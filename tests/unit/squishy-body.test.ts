import { describe, expect, it } from "vitest";
import {
  BodyMotion,
  FLIGHT_SECONDS,
  MAX_LAUNCH_SPEED,
  MAX_SQUASH,
  MAX_SWAY,
  MAX_TILT,
  RESPONSE_LIMIT_SECONDS,
  apply,
  bodyMatrix,
  invert,
  type BodyLimits,
} from "../../src/toys/squishy/body";

// Portrait-like room for the body centre: about 140px each side, 220px up/down.
const limits: BodyLimits = { left: -140, right: 140, top: -220, bottom: 220 };
function bounded(body: BodyMotion, room = limits) {
  expect(body.x).toBeGreaterThanOrEqual(Math.min(room.left, 0) - 1e-9);
  expect(body.x).toBeLessThanOrEqual(Math.max(room.right, 0) + 1e-9);
  expect(body.y).toBeGreaterThanOrEqual(Math.min(room.top, 0) - 1e-9);
  expect(body.y).toBeLessThanOrEqual(Math.max(room.bottom, 0) + 1e-9);
  expect(Math.abs(body.tilt)).toBeLessThanOrEqual(MAX_TILT + 1e-12);
  expect(Math.abs(body.sway)).toBeLessThanOrEqual(MAX_SWAY + 1e-12);
  expect(Math.abs(body.squash)).toBeLessThanOrEqual(MAX_SQUASH + 1e-12);
  for (const value of [body.x, body.y, body.vx, body.vy, body.tilt, body.sway, body.squash])
    expect(Number.isFinite(value)).toBe(true);
}
function toRest(body: BodyMotion, room = limits, dt = 1 / 60) {
  let seconds = 0;
  while (body.step(dt, room)) {
    seconds += dt;
    bounded(body, room);
    expect(seconds).toBeLessThan(RESPONSE_LIMIT_SECONDS);
  }
  return seconds;
}

describe("Squishy Friend whole-body Playful response", () => {
  it("a strong stretch launches the body the opposite way, bounces off the near edge with a squash, and ends at exact rest in time", () => {
    const body = new BodyMotion();
    body.launch(258, 0);
    expect(body.vx).toBeLessThan(-1000);
    expect(body.vy).toBeLessThan(0);
    let nearest = 0,
      squash = 0,
      sway = 0,
      seconds = 0;
    while (body.step(1 / 60, limits)) {
      seconds += 1 / 60;
      bounded(body);
      nearest = Math.min(nearest, body.x);
      squash = Math.max(squash, Math.abs(body.squash));
      sway = Math.max(sway, Math.abs(body.sway));
      expect(seconds).toBeLessThan(RESPONSE_LIMIT_SECONDS);
    }
    // Frames sample after the bounce, so allow a few pixels of travel back.
    expect(nearest).toBeLessThan(limits.left + 6);
    expect(body.bounces).toBeGreaterThanOrEqual(1);
    expect(squash).toBeGreaterThan(0.08);
    expect(sway).toBeGreaterThan(0.03);
    expect(seconds).toBeGreaterThan(0.8);
    expect(body).toMatchObject({ x: 0, y: 0, tilt: 0, sway: 0, squash: 0, mode: "rest" });
    expect(body.step(1 / 60, limits)).toBe(false);
  });

  it("a downward stretch launches upward into the top edge; speed is capped and non-finite input is ignored", () => {
    const body = new BodyMotion();
    const room: BodyLimits = { ...limits, top: -170 };
    body.launch(0, 10_000);
    expect(Math.hypot(body.vx, body.vy)).toBeCloseTo(MAX_LAUNCH_SPEED, 6);
    expect(body.vy).toBeLessThan(0);
    let highest = 0;
    while (body.step(1 / 60, room)) {
      bounded(body, room);
      highest = Math.min(highest, body.y);
    }
    expect(highest).toBeLessThan(room.top + 6);
    expect(body.bounces).toBeGreaterThanOrEqual(1);
    const untouched = new BodyMotion();
    untouched.launch(NaN, 4);
    untouched.launch(Infinity, 0);
    expect(untouched.mode).toBe("rest");
    expect(untouched.step(1 / 60, limits)).toBe(false);
  });

  it("a small pull only wobbles near home without reaching an edge", () => {
    const body = new BodyMotion();
    body.launch(24, 0);
    let farthest = 0;
    while (body.step(1 / 60, limits)) farthest = Math.max(farthest, Math.abs(body.x));
    expect(body.bounces).toBe(0);
    expect(farthest).toBeGreaterThan(5);
    expect(farthest).toBeLessThan(80);
  });

  it("hold stops travel at once, relaxes the pose in place, then reports no motion; a poke springs it home", () => {
    const body = new BodyMotion();
    body.launch(258, 0);
    for (let i = 0; i < 6; i++) body.step(1 / 60, limits);
    body.hold();
    const caught = { x: body.x, y: body.y };
    let pose = Math.abs(body.tilt) + Math.abs(body.sway) + Math.abs(body.squash);
    expect(pose).toBeGreaterThan(0);
    let frames = 0;
    while (body.step(1 / 60, limits)) {
      frames++;
      expect(frames).toBeLessThan(120);
      expect({ x: body.x, y: body.y }).toEqual(caught);
      const next = Math.abs(body.tilt) + Math.abs(body.sway) + Math.abs(body.squash);
      expect(next).toBeLessThanOrEqual(pose + 1e-12);
      pose = next;
    }
    // A still hold: an exactly relaxed pose and no motion, so the scheduler can sleep.
    expect(body).toMatchObject({ mode: "held", tilt: 0, sway: 0, squash: 0 });
    expect(body.stillHeld).toBe(true);
    expect({ x: body.x, y: body.y }).toEqual(caught);
    expect(body.step(1 / 60, limits)).toBe(false);
    body.poke(0, -1);
    expect(body.mode).toBe("flying");
    toRest(body);
    expect(body).toMatchObject({ x: 0, y: 0, mode: "rest" });
  });

  it("held and settling bodies stay inside pose-dependent room, which only ever moves them toward home", () => {
    const body = new BodyMotion();
    body.launch(-300, 0);
    for (let i = 0; i < 12; i++) body.step(1 / 60, limits);
    expect(body.x).toBeGreaterThan(30);
    body.hold();
    body.step(1 / 60, () => ({ left: -140, right: 20, top: -220, bottom: 220 }));
    expect(body.x).toBeLessThanOrEqual(20);
    body.settle();
    let previous = Math.abs(body.x);
    while (body.step(1 / 60, () => ({ left: -140, right: 10, top: -220, bottom: 220 }))) {
      expect(Math.abs(body.x)).toBeLessThanOrEqual(previous + 1e-12);
      previous = Math.abs(body.x);
    }
    expect(body.mode).toBe("rest");
  });

  it("settle never overshoots: position and pose decay monotonically to exact rest", () => {
    const body = new BodyMotion();
    body.launch(-200, -120);
    for (let i = 0; i < 9; i++) body.step(1 / 60, limits);
    body.settle();
    const signX = Math.sign(body.x),
      signY = Math.sign(body.y);
    let distance = Math.hypot(body.x, body.y);
    let seconds = 0;
    while (body.step(1 / 60, limits)) {
      seconds += 1 / 60;
      const next = Math.hypot(body.x, body.y);
      expect(next).toBeLessThanOrEqual(distance + 1e-12);
      if (body.x) expect(Math.sign(body.x)).toBe(signX);
      if (body.y) expect(Math.sign(body.y)).toBe(signY);
      distance = next;
    }
    expect(seconds).toBeLessThan(1);
    expect(body).toMatchObject({ x: 0, y: 0, mode: "rest" });
  });

  it("pokes squash along the tap axis; rapid repetition stays bounded and never queues", () => {
    const body = new BodyMotion();
    for (let i = 0; i < 60; i++) {
      body.poke(i % 2 ? 1 : -1, 0.3);
      body.step(1 / 60, limits);
      bounded(body);
    }
    expect(body.x).toBe(0);
    toRest(body);
    expect(body.mode).toBe("rest");
  });

  it("each flight hands over to a quiet settle by its time limit, even pinned without room", () => {
    const body = new BodyMotion();
    const none: BodyLimits = { left: 10, right: -10, top: 10, bottom: -10 };
    body.launch(258, 258);
    let seconds = 0;
    while (body.step(1 / 60, none)) {
      seconds += 1 / 60;
      expect(body.x).toBe(0);
      expect(body.y).toBe(0);
    }
    expect(seconds).toBeLessThan(RESPONSE_LIMIT_SECONDS);
    expect(seconds).toBeGreaterThan(0.1);
    expect(FLIGHT_SECONDS).toBeLessThan(RESPONSE_LIMIT_SECONDS);
  });

  it("catch-up is capped: an hour-long delta advances no more than 50ms", () => {
    const a = new BodyMotion(),
      b = new BodyMotion();
    a.launch(200, 0);
    b.launch(200, 0);
    a.step(3600, limits);
    b.step(0.05, limits);
    expect({ ...a }).toEqual({ ...b });
    const before = { ...a };
    a.step(NaN, limits);
    a.step(-1, limits);
    expect({ ...a }).toEqual(before);
  });

  it("the body matrix is a translation at rest, inverts exactly, and pivots lean and sway at the feet", () => {
    const body = new BodyMotion();
    expect(bodyMatrix(body, 400, 500, 200)).toEqual([1, 0, 0, 1, 400, 500]);
    body.tilt = 0.06;
    const lean = bodyMatrix(body, 400, 500, 200);
    const feet = apply(lean, 0, 200);
    expect(feet.x).toBeCloseTo(400, 9);
    expect(feet.y).toBeCloseTo(700, 9);
    body.tilt = 0;
    body.sway = 0.1;
    const sway = bodyMatrix(body, 400, 500, 200);
    expect(apply(sway, 30, 200)).toEqual({ x: 430, y: 700 });
    expect(apply(sway, 0, -200).x).toBeCloseTo(400 + 0.1 * 400, 9);
    body.sway = 0;
    body.squash = 0.2;
    body.squashAngle = 0;
    body.squashAnchorX = -1;
    const squash = bodyMatrix(body, 400, 500, 200);
    const anchor = apply(squash, -200, 0);
    expect(anchor.x).toBeCloseTo(200, 9);
    expect(anchor.y).toBeCloseTo(500, 9);
    expect(apply(squash, 200, 0).x).toBeCloseTo(200 + 400 * 0.8, 9);
    Object.assign(body, { tilt: -0.05, sway: 0.08, squash: 0.15, squashAngle: 1.1, squashAnchorX: 0.3, squashAnchorY: 0.9, x: 40, y: -25 });
    const combined = bodyMatrix(body, 400, 500, 200),
      inverse = invert(combined);
    for (const [x, y] of [[0, 0], [150, -90], [-210, 180], [33, 205]]) {
      const back = apply(inverse, apply(combined, x, y).x, apply(combined, x, y).y);
      expect(back.x).toBeCloseTo(x, 9);
      expect(back.y).toBeCloseTo(y, 9);
    }
  });
});
