import { clamp } from "../../core/coordinates";
export interface Grab {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
}
export const ANCHORS = 64;
export function restRadius(angle: number): number {
  return (
    1 + 0.035 * Math.cos(3 * angle + Math.PI / 2) - 0.045 * Math.sin(angle)
  );
}
export function radiusAt(angle: number, grabs: Iterable<Grab>): number {
  const ux = Math.cos(angle),
    uy = Math.sin(angle);
  let offset = 0;
  for (const g of grabs) {
    const influence = Math.exp(-((ux - g.x) ** 2 + (uy - g.y) ** 2) / 0.52);
    offset += influence * (g.dx * ux + g.dy * uy - 0.065);
  }
  return restRadius(angle) + clamp(offset, -0.3, 0.3);
}
export function displace(x: number, y: number, grabs: Iterable<Grab>) {
  let dx = 0,
    dy = 0;
  for (const g of grabs) {
    const weight = Math.exp(-((x - g.x) ** 2 + (y - g.y) ** 2) / 0.42);
    dx += g.dx * weight;
    dy += g.dy * weight;
  }
  const limit = Math.hypot(dx, dy);
  if (limit > 0.3) {
    dx *= 0.3 / limit;
    dy *= 0.3 / limit;
  }
  return { x: x + dx, y: y + dy };
}
