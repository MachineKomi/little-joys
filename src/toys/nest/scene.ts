import type {
  SceneServices,
  ToyPointer,
  ToyScene,
  View,
} from "../../core/types";
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
  }
  pointerMove(p: ToyPointer): void {
    if (this.services.settings.ballControl === "tap-place") return;
    const ball = this.balls.find((candidate) => candidate.owner === p.id);
    if (!ball) return;
    Object.assign(
      ball,
      clampBall(
        { x: p.x + ball.offset.x, y: p.y + ball.offset.y },
        this.layout.radius,
        this.view,
      ),
    );
  }
  pointerEnd(id: number, reason: "up" | "cancel" = "up"): void {
    const ball = this.balls.find((candidate) => candidate.owner === id);
    if (!ball) return;
    ball.owner = null;
    if (reason === "up") this.release(ball);
    else this.separate(ball);
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
        ball.slot = available[0].index;
        ball.target = { ...available[0].point };
        this.response = 0.26;
        this.services.sound("nest");
        return;
      }
    }
    ball.slot = null;
    ball.target = null;
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
    });
    released.forEach((ball) => this.separate(ball));
    this.selected = null;
  }
  update(dt: number): boolean {
    const delta = Math.min(0.05, Math.max(0, dt));
    const blend = 1 - Math.exp(-delta * 20);
    let moving = false;
    for (const ball of this.balls) {
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
    this.response = Math.max(0, this.response - delta);
    return moving || this.response > 0;
  }
  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.view;
    const { radius: r, opening: bowl } = this.layout;
    const bowlSprite = this.services.image?.("bowl");
    const bowlWidth = bowl.rx * 2,
      bowlHeight = bowlSprite
        ? (bowlWidth * bowlSprite.naturalHeight) / bowlSprite.naturalWidth
        : 0;
    const bowlTop = bowl.y - bowlHeight * 0.205;
    ctx.fillStyle = "#fbf7ef";
    ctx.fillRect(0, 0, width, height);
    // Back and interior are behind all balls. The shallow front rim is drawn last.
    ctx.fillStyle = "#ece5d8";
    ctx.beginPath();
    ctx.ellipse(
      bowl.x,
      bowl.y + r * 0.95,
      bowl.rx * 0.88,
      r * 0.15,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    if (bowlSprite)
      ctx.drawImage(
        bowlSprite,
        bowl.x - bowl.rx,
        bowlTop,
        bowlWidth,
        bowlHeight,
      );
    else {
      ctx.beginPath();
      ctx.ellipse(bowl.x, bowl.y, bowl.rx, bowl.ry, 0, 0, Math.PI * 2);
      const inside = ctx.createLinearGradient(
        0,
        bowl.y - bowl.ry,
        0,
        bowl.y + bowl.ry,
      );
      inside.addColorStop(0, "#d7936e");
      inside.addColorStop(1, "#f2c9a3");
      ctx.fillStyle = inside;
      ctx.fill();
      ctx.strokeStyle = "#aa765c";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(
        bowl.x,
        bowl.y + r * 0.06,
        bowl.rx * 0.84,
        bowl.ry * 0.67,
        0,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = "#bb8261";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    for (const ball of this.balls) {
      if (ball.slot === null) {
        ctx.fillStyle = "#e7e3dc";
        ctx.beginPath();
        ctx.ellipse(
          ball.x,
          ball.y + r * 1.05,
          r * 0.78,
          r * 0.105,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      if (this.selected === ball.id || ball.owner !== null) {
        ctx.strokeStyle = "#528878";
        ctx.lineWidth = this.selected === ball.id ? 4 : 2;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      const ballSprite = this.services.image?.(
        ball.id === 0 ? "ball" : "ballTwo",
      );
      if (ballSprite)
        ctx.drawImage(ballSprite, ball.x - r, ball.y - r, r * 2, r * 2);
      else {
        const shading = ctx.createRadialGradient(
          ball.x - r * 0.4,
          ball.y - r * 0.42,
          r * 0.02,
          ball.x + r * 0.15,
          ball.y + r * 0.23,
          r * 1.35,
        );
        if (ball.id === 0) {
          shading.addColorStop(0, "#d8d2f3");
          shading.addColorStop(0.45, "#b0a5d6");
          shading.addColorStop(1, "#8179b1");
        } else {
          shading.addColorStop(0, "#c8edd6");
          shading.addColorStop(0.45, "#89c9b0");
          shading.addColorStop(1, "#459d8c");
        }
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
        ctx.fillStyle = shading;
        ctx.fill();
        ctx.strokeStyle = ball.id === 0 ? "#716a97" : "#3d8072";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(
          ball.x - r * 0.32,
          ball.y - r * 0.4,
          r * 0.22,
          r * 0.1,
          -0.55,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = "#fffaf05c";
        ctx.fill();
      }
    }
    if (bowlSprite) {
      // Reuse the same registered painting for the foreground. The clip follows
      // its shallow front lip, keeping a nested ball mostly visible.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bowl.x - bowl.rx, bowl.y);
      ctx.bezierCurveTo(
        bowl.x - bowl.rx * 0.72,
        bowl.y + r * 0.59,
        bowl.x + bowl.rx * 0.72,
        bowl.y + r * 0.59,
        bowl.x + bowl.rx,
        bowl.y,
      );
      ctx.lineTo(bowl.x + bowl.rx, bowlTop + bowlHeight);
      ctx.lineTo(bowl.x - bowl.rx, bowlTop + bowlHeight);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        bowlSprite,
        bowl.x - bowl.rx,
        bowlTop,
        bowlWidth,
        bowlHeight,
      );
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(bowl.x - bowl.rx, bowl.y);
      ctx.bezierCurveTo(
        bowl.x - bowl.rx * 0.91,
        bowl.y + r * 0.95,
        bowl.x - bowl.rx * 0.63,
        bowl.y + r * 1.04,
        bowl.x,
        bowl.y + r * 1.07,
      );
      ctx.bezierCurveTo(
        bowl.x + bowl.rx * 0.63,
        bowl.y + r * 1.04,
        bowl.x + bowl.rx * 0.91,
        bowl.y + r * 0.95,
        bowl.x + bowl.rx,
        bowl.y,
      );
      ctx.bezierCurveTo(
        bowl.x + bowl.rx * 0.69,
        bowl.y + r * 0.58,
        bowl.x - bowl.rx * 0.69,
        bowl.y + r * 0.58,
        bowl.x - bowl.rx,
        bowl.y,
      );
      ctx.closePath();
      const front = ctx.createLinearGradient(0, bowl.y, 0, bowl.y + r);
      front.addColorStop(0, "#f8d2ab");
      front.addColorStop(0.65, "#eeb98e");
      front.addColorStop(1, "#d99b75");
      ctx.fillStyle = front;
      ctx.fill();
      ctx.strokeStyle = "#aa765c";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bowl.x - bowl.rx * 0.9, bowl.y + r * 0.14);
      ctx.bezierCurveTo(
        bowl.x - bowl.rx * 0.5,
        bowl.y + r * 0.54,
        bowl.x + bowl.rx * 0.5,
        bowl.y + r * 0.54,
        bowl.x + bowl.rx * 0.9,
        bowl.y + r * 0.14,
      );
      ctx.strokeStyle = "#ffe7c8";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (this.response > 0) {
      ctx.globalAlpha = (this.response / 0.26) * 0.6;
      ctx.strokeStyle = "#8a8562";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        bowl.x,
        bowl.y + r * 1.3,
        r * 0.3,
        r * 0.06,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
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
