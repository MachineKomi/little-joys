import type { View } from "./types";
export function backingScale(view: View, dpr: number): number {
  return Math.min(
    dpr || 1,
    1.5,
    Math.sqrt(2_000_000 / Math.max(1, view.width * view.height)),
  );
}
export function coordinates(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  view: View,
) {
  return {
    x: ((clientX - rect.left) * view.width) / Math.max(1, rect.width),
    y: ((clientY - rect.top) * view.height) / Math.max(1, rect.height),
  };
}
export const clamp = (v: number, low: number, high: number) =>
  Math.max(low, Math.min(high, v));
