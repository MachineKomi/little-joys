import { describe, expect, it, vi } from 'vitest';
import { BounceWorld, closestOnSegment, deflectorSegment, hitsDeflector, DEFLECTOR_ANGLES, DEFLECTOR_TARGET_RADIUS, FIXED_STEP, MAX_STEPS, type Ball } from '../../src/toys/bounce/physics';
import { BounceScene } from '../../src/toys/bounce/scene';
import type { SettingsV1, ToyPointer } from '../../src/core/types';

const defaults: SettingsV1 = { schemaVersion: 1, soundEnabled: false, sfxGain: .15, musicEnabled: false, musicGain: .08, motion: 'gentle', bubbleCount: 3, ballCount: 1, bounceBallCount: 16, ballControl: 'drag', startupToy: 'last', lastToy: 'squishy', diagnosticsEnabled: false };
const view = { width: 810, height: 972 };
const pointer = (id: number, x: number, y: number): ToyPointer => ({ id, x, y, previousX: x, previousY: y, timeMs: 0 });
const world = (cap: 8 | 16 | 24 = 16, motion: 'gentle' | 'playful' = 'gentle') => new BounceWorld(view, { cap, motion });
function scene(settings: Partial<SettingsV1> = {}) { const sound = vi.fn(); const value = new BounceScene({ settings: { ...defaults, ...settings }, sound }); value.resize(view); return { value, sound }; }
function inBounds(state: BounceWorld) {
  expect(state.balls.length).toBeLessThanOrEqual(state.options.cap);
  for (const ball of state.balls) {
    for (const number of [ball.x, ball.y, ball.vx, ball.vy, ball.stillTime]) expect(Number.isFinite(number)).toBe(true);
    expect(ball.x).toBeGreaterThanOrEqual(state.bounds.left + state.radius - .01); expect(ball.x).toBeLessThanOrEqual(state.bounds.right - state.radius + .01);
    expect(ball.y).toBeGreaterThanOrEqual(state.bounds.top + state.radius - .01); expect(ball.y).toBeLessThanOrEqual(state.bounds.bottom - state.radius + .01);
    expect(Math.hypot(ball.vx, ball.vy)).toBeLessThanOrEqual(state.maxSpeed + .0001);
  }
}

describe('Penguin Bounce deterministic physics P02–P11', () => {
  it('T36/P07: the first frame contains three stationary balls and sleeps until input', () => {
    const state = world(); expect(state.balls).toHaveLength(3); expect(state.step(1 / 60)).toBe(false);
    expect(state.debug()).toMatchObject({ activeBalls: 0, settledBalls: 3, deflectors: 2 });
  });
  it('T36: an ordinary pointer-down responds once, holding does not repeat, and another finger stays independent', () => {
    const { value } = scene(); const before = value.debug().balls;
    value.pointerDown(pointer(1, 120, 70)); expect(value.debug().balls).toBe(before + 1);
    value.pointerDown(pointer(1, 130, 70));
    for (let i = 0; i < 60; i++) value.update(1 / 60);
    expect(value.debug().balls).toBe(before + 1);
    value.pointerDown(pointer(2, 700, 70)); value.pointerEnd(1, 'up');
    expect(value.debug().pointers).toBe(1); expect(value.debug().balls).toBe(before + 2);
  });
  it('T36/P06: all capacities recycle immediately, preferring the oldest settled ball', () => {
    for (const cap of [8, 16, 24] as const) {
      const state = world(cap); const initial = state.balls.map(ball => ball.id);
      for (let i = 0; i < cap - 3; i++) state.spawn({ x: 100 + i * 23, y: 80 });
      expect(state.balls).toHaveLength(cap); const replacement = state.spawn({ x: 500, y: 60 });
      expect(state.balls).toHaveLength(cap); expect(state.balls.some(ball => ball.id === initial[0])).toBe(false); expect(state.balls).toContain(replacement);
      for (let i = 0; i < 200; i++) state.spawn({ x: 400, y: 90 });
      expect(state.balls).toHaveLength(cap); inBounds(state);
    }
  });
  it('T36/P04: deflector hit regions are broad and rotating changes actual segment endpoints', () => {
    const state = world(); const shape = state.deflectors[0], before = deflectorSegment(shape);
    expect(hitsDeflector({ x: shape.x, y: shape.y + 30 }, shape)).toBe(true);
    expect(hitsDeflector({ x: shape.x, y: shape.y + 110 }, shape)).toBe(false);
    expect(state.rotateDeflector(0)).toBe(true); expect(deflectorSegment(shape)).not.toEqual(before); expect(state.rotateDeflector(9)).toBe(false);
    for (let i = 0; i < 3; i++) state.rotateDeflector(0); expect(deflectorSegment(shape)).toEqual(before);
    expect(closestOnSegment({ x: 3, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
  it('P04/T44: every peg remains visible with a full ball passage past either deflector at all four angles', () => {
    for (const size of [view, { width: 360, height: 532 }, { width: 1080, height: 702 }]) {
      const state = new BounceWorld(size, { cap: 24, motion: 'playful' });
      expect(state.pegs.length).toBeGreaterThanOrEqual(7); expect(state.pegs.length).toBeLessThanOrEqual(14);
      for (const peg of state.pegs) for (const shape of state.deflectors) for (let angleIndex = 0; angleIndex < DEFLECTOR_ANGLES.length; angleIndex++) {
        const [start, end] = deflectorSegment({ ...shape, angleIndex });
        const nearest = closestOnSegment(peg, start, end);
        const separation = Math.hypot(peg.x - nearest.x, peg.y - nearest.y) - peg.radius;
        expect(separation - DEFLECTOR_TARGET_RADIUS).toBeGreaterThanOrEqual(10);
        expect(separation - shape.radius).toBeGreaterThanOrEqual(state.radius * 2 + 8);
      }
    }
  });
  it('T36/T38: mechanism taps rotate instead of spawning and cannot be stolen by another contact', () => {
    const { value } = scene(); const first = value.debug().deflectorStates[0], second = value.debug().deflectorStates[1], count = value.debug().balls;
    value.pointerDown(pointer(1, first.x, first.y)); const angle = value.debug().deflectorStates[0].angleIndex;
    expect(angle).not.toBe(first.angleIndex); expect(value.debug().balls).toBe(count);
    value.pointerDown(pointer(2, first.x, first.y)); expect(value.debug().deflectorStates[0].angleIndex).toBe(angle);
    value.pointerDown(pointer(3, second.x, second.y)); expect(value.debug().mechanismOwners).toBe(2);
    value.pointerEnd(1, 'cancel'); value.pointerEnd(1, 'cancel'); expect(value.debug().mechanismOwners).toBe(1);
  });
  it('T37: identical inputs and fixed-step timing produce identical world states', () => {
    const a = world(), b = world();
    for (let i = 0; i < 150; i++) {
      if (i % 15 === 0) { const p = { x: 100 + (i * 37) % 600, y: 70 }; a.spawn(p); b.spawn(p); }
      if (i % 25 === 0) { a.rotateDeflector(0); b.rotateDeflector(0); }
      a.step(1 / 60); b.step(1 / 60);
    }
    expect(a.snapshot()).toEqual(b.snapshot());
  });
  it('T37: excessive or invalid deltas are bounded without a hidden-time catch-up', () => {
    const a = world(), b = world(); a.spawn({ x: 200, y: 70 }); b.spawn({ x: 200, y: 70 });
    a.step(3600); b.step(FIXED_STEP * MAX_STEPS); expect(a.snapshot()).toEqual(b.snapshot());
    expect(a.stepsLastUpdate).toBe(MAX_STEPS); expect(a.clampedUpdates).toBe(1);
    const before = a.snapshot(); a.step(NaN); a.step(Infinity); a.step(-1); expect(a.snapshot()).toEqual(before);
  });
  it('T37: peg contact reflects incoming velocity and separates exact-centre placements finitely', () => {
    const state = world(); const peg = state.pegs[0]; const ball = state.spawn({ x: peg.x, y: peg.y });
    expect(Math.hypot(ball.x - peg.x, ball.y - peg.y)).toBeGreaterThan(0); inBounds(state);
    ball.x = peg.x; ball.y = peg.y - state.radius - peg.radius + 1; ball.vx = 0; ball.vy = 150;
    state.step(FIXED_STEP); expect(ball.vy).toBeLessThan(0); inBounds(state);
  });
  it('P07/T39: a perfectly centred peg drop rolls away into the trough instead of balancing forever', () => {
    const state = world(); const peg = state.pegs[0];
    const ball = state.spawn({ x: peg.x, y: peg.y - state.radius - peg.radius - 10 }); ball.vx = 0; ball.vy = 0;
    for (let i = 0; i < 3600 && !ball.settled; i++) state.step(1 / 60);
    expect(ball.settled).toBe(true); expect(ball.y).toBeGreaterThanOrEqual(state.troughTop - state.radius * 1.25); inBounds(state);
  });
  it('T37/P04: deflector collisions use its actual rotated surface', () => {
    const state = world(); const shape = state.deflectors[0]; const angle = -.68;
    shape.angleIndex = 0;
    const ball = state.spawn({ x: shape.x, y: shape.y - state.radius - shape.radius - 5 });
    ball.x = shape.x; ball.y = shape.y - state.radius - shape.radius + 5; ball.vx = 0; ball.vy = 200;
    state.step(FIXED_STEP); expect(Math.abs(ball.vx)).toBeGreaterThan(20); expect(ball.vy).toBeLessThan(200);
    const [start, end] = deflectorSegment(shape); expect((end.y - start.y) / (end.x - start.x)).toBeCloseTo(Math.tan(angle));
  });
  it('T37: ball-ball collisions transfer motion rather than passing through each other', () => {
    const state = world(); state.balls = [];
    const a = state.spawn({ x: 330, y: 110 }), b = state.spawn({ x: 375, y: 110 });
    a.x = 330; b.x = 371; a.y = b.y = 110; a.vx = 220; b.vx = 0; a.vy = b.vy = 0;
    state.step(FIXED_STEP); expect(b.vx).toBeGreaterThan(50); expect(a.vx).toBeLessThan(220);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(state.radius * 2 - .1);
  });
  it('T37: dense repeated spawn/swipe/rotation stays finite with bounded energy and effects', () => {
    const { value } = scene({ bounceBallCount: 24, motion: 'playful' });
    for (let i = 0; i < 300; i++) {
      value.pointerDown(pointer(i, i % 2 ? 70 : 740, 60));
      value.pointerMove(pointer(i, i % 2 ? 10_000 : -10_000, -10_000)); value.pointerEnd(i, 'up');
      value.update(i % 12 === 0 ? 1000 : 1 / 60);
      const state = value.debug(); expect(state.balls).toBeLessThanOrEqual(24); expect(state.effects).toBeLessThanOrEqual(24); expect(state.stepsLastUpdate).toBeLessThanOrEqual(MAX_STEPS);
      for (const ball of state.ballStates) { expect([ball.x, ball.y, ball.vx, ball.vy].every(Number.isFinite)).toBe(true); expect(Math.hypot(ball.vx, ball.vy)).toBeLessThanOrEqual(state.maxSpeed + .001); }
    }
  });
  it('T38: four pointers are independent, a fifth cannot spawn, and cancellation preserves physical state', () => {
    const { value } = scene();
    for (let id = 1; id <= 5; id++) value.pointerDown(pointer(id, 100 + id * 90, 60));
    expect(value.debug().pointers).toBe(4); expect(value.debug().balls).toBe(7);
    value.pointerEnd(2, 'cancel'); expect(value.debug().pointers).toBe(3);
    const before = value.snapshot(); value.cancelAll(); value.pointerMove(pointer(1, 9000, 9000));
    expect(value.debug().pointers).toBe(0); expect(value.snapshot()).toEqual(before);
  });
  it('T39: Gentle injects less energy, produces no impact glows, and the board sleeps after settling', () => {
    const gentle = world(24, 'gentle'), playful = world(24, 'playful');
    expect(Math.abs(gentle.spawn({ x: 200, y: 60 }).vy)).toBeLessThan(Math.abs(playful.spawn({ x: 200, y: 60 }).vy));
    expect(gentle.maxSpeed).toBeLessThan(playful.maxSpeed);
    for (const state of [gentle, playful]) {
      for (let i = 0; i < 24; i++) state.spawn({ x: 80 + (i * 61) % 640, y: 65 + i % 3 * 30 });
      let moving = true;
      for (let frame = 0; frame < 3600 && moving; frame++) moving = state.step(1 / 60);
      expect(moving).toBe(false); expect(state.debug().activeBalls).toBe(0); expect(state.step(1)).toBe(false); inBounds(state);
    }
    const { value } = scene(); value.pointerDown(pointer(1, 100, 60)); value.pointerEnd(1, 'up');
    for (let i = 0; i < 40; i++) value.update(1 / 60); expect(value.debug().effects).toBe(0);
  });
  it('P07/T39 regression: the browser six-lane 24-tap workload settles within 45s across input cadences and layouts', () => {
    for (const size of [view, { width: 360, height: 532 }, { width: 1080, height: 702 }]) for (const motion of ['gentle', 'playful'] as const) for (const framesBetweenTaps of [0, 1, 2, 3, 4, 6, 8]) {
      const state = new BounceWorld(size, { cap: 24, motion });
      for (let index = 0; index < 24; index++) {
        state.spawn({ x: (.14 + (index % 6) * .14) * size.width, y: .12 * size.height });
        for (let frame = 0; frame < framesBetweenTaps; frame++) state.step(1 / 60);
      }
      let moving = true;
      for (let frame = 0; frame < 2700 && moving; frame++) moving = state.step(1 / 60);
      expect(moving, JSON.stringify({ size, motion, framesBetweenTaps, active: state.balls.filter(ball => !ball.settled) })).toBe(false);
      expect(state.debug()).toMatchObject({ balls: 24, activeBalls: 0, settledBalls: 24 }); inBounds(state);
    }
  });
  it('P07 regression: a supported stack above the trough sleeps, and recycling its bottom ball wakes the unsupported stack', () => {
    const state = world(8, 'playful'); state.pegs = []; state.deflectors = [];
    const floor = state.bounds.bottom - state.radius;
    state.balls = Array.from({ length: 8 }, (_, index): Ball => ({
      id: 100 + index, x: index < 4 ? 110 : 360 + (index - 4) * 60,
      y: index < 4 ? floor - index * state.radius * 2 : floor,
      vx: 0, vy: 0, settled: index === 0 || index >= 4, stillTime: 0, tint: index % 4,
    }));
    for (let frame = 0; frame < 600 && state.step(1 / 60); frame++);
    expect(state.balls[3].y).toBeLessThan(state.troughTop - state.radius * 1.25);
    expect(state.debug().activeBalls).toBe(0);
    const lower = state.balls[1], yBefore = lower.y;
    state.spawn({ x: 680, y: 70 });
    expect(state.balls.some(ball => ball.id === 100)).toBe(false); expect(lower.settled).toBe(false);
    state.step(1 / 30); expect(lower.y).toBeGreaterThan(yBefore); inBounds(state);
  });
  it('P04/P07 regression: turning a settled ball\'s old support wakes it even when the new paddle is farther away', () => {
    const state = world(); state.pegs = [];
    const shape = state.deflectors[0]; shape.angleIndex = 0;
    const [, end] = deflectorSegment(shape), angle = DEFLECTOR_ANGLES[0], distance = state.radius + shape.radius + .01;
    const ball: Ball = { id: 100, x: end.x + Math.sin(angle) * distance, y: end.y - Math.cos(angle) * distance, vx: 0, vy: 0, settled: true, stillTime: 1, tint: 0 };
    state.balls = [ball]; expect(state.step(1 / 60)).toBe(false);
    const before = { x: ball.x, y: ball.y };
    state.rotateDeflector(0); expect(ball.settled).toBe(false); expect({ x: ball.x, y: ball.y }).toEqual(before);
    expect(state.step(1 / 60)).toBe(true); expect(ball.y).toBeGreaterThan(before.y); inBounds(state);
  });
  it('T40/P10: snapshots validate every number/count and restore layout, then clamp after rotation', () => {
    const source = world(); source.spawn({ x: 170, y: 100 }); source.rotateDeflector(1); source.step(.03);
    const restored = new BounceWorld(view, { cap: 16, motion: 'gentle' }, source.snapshot());
    expect(restored.snapshot()).toEqual(source.snapshot());
    restored.resize({ width: 1080, height: 702 }); restored.resize({ width: 360, height: 540 }); inBounds(restored);
    for (const input of [{ version: 1, angles: [0, 1], balls: Array(25).fill({}) }, { version: 1, angles: [0, 1], balls: [{ x: NaN, y: Infinity }] }, { version: 1, angles: [99, 1], balls: [] }]) {
      const recovered = new BounceWorld(view, { cap: 8, motion: 'gentle' }, input); expect(recovered.balls).toHaveLength(3); inBounds(recovered);
    }
  });
  it('T40: a finite but unsupported settled snapshot cannot freeze a ball in mid-air', () => {
    const source = world(); const saved = source.snapshot() as { balls: Ball[]; nextId: number };
    saved.balls[0].x = .2; saved.balls[0].y = .1; saved.nextId = saved.balls[0].id;
    const restored = new BounceWorld(view, { cap: 8, motion: 'gentle' }, saved);
    expect(restored.balls[0].settled).toBe(false);
    const oldY = restored.balls[0].y; restored.step(1 / 30); expect(restored.balls[0].y).toBeGreaterThan(oldY);
    const added = restored.spawn({ x: 100, y: 60 }); expect(restored.balls.filter(ball => ball.id === added.id)).toHaveLength(1);
  });
  it('P10: disposal clears transient ownership and objects without retained image references', () => {
    const { value } = scene(); value.pointerDown(pointer(1, 100, 60)); value.dispose();
    expect(value.debug()).toMatchObject({ balls: 0, pointers: 0, effects: 0, mechanismOwners: 0 }); expect(value.update(1)).toBe(false);
    value.pointerDown(pointer(2, 100, 60)); expect(value.debug().balls).toBe(0);
  });
});
