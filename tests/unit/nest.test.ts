import { describe, expect, it, vi } from "vitest";
import { defaults } from "../../src/core/settings";
import type { SettingsV1, ToyPointer, View } from "../../src/core/types";
import { NestScene } from "../../src/toys/nest/scene";
import {
  acceptsDrop,
  DROP_TOLERANCE,
  GRAB_MARGIN,
  nestLayout,
} from "../../src/toys/nest/geometry";

const pointer = (id: number, x: number, y: number): ToyPointer => ({
  id,
  x,
  y,
  previousX: x,
  previousY: y,
  timeMs: 0,
});
function fixture(
  settings: Partial<SettingsV1> = {},
  snapshot?: unknown,
  view: View = { width: 810, height: 970 },
) {
  const sound = vi.fn();
  const service = { settings: { ...defaults, ...settings }, sound };
  const scene = new NestScene(service, snapshot);
  scene.resize(view);
  return { scene, sound, service };
}
function settle(scene: NestScene) {
  for (let i = 0; i < 100; i++) scene.update(1 / 60);
}
function nestBall(scene: NestScene, id: number, pointerId: number) {
  const state = scene.debug();
  const ball = state.balls[id];
  scene.pointerDown(pointer(pointerId, ball.x, ball.y));
  scene.pointerMove(
    pointer(pointerId, state.slots[id]?.x ?? state.opening.x, state.opening.y),
  );
  scene.pointerEnd(pointerId, "up");
  settle(scene);
}

describe("Roll & Nest", () => {
  it("T15: generous pickup preserves the offset and follows beyond the original bounds", () => {
    const { scene } = fixture();
    const {
      balls: [initial],
      radius,
    } = scene.debug();
    scene.pointerDown(
      pointer(1, initial.x + radius + GRAB_MARGIN - 1, initial.y),
    );
    expect(scene.debug().balls[0]).toMatchObject({
      x: initial.x,
      y: initial.y,
      owner: 1,
    });
    scene.pointerMove(
      pointer(1, initial.x + radius + GRAB_MARGIN + 120, initial.y + 80),
    );
    expect(scene.debug().balls[0].x).toBeCloseTo(initial.x + 121);
    expect(scene.debug().balls[0].y).toBe(initial.y + 80);
  });
  it("T16: ellipse exterior tolerance has explicit inside/outside acceptance", () => {
    const { opening } = nestLayout({ width: 810, height: 970 }, 1);
    expect(
      acceptsDrop(
        { x: opening.x + opening.rx + DROP_TOLERANCE - 0.001, y: opening.y },
        opening,
      ),
    ).toBe(true);
    expect(
      acceptsDrop(
        { x: opening.x + opening.rx + DROP_TOLERANCE + 0.001, y: opening.y },
        opening,
      ),
    ).toBe(false);
    expect(
      acceptsDrop(
        { x: opening.x, y: opening.y - opening.ry - DROP_TOLERANCE - 0.001 },
        opening,
      ),
    ).toBe(false);
  });
  it("T16: no snapping while held; outside release remains at its released position", () => {
    const { scene, sound } = fixture();
    const {
      balls: [ball],
      opening,
    } = scene.debug();
    scene.pointerDown(pointer(1, ball.x, ball.y));
    scene.pointerMove(pointer(1, opening.x + 15, opening.y));
    scene.update(1);
    expect(scene.debug().balls[0]).toMatchObject({
      x: opening.x + 15,
      y: opening.y,
      slot: null,
      target: null,
      owner: 1,
    });
    scene.pointerMove(pointer(1, 130, 150));
    scene.pointerEnd(1, "up");
    settle(scene);
    expect(scene.debug().balls[0]).toMatchObject({
      x: 130,
      y: 150,
      slot: null,
      owner: null,
    });
    expect(sound).not.toHaveBeenCalled();
  });
  it("T16: valid release starts a finite monotonic settle and one local response", () => {
    const { scene, sound } = fixture();
    const {
      balls: [ball],
      opening,
      slots: [target],
    } = scene.debug();
    scene.pointerDown(pointer(1, ball.x, ball.y));
    scene.pointerMove(pointer(1, opening.x + 90, opening.y));
    scene.pointerEnd(1, "up");
    expect(scene.debug().balls[0]).toMatchObject({
      x: opening.x + 90,
      y: opening.y,
      slot: 0,
      target,
    });
    let last = Infinity;
    for (let i = 0; i < 70; i++) {
      scene.update(i === 0 ? 3600 : 1 / 60);
      const current = scene.debug().balls[0];
      const distance = Math.hypot(current.x - target.x, current.y - target.y);
      expect(distance).toBeLessThanOrEqual(last);
      expect(current.x).toBeGreaterThanOrEqual(target.x);
      expect(current.y).toBeGreaterThanOrEqual(target.y);
      last = distance;
    }
    expect(scene.debug().balls[0]).toMatchObject({
      x: target.x,
      y: target.y,
      target: null,
    });
    expect(sound).toHaveBeenCalledTimes(1);
    expect(scene.update(1 / 60)).toBe(false);
  });
  it("T17: two balls nest in separate slots and can be independently retrieved", () => {
    const { scene } = fixture({ ballCount: 2 });
    nestBall(scene, 0, 1);
    nestBall(scene, 1, 2);
    const { balls, radius } = scene.debug();
    expect(balls.map((ball) => ball.slot).sort()).toEqual([0, 1]);
    expect(
      Math.hypot(balls[0].x - balls[1].x, balls[0].y - balls[1].y),
    ).toBeGreaterThan(2 * radius);
    scene.pointerDown(pointer(10, balls[0].x, balls[0].y));
    scene.pointerDown(pointer(11, balls[1].x, balls[1].y));
    scene.pointerMove(pointer(10, 150, 200));
    scene.pointerMove(pointer(11, 550, 200));
    expect(scene.debug().balls.map((ball) => ball.owner)).toEqual([10, 11]);
    scene.pointerEnd(10, "up");
    expect(scene.debug().balls[1].owner).toBe(11);
    scene.pointerEnd(11, "up");
    expect(scene.debug().balls.map((ball) => ball.slot)).toEqual([null, null]);
  });
  it("T18: first claim cannot be stolen and another free ball remains available", () => {
    const { scene } = fixture({ ballCount: 2 });
    const [a, b] = scene.debug().balls;
    scene.pointerDown(pointer(1, a.x, a.y));
    scene.pointerDown(pointer(2, a.x, a.y));
    scene.pointerDown(pointer(3, b.x, b.y));
    scene.pointerMove(pointer(2, a.x + 50, a.y + 50));
    expect(scene.debug().balls[0]).toMatchObject({ x: a.x, y: a.y, owner: 1 });
    expect(scene.debug().balls[1].owner).toBe(3);
    scene.pointerEnd(1, "cancel");
    scene.pointerEnd(1, "cancel");
    expect(scene.debug().balls[1].owner).toBe(3);
  });
  it("T19: tap selection has no timeout, can cancel, and places without a drag", () => {
    const { scene } = fixture({ ballControl: "tap-place", ballCount: 2 });
    const [a, b] = scene.debug().balls;
    scene.pointerDown(pointer(1, a.x, a.y));
    scene.pointerEnd(1, "up");
    settle(scene);
    expect(scene.debug().selected).toBe(0);
    scene.pointerDown(pointer(2, a.x, a.y));
    expect(scene.debug().selected).toBeNull();
    scene.pointerDown(pointer(3, a.x, a.y));
    scene.pointerDown(pointer(4, b.x, b.y));
    expect(scene.debug().selected).toBe(1);
    scene.pointerDown(pointer(5, 150, 150));
    expect(scene.debug().selected).toBeNull();
    expect(scene.debug().balls[1]).toMatchObject({
      x: 150,
      y: 150,
      owner: null,
    });
    scene.pointerDown(pointer(6, 150, 150));
    const bowl = scene.debug().opening;
    scene.pointerDown(pointer(7, bowl.x, bowl.y));
    settle(scene);
    expect(scene.debug().balls[1].slot).not.toBeNull();
  });
  it("T06: cancellation and resize release ownership, clamp balls, and cannot produce a drop sound", () => {
    const { scene, sound } = fixture({ ballCount: 2 });
    const [a, b] = scene.debug().balls;
    scene.pointerDown(pointer(1, a.x, a.y));
    scene.pointerDown(pointer(2, b.x, b.y));
    scene.pointerMove(pointer(1, 10000, -10000));
    scene.resize({ width: 360, height: 540 });
    scene.pointerMove(pointer(2, 900, 900));
    expect(scene.debug().owners).toBe(0);
    expect(sound).not.toHaveBeenCalled();
    for (const ball of scene.debug().balls) {
      expect(ball.x - scene.debug().radius).toBeGreaterThanOrEqual(24);
      expect(ball.x + scene.debug().radius).toBeLessThanOrEqual(336);
      expect(ball.y - scene.debug().radius).toBeGreaterThanOrEqual(24);
      expect(ball.y + scene.debug().radius).toBeLessThanOrEqual(516);
    }
  });
  it("N06: released overlap separates the released ball without moving a held neighbour", () => {
    const { scene } = fixture({ ballCount: 2 });
    const [a, b] = scene.debug().balls;
    scene.pointerDown(pointer(1, a.x, a.y));
    scene.pointerDown(pointer(2, b.x, b.y));
    scene.pointerMove(pointer(1, 350, 200));
    scene.pointerMove(pointer(2, 350, 200));
    scene.pointerEnd(2, "up");
    const state = scene.debug();
    expect(state.balls[0]).toMatchObject({ x: 350, y: 200, owner: 1 });
    expect(
      Math.hypot(state.balls[1].x - 350, state.balls[1].y - 200),
    ).toBeGreaterThanOrEqual(state.radius * 2);
  });
  it("T06/N06: pausing with two overlapping held balls cannot leave one permanently covered", () => {
    const { scene } = fixture({ ballCount: 2 });
    const [a, b] = scene.debug().balls;
    scene.pointerDown(pointer(1, a.x, a.y));
    scene.pointerDown(pointer(2, b.x, b.y));
    scene.pointerMove(pointer(1, 350, 200));
    scene.pointerMove(pointer(2, 350, 200));
    scene.cancelAll();
    const state = scene.debug();
    expect(state.owners).toBe(0);
    expect(
      Math.hypot(
        state.balls[0].x - state.balls[1].x,
        state.balls[0].y - state.balls[1].y,
      ),
    ).toBeGreaterThanOrEqual(state.radius * 2);
  });
  it("T17/U08: settled snapshot restored after an off-screen rotation aligns with the new bowl slots", () => {
    const { scene } = fixture({ ballCount: 2 });
    nestBall(scene, 0, 1);
    nestBall(scene, 1, 2);
    const restored = fixture({ ballCount: 2 }, scene.snapshot(), {
      width: 1080,
      height: 702,
    }).scene;
    const state = restored.debug();
    for (const ball of state.balls) {
      expect(ball.slot).not.toBeNull();
      expect({ x: ball.x, y: ball.y }).toEqual(state.slots[ball.slot!]);
    }
    expect(state.owners).toBe(0);
  });
  it("T32: invalid snapshots stay finite and object counts follow the explicit setting", () => {
    for (const input of [
      null,
      { balls: [{ x: NaN, y: Infinity, slot: 0, settling: true }] },
      { balls: Array(5).fill({ x: 0.5, y: 0.5, slot: 0, settling: false }) },
      { balls: [{ x: 0.5, y: 0.5, slot: 8, settling: false }] },
    ]) {
      const { scene } = fixture({ ballCount: 2 }, input);
      const state = scene.debug();
      expect(state.balls).toHaveLength(2);
      for (const ball of state.balls)
        expect(Number.isFinite(ball.x) && Number.isFinite(ball.y)).toBe(true);
      scene.dispose();
      expect(scene.debug().balls).toHaveLength(0);
      expect(scene.debug().owners).toBe(0);
    }
  });
  it("U02/U03: iPad targets are large, the opening fits two balls, and nested balls remain mostly above the rim", () => {
    for (const view of [
      { width: 810, height: 972 },
      { width: 1080, height: 702 },
    ]) {
      const { radius, opening, slots } = nestLayout(view, 2);
      expect(radius * 2).toBeGreaterThanOrEqual(112);
      expect(opening.rx * 2).toBeGreaterThanOrEqual(radius * 5);
      expect(opening.x - opening.rx).toBeGreaterThanOrEqual(24);
      expect(opening.x + opening.rx).toBeLessThanOrEqual(view.width - 24);
      for (const slot of slots) expect(slot.y).toBeLessThan(opening.y);
    }
  });
});
