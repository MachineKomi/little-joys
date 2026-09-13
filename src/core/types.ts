export type ToyId = "squishy" | "bubbles" | "nest";
export interface SettingsV1 {
  schemaVersion: 1;
  soundEnabled: boolean;
  sfxGain: number;
  musicEnabled: boolean;
  musicGain: number;
  motion: "gentle" | "playful";
  bubbleCount: 3 | 6;
  ballCount: 1 | 2;
  ballControl: "drag" | "tap-place";
  startupToy: ToyId | "last";
  lastToy: ToyId;
  diagnosticsEnabled: boolean;
}
export interface View {
  width: number;
  height: number;
}
export interface ToyPointer {
  id: number;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  timeMs: number;
}
export interface SceneServices {
  settings: SettingsV1;
  sound: (toy: ToyId) => void;
  image?: (
    key: "friend" | "bowl" | "ball" | "ballTwo" | "bubble",
  ) => HTMLImageElement | undefined;
}
export interface ToyScene {
  readonly id: ToyId;
  resize(view: View): void;
  pointerDown(p: ToyPointer): void;
  pointerMove(p: ToyPointer): void;
  pointerEnd(id: number, reason: "up" | "cancel"): void;
  cancelAll(): void;
  update(dt: number): boolean;
  render(ctx: CanvasRenderingContext2D): void;
  snapshot(): unknown;
  dispose(): void;
  debug(): Record<string, unknown>;
}
declare global {
  const __BUILD_ID__: string;
}
