import type {
  SceneServices,
  ToyPointer,
  ToyScene,
  View,
} from "../../core/types";
import { bubbleLayout, segmentCircle } from "./geometry";
type Bubble = {
  x: number;
  y: number;
  radius: number;
  state: "ready" | "poppedWaiting" | "waitingForClear";
  remaining: number;
};
export class BubbleScene implements ToyScene {
  readonly id = "bubbles" as const;
  private view: View = { width: 800, height: 600 };
  private bubbles: Bubble[] = [];
  private pointers = new Map<number, { x: number; y: number }>();
  private effects: { x: number; y: number; radius: number; life: number }[] =
    [];
  private limited = false;
  private restored: { state: Bubble["state"]; remaining: number }[] = [];
  constructor(
    private services: SceneServices,
    snapshot?: unknown,
  ) {
    if (snapshot && typeof snapshot === "object") {
      const b = (snapshot as { bubbles?: unknown }).bubbles;
      if (Array.isArray(b) && b.length <= 6)
        this.restored = b.map((v) =>
          v &&
          typeof v === "object" &&
          ["ready", "poppedWaiting", "waitingForClear"].includes(v.state) &&
          Number.isFinite(v.remaining)
            ? {
                state: v.state,
                remaining: Math.max(0, Math.min(0.9, v.remaining)),
              }
            : { state: "ready", remaining: 0 },
        );
    }
  }
  resize(view: View) {
    this.cancelAll();
    this.view = view;
    const { slots, limited } = bubbleLayout(
      view,
      this.services.settings.bubbleCount,
    );
    this.limited = limited;
    const old = this.bubbles.length ? this.bubbles : this.restored;
    this.bubbles = slots.map((slot, i) => ({
      ...slot,
      state: old[i]?.state ?? "ready",
      remaining: old[i]?.remaining ?? 0,
    }));
    this.restored = [];
    this.effects = [];
  }
  private effect(x: number, y: number, radius: number) {
    if (this.effects.length === 24) this.effects.shift();
    this.effects.push({ x, y, radius, life: 0.28 });
  }
  private sweep(p: ToyPointer) {
    let hit = false;
    for (const b of this.bubbles) {
      if (
        b.state === "ready" &&
        segmentCircle(p.previousX, p.previousY, p.x, p.y, b.x, b.y, b.radius)
      ) {
        b.state = "poppedWaiting";
        b.remaining = 0.9;
        this.effect(b.x, b.y, b.radius);
        this.services.sound("bubbles");
        hit = true;
      }
    }
    return hit;
  }
  pointerDown(p: ToyPointer) {
    this.pointers.set(p.id, { x: p.x, y: p.y });
    if (!this.sweep({ ...p, previousX: p.x, previousY: p.y }))
      this.effect(p.x, p.y, 18);
  }
  pointerMove(p: ToyPointer) {
    if (!this.pointers.has(p.id)) return;
    this.pointers.set(p.id, { x: p.x, y: p.y });
    this.sweep(p);
  }
  pointerEnd(id: number) {
    this.pointers.delete(id);
  }
  cancelAll() {
    this.pointers.clear();
  }
  update(dt: number) {
    let pending = false;
    for (const b of this.bubbles) {
      if (b.state === "ready") continue;
      b.remaining = Math.max(0, b.remaining - Math.min(0.05, dt));
      if (b.remaining > 0) {
        pending = true;
        continue;
      }
      const blocked = [...this.pointers.values()].some(
        (p) => Math.hypot(p.x - b.x, p.y - b.y) <= b.radius + 16,
      );
      b.state = blocked ? "waitingForClear" : "ready";
    }
    for (const e of this.effects) e.life -= dt;
    this.effects = this.effects.filter((e) => e.life > 0);
    return pending || this.effects.length > 0;
  }
  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#eef7f3";
    ctx.fillRect(0, 0, this.view.width, this.view.height);
    const colours = [
      ["#f9f3df", "#aadbd4"],
      ["#f7eeff", "#bcb9df"],
      ["#fff2e1", "#e8c8a9"],
      ["#edfbf7", "#a5d2c3"],
      ["#f5efff", "#cec1df"],
      ["#fef4e8", "#e1c4ac"],
    ];
    const sprite = this.services.image?.("bubble");
    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i];
      if (b.state !== "ready") continue;
      const [light, dark] = colours[i];
      const gradient = ctx.createRadialGradient(
        b.x - b.radius * 0.3,
        b.y - b.radius * 0.38,
        b.radius * 0.08,
        b.x,
        b.y,
        b.radius,
      );
      gradient.addColorStop(0, light);
      gradient.addColorStop(0.8, light);
      gradient.addColorStop(1, dark);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      if (sprite) {
        ctx.drawImage(
          sprite,
          b.x - b.radius - 2,
          b.y - b.radius - 2,
          b.radius * 2 + 4,
          b.radius * 2 + 4,
        );
        continue;
      }
      ctx.strokeStyle = "#609c98";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.78, Math.PI * 1.13, Math.PI * 1.59);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        b.x + b.radius * 0.4,
        b.y + b.radius * 0.44,
        b.radius * 0.085,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "#ffffffb8";
      ctx.fill();
    }
    for (const e of this.effects) {
      const age = 1 - e.life / 0.28;
      ctx.globalAlpha = (1 - age) * 0.6;
      ctx.strokeStyle = "#6caaa1";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        e.x,
        e.y,
        e.radius *
          (this.services.settings.motion === "playful" ? 1 + 0.18 * age : 1),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  snapshot() {
    return {
      bubbles: this.bubbles.map((b) => ({
        state: b.state,
        remaining: b.remaining,
      })),
    };
  }
  debug() {
    return {
      bubbles: this.bubbles.map((b) => ({ ...b })),
      effectiveBubbleCount: this.bubbles.length,
      bubbleLayoutLimited: this.limited,
      effects: this.effects.length,
      contacts: this.pointers.size,
    };
  }
  dispose() {
    this.cancelAll();
    this.bubbles = [];
    this.effects = [];
  }
}
