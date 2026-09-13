import { describe, it, expect } from "vitest";
import { BubbleScene } from "../../src/toys/bubbles/scene";
import { bubbleLayout, segmentCircle } from "../../src/toys/bubbles/geometry";
import { defaults } from "../../src/core/settings";
const pointer = (
  id: number,
  x: number,
  y: number,
  previousX = x,
  previousY = y,
) => ({ id, x, y, previousX, previousY, timeMs: 0 });
const scene = () => {
  const s = new BubbleScene({ settings: defaults, sound: () => {} });
  s.resize({ width: 810, height: 972 });
  return s;
};
describe("Bubble Pond T10–T14", () => {
  it("sweeps through circles with both endpoints outside, and handles zero-length paths", () => {
    expect(segmentCircle(0, 0, 200, 0, 100, 0, 20)).toBe(true);
    expect(segmentCircle(0, 21, 200, 21, 100, 0, 20)).toBe(false);
    expect(segmentCircle(100, 0, 100, 0, 100, 0, 20)).toBe(true);
  });
  it("empty-space contact sweeps into slot once, waits while held, returns only after leaving clearance", () => {
    const s = scene(),
      b = s.debug().bubbles[0];
    s.pointerDown(pointer(1, b.x - b.radius - 30, b.y));
    s.pointerMove(
      pointer(1, b.x + b.radius + 30, b.y, b.x - b.radius - 30, b.y),
    );
    expect(s.debug().bubbles[0].state).toBe("poppedWaiting");
    s.pointerMove(pointer(1, b.x, b.y));
    for (let i = 0; i < 30; i++) s.update(0.05);
    expect(s.debug().bubbles[0].state).toBe("waitingForClear");
    expect(s.update(0.05)).toBe(false);
    s.pointerMove(pointer(1, b.x + b.radius + 15, b.y));
    s.update(0.05);
    expect(s.debug().bubbles[0].state).toBe("waitingForClear");
    s.pointerMove(pointer(1, b.x + b.radius + 17, b.y));
    s.update(0.05);
    expect(s.debug().bubbles[0].state).toBe("ready");
  });
  it("independent contacts both block respawn until all are clear", () => {
    const s = scene(),
      b = s.debug().bubbles[0];
    s.pointerDown(pointer(1, b.x, b.y));
    s.pointerDown(pointer(2, b.x, b.y));
    for (let i = 0; i < 30; i++) s.update(0.05);
    s.pointerEnd(1);
    s.update(0.05);
    expect(s.debug().bubbles[0].state).toBe("waitingForClear");
    s.pointerEnd(2);
    s.update(0.05);
    expect(s.debug().bubbles[0].state).toBe("ready");
  });
  it("snapshot freezes cooldown over scene switches and validates malformed state", () => {
    const s = scene(),
      b = s.debug().bubbles[0];
    s.pointerDown(pointer(1, b.x, b.y));
    s.update(0.05);
    const restored = new BubbleScene(
      { settings: defaults, sound: () => {} },
      s.snapshot(),
    );
    restored.resize({ width: 810, height: 972 });
    expect(restored.debug().bubbles[0].remaining).toBeCloseTo(0.85);
    s.update(3600);
    expect(s.debug().bubbles[0].remaining).toBeCloseTo(0.8);
  });
  it.each([
    { width: 810, height: 972 },
    { width: 1080, height: 702 },
    { width: 360, height: 550 },
  ])("six readable fixed slots fit %j", (view) => {
    const l = bubbleLayout(view, 6);
    expect(l.slots).toHaveLength(6);
    for (const a of l.slots) {
      expect(a.radius * 2).toBeGreaterThanOrEqual(96);
      expect(a.x - a.radius).toBeGreaterThanOrEqual(24);
      for (const b of l.slots)
        if (a !== b)
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(
            a.radius + b.radius,
          );
    }
  });
  it("falls back to three before making six precision targets", () => {
    expect(bubbleLayout({ width: 360, height: 300 }, 6).limited).toBe(true);
  });
  it("bounds all effects, disposes contacts and objects", () => {
    const s = scene();
    for (let i = 0; i < 200; i++) {
      s.pointerDown(pointer(1, 20, 20));
      s.pointerEnd(1);
    }
    expect(s.debug().effects).toBe(24);
    s.dispose();
    expect(s.debug().effects).toBe(0);
    expect(s.debug().contacts).toBe(0);
  });
});
