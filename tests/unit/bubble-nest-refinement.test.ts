import { describe, expect, it } from "vitest";
import { defaults } from "../../src/core/settings";
import { BubbleScene } from "../../src/toys/bubbles/scene";
import type { BubblePosition } from "../../src/toys/bubbles/geometry";
import { nextBubblePosition } from "../../src/toys/bubbles/geometry";
import type { SettingsV1, ToyPointer, View } from "../../src/core/types";
import { NestScene } from "../../src/toys/nest/scene";

const pointer = (
  id: number,
  x: number,
  y: number,
  timeMs = 0,
  previousX = x,
  previousY = y,
): ToyPointer => ({
  id,
  x,
  y,
  previousX,
  previousY,
  timeMs,
});

function nestFixture(
  settings: Partial<SettingsV1> = {},
  view: View = { width: 810, height: 970 },
) {
  const scene = new NestScene({ settings: { ...defaults, ...settings }, sound: () => {} });
  scene.resize(view);
  return scene;
}

function bubbleFixture(
  settings: Partial<SettingsV1> = {},
  snapshot?: unknown,
  view: View = { width: 810, height: 972 },
) {
  const scene = new BubbleScene(
    { settings: { ...defaults, ...settings }, sound: () => {} },
    snapshot,
  );
  scene.resize(view);
  return scene;
}

function separation(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe("Roll & Nest refinement", () => {
  it("Playful recent release outside bowl keeps moving, rotates, and sleeps within bounds", () => {
    const scene = nestFixture({ motion: "playful", ballCount: 1 });
    const { balls, opening, radius } = scene.debug();
    const start = balls[0];

    scene.pointerDown(pointer(1, start.x, start.y, 0));
    scene.pointerMove(
      pointer(1, opening.x + opening.rx + 40, opening.y + 18, 50),
      );
    scene.pointerEnd(1, "up");

    let moving = scene.update(1 / 60);
    let state = scene.debug().balls[0];
    expect(state.target).toBeNull();
    expect(state.slot).toBeNull();
    expect(state.vx).not.toBe(0);
    expect(state.vy).not.toBe(0);
    expect(moving).toBe(true);

    const moved = { x: Math.abs(state.x - start.x) > 0.01, angle: Math.abs(state.angle - start.angle) > 0.01 };
    let slept = !moving;
    let frames = 1;
    let previous = state;
    for (frames = 1; frames <= 360; frames++) {
      moving = scene.update(1 / 60);
      state = scene.debug().balls[0];
      if (Math.hypot(state.x - previous.x, state.y - previous.y) > 0.01)
        moved.x = true;
      if (Math.abs(state.angle - previous.angle) > 1e-6)
        moved.angle = true;
      expect(state.x).toBeGreaterThanOrEqual(radius + 24 - 1e-6);
      expect(state.x).toBeLessThanOrEqual(810 - radius - 24 + 1e-6);
      expect(state.y).toBeGreaterThanOrEqual(radius + 24 - 1e-6);
      expect(state.y).toBeLessThanOrEqual(970 - radius - 24 + 1e-6);
      if (!moving) {
        slept = true;
        break;
      }
      previous = state;
    }

    expect(moved.x).toBe(true);
    expect(moved.angle).toBe(true);
    expect(slept).toBe(true);
    expect(frames).toBeLessThanOrEqual(360);
  });

  it("Stationary held playful ball ages out velocity before release so it does not launch on free-drop", () => {
    const scene = nestFixture({ motion: "playful", ballCount: 1 });
    const { balls } = scene.debug();
    const ball = balls[0];

    scene.pointerDown(pointer(1, ball.x, ball.y, 0));
    scene.pointerMove(pointer(1, ball.x + 50, ball.y, 50));
    const pushed = scene.debug().balls[0];
    expect(Math.abs(pushed.vx)).toBeGreaterThan(0);

    for (let i = 0; i < 10; i++) scene.update(1 / 60);

    const held = scene.debug().balls[0];
    expect(Math.abs(held.vx)).toBe(0);
    expect(Math.abs(held.vy)).toBe(0);

    scene.update(1 / 60);
    const afterAging = scene.debug().balls[0];
    expect(Math.abs(afterAging.vx)).toBe(0);
    expect(Math.abs(afterAging.vy)).toBe(0);

    scene.pointerEnd(1, "up");
    const released = scene.debug().balls[0];
    expect(released.owner).toBeNull();
    expect(released.slot).toBeNull();
    expect(released.target).toBeNull();
    expect(released.vx).toBe(0);
    expect(released.vy).toBe(0);

    const before = { ...released };
    for (let i = 0; i < 12; i++) scene.update(1 / 60);
    const final = scene.debug().balls[0];
    expect(Math.hypot(final.x - before.x, final.y - before.y)).toBeLessThan(1e-2);
  });

  it("cancelAll and resize clear ball velocity so no stale rolling remains", () => {
    const scene = nestFixture({ motion: "playful", ballCount: 2 });
    const afterFirst = scene.debug().balls;

    scene.pointerDown(pointer(1, afterFirst[0].x, afterFirst[0].y, 0));
    scene.pointerMove(pointer(1, afterFirst[0].x + 140, afterFirst[0].y, 50));
    scene.update(1 / 60);
    expect(scene.debug().balls[0].vx).not.toBe(0);
    expect(scene.debug().balls[0].vy).toBe(0);

    scene.cancelAll();
    for (const ball of scene.debug().balls) {
      expect(ball.owner).toBeNull();
      expect(ball.vx).toBe(0);
      expect(ball.vy).toBe(0);
    }

    const afterCancel = scene.debug().balls;
    scene.pointerDown(pointer(2, afterCancel[1].x, afterCancel[1].y, 10));
    scene.pointerMove(pointer(2, afterCancel[1].x + 320, afterCancel[1].y - 120, 120));
    scene.update(1 / 60);
    expect(Math.abs(scene.debug().balls[1].vx)).toBeGreaterThan(0);

    scene.resize({ width: 360, height: 540 });
    for (const ball of scene.debug().balls) {
      expect(ball.vx).toBe(0);
      expect(ball.vy).toBe(0);
      expect(ball.owner).toBeNull();
    }
  });

  it("Gentle keeps a free release still even with real timestamps", () => {
    const scene = nestFixture({ motion: "gentle", ballCount: 1 });
    const { balls, opening } = scene.debug();
    const ball = balls[0];

    scene.pointerDown(pointer(1, ball.x, ball.y, 0));
    scene.pointerMove(pointer(1, opening.x + opening.rx + 40, opening.y + 180, 120));
    scene.pointerEnd(1, "up");

    const released = scene.debug().balls[0];
    expect(released.vx).toBe(0);
    expect(released.vy).toBe(0);
    expect(released.slot).toBeNull();
    expect(released.target).toBeNull();

    const fixed = { ...released };
    for (let i = 0; i < 24; i++) scene.update(1 / 60);
    const still = scene.debug().balls[0];
    expect(still.x).toBeCloseTo(fixed.x, 6);
    expect(still.y).toBeCloseTo(fixed.y, 6);
    expect(still.vx).toBe(0);
    expect(still.vy).toBe(0);
  });

  it("two-pointer ownership remains intact between independently held balls", () => {
    const scene = nestFixture({ ballCount: 2 });
    const { balls } = scene.debug();

    scene.pointerDown(pointer(1, balls[0].x, balls[0].y, 0));
    scene.pointerDown(pointer(2, balls[0].x, balls[0].y, 10));
    scene.pointerDown(pointer(3, balls[1].x, balls[1].y, 20));

    scene.pointerMove(pointer(1, balls[0].x + 30, balls[0].y + 15, 30));
    scene.pointerMove(pointer(2, balls[0].x + 35, balls[0].y + 18, 40));
    scene.pointerMove(pointer(3, balls[1].x + 30, balls[1].y + 12, 30));

    expect(scene.debug().balls[0].owner).toBe(1);
    expect(scene.debug().balls[1].owner).toBe(3);

    scene.pointerEnd(1, "up");
    expect(scene.debug().balls[0].owner).toBeNull();
    expect(scene.debug().balls[1].owner).toBe(3);
  });
});

describe("Bubble Pond refinement", () => {
  it("return placement varies deterministically when roomy and avoids neighbors/held contacts", () => {
    const view = { width: 1200, height: 760 };
    const bubbles: BubblePosition[] = [
      { x: 200, y: 200, radius: 34 },
      { x: 540, y: 220, radius: 34 },
      { x: 850, y: 240, radius: 34 },
      { x: 560, y: 560, radius: 34 },
    ];
    const pointers = [{ x: 208, y: 204 }, { x: 560, y: 220 }, { x: 40, y: 90 }];
    const first = nextBubblePosition(view, bubbles, 0, 17, pointers);
    const second = nextBubblePosition(view, bubbles, 0, 18, pointers);
    const stable = nextBubblePosition(view, bubbles, 0, 17, pointers);

    expect(Math.hypot(first.x - bubbles[0].x, first.y - bubbles[0].y)).toBeGreaterThan(0);
    expect(Math.hypot(second.x - bubbles[0].x, second.y - bubbles[0].y)).toBeGreaterThan(0);
    expect(first).not.toEqual(second);
    expect(stable).toEqual(first);

    for (const neighbor of bubbles.slice(1)) {
      expect(separation(first, neighbor)).toBeGreaterThan(
        bubbles[0].radius + neighbor.radius + 18 - 1e-6,
      );
      expect(separation(second, neighbor)).toBeGreaterThan(
        bubbles[0].radius + neighbor.radius + 18 - 1e-6,
      );
    }
    for (const p of pointers) {
      expect(separation(first, p)).toBeGreaterThan(bubbles[0].radius + 16 - 1e-6);
      expect(separation(second, p)).toBeGreaterThan(bubbles[0].radius + 16 - 1e-6);
    }
  });

  it("snapshot restores safe bubble positions and preserved non-overlap", () => {
    const view = { width: 810, height: 972 };
    const scene = bubbleFixture({}, undefined, view);
    const original = scene.debug().bubbles[0];

    scene.pointerDown(pointer(1, original.x - original.radius - 28, original.y, 0));
    scene.pointerMove(pointer(1, original.x + original.radius + 28, original.y, 20));
    scene.pointerEnd(1);

    for (let i = 0; i < 80; i++) {
      scene.update(0.05);
    }
    expect(scene.debug().bubbles[0].state).toBe("ready");

    const restored = bubbleFixture({}, scene.snapshot());
    const restoredState = restored.debug();
    expect(restoredState.bubbles).toHaveLength(3);
    expect(restoredState.contacts).toBe(0);
    expect(restoredState.bubbles[0].state).toBe("ready");

    for (const bubble of restoredState.bubbles) {
      expect(bubble.x - bubble.radius).toBeGreaterThanOrEqual(24);
      expect(bubble.x + bubble.radius).toBeLessThanOrEqual(view.width - 24);
      expect(bubble.y - bubble.radius).toBeGreaterThanOrEqual(24);
      expect(bubble.y + bubble.radius).toBeLessThanOrEqual(view.height - 24);
    }
    for (let i = 0; i < restoredState.bubbles.length; i++) {
      for (let j = i + 1; j < restoredState.bubbles.length; j++) {
        const a = restoredState.bubbles[i];
        const b = restoredState.bubbles[j];
        expect(separation(a, b)).toBeGreaterThanOrEqual(
          a.radius + b.radius + 16 - 1e-6,
        );
      }
    }
  });
});
