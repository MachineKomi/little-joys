import type { View } from "../../core/types";
export interface BubblePosition {
  x: number;
  y: number;
  radius: number;
}

/** Finite deterministic placement search, performed only when a bubble returns. */
export function nextBubblePosition(
  view: View,
  bubbles: readonly BubblePosition[],
  index: number,
  sequence: number,
  pointers: Iterable<{ x: number; y: number }>,
): { x: number; y: number } {
  const old = bubbles[index],
    contacts = Array.from(pointers).slice(0, 4);
  const margin = old.radius + 24;
  const spanX = Math.max(0, view.width - margin * 2);
  const spanY = Math.max(0, view.height - margin * 2);
  let best = { x: old.x, y: old.y },
    score = 0;
  for (let attempt = 0; attempt < 48; attempt++) {
    const seed = sequence * 53 + index * 17 + attempt + 1;
    const x =
      Math.min(margin, view.width / 2) + ((seed * 0.61803398875) % 1) * spanX;
    const y =
      Math.min(margin, view.height / 2) + ((seed * 0.41421356237) % 1) * spanY;
    if (
      bubbles.some(
        (b, i) =>
          i !== index &&
          Math.hypot(x - b.x, y - b.y) < old.radius + b.radius + 18,
      )
    )
      continue;
    if (contacts.some((p) => Math.hypot(x - p.x, y - p.y) <= old.radius + 16))
      continue;
    const distance = Math.hypot(x - old.x, y - old.y);
    if (distance > score) {
      best = { x, y };
      score = distance;
    }
  }
  return best;
}
export function segmentCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const dx = bx - ax,
    dy = by - ay,
    d = dx * dx + dy * dy;
  const t = d
    ? Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / d))
    : 0;
  return (ax + t * dx - cx) ** 2 + (ay + t * dy - cy) ** 2 <= r * r;
}
export function bubbleLayout(view: View, requested: 3 | 6) {
  const w = Math.max(1, view.width - 48),
    h = Math.max(1, view.height - 48);
  let count: number = requested;
  const dimensions = (n: number) => {
    const cols = view.width > view.height ? 3 : 2,
      rows = Math.ceil(n / cols);
    return {
      cols,
      rows,
      diameter: Math.min(
        128,
        (w - (cols - 1) * 24) / cols,
        (h - (rows - 1) * 24) / rows,
      ),
    };
  };
  if (requested === 6 && dimensions(6).diameter < 96) count = 3;
  const { cols, rows, diameter } = dimensions(count),
    radius = Math.max(24, diameter / 2);
  const gapX = Math.min(radius * 2 + 52, w / cols),
    gapY = Math.min(radius * 2 + 64, h / rows);
  return {
    limited: count !== requested,
    slots: Array.from({ length: count }, (_, i) => {
      const row = Math.floor(i / cols),
        items = Math.min(cols, count - row * cols);
      return {
        x: view.width / 2 + ((i % cols) - (items - 1) / 2) * gapX,
        y: view.height / 2 + (row - (rows - 1) / 2) * gapY,
        radius,
      };
    }),
  };
}
