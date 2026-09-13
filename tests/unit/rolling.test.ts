import { describe, expect, it } from "vitest";
import { rollStep, type RollingBody } from "../../src/toys/nest/rolling";

describe("bounded rolling step", () => {
  it("keeps bounded, finite state through extreme and corrupt inputs", () => {
    const bodies: RollingBody[] = [
      {
        x: Infinity,
        y: Infinity,
        vx: 5_000,
        vy: -3_000,
        angle: 0,
        fixed: false,
      },
      {
        x: -1_000,
        y: 1_000,
        vx: -2_000,
        vy: 2_000,
        angle: 0.1,
        fixed: false,
      },
      { x: NaN, y: 10, vx: 10, vy: -10, angle: 0.2, fixed: true },
    ];

    const active = rollStep(bodies, { width: 120, height: 120 }, 200, 10);

    expect(active).toBe(false);
    for (let i = 0; i < 2; i++) {
      expect(Number.isFinite(bodies[i].x)).toBe(true);
      expect(Number.isFinite(bodies[i].y)).toBe(true);
      expect(Number.isFinite(bodies[i].vx)).toBe(true);
      expect(Number.isFinite(bodies[i].vy)).toBe(true);
      expect(Number.isFinite(bodies[i].angle)).toBe(true);
      expect(bodies[i].x).toBeGreaterThanOrEqual(60);
      expect(bodies[i].x).toBeLessThanOrEqual(60);
      expect(bodies[i].y).toBeGreaterThanOrEqual(60);
      expect(bodies[i].y).toBeLessThanOrEqual(60);
    }
  });

  it("eventually sleeps below 7px/s within 4 seconds of clamped simulation", () => {
    const bodies: RollingBody[] = [
      { x: 70, y: 70, vx: 700, vy: 700, angle: 0 },
    ];
    let still = false;
    for (let i = 0; i < 121; i++) {
      still = rollStep(bodies, { width: 300, height: 300 }, 12, 1);
      if (!still) break;
    }
    expect(still).toBe(false);
    expect(Math.abs(bodies[0].vx)).toBeLessThanOrEqual(7);
    expect(Math.abs(bodies[0].vy)).toBeLessThanOrEqual(7);
    expect(bodies[0].vx).toBe(0);
    expect(bodies[0].vy).toBe(0);
  });

  it("reverses edge velocity on soft reflection with restitution", () => {
    const bodies: RollingBody[] = [
      { x: 276, y: 150, vx: 500, vy: 0, angle: 0 },
    ];
    const active = rollStep(bodies, { width: 300, height: 300 }, 2, 1 / 60);
    expect(active).toBe(true);
    expect(bodies[0].x).toBeLessThanOrEqual(274);
    expect(bodies[0].vx).toBeLessThan(0);
  });

  it("steps deterministically from the same seed state", () => {
    const first: RollingBody[] = [
      { x: 80, y: 90, vx: 120, vy: -85, angle: 0.15 },
      { x: 240, y: 150, vx: -90, vy: 30, angle: 1.2 },
    ];
    const second: RollingBody[] = structuredClone(first);

    for (let i = 0; i < 40; i++) {
      rollStep(first, { width: 320, height: 360 }, 10, 1 / 30);
      rollStep(second, { width: 320, height: 360 }, 10, 1 / 30);
    }
    expect(first).toEqual(second);
  });

  it("does not mutate invalid fixed bodies and does not treat them as collision solids", () => {
    const fixed: RollingBody = {
      x: Number.NaN,
      y: Number.NaN,
      vx: Number.POSITIVE_INFINITY,
      vy: Number.NEGATIVE_INFINITY,
      angle: Number.NaN,
      fixed: true,
    };
    const moving: RollingBody = { x: 160, y: 160, vx: 250, vy: 0, angle: 0 };
    const bodies = [fixed, moving];

    rollStep(bodies, { width: 500, height: 300 }, 12, 1 / 60);

    expect(Number.isNaN(fixed.x)).toBe(true);
    expect(Number.isNaN(fixed.y)).toBe(true);
    expect(fixed.vx).toBe(Number.POSITIVE_INFINITY);
    expect(fixed.vy).toBe(Number.NEGATIVE_INFINITY);
    expect(Number.isNaN(fixed.angle)).toBe(true);
    expect(moving.x).toBeGreaterThan(160);
    expect(moving.vx).toBeLessThan(250);
  });

  it("caps speed before displacement so displacement never uses unclipped velocity", () => {
    const bodies: RollingBody[] = [
      { x: 150, y: 150, vx: 10000, vy: 0, angle: 0 },
    ];
    rollStep(bodies, { width: 500, height: 300 }, 10, 1 / 30);

    expect(bodies[0].x).toBeGreaterThan(170);
    expect(bodies[0].x).toBeLessThan(180);
  });

  it("uses actual clamped x movement for angle and keeps angle bounded", () => {
    const body: RollingBody = { x: 375, y: 150, vx: 700, vy: 0, angle: 0 };
    rollStep([body], { width: 500, height: 300 }, 100, 1 / 120);
    expect(body.x).toBe(376);
    expect(body.angle).toBeCloseTo(0.01);
    expect(body.vx).toBeLessThan(0);
  });

  it("applies the same damping over equal elapsed time at 30 and 120 Hz", () => {
    const a: RollingBody = { x: 100, y: 100, vx: 300, vy: 0, angle: 0 };
    const b = { ...a };
    rollStep([a], { width: 800, height: 600 }, 20, 1 / 30);
    for (let i = 0; i < 4; i++)
      rollStep([b], { width: 800, height: 600 }, 20, 1 / 120);
    expect(a.vx).toBeCloseTo(b.vx, 8);
    expect(a.x).toBeCloseTo(b.x, 8);
  });

  it("separates coincident free bodies with deterministic direction", () => {
    const bodies: RollingBody[] = [
      { x: 200, y: 200, vx: 0, vy: 0, angle: 0 },
      { x: 200, y: 200, vx: 0, vy: 0, angle: 0 },
    ];
    rollStep(bodies, { width: 500, height: 500 }, 10, 1 / 60);

    const dx = bodies[1].x - bodies[0].x;
    const dy = bodies[1].y - bodies[0].y;
    expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(20);
    expect(dx).toBeGreaterThan(0);
    expect(Math.abs(dy)).toBeLessThan(1e-6);
  });

  it("separates a free body from fixed when centers coincide and room exists", () => {
    const fixed: RollingBody = {
      x: 200,
      y: 200,
      vx: 50,
      vy: -3,
      angle: 0.1,
      fixed: true,
    };
    const moving: RollingBody = { x: 200, y: 200, vx: 40, vy: 0, angle: 0 };
    const bodies = [fixed, moving];
    rollStep(bodies, { width: 500, height: 500 }, 10, 1 / 60);

    expect(moving.x).toBeGreaterThan(fixed.x);
    expect(Math.abs(moving.y - fixed.y)).toBeLessThan(1e-6);
    expect(moving.x - fixed.x).toBeGreaterThan(20);
  });

  it("uses true speed magnitude for sleep threshold", () => {
    const bodies: RollingBody[] = [
      { x: 150, y: 150, vx: 5.5, vy: 5.5, angle: 0 },
    ];
    const resting = rollStep(bodies, { width: 300, height: 300 }, 12, 1 / 120);

    expect(resting).toBe(true);
    expect(Math.hypot(bodies[0].vx, bodies[0].vy)).toBeGreaterThan(7);
  });

  it("sleeps collapsed axes in tiny views", () => {
    const bodies: RollingBody[] = [{ x: 5, y: 95, vx: 120, vy: -90, angle: 0 }];
    const active = rollStep(bodies, { width: 120, height: 120 }, 200, 1 / 60);

    expect(active).toBe(false);
    expect(bodies[0].x).toBe(60);
    expect(bodies[0].y).toBe(60);
    expect(bodies[0].vx).toBe(0);
    expect(bodies[0].vy).toBe(0);
  });

  it("keeps fixed-body state intact while transferring to a free body", () => {
    const fixed: RollingBody = {
      x: 150,
      y: 150,
      vx: 10,
      vy: -3,
      angle: 2,
      fixed: true,
    };
    const mover: RollingBody = { x: 130, y: 150, vx: 400, vy: 0, angle: 0 };
    const bodies = [fixed, mover];
    rollStep(bodies, { width: 360, height: 360 }, 12, 1 / 60);

    expect(bodies[0]).toMatchObject({
      x: 150,
      y: 150,
      vx: 10,
      vy: -3,
      angle: 2,
      fixed: true,
    });
    expect(bodies[1].vx).toBeLessThan(0);
  });

  it("transfers collision response for two moving circles", () => {
    const bodies: RollingBody[] = [
      { x: 100, y: 100, vx: 40, vy: 0, angle: 0 },
      { x: 117, y: 100, vx: -40, vy: 0, angle: 0 },
    ];
    rollStep(bodies, { width: 400, height: 300 }, 10, 1 / 60);
    expect(bodies[0].vx).toBeLessThan(0);
    expect(bodies[1].vx).toBeGreaterThan(0);
  });

  it("returns a safe no-motion result for zero, negative, and nonfinite dt", () => {
    const body: RollingBody = { x: 120, y: 120, vx: 200, vy: -120, angle: 0 };
    const original = structuredClone(body);

    expect(rollStep([body], { width: 400, height: 400 }, 8, 0)).toBe(false);
    expect(rollStep([body], { width: 400, height: 400 }, 8, -1)).toBe(false);
    expect(rollStep([body], { width: 400, height: 400 }, 8, Number.NaN)).toBe(
      false,
    );

    expect(body).toEqual(original);
  });

  it("processes only the first two bodies", () => {
    const untouched: RollingBody = {
      x: 123,
      y: 123,
      vx: 200,
      vy: 200,
      angle: 0.5,
    };
    const bodies: RollingBody[] = [
      { x: 50, y: 50, vx: 500, vy: 0, angle: 0 },
      { x: 200, y: 50, vx: -500, vy: 0, angle: 0 },
      untouched,
    ];
    rollStep(bodies, { width: 240, height: 240 }, 10, 1 / 30);
    expect(bodies[2]).toEqual(untouched);
  });
});
