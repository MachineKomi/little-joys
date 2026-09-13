import { describe, expect, it, vi } from "vitest";
import { defaults } from "../../src/core/settings";
import type { ToyPointer } from "../../src/core/types";
import {
  ANCHORS,
  displace,
  radiusAt,
  restRadius,
} from "../../src/toys/squishy/deformation";
import { SquishyScene } from "../../src/toys/squishy/scene";

const point = (id: number, x: number, y: number): ToyPointer => ({
  id,
  x,
  y,
  previousX: x,
  previousY: y,
  timeMs: 0,
});
function fixture() {
  const sound = vi.fn();
  const scene = new SquishyScene({ settings: { ...defaults }, sound });
  scene.resize({ width: 810, height: 960 });
  const { x, y, radius } = scene.debug();
  return {
    scene,
    sound,
    at: (id: number, px: number, py: number) =>
      point(id, x + px * radius, y + py * radius),
  };
}
function distanceFromRest(scene: SquishyScene) {
  return scene
    .debug()
    .radii.reduce(
      (sum, radius, i) =>
        sum + Math.abs(radius - restRadius((i * Math.PI * 2) / ANCHORS)),
      0,
    );
}

describe("Squishy Friend local contact mechanics", () => {
  it("T08: one-sided drag changes the touched side more than the opposite side", () => {
    const { scene, at } = fixture();
    scene.pointerDown(at(1, 0.8, 0));
    scene.pointerMove(at(1, 1.3, 0));
    scene.update(1 / 60);
    const radii = scene.debug().radii;
    const near = Math.abs(radii[0] - restRadius(0));
    const far = Math.abs(radii[ANCHORS / 2] - restRadius(Math.PI));
    expect(near).toBeGreaterThan(0.1);
    expect(far).toBeLessThan(near / 10);
  });

  it("T02: two separated grabs remain independent when the first is released", () => {
    const { scene, at } = fixture();
    scene.pointerDown(at(1, -0.8, 0));
    scene.pointerDown(at(2, 0.8, 0));
    scene.pointerMove(at(1, -1.2, 0));
    scene.pointerMove(at(2, 1.2, 0));
    scene.update(1 / 60);
    expect(scene.debug().grabs).toBe(2);
    scene.pointerEnd(1);
    scene.update(1 / 60);
    expect(scene.debug().grabs).toBe(1);
    scene.pointerMove(at(2, 1.15, 0.15));
    scene.update(1 / 60);
    expect(scene.debug().radii[0]).toBeGreaterThan(restRadius(0) + 0.15);
  });

  it("T04: empty-space contact does not own the creature or block another grab", () => {
    const { scene, at } = fixture();
    scene.pointerDown(at(1, -1.5, -1.5));
    expect(scene.debug().grabs).toBe(0);
    scene.pointerDown(at(2, 0.6, 0));
    scene.pointerMove(at(2, 1, 0));
    scene.update(1 / 60);
    expect(scene.debug().grabs).toBe(1);
    expect(distanceFromRest(scene)).toBeGreaterThan(0.1);
  });

  it("T05: repeated release/cancel is harmless and does not clear another grab", () => {
    const { scene, at } = fixture();
    scene.pointerDown(at(1, -0.6, 0));
    scene.pointerDown(at(2, 0.6, 0));
    scene.pointerEnd(1);
    scene.pointerEnd(1);
    expect(scene.debug().grabs).toBe(1);
    scene.cancelAll();
    scene.cancelAll();
    expect(scene.debug().grabs).toBe(0);
  });

  it("T06: resize cancels grabs and stale movements cannot move the resized body", () => {
    const { scene, at } = fixture();
    scene.pointerDown(at(1, 0.6, 0));
    scene.pointerMove(at(1, 1.1, 0));
    scene.update(1 / 60);
    scene.resize({ width: 1080, height: 690 });
    scene.pointerMove(point(1, 2000, 2000));
    expect(scene.debug()).toMatchObject({ grabs: 0, x: 540, y: 345 });
    expect(scene.debug().radii.every(Number.isFinite)).toBe(true);
  });

  it("T09: four opposing extreme drags remain finite, positive and within play bounds", () => {
    const { scene, at } = fixture();
    const directions = [
      [0.8, 0],
      [0, 0.8],
      [-0.8, 0],
      [0, -0.8],
    ];
    directions.forEach(([x, y], i) => scene.pointerDown(at(i + 1, x, y)));
    directions.forEach(([x, y], i) =>
      scene.pointerMove(at(i + 1, x * 10000, y * 10000)),
    );
    for (let n = 0; n < 30; n++) scene.update(n === 0 ? 3600 : 1 / 60);
    const state = scene.debug();
    expect(state.grabs).toBe(4);
    state.radii.forEach((r, i) => {
      expect(Number.isFinite(r)).toBe(true);
      expect(r).toBeGreaterThan(0.5);
      expect(
        Math.abs(r - restRadius((i * Math.PI * 2) / ANCHORS)),
      ).toBeLessThanOrEqual(0.3000001);
      const a = (i * Math.PI * 2) / ANCHORS;
      expect(state.x + Math.cos(a) * r * state.radius).toBeGreaterThanOrEqual(
        24,
      );
      expect(state.x + Math.cos(a) * r * state.radius).toBeLessThanOrEqual(
        810 - 24,
      );
      expect(state.y + Math.sin(a) * r * state.radius).toBeGreaterThanOrEqual(
        24,
      );
      expect(state.y + Math.sin(a) * r * state.radius).toBeLessThanOrEqual(
        960 - 24,
      );
    });
  });

  it("T09: Gentle return converges without overshoot even after a long resumed delta", () => {
    const { scene, at } = fixture();
    scene.pointerDown(at(1, 0.8, 0));
    scene.pointerMove(at(1, 1.4, 0));
    scene.update(1 / 60);
    const signs = scene
      .debug()
      .radii.map((r, i) =>
        Math.sign(r - restRadius((i * Math.PI * 2) / ANCHORS)),
      );
    scene.pointerEnd(1);
    let last = distanceFromRest(scene);
    for (let step = 0; step < 100; step++) {
      scene.update(step === 0 ? 3600 : 1 / 60);
      const current = distanceFromRest(scene);
      expect(current).toBeLessThanOrEqual(last + 1e-12);
      scene
        .debug()
        .radii.forEach((r, i) =>
          expect(
            (r - restRadius((i * Math.PI * 2) / ANCHORS)) * signs[i],
          ).toBeGreaterThanOrEqual(-1e-12),
        );
      last = current;
    }
    expect(last).toBeLessThan(0.001);
    expect(scene.update(1 / 60)).toBe(false);
  });

  it("T09/T32: repeated taps bound feedback and remain responsive", () => {
    const { scene, at, sound } = fixture();
    for (let n = 0; n < 250; n++) {
      scene.pointerDown(at(n, 0.2, 0.1));
      scene.pointerEnd(n);
    }
    expect(sound).toHaveBeenCalledTimes(250);
    expect(scene.debug().effects).toBeLessThanOrEqual(24);
    scene.pointerDown(at(999, -0.4, 0));
    scene.pointerMove(at(999, -0.8, 0));
    scene.update(1 / 60);
    expect(scene.debug().grabs).toBe(1);
    expect(scene.debug().radii.every(Number.isFinite)).toBe(true);
    scene.dispose();
    expect(scene.debug()).toMatchObject({ grabs: 0, effects: 0 });
  });

  it("T09: malformed scene snapshots cannot introduce invalid contour geometry", () => {
    for (const snapshot of [
      null,
      { radii: [NaN] },
      { radii: Array(ANCHORS).fill(Infinity) },
      { radii: Array(ANCHORS).fill(-2) },
    ]) {
      const scene = new SquishyScene(
        { settings: { ...defaults }, sound: () => {} },
        snapshot,
      );
      expect(
        scene.debug().radii.every((r) => Number.isFinite(r) && r > 0.5),
      ).toBe(true);
    }
  });

  it("T08/T09: deformed face features respond locally and stay bounded", () => {
    const grabs = [{ id: 1, x: -0.3, y: -0.1, dx: -0.35, dy: 0.1 }];
    const near = displace(-0.28, -0.1, grabs);
    const far = displace(0.28, -0.1, grabs);
    expect(Math.hypot(near.x + 0.28, near.y + 0.1)).toBeLessThanOrEqual(
      0.300001,
    );
    expect(Math.hypot(far.x - 0.28, far.y + 0.1)).toBeLessThan(
      Math.hypot(near.x + 0.28, near.y + 0.1),
    );
    for (let i = 0; i < ANCHORS; i++)
      expect(radiusAt((i * Math.PI * 2) / ANCHORS, grabs)).toBeGreaterThan(0.5);
  });
});
