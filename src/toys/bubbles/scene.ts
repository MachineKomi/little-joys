import { paintPond } from "./presentation";
import type {
  SceneServices,
  ToyPointer,
  ToyScene,
  View,
} from "../../core/types";
import { bubbleLayout, nextBubblePosition, segmentCircle } from "./geometry";
type Bubble = {
  x: number;
  y: number;
  radius: number;
  state: "ready" | "poppedWaiting" | "waitingForClear";
  remaining: number;
  forming: number;
};
export class BubbleScene implements ToyScene {
  readonly id = "bubbles" as const;
  private view: View = { width: 800, height: 600 };
  private bubbles: Bubble[] = [];
  private pointers = new Map<number, { x: number; y: number }>();
  private effects: {
    x: number;
    y: number;
    radius: number;
    life: number;
    pop: boolean;
    seed: number;
  }[] = [];
  private limited = false;
  private sequence = 0;
  private restored: {
    state: Bubble["state"];
    remaining: number;
    x?: number;
    y?: number;
  }[] = [];
  constructor(
    private services: SceneServices,
    snapshot?: unknown,
  ) {
    if (snapshot && typeof snapshot === "object") {
      const sequence = (snapshot as { sequence?: unknown }).sequence;
      if (
        typeof sequence === "number" &&
        Number.isSafeInteger(sequence) &&
        sequence >= 0 &&
        sequence < 1_000_000
      )
        this.sequence = sequence;
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
                x:
                  Number.isFinite(v.x) && v.x >= 0 && v.x <= 1
                    ? v.x
                    : undefined,
                y:
                  Number.isFinite(v.y) && v.y >= 0 && v.y <= 1
                    ? v.y
                    : undefined,
              }
            : { state: "ready", remaining: 0 },
        );
    }
  }
  resize(view: View) {
    this.cancelAll();
    const previous = this.view;
    this.view = view;
    const { slots, limited } = bubbleLayout(
      view,
      this.services.settings.bubbleCount,
    );
    this.limited = limited;
    const old = this.bubbles.length
      ? this.bubbles.map((b) => ({
          ...b,
          x: b.x / previous.width,
          y: b.y / previous.height,
        }))
      : this.restored;
    this.bubbles = slots.map((slot, i) => ({
      ...slot,
      state: old[i]?.state ?? "ready",
      remaining: old[i]?.remaining ?? 0,
      forming: 0,
    }));
    // Restore only a complete, valid arrangement; malformed/rotated overlaps use
    // the readable baseline layout rather than leaving inaccessible targets.
    const candidates = this.bubbles.map((b, i) => ({
      ...b,
      x: (old[i]?.x ?? b.x / view.width) * view.width,
      y: (old[i]?.y ?? b.y / view.height) * view.height,
    }));
    if (
      candidates.every(
        (b, i) =>
          b.x - b.radius >= 24 &&
          b.x + b.radius <= view.width - 24 &&
          b.y - b.radius >= 24 &&
          b.y + b.radius <= view.height - 24 &&
          candidates.every(
            (other, j) =>
              i === j ||
              Math.hypot(b.x - other.x, b.y - other.y) >=
                b.radius + other.radius + 16,
          ),
      )
    )
      this.bubbles = candidates;
    this.restored = [];
    this.effects = [];
  }
  private effect(x: number, y: number, radius: number, pop = false) {
    if (this.effects.length === 24) this.effects.shift();
    this.effects.push({
      x,
      y,
      radius,
      life: 0.55,
      pop,
      seed: this.sequence++ % 12,
    });
    this.sequence %= 1_000_000;
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
        this.effect(b.x, b.y, b.radius, true);
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
    const delta = Number.isFinite(dt) ? Math.max(0, Math.min(0.05, dt)) : 0;
    let pending = false;
    for (let index = 0; index < this.bubbles.length; index++) {
      const b = this.bubbles[index];
      b.forming = Math.max(0, b.forming - delta);
      pending ||= b.forming > 0;
      if (b.state === "ready") continue;
      b.remaining = Math.max(0, b.remaining - delta);
      if (b.remaining > 0) {
        pending = true;
        continue;
      }
      const blocked = [...this.pointers.values()].some(
        (p) => Math.hypot(p.x - b.x, p.y - b.y) <= b.radius + 16,
      );
      b.state = blocked ? "waitingForClear" : "ready";
      if (!blocked) {
        Object.assign(
          b,
          nextBubblePosition(
            this.view,
            this.bubbles,
            index,
            this.sequence++,
            this.pointers.values(),
          ),
        );
        this.sequence %= 1_000_000;
        b.forming = 0.22;
        pending = true;
      }
    }
    for (const e of this.effects) e.life -= delta;
    this.effects = this.effects.filter((e) => e.life > 0);
    return pending || this.effects.length > 0;
  }
  render(ctx: CanvasRenderingContext2D) {
    paintPond(
      ctx,
      this.view,
      this.bubbles,
      this.effects,
      this.services.settings.motion === "playful",
      this.services.image?.("bubble"),
    );
  }
  snapshot() {
    return {
      sequence: this.sequence,
      bubbles: this.bubbles.map((b) => ({
        state: b.state,
        remaining: b.remaining,
        x: b.x / this.view.width,
        y: b.y / this.view.height,
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
