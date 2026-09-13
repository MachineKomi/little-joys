import { describe, expect, it, vi } from 'vitest';
import { ATTENTION_SECONDS, BounceWorld, closestOnSegment, deflectorSegment, hitsDeflector, hitsSpinner, spinnerArms, DEFLECTOR_ANGLES, DEFLECTOR_TARGET_RADIUS, FIXED_STEP, FLOW_FIRST_DELAY, FLOW_INTERVAL, MAX_SPIN, MAX_STEPS, TINTS, type Ball } from '../../src/toys/bounce/physics';
import { BounceScene } from '../../src/toys/bounce/scene';
import type { SettingsV1, ToyPointer } from '../../src/core/types';

const defaults: SettingsV1 = { schemaVersion: 1, soundEnabled: false, sfxGain: .15, musicEnabled: false, musicGain: .08, motion: 'gentle', bubbleCount: 3, ballCount: 1, bounceBallCount: 16, ballControl: 'drag', startupToy: 'last', lastToy: 'squishy', diagnosticsEnabled: false };
const view = { width: 810, height: 972 };
const pointer = (id: number, x: number, y: number): ToyPointer => ({ id, x, y, previousX: x, previousY: y, timeMs: 0 });
const world = (cap: 8 | 16 | 24 = 16, motion: 'gentle' | 'playful' = 'gentle') => new BounceWorld(view, { cap, motion });
/** A board whose attended window has ended: the former input-only contract for settling checks. */
const restingWorld = (cap: 8 | 16 | 24 = 16, motion: 'gentle' | 'playful' = 'gentle') => { const state = world(cap, motion); state.attention = 0; return state; };
function scene(settings: Partial<SettingsV1> = {}) { const sound = vi.fn(); const value = new BounceScene({ settings: { ...defaults, ...settings }, sound }); value.resize(view); return { value, sound }; }
/** Open board space below the shelf and away from every mechanism. */
function openSpace(state: BounceWorld, x: number): { x: number; y: number } {
  const y = state.bounds.top + state.radius * 1.5;
  return { x, y };
}
function inBounds(state: BounceWorld) {
  expect(state.balls.length).toBeLessThanOrEqual(state.options.cap);
  for (const ball of state.balls) {
    for (const number of [ball.x, ball.y, ball.vx, ball.vy, ball.stillTime]) expect(Number.isFinite(number)).toBe(true);
    expect(ball.x).toBeGreaterThanOrEqual(state.bounds.left + state.radius - .01); expect(ball.x).toBeLessThanOrEqual(state.bounds.right - state.radius + .01);
    expect(ball.y).toBeGreaterThanOrEqual(state.bounds.top + state.radius - .01); expect(ball.y).toBeLessThanOrEqual(state.bounds.bottom - state.radius + .01);
    expect(Math.hypot(ball.vx, ball.vy)).toBeLessThanOrEqual(state.maxSpeed + .0001);
    expect(ball.tint).toBeGreaterThanOrEqual(0); expect(ball.tint).toBeLessThan(TINTS);
  }
  for (const shape of state.spinners) expect(Math.abs(shape.spin)).toBeLessThanOrEqual(MAX_SPIN.playful + 1e-9);
}

describe('Penguin Bounce deterministic physics P02–P11', () => {
  it('T36/P07: the first frame contains three stationary balls; the attended board stays awake without a countdown burst', () => {
    const state = world(); expect(state.balls).toHaveLength(3);
    expect(state.debug()).toMatchObject({ activeBalls: 0, settledBalls: 3, deflectors: 2, bumpers: 3, spinners: 1, rails: 2, flowActive: true });
    expect(state.step(1 / 60)).toBe(true);
    expect(state.balls).toHaveLength(3);
  });
  it('P07 (amended): passive flow dispenses on a fixed pace only through stepped time, and stops after the attended window', () => {
    for (const motion of ['gentle', 'playful'] as const) {
      const state = world(24, motion);
      let elapsed = 0;
      while (elapsed < FLOW_FIRST_DELAY - .05) { state.step(1 / 60); elapsed += 1 / 60; }
      expect(state.flowSpawns).toBe(0);
      while (elapsed < FLOW_FIRST_DELAY + FLOW_INTERVAL[motion] * 3 + .05) { state.step(1 / 60); elapsed += 1 / 60; }
      expect(state.flowSpawns).toBe(4);
      expect(state.inputSpawns).toBe(0);
      // A hidden-tab gap of an hour is one clamped update: no catch-up burst.
      const before = state.flowSpawns; state.step(3600);
      expect(state.flowSpawns - before).toBeLessThanOrEqual(1);
      expect(state.stepsLastUpdate).toBe(MAX_STEPS);
      inBounds(state);
    }
    const state = world(8, 'playful');
    for (let t = 0; t < ATTENTION_SECONDS + 2; t += 1 / 60) state.step(1 / 60);
    expect(state.attention).toBe(0);
    expect(state.debug().flowActive).toBe(false);
    const spawns = state.flowSpawns;
    let moving = true;
    for (let frame = 0; frame < 3600 && moving; frame++) moving = state.step(1 / 60);
    expect(moving).toBe(false);
    expect(state.flowSpawns).toBe(spawns);
    expect(state.balls).toHaveLength(8);
    inBounds(state);
    state.touch(); expect(state.attention).toBe(ATTENTION_SECONDS); expect(state.step(1 / 60)).toBe(true);
  });
  it('P06 (amended): dispensing at capacity recycles the oldest settled trough ball and reports the removal locally', () => {
    const state = world(8, 'playful'); state.attention = 0;
    for (let i = 0; i < 5; i++) state.spawn(openSpace(state, 120 + i * 60));
    let moving = true;
    for (let frame = 0; frame < 3600 && moving; frame++) moving = state.step(1 / 60);
    expect(state.balls).toHaveLength(8);
    const oldest = state.balls.find(ball => ball.settled && ball.y > state.troughTop)!;
    expect(oldest).toBeDefined();
    state.dispense();
    expect(state.balls).toHaveLength(8);
    expect(state.balls.some(ball => ball.id === oldest.id)).toBe(false);
    expect(state.recycled).toEqual([{ x: oldest.x, y: oldest.y }]);
    expect(state.dispensed).toHaveLength(1);
    expect(Math.abs(state.dispensed[0].x - state.chute.x)).toBeLessThan(state.radius);
    expect(state.balls.at(-1)!.y).toBeLessThan(state.bounds.top + state.radius * 2);
    inBounds(state);
  });
  it('T36: an ordinary pointer-down responds once, holding does not repeat, and another finger stays independent', () => {
    const { value } = scene(); const before = value.debug().inputSpawns;
    const space = openSpace(value['world'], 120);
    value.pointerDown(pointer(1, space.x, space.y)); expect(value.debug().inputSpawns).toBe(before + 1);
    value.pointerDown(pointer(1, space.x + 10, space.y));
    for (let i = 0; i < 60; i++) value.update(1 / 60);
    expect(value.debug().inputSpawns).toBe(before + 1);
    value.pointerDown(pointer(2, 700, space.y)); value.pointerEnd(1, 'up');
    expect(value.debug().pointers).toBe(1); expect(value.debug().inputSpawns).toBe(before + 2);
  });
  it('T36/P06: all capacities recycle immediately, preferring the oldest settled ball', () => {
    for (const cap of [8, 16, 24] as const) {
      const state = restingWorld(cap); const initial = state.balls.map(ball => ball.id);
      for (let i = 0; i < cap - 3; i++) state.spawn(openSpace(state, 100 + i * 23));
      expect(state.balls).toHaveLength(cap); const replacement = state.spawn(openSpace(state, 500));
      expect(state.balls).toHaveLength(cap); expect(state.balls.some(ball => ball.id === initial[0])).toBe(false); expect(state.balls).toContain(replacement);
      for (let i = 0; i < 200; i++) state.spawn(openSpace(state, 400));
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
  it('P04 (amended): the pinwheel has a broad target, turns from taps and ball contact, and its spin is bounded and fades', () => {
    const state = world(24, 'playful'); state.attention = 0;
    const shape = state.spinners[0];
    expect(hitsSpinner({ x: shape.x + 30, y: shape.y - 20 }, shape)).toBe(true);
    expect(hitsSpinner({ x: shape.x + 200, y: shape.y }, shape)).toBe(false);
    expect(spinnerArms(shape)).toHaveLength(4);
    expect(state.spinSpinner(0)).toBe(true); expect(state.spinSpinner(3)).toBe(false);
    expect(shape.spin).toBeGreaterThan(0);
    for (let n = 0; n < 40; n++) state.spinSpinner(0);
    expect(shape.spin).toBeLessThanOrEqual(MAX_SPIN.playful);
    const angle = shape.angle; state.step(1 / 60); expect(shape.angle).not.toBe(angle);
    for (let frame = 0; frame < 3600 && state.step(1 / 60); frame++);
    expect(shape.spin).toBe(0);
    // While attended, a falling ball striking one arm off-centre turns the wheel.
    state.touch();
    const [, tip] = spinnerArms(shape)[0];
    const ball = state.spawn({ x: tip.x - 4, y: shape.y - state.radius * 6 });
    ball.vx = 0; ball.vy = 260;
    for (let frame = 0; frame < 90; frame++) state.step(1 / 60);
    expect(shape.spin).not.toBe(0);
    inBounds(state);
  });
  it('P04 (amended): bumpers push balls away at a generous speed and a tap pulses nearby balls', () => {
    for (const motion of ['gentle', 'playful'] as const) {
      const state = world(24, motion);
      const shape = state.bumpers[2];
      const ball = state.spawn({ x: shape.x, y: shape.y - shape.radius - state.radius - 6 });
      ball.vx = 0; ball.vy = 60;
      let bumped = false;
      for (let frame = 0; frame < 60 && !bumped; frame++) { state.step(1 / 60); bumped = state.impacts.some(impact => impact.kind === 'bumper'); }
      expect(bumped).toBe(true);
      expect(ball.vy).toBeLessThan(-100);
      inBounds(state);
      const still = state.spawn({ x: shape.x + shape.radius + state.radius + 30, y: shape.y });
      still.vx = 0; still.vy = 0; still.settled = true;
      expect(state.pulseBumper(2)).toBeGreaterThanOrEqual(1);
      expect(still.settled).toBe(false); expect(Math.hypot(still.vx, still.vy)).toBeGreaterThan(50);
      expect(state.pulseBumper(7)).toBe(0);
      // Unattended, the bumper adds no energy, so the board can come to rest.
      state.attention = 0;
      const calm = state.spawn({ x: shape.x, y: shape.y - shape.radius - state.radius - 6 }); calm.vx = 0; calm.vy = 60;
      for (let frame = 0; frame < 60; frame++) { state.step(1 / 60); expect(state.impacts.some(impact => impact.kind === 'bumper')).toBe(false); }
    }
  });
  it('P04 (amended): mechanisms, their full turning sweeps, rails and walls keep a ball passage at reference layouts', () => {
    for (const size of [view, { width: 360, height: 532 }, { width: 1080, height: 702 }, { width: 768, height: 900 }, { width: 1366, height: 900 }, { width: 600, height: 800 }]) {
      const state = new BounceWorld(size, { cap: 24, motion: 'playful' });
      const clearance = state.radius * 2 + 8;
      const bodies = [
        ...state.deflectors.map(shape => ({ point: shape, reach: shape.halfLength + shape.radius })),
        ...state.spinners.map(shape => ({ point: shape, reach: shape.armLength + shape.radius })),
        ...state.bumpers.map(shape => ({ point: shape, reach: shape.radius })),
      ];
      expect(state.bumpers).toHaveLength(3); expect(state.spinners).toHaveLength(1); expect(state.deflectors).toHaveLength(2);
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i];
        for (let j = i + 1; j < bodies.length; j++) {
          const b = bodies[j];
          expect(Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y) - a.reach - b.reach, JSON.stringify({ size, i, j })).toBeGreaterThanOrEqual(clearance - 1e-6);
        }
        for (const rail of state.rails) {
          const nearest = closestOnSegment(a.point, rail.start, rail.end);
          expect(Math.hypot(a.point.x - nearest.x, a.point.y - nearest.y) - a.reach - rail.radius, JSON.stringify({ size, i, rail })).toBeGreaterThanOrEqual(clearance - 1e-6);
        }
        expect(a.point.x - a.reach - state.bounds.left).toBeGreaterThanOrEqual(clearance - 1e-6);
        expect(state.bounds.right - a.point.x - a.reach).toBeGreaterThanOrEqual(clearance - 1e-6);
        expect(state.troughTop - a.point.y - a.reach).toBeGreaterThanOrEqual(clearance - 1e-6);
      }
    }
  });
  it('P04/T44: every peg keeps a full ball passage from mechanisms, rails, the chute and its neighbours at every layout', () => {
    for (const size of [view, { width: 360, height: 532 }, { width: 1080, height: 702 }]) {
      const state = new BounceWorld(size, { cap: 24, motion: 'playful' });
      expect(state.pegs.length).toBeGreaterThanOrEqual(size.width >= 700 ? 10 : 5);
      const clearance = state.radius * 2 + 8;
      for (const peg of state.pegs) {
        for (const shape of state.deflectors) for (let angleIndex = 0; angleIndex < DEFLECTOR_ANGLES.length; angleIndex++) {
          const [start, end] = deflectorSegment({ ...shape, angleIndex });
          const nearest = closestOnSegment(peg, start, end);
          const separation = Math.hypot(peg.x - nearest.x, peg.y - nearest.y) - peg.radius;
          expect(separation - DEFLECTOR_TARGET_RADIUS).toBeGreaterThanOrEqual(10);
          expect(separation - shape.radius).toBeGreaterThanOrEqual(clearance);
        }
        for (const shape of state.bumpers) expect(Math.hypot(peg.x - shape.x, peg.y - shape.y) - peg.radius - shape.radius).toBeGreaterThanOrEqual(clearance);
        for (const shape of state.spinners) expect(Math.hypot(peg.x - shape.x, peg.y - shape.y) - peg.radius - shape.radius - shape.armLength).toBeGreaterThanOrEqual(clearance);
        for (const rail of state.rails) { const nearest = closestOnSegment(peg, rail.start, rail.end); expect(Math.hypot(peg.x - nearest.x, peg.y - nearest.y) - peg.radius - rail.radius).toBeGreaterThanOrEqual(clearance); }
        for (const other of state.pegs) if (other !== peg) expect(Math.hypot(peg.x - other.x, peg.y - other.y) - peg.radius - other.radius).toBeGreaterThanOrEqual(clearance - 1e-9);
        expect(peg.y).toBeGreaterThan(state.bounds.top + state.radius); expect(peg.y).toBeLessThan(state.troughTop - state.radius);
      }
      // The shelf band lies entirely above the physics bounds; the chute opens into them.
      expect(state.shelf.bottom).toBeLessThanOrEqual(state.bounds.top);
      expect(state.chute.y).toBeGreaterThan(state.bounds.top);
    }
  });
  it('T36/T38: mechanism taps rotate/spin/pulse instead of spawning, and a penguin tap dispenses from the chute', () => {
    const { value } = scene(); const first = value.debug().deflectorStates[0], second = value.debug().deflectorStates[1], count = value.debug().balls, spawns = value.debug().inputSpawns;
    value.pointerDown(pointer(1, first.x, first.y)); const angle = value.debug().deflectorStates[0].angleIndex;
    expect(angle).not.toBe(first.angleIndex); expect(value.debug().balls).toBe(count); expect(value.debug().inputSpawns).toBe(spawns);
    value.pointerDown(pointer(2, first.x, first.y)); expect(value.debug().deflectorStates[0].angleIndex).toBe(angle);
    value.pointerDown(pointer(3, second.x, second.y)); expect(value.debug().mechanismOwners).toBe(2);
    value.pointerEnd(1, 'cancel'); value.pointerEnd(1, 'cancel'); expect(value.debug().mechanismOwners).toBe(1);
    value.pointerEnd(2); value.pointerEnd(3);
    const spinner = value.debug().spinnerStates[0];
    value.pointerDown(pointer(4, spinner.x, spinner.y)); expect(value.debug().spinnerStates[0].spin).not.toBe(0); expect(value.debug().inputSpawns).toBe(spawns); value.pointerEnd(4);
    const bumper = value.debug().bumperStates[0];
    value.pointerDown(pointer(5, bumper.x, bumper.y)); expect(value.debug().inputSpawns).toBe(spawns); value.pointerEnd(5);
    const chute = value.debug().chute, shelf = value.debug().shelf, flow = value.debug().flowSpawns;
    value.pointerDown(pointer(6, chute.x, (shelf.top + shelf.bottom) / 2));
    expect(value.debug().flowSpawns).toBe(flow + 1); expect(value.debug().inputSpawns).toBe(spawns); expect(value.debug().reaction).toBeGreaterThan(0);
    value.pointerEnd(6);
  });
  it('T37: identical inputs and fixed-step timing produce identical world states, including passive flow', () => {
    const a = world(), b = world();
    for (let i = 0; i < 400; i++) {
      if (i % 15 === 0) { const p = { x: 100 + (i * 37) % 600, y: 70 }; a.spawn(p); b.spawn(p); }
      if (i % 25 === 0) { a.rotateDeflector(0); b.rotateDeflector(0); a.spinSpinner(0); b.spinSpinner(0); }
      a.step(1 / 60); b.step(1 / 60);
    }
    expect(a.flowSpawns).toBeGreaterThan(0);
    expect(a.snapshot()).toEqual(b.snapshot());
  });
  it('T37: excessive or invalid deltas are bounded without a hidden-time catch-up', () => {
    const a = world(), b = world(); a.spawn({ x: 200, y: 70 }); b.spawn({ x: 200, y: 70 });
    a.step(3600); b.step(FIXED_STEP * MAX_STEPS); expect(a.snapshot()).toEqual(b.snapshot());
    expect(a.stepsLastUpdate).toBe(MAX_STEPS); expect(a.clampedUpdates).toBe(1);
    expect(a.attention).toBeCloseTo(ATTENTION_SECONDS - FIXED_STEP * MAX_STEPS, 9);
    const before = a.snapshot(); a.step(NaN); a.step(Infinity); a.step(-1); expect(a.snapshot()).toEqual(before);
  });
  it('T37: peg contact reflects incoming velocity and separates exact-centre placements finitely', () => {
    const state = restingWorld(); const peg = state.pegs[0]; const ball = state.spawn({ x: peg.x, y: peg.y });
    expect(Math.hypot(ball.x - peg.x, ball.y - peg.y)).toBeGreaterThan(0); inBounds(state);
    ball.x = peg.x; ball.y = peg.y - state.radius - peg.radius + 1; ball.vx = 0; ball.vy = 150;
    state.step(FIXED_STEP); expect(ball.vy).toBeLessThan(0); inBounds(state);
  });
  it('P07/T39: a perfectly centred peg drop rolls away into the trough instead of balancing forever', () => {
    const state = restingWorld(); const peg = state.pegs[0];
    const ball = state.spawn({ x: peg.x, y: peg.y - state.radius - peg.radius - 10 }); ball.vx = 0; ball.vy = 0;
    for (let i = 0; i < 3600 && !ball.settled; i++) state.step(1 / 60);
    expect(ball.settled).toBe(true); expect(ball.y).toBeGreaterThanOrEqual(state.troughTop - state.radius * 1.25); inBounds(state);
  });
  it('T37/P04: deflector collisions use its actual rotated surface', () => {
    const state = restingWorld(); const shape = state.deflectors[0]; const angle = -.68;
    shape.angleIndex = 0;
    const ball = state.spawn({ x: shape.x, y: shape.y - state.radius - shape.radius - 5 });
    ball.x = shape.x; ball.y = shape.y - state.radius - shape.radius + 5; ball.vx = 0; ball.vy = 200;
    state.step(FIXED_STEP); expect(Math.abs(ball.vx)).toBeGreaterThan(20); expect(ball.vy).toBeLessThan(200);
    const [start, end] = deflectorSegment(shape); expect((end.y - start.y) / (end.x - start.x)).toBeCloseTo(Math.tan(angle));
  });
  it('T37: ball-ball collisions transfer motion rather than passing through each other', () => {
    const state = restingWorld(); state.balls = []; state.pegs = []; state.bumpers = []; state.spinners = []; state.rails = [];
    const a = state.spawn({ x: 330, y: 160 }), b = state.spawn({ x: 375, y: 160 });
    a.x = 330; b.x = 371; a.y = b.y = 160; a.vx = 220; b.vx = 0; a.vy = b.vy = 0;
    state.step(FIXED_STEP); expect(b.vx).toBeGreaterThan(50); expect(a.vx).toBeLessThan(220);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(state.radius * 2 - .1);
  });
  it('T37: dense repeated spawn/swipe/rotation/spin with live flow stays finite with bounded energy and effects', () => {
    const { value } = scene({ bounceBallCount: 24, motion: 'playful' });
    for (let i = 0; i < 300; i++) {
      value.pointerDown(pointer(i, i % 2 ? 70 : 740, 60));
      value.pointerMove(pointer(i, i % 2 ? 10_000 : -10_000, -10_000)); value.pointerEnd(i, 'up');
      if (i % 7 === 0) { const spinner = value.debug().spinnerStates[0]; value.pointerDown(pointer(1000 + i, spinner.x, spinner.y)); value.pointerEnd(1000 + i); }
      value.update(i % 12 === 0 ? 1000 : 1 / 60);
      const state = value.debug(); expect(state.balls).toBeLessThanOrEqual(24); expect(state.effects).toBeLessThanOrEqual(24); expect(state.stepsLastUpdate).toBeLessThanOrEqual(MAX_STEPS);
      for (const ball of state.ballStates) { expect([ball.x, ball.y, ball.vx, ball.vy].every(Number.isFinite)).toBe(true); expect(Math.hypot(ball.vx, ball.vy)).toBeLessThanOrEqual(state.maxSpeed + .001); }
      for (const spinner of state.spinnerStates) { expect(Number.isFinite(spinner.angle)).toBe(true); expect(Math.abs(spinner.spin)).toBeLessThanOrEqual(MAX_SPIN.playful); }
    }
  });
  it('T38: four pointers are independent, a fifth cannot spawn, and cancellation preserves physical state', () => {
    const { value } = scene();
    const y = openSpace(value['world'], 0).y;
    for (let id = 1; id <= 5; id++) value.pointerDown(pointer(id, 100 + id * 90, y));
    expect(value.debug().pointers).toBe(4); expect(value.debug().inputSpawns).toBe(4);
    value.pointerEnd(2, 'cancel'); expect(value.debug().pointers).toBe(3);
    const before = value.snapshot(); value.cancelAll(); value.pointerMove(pointer(1, 9000, 9000));
    expect(value.debug().pointers).toBe(0); expect(value.snapshot()).toEqual(before);
  });
  it('T39 (amended): Gentle injects less energy and flows more slowly; both boards settle and sleep once the attended window ends', () => {
    const gentle = world(24, 'gentle'), playful = world(24, 'playful');
    expect(Math.abs(gentle.spawn({ x: 200, y: 160 }).vy)).toBeLessThan(Math.abs(playful.spawn({ x: 200, y: 160 }).vy));
    expect(gentle.maxSpeed).toBeLessThan(playful.maxSpeed);
    expect(FLOW_INTERVAL.gentle).toBeGreaterThan(FLOW_INTERVAL.playful);
    for (const state of [gentle, playful]) {
      for (let i = 0; i < 24; i++) state.spawn({ x: 80 + (i * 61) % 640, y: 165 + i % 3 * 30 });
      state.attention = 0;
      let moving = true;
      for (let frame = 0; frame < 3600 && moving; frame++) moving = state.step(1 / 60);
      expect(moving).toBe(false); expect(state.debug().activeBalls).toBe(0); expect(state.step(1)).toBe(false); inBounds(state);
    }
    const { value } = scene(); value['world'].attention = 0;
    const space = openSpace(value['world'], 100);
    value.pointerDown(pointer(1, space.x, space.y)); value.pointerEnd(1, 'up'); value['world'].attention = 0;
    for (let i = 0; i < 40; i++) value.update(1 / 60); expect(value.debug().effects).toBe(0);
  });
  it('P08 (amended): the penguin dips once per dispensed or tapped ball in both modes, and visual effects finish without changing physics', () => {
    for (const motion of ['gentle', 'playful'] as const) {
      const penguin = {} as HTMLImageElement, drawImage = vi.fn();
      const methods: Record<string, unknown> = {
        drawImage,
        createLinearGradient: () => ({ addColorStop: vi.fn() }),
        createRadialGradient: () => ({ addColorStop: vi.fn() }),
      };
      const ctx = new Proxy(methods, { get(target, key: string) { return target[key] ??= vi.fn(); } }) as unknown as CanvasRenderingContext2D;
      const value = new BounceScene({ settings: { ...defaults, motion }, sound: vi.fn(), image: key => key === 'penguin' ? penguin : undefined });
      value.resize(view); value['world'].attention = 0;
      expect(value.update(1 / 60)).toBe(false); value.render(ctx);
      const penguinY = () => drawImage.mock.calls.filter(call => call[0] === penguin).at(-1)![2] as number;
      const restingY = penguinY();
      const chute = value.debug().chute, shelf = value.debug().shelf;
      value.pointerDown(pointer(1, chute.x, (shelf.top + shelf.bottom) / 2)); value.pointerEnd(1, 'up');
      value['world'].attention = 0;
      for (let frame = 0; frame < 6; frame++) value.update(1 / 60);
      value.render(ctx);
      expect(penguinY()).toBeGreaterThan(restingY + 1);
      expect(penguinY()).toBeLessThanOrEqual(restingY + 13);
      expect(value.debug().balls).toBe(4);
      // The dropped ball lands and the board sleeps; the character response ends with it.
      let frames = 0;
      while (value.update(1 / 60) && frames < 3600) frames++;
      expect(frames).toBeLessThan(3600);
      expect(value.debug().effects).toBe(0); expect(value.debug().reaction).toBe(0);
      const physicalState = value.snapshot();
      value.render(ctx); expect(penguinY()).toBe(restingY);
      for (let frame = 0; frame < 60; frame++) expect(value.update(1 / 60)).toBe(false);
      value.render(ctx); expect(penguinY()).toBe(restingY);
      expect(value.snapshot()).toEqual(physicalState);
    }
  });
  it('P07/T39 regression: the browser six-lane 24-tap workload settles within 45s across input cadences and layouts once unattended', () => {
    for (const size of [view, { width: 360, height: 532 }, { width: 1080, height: 702 }]) for (const motion of ['gentle', 'playful'] as const) for (const framesBetweenTaps of [0, 1, 2, 3, 4, 6, 8]) {
      const state = new BounceWorld(size, { cap: 24, motion }); state.attention = 0;
      for (let index = 0; index < 24; index++) {
        state.spawn({ x: (.14 + (index % 6) * .14) * size.width, y: state.bounds.top + state.radius * 1.5 });
        for (let frame = 0; frame < framesBetweenTaps; frame++) state.step(1 / 60);
      }
      let moving = true;
      for (let frame = 0; frame < 2700 && moving; frame++) moving = state.step(1 / 60);
      expect(moving, JSON.stringify({ size, motion, framesBetweenTaps, active: state.balls.filter(ball => !ball.settled), spin: state.spinners[0].spin })).toBe(false);
      expect(state.debug()).toMatchObject({ balls: 24, activeBalls: 0, settledBalls: 24 }); inBounds(state);
    }
  });
  it('P07 regression: a supported stack above the trough sleeps, and recycling its bottom ball wakes the unsupported stack', () => {
    const state = restingWorld(8, 'playful'); state.pegs = []; state.deflectors = []; state.bumpers = []; state.spinners = []; state.rails = [];
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
    state.spawn({ x: 680, y: 170 });
    expect(state.balls.some(ball => ball.id === 100)).toBe(false); expect(lower.settled).toBe(false);
    state.step(1 / 30); expect(lower.y).toBeGreaterThan(yBefore); inBounds(state);
  });
  it('P04/P07 regression: turning a settled ball\'s old support wakes it even when the new paddle is farther away', () => {
    const state = restingWorld(); state.pegs = []; state.bumpers = []; state.spinners = []; state.rails = [];
    const shape = state.deflectors[0]; shape.angleIndex = 0;
    const [, end] = deflectorSegment(shape), angle = DEFLECTOR_ANGLES[0], distance = state.radius + shape.radius + .01;
    const ball: Ball = { id: 100, x: end.x + Math.sin(angle) * distance, y: end.y - Math.cos(angle) * distance, vx: 0, vy: 0, settled: true, stillTime: 1, tint: 0 };
    state.balls = [ball]; expect(state.step(1 / 60)).toBe(false);
    const before = { x: ball.x, y: ball.y };
    state.rotateDeflector(0); expect(ball.settled).toBe(false); expect({ x: ball.x, y: ball.y }).toEqual(before);
    expect(state.step(1 / 60)).toBe(true); expect(ball.y).toBeGreaterThan(before.y); inBounds(state);
  });
  it('T40/P10: snapshots validate every number/count and restore layout, then clamp after rotation', () => {
    const source = world(); source.spawn({ x: 170, y: 160 }); source.rotateDeflector(1); source.spinSpinner(0); source.step(.03);
    const restored = new BounceWorld(view, { cap: 16, motion: 'gentle' }, source.snapshot());
    expect(restored.snapshot()).toEqual(source.snapshot());
    expect(restored.attention).toBe(ATTENTION_SECONDS);
    restored.resize({ width: 1080, height: 702 }); restored.resize({ width: 360, height: 540 }); inBounds(restored);
    for (const input of [
      { version: 1, angles: [0, 1], balls: [] },
      { version: 2, angles: [0, 1], spinners: [{ angle: 0, spin: 0 }], balls: Array(25).fill({}) },
      { version: 2, angles: [0, 1], spinners: [{ angle: 0, spin: 0 }], balls: [{ x: NaN, y: Infinity }] },
      { version: 2, angles: [99, 1], spinners: [{ angle: 0, spin: 0 }], balls: [] },
      { version: 2, angles: [0, 1], spinners: [{ angle: NaN, spin: 0 }], balls: [] },
      { version: 2, angles: [0, 1], spinners: [{ angle: 0, spin: 99 }], balls: [] },
      { version: 2, angles: [0, 1], spinners: [], balls: [] },
      { version: 2, angles: [0, 1], spinners: [{ angle: 0, spin: 0 }], balls: [{ id: 1, x: .5, y: .5, vx: 0, vy: 0, settled: true, stillTime: 0, tint: TINTS }] },
    ]) {
      const recovered = new BounceWorld(view, { cap: 8, motion: 'gentle' }, input); expect(recovered.balls).toHaveLength(3); inBounds(recovered);
    }
  });
  it('T40: a finite but unsupported settled snapshot cannot freeze a ball in mid-air', () => {
    const source = world(); const saved = source.snapshot() as { balls: Ball[]; nextId: number };
    const open = { x: (source.bounds.left + source.radius * 3) / view.width, y: (source.bounds.top + source.radius * 1.5) / view.height };
    saved.balls[0].x = open.x; saved.balls[0].y = open.y; saved.nextId = saved.balls[0].id;
    const restored = new BounceWorld(view, { cap: 8, motion: 'gentle' }, saved);
    expect(restored.balls[0].settled).toBe(false);
    const oldY = restored.balls[0].y; restored.step(1 / 30); expect(restored.balls[0].y).toBeGreaterThan(oldY);
    const added = restored.spawn({ x: 100, y: 160 }); expect(restored.balls.filter(ball => ball.id === added.id)).toHaveLength(1);
  });
  it('P10: disposal clears transient ownership, prepared tints and objects without retained image references, and stops the flow', () => {
    const { value } = scene(); value.pointerDown(pointer(1, 100, 160)); value.dispose();
    expect(value.debug()).toMatchObject({ balls: 0, pointers: 0, effects: 0, mechanismOwners: 0, preparedRasterBytes: 0, flowActive: false }); expect(value.update(1)).toBe(false);
    value.pointerDown(pointer(2, 100, 160)); expect(value.debug().balls).toBe(0);
  });
});
