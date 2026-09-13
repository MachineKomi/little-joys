import { afterEach, describe, expect, it, vi } from "vitest";
import { backingScale, coordinates } from "../../src/core/coordinates";
import { PointerTracker } from "../../src/core/pointers";
import {
  defaults,
  effectiveSettings,
  loadSettings,
  saveSettings,
  STORAGE_KEY,
  validateSettings,
} from "../../src/core/settings";
import type { ToyPointer } from "../../src/core/types";

const pointer = (id: number, x = 100, y = 100): ToyPointer => ({
  id,
  x,
  y,
  previousX: x,
  previousY: y,
  timeMs: 0,
});

afterEach(() => vi.unstubAllGlobals());

describe("contact tracking", () => {
  it("T02/T05: releasing and repeated cancellation of one pointer preserve another", () => {
    const tracker = new PointerTracker();
    tracker.down(pointer(11));
    tracker.down(pointer(22, 220));
    expect(tracker.end(11)).toBe(true);
    expect(tracker.end(11)).toBe(false);
    expect(tracker.active.size).toBe(1);
    expect(tracker.move(pointer(22, 260))).toMatchObject({
      id: 22,
      x: 260,
      previousX: 220,
    });
  });

  it("T03: ignores a fifth contact for its entire lifetime, even after a slot frees", () => {
    const tracker = new PointerTracker();
    for (let id = 1; id <= 4; id++)
      expect(tracker.down(pointer(id))).toBe(true);
    expect(tracker.down(pointer(5))).toBe(false);
    tracker.end(2);
    expect(tracker.move(pointer(5, 900))).toBeNull();
    expect(tracker.down(pointer(5))).toBe(false);
    expect([...tracker.active.keys()]).toEqual([1, 3, 4]);
    expect(tracker.end(5)).toBe(false);
    expect(tracker.down(pointer(5))).toBe(true);
    expect(tracker.active.size).toBe(4);
  });

  it("T03: duplicate down cannot replace a currently tracked position", () => {
    const tracker = new PointerTracker();
    tracker.down(pointer(1, 120));
    expect(tracker.down(pointer(1, 999))).toBe(false);
    expect(tracker.active.get(1)?.x).toBe(120);
  });

  it("T02/T04: non-primary and empty-space contacts have independent IDs", () => {
    const tracker = new PointerTracker();
    const secondary = { ...pointer(9, 250), isPrimary: false };
    expect(tracker.down(pointer(1, 0, 0))).toBe(true);
    expect(tracker.down(secondary)).toBe(true);
    expect(tracker.move({ ...secondary, x: 280 })?.x).toBe(280);
    expect(tracker.active.get(1)?.x).toBe(0);
  });

  it("T06: global cancellation makes stale movements harmless", () => {
    const tracker = new PointerTracker();
    tracker.down(pointer(1));
    tracker.down(pointer(2));
    tracker.clear();
    tracker.clear();
    expect(tracker.active.size).toBe(0);
    expect(tracker.move(pointer(1, 500))).toBeNull();
    expect(tracker.end(2)).toBe(false);
  });
});

describe("CSS-space input and bounded canvas backing", () => {
  it.each([1, 1.5, 2])(
    "T07: DPR %s does not change logical hit coordinates on an offset canvas",
    (dpr) => {
      const view = { width: 810, height: 960 };
      const rect = { left: 37, top: 92, width: 810, height: 960 };
      expect(coordinates(rect.left + 405, rect.top + 480, rect, view)).toEqual({
        x: 405,
        y: 480,
      });
      const scale = backingScale(view, dpr);
      expect(scale).toBeLessThanOrEqual(1.5);
      expect(view.width * view.height * scale * scale).toBeLessThanOrEqual(
        2_000_000,
      );
    },
  );

  it("T07: recomputed landscape and CSS zoom geometry hit the same relative target", () => {
    const view = { width: 1080, height: 690 };
    const rect = { left: 19, top: 101, width: 540, height: 345 };
    expect(coordinates(19 + 270, 101 + 172.5, rect, view)).toEqual({
      x: 540,
      y: 345,
    });
  });

  it("T32: even a large high-DPR display respects the two-million-pixel bound", () => {
    const view = { width: 3840, height: 2160 };
    const scale = backingScale(view, 3);
    expect(scale).toBeGreaterThan(0);
    expect(view.width * view.height * scale * scale).toBeLessThanOrEqual(
      2_000_000.00001,
    );
  });
});

describe("settings resilience and sensory defaults", () => {
  it("T01/T21: fresh storage is silent and starts with the first toy", () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    expect(loadSettings()).toEqual(defaults);
    expect(loadSettings().soundEnabled).toBe(false);
  });

  it.each([
    null,
    undefined,
    [],
    12,
    "invalid",
    { soundEnabled: "yes", bubbleCount: 7, ballCount: 3, sfxGain: NaN },
  ])("T27: invalid settings recover safe defaults (%j)", (input) => {
    expect(validateSettings(input)).toEqual(defaults);
  });

  it("T27: corrupt JSON and denied storage reads fall back without exceptions", () => {
    vi.stubGlobal("localStorage", { getItem: () => "{broken" });
    expect(loadSettings()).toEqual(defaults);
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("storage denied");
      },
    });
    expect(loadSettings()).toEqual(defaults);
  });

  it("T27: storage write failure preserves working in-memory settings", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("quota");
      },
    });
    const settings = { ...defaults, ballCount: 2 as const };
    expect(saveSettings(settings)).toBe(false);
    expect(settings.ballCount).toBe(2);
  });

  it("T21/T27: persistence retains explicit mute, clamps gain, and omits unknown data", () => {
    const saved = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    });
    const settings = validateSettings({
      ...defaults,
      soundEnabled: false,
      sfxGain: 4,
      lastToy: "nest",
      unknown: "discard",
    });
    expect(saveSettings(settings)).toBe(true);
    expect(loadSettings()).toMatchObject({
      soundEnabled: false,
      sfxGain: 0.3,
      lastToy: "nest",
    });
    expect(JSON.parse(saved.get(STORAGE_KEY)!)).not.toHaveProperty("unknown");
    expect(validateSettings({ sfxGain: -4 }).sfxGain).toBe(0);
  });

  it("T24: reduced motion forces Gentle without changing the saved preference", () => {
    const settings = { ...defaults, motion: "playful" as const };
    expect(effectiveSettings(settings, true).motion).toBe("gentle");
    expect(effectiveSettings(settings, false).motion).toBe("playful");
    expect(settings.motion).toBe("playful");
  });
});
