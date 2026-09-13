import { describe, expect, it, vi } from 'vitest';
import { ATTENTION_SECONDS, BounceWorld, closestOnSegment, deflectorSegment, DEFLECTOR_ANGLES, DEFLECTOR_TARGET_RADIUS } from '../../src/toys/bounce/physics';
import { BounceScene } from '../../src/toys/bounce/scene';
import type { SettingsV1, ToyPointer } from '../../src/core/types';

const defaults: SettingsV1 = { schemaVersion: 1, soundEnabled: false, sfxGain: .15, musicEnabled: false, musicGain: .08, motion: 'gentle', bubbleCount: 3, ballCount: 1, bounceBallCount: 16, ballControl: 'drag', startupToy: 'last', lastToy: 'squishy', diagnosticsEnabled: false };
const pointer = (id: number, x: number, y: number): ToyPointer => ({ id, x, y, previousX: x, previousY: y, timeMs: 0 });
const layouts = [{ width: 810, height: 972 }, { width: 360, height: 532 }, { width: 1080, height: 702 }, { width: 768, height: 900 }, { width: 1366, height: 900 }, { width: 600, height: 800 }];
function scene(settings: Partial<SettingsV1> = {}) {
  const value = new BounceScene({ settings: { ...defaults, ...settings }, sound: vi.fn() });
  value.resize({ width: 810, height: 972 });
  return { value, world: (value as unknown as { world: BounceWorld }).world };
}

describe('Penguin Bounce review repairs', () => {
  it('P06: a tap at capacity shows the soft ring where the replaced ball rested', () => {
    const { value, world } = scene({ bounceBallCount: 8 });
    const y = world.bounds.top + world.radius * 1.5;
    for (let i = 0; i < 5; i++) { value.pointerDown(pointer(i + 1, 120 + i * 60, y)); value.pointerEnd(i + 1); }
    world.attention = 0;
    for (let frame = 0; frame < 3600 && value.update(1 / 60); frame++);
    expect(world.balls).toHaveLength(8);
    const before = value.debug().popEffects as number;
    value.pointerDown(pointer(50, 400, y));
    expect(value.debug().popEffects).toBe(before + 1);
    expect(world.balls).toHaveLength(8);
  });

  it('the attended window renews while a finger keeps moving, so a long swipe keeps the flow going', () => {
    const { value, world } = scene();
    const y = world.bounds.top + world.radius * 1.5;
    value.pointerDown(pointer(1, 200, y));
    for (let frame = 0; frame < 60 * 100; frame++) value.update(1 / 60);
    expect(world.attention).toBeLessThan(21);
    value.pointerMove(pointer(1, 260, y));
    expect(world.attention).toBe(ATTENTION_SECONDS);
    value.pointerEnd(1);
  });

  it('P07 hand-off: a dense attended board keeps flowing, then settles and sleeps once its window ends', () => {
    for (const size of [layouts[0], layouts[1]]) for (const motion of ['gentle', 'playful'] as const) {
      const world = new BounceWorld(size, { cap: 24, motion });
      for (let index = 0; index < 24; index++) world.spawn({ x: (.14 + (index % 6) * .14) * size.width, y: world.bounds.top + world.radius * 1.5 });
      for (let t = 0; t < ATTENTION_SECONDS; t += 1 / 60) world.step(1 / 60);
      expect(world.flowSpawns).toBeGreaterThan(40);
      let frames = 0, moving = true;
      while (moving && frames < 2700) { moving = world.step(1 / 60); frames++; }
      expect(moving, JSON.stringify({ size, motion, active: world.balls.filter(ball => !ball.settled).length, spin: world.spinners[0].spin })).toBe(false);
      expect(world.debug()).toMatchObject({ flowActive: false, activeBalls: 0, balls: 24 });
    }
  });

  it('P04/T44: peg passages hold at the same six layouts as the mechanism clearances', () => {
    for (const size of layouts) {
      const state = new BounceWorld(size, { cap: 24, motion: 'playful' });
      expect(state.pegs.length, JSON.stringify(size)).toBeGreaterThanOrEqual(size.width >= 700 ? 10 : 5);
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
        expect(peg.x - peg.radius - state.bounds.left).toBeGreaterThanOrEqual(clearance - 1e-9);
        expect(state.bounds.right - peg.x - peg.radius).toBeGreaterThanOrEqual(clearance - 1e-9);
      }
    }
  });
});
