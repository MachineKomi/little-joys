import type { View } from "../../core/types";
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
