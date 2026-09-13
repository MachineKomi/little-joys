import type {
  SceneServices,
  ToyPointer,
  ToyScene,
  View,
} from "../../core/types";
import { rollStep } from "./rolling";
import {
  acceptsDrop,
  clampBall,
  GRAB_MARGIN,
  nestLayout,
  separateReleased,
  type NestLayout,
  type Point,
} from "./geometry";

interface Ball extends Point {
  id: number;
  slot: number | null;
  target: Point | null;
  owner: number | null;
  offset: Point;
  vx: number;
  vy: number;
  angle: number;
  fixed: boolean;
  lastMoveTime: number;
  sinceMove: number;
}
interface SavedBall {
  x: number;
  y: number;
  slot: number | null;
  settling: boolean;
}
function readSnapshot(snapshot: unknown): SavedBall[] | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const balls = (snapshot as { balls?: unknown }).balls;
  if (!Array.isArray(balls) || balls.length < 1 || balls.length > 2)
    return null;
  const result: SavedBall[] = [];
  for (const item of balls) {
    if (!item || typeof item !== "object") return null;
    const b = item as SavedBall;
    if (
      !Number.isFinite(b.x) ||
      !Number.isFinite(b.y) ||
      b.x < 0 ||
      b.x > 1 ||
      b.y < 0 ||
      b.y > 1 ||
      ![null, 0, 1].includes(b.slot) ||
      typeof b.settling !== "boolean"
    )
      return null;
    result.push({ x: b.x, y: b.y, slot: b.slot, settling: b.settling });
  }
  return result;
}

export class NestScene implements ToyScene {
  readonly id = "nest" as const;
  private view: View = { width: 800, height: 600 };
  private layout: NestLayout;
  private balls: Ball[] = [];
  private saved: SavedBall[] | null;
  private initialized = false;
  private selected: number | null = null;
  private response = 0;
  constructor(
    private services: SceneServices,
    snapshot?: unknown,
  ) {
    this.layout = nestLayout(this.view, services.settings.ballCount);
    this.saved = readSnapshot(snapshot);
  }
  resize(view: View): void {
    this.cancelAll();
    const old = this.view;
    this.view = view;
    this.layout = nestLayout(view, this.services.settings.ballCount);
    if (!this.initialized) {
      this.balls = this.layout.initial.map((initial, id) => {
        const saved = this.saved?.[id];
        const slot =
          saved && saved.slot !== null && saved.slot < this.layout.slots.length
            ? saved.slot
            : null;
        const point =
          slot !== null && !saved?.settling
            ? this.layout.slots[slot]
            : saved
              ? clampBall(
                  { x: saved.x * view.width, y: saved.y * view.height },
                  this.layout.radius,
                  view,
                )
              : initial;
        return {
          id,
          ...point,
          slot,
          target:
            slot !== null && saved?.settling
              ? { ...this.layout.slots[slot] }
              : null,
          owner: null,
          offset: { x: 0, y: 0 },
          vx: 0,
          vy: 0,
          angle: 0,
          fixed: false,
          lastMoveTime: 0,
          sinceMove: 1,
        };
      });
      this.initialized = true;
      this.saved = null;
    } else {
      for (const ball of this.balls) {
        if (ball.slot !== null) {
          const slot = this.layout.slots[ball.slot];
          Object.assign(ball, slot);
          ball.target = null;
        } else
          Object.assign(
            ball,
            clampBall(
              {
                x: (ball.x / old.width) * view.width,
                y: (ball.y / old.height) * view.height,
              },
              this.layout.radius,
              view,
            ),
          );
      }
    }
    // Configuration/rotation may bring two previous resting positions together.
    if (this.balls.length === 2) this.separate(this.balls[1]);
  }
  private hit(p: Point): Ball | undefined {
    return this.balls.find(
      (ball) =>
        ball.owner === null &&
        Math.hypot(p.x - ball.x, p.y - ball.y) <=
          this.layout.radius + GRAB_MARGIN,
    );
  }
  pointerDown(p: ToyPointer): void {
    if (this.balls.some((ball) => ball.owner === p.id)) return;
    const ball = this.hit(p);
    if (this.services.settings.ballControl === "tap-place") {
      if (ball) this.selected = this.selected === ball.id ? null : ball.id;
      else if (this.selected !== null) {
        const selected = this.balls[this.selected];
        Object.assign(selected, clampBall(p, this.layout.radius, this.view));
        selected.target = null;
        selected.slot = null;
        this.release(selected);
        this.selected = null;
      }
      return;
    }
    if (!ball) return;
    ball.owner = p.id;
    ball.offset = { x: ball.x - p.x, y: ball.y - p.y };
    ball.slot = null;
    ball.target = null;
    ball.vx = ball.vy = 0;
    ball.lastMoveTime = p.timeMs;
    ball.sinceMove = 1;
  }
  pointerMove(p: ToyPointer): void {
    if (this.services.settings.ballControl === "tap-place") return;
    const ball = this.balls.find((candidate) => candidate.owner === p.id);
    if (!ball) return;
    const oldX = ball.x,
      oldY = ball.y;
    Object.assign(
      ball,
      clampBall(
        { x: p.x + ball.offset.x, y: p.y + ball.offset.y },
        this.layout.radius,
        this.view,
      ),
    );
    const elapsed = (p.timeMs - ball.lastMoveTime) / 1000;
    ball.angle =
      (ball.angle + (ball.x - oldX) / this.layout.radius) % (Math.PI * 2);
    if (Number.isFinite(elapsed) && elapsed > 0 && elapsed <= 0.15) {
      const vx = (ball.x - oldX) / elapsed,
        vy = (ball.y - oldY) / elapsed;
      const scale = Math.min(1, 700 / Math.max(1, Math.hypot(vx, vy)));
      ball.vx = vx * scale;
      ball.vy = vy * scale;
      ball.sinceMove = 0;
    } else {
      ball.vx = ball.vy = 0;
      ball.sinceMove = 1;
    }
    ball.lastMoveTime = p.timeMs;
  }
  pointerEnd(id: number, reason: "up" | "cancel" = "up"): void {
    const ball = this.balls.find((candidate) => candidate.owner === id);
    if (!ball) return;
    ball.owner = null;
    if (reason === "up") this.release(ball);
    else {
      ball.vx = ball.vy = 0;
      this.separate(ball);
    }
  }
  private release(ball: Ball): void {
    if (acceptsDrop(ball, this.layout.opening)) {
      const occupied = new Set(
        this.balls
          .filter((other) => other !== ball && other.slot !== null)
          .map((other) => other.slot),
      );
      const available = this.layout.slots
        .map((point, index) => ({ point, index }))
        .filter((slot) => !occupied.has(slot.index));
      available.sort(
        (a, b) =>
          Math.hypot(a.point.x - ball.x, a.point.y - ball.y) -
          Math.hypot(b.point.x - ball.x, b.point.y - ball.y),
      );
      if (available[0]) {
        ball.vx = ball.vy = 0;
        ball.slot = available[0].index;
        ball.target = { ...available[0].point };
        this.response = 0.26;
        this.services.sound("nest");
        return;
      }
    }
    ball.slot = null;
    ball.target = null;
    if (
      this.services.settings.motion !== "playful" ||
      this.services.settings.ballControl === "tap-place" ||
      ball.sinceMove > 0.12
    )
      ball.vx = ball.vy = 0;
    this.separate(ball);
  }
  private separate(ball: Ball): void {
    for (const other of this.balls) {
      if (other === ball) continue;
      const separated = separateReleased(
        ball,
        other.target ?? other,
        this.layout.radius,
        this.view,
      );
      if (separated.x !== ball.x || separated.y !== ball.y) {
        Object.assign(ball, separated);
        ball.slot = null;
        ball.target = null;
      }
    }
  }
  cancelAll(): void {
    const released = this.balls.filter((ball) => ball.owner !== null);
    this.balls.forEach((ball) => {
      ball.owner = null;
      ball.vx = ball.vy = 0;
      ball.sinceMove = 1;
    });
    released.forEach((ball) => this.separate(ball));
    this.selected = null;
  }
  update(dt: number): boolean {
    const delta = Number.isFinite(dt) ? Math.min(0.05, Math.max(0, dt)) : 0;
    const blend = 1 - Math.exp(-delta * 20);
    let moving = false;
    for (const ball of this.balls) {
      ball.sinceMove += delta;
      ball.fixed = ball.owner !== null || ball.slot !== null;
      if (this.services.settings.motion !== "playful") ball.vx = ball.vy = 0;
      // Run only a short expiry clock after a drag sample. A stationary hold
      // must not launch the ball using stale velocity when eventually released.
      if (ball.owner !== null && (ball.vx !== 0 || ball.vy !== 0)) {
        if (ball.sinceMove > 0.12) ball.vx = ball.vy = 0;
        else moving = true;
      }
      if (!ball.target || ball.owner !== null) continue;
      const distance = Math.hypot(
        ball.target.x - ball.x,
        ball.target.y - ball.y,
      );
      if (distance < 0.08) {
        Object.assign(ball, ball.target);
        ball.target = null;
      } else {
        ball.x += (ball.target.x - ball.x) * blend;
        ball.y += (ball.target.y - ball.y) * blend;
        moving = true;
      }
    }
    if (this.services.settings.motion === "playful")
      moving =
        rollStep(this.balls, this.view, this.layout.radius, delta) || moving;
    this.response = Math.max(0, this.response - delta);
    return moving || this.response > 0;
  }
  private paintBall(ctx: CanvasRenderingContext2D, ball: Ball): void {
    const r = this.layout.radius;
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.angle);
    const sprite = this.services.image?.(ball.id === 0 ? "ball" : "ballTwo");
    if (sprite) ctx.drawImage(sprite, -r, -r, r * 2, r * 2);
    else {
      const fill = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r);
      fill.addColorStop(0, ball.id === 0 ? "#fbe0b4" : "#dcd4ff");
      fill.addColorStop(1, ball.id === 0 ? "#ec913f" : "#9482d4");
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff80";
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.65, -0.9, 0.5);
      ctx.stroke();
    }
    ctx.restore();
    if (this.selected === ball.id) {
      ctx.strokeStyle = "#46506c";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r + 9, angle - 0.11, angle + 0.11);
        ctx.stroke();
      }
    }
  }
  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.view;
    const { radius: r, opening: bowl } = this.layout;
    const sprite = this.services.image?.("bowl");
    const w = bowl.rx * 2;
    const h = sprite
      ? (w * sprite.naturalHeight) / sprite.naturalWidth
      : r * 1.5;
    const left = bowl.x - bowl.rx,
      top = bowl.y - h * 0.205;
    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#fff5dc");
    background.addColorStop(1, "#f8dbab");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    // Static woven-table curves give the scene warmth without a moving backdrop.
    ctx.strokeStyle = "#d9a97226";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const y = height * (0.79 + i * 0.07);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * 0.3, y - 14, width * 0.7, y + 14, width, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#9d61291c";
    ctx.beginPath();
    ctx.ellipse(bowl.x, top + h * 0.92, w * 0.4, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    if (sprite) ctx.drawImage(sprite, left, top, w, h);
    else {
      ctx.fillStyle = "#cc8051";
      ctx.beginPath();
      ctx.ellipse(bowl.x, bowl.y, bowl.rx, bowl.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const ball of this.balls)
      if (ball.slot !== null) this.paintBall(ctx, ball);
    // Registered to the 768x231 painting: the inner front lip starts at 20%
    // of its height at the ends and reaches 40.25% at the centre. Only nested
    // balls go behind this foreground; direct manipulation always stays visible.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left, top + h * 0.2);
    ctx.bezierCurveTo(
      left + w * 0.16,
      top + h * 0.47,
      left + w * 0.84,
      top + h * 0.47,
      left + w,
      top + h * 0.2,
    );
    ctx.lineTo(left + w, top + h);
    ctx.lineTo(left, top + h);
    ctx.closePath();
    if (sprite) {
      ctx.clip();
      ctx.drawImage(sprite, left, top, w, h);
    } else {
      ctx.fillStyle = "#efa864";
      ctx.fill();
    }
    ctx.restore();
    if (this.response > 0) {
      const life = this.response / 0.26;
      ctx.globalAlpha = life * 0.7;
      ctx.strokeStyle = "#fff5c8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(left + w * 0.16, top + h * 0.36);
      ctx.quadraticCurveTo(
        bowl.x,
        top + h * 0.52,
        left + w * 0.84,
        top + h * 0.36,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const ball of this.balls)
      if (ball.slot === null) this.paintBall(ctx, ball);
  }
  snapshot(): unknown {
    return {
      balls: this.balls.map((ball) => ({
        x: ball.x / this.view.width,
        y: ball.y / this.view.height,
        slot: ball.slot,
        settling: ball.target !== null,
      })),
    };
  }
  debug() {
    return {
      radius: this.layout.radius,
      opening: { ...this.layout.opening },
      slots: this.layout.slots.map((slot) => ({ ...slot })),
      balls: this.balls.map((ball) => ({
        id: ball.id,
        x: ball.x,
        y: ball.y,
        slot: ball.slot,
        owner: ball.owner,
        target: ball.target ? { ...ball.target } : null,
        vx: ball.vx,
        vy: ball.vy,
        angle: ball.angle,
      })),
      selected: this.selected,
      effects: this.response > 0 ? 1 : 0,
      owners: this.balls.filter((ball) => ball.owner !== null).length,
    };
  }
  dispose(): void {
    this.cancelAll();
    this.balls = [];
    this.response = 0;
    this.saved = null;
  }
}
