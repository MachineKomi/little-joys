import type { SettingsV1, ToyId } from "./types";
export type { SettingsV1, ToyId } from "./types";
export const STORAGE_KEY = "little-joys-settings-v1";
export const defaults: SettingsV1 = {
  schemaVersion: 1,
  soundEnabled: false,
  sfxGain: 0.15,
  musicEnabled: false,
  musicGain: 0.08,
  motion: "gentle",
  bubbleCount: 3,
  ballCount: 1,
  ballControl: "drag",
  startupToy: "last",
  lastToy: "squishy",
  diagnosticsEnabled: false,
};
const toys = ["squishy", "bubbles", "nest"];
export function validateSettings(input: unknown): SettingsV1 {
  const x =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  return {
    schemaVersion: 1,
    soundEnabled: x.soundEnabled === true,
    sfxGain:
      typeof x.sfxGain === "number" && Number.isFinite(x.sfxGain)
        ? Math.min(0.3, Math.max(0, x.sfxGain))
        : 0.15,
    musicEnabled: x.musicEnabled === true,
    musicGain:
      typeof x.musicGain === "number" && Number.isFinite(x.musicGain)
        ? Math.min(0.2, Math.max(0, x.musicGain))
        : 0.08,
    motion: x.motion === "playful" ? "playful" : "gentle",
    bubbleCount: x.bubbleCount === 6 ? 6 : 3,
    ballCount: x.ballCount === 2 ? 2 : 1,
    ballControl: x.ballControl === "tap-place" ? "tap-place" : "drag",
    startupToy: toys.includes(String(x.startupToy))
      ? (x.startupToy as ToyId)
      : "last",
    lastToy: toys.includes(String(x.lastToy))
      ? (x.lastToy as ToyId)
      : "squishy",
    diagnosticsEnabled: x.diagnosticsEnabled === true,
  };
}
export function loadSettings(): SettingsV1 {
  try {
    return validateSettings(
      JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
    );
  } catch {
    return { ...defaults };
  }
}
export function saveSettings(settings: SettingsV1): boolean {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(validateSettings(settings)),
    );
    return true;
  } catch {
    return false;
  }
}
export function effectiveSettings(
  settings: SettingsV1,
  reduced: boolean,
): SettingsV1 {
  return { ...settings, motion: reduced ? "gentle" : settings.motion };
}
