import { clamp } from "../../core/coordinates";
export interface Grab {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  pressure?: number;
  /** Squared Gaussian width of this contact's local influence (rest-mesh units). */
  spread?: number;
  /** Longest pull this contact may make, in rest radii. */
  reach?: number;
}
export const MAX_PULL = 1.1;
export type Region = "curl" | "eye" | "cheek" | "foot" | "body";
export interface RegionProfile {
  region: Region;
  spread: number;
  reach: number;
}
/** Painted feature centres measured on the shipped 768px sprite, in rest-mesh units. */
export const FEATURES = {
  eyes: [
    [-0.366, -0.105],
    [0.373, -0.106],
  ],
  cheeks: [
    [-0.55, 0.155],
    [0.557, 0.143],
  ],
  curl: [0.137, -1.024],
  mouth: [-0.005, 0.061],
} as const;
/** Different parts of the friend answer a pull differently: the curl draws out
 * like a long soft tail, cheeks squish wide, an eye stretches tightly, the feet
 * stay stubby, and the rest of the body is the original broad squish. */
export function regionAt(x: number, y: number): RegionProfile {
  if (!Number.isFinite(x) || !Number.isFinite(y))
    return { region: "body", spread: 0.52, reach: MAX_PULL };
  if (y < -0.7 && Math.abs(x - 0.14) < 0.42)
    return { region: "curl", spread: 0.22, reach: 1.5 };
  for (const [ex, ey] of FEATURES.eyes)
    if (Math.hypot(x - ex, y - ey) < 0.2)
      return { region: "eye", spread: 0.3, reach: 1.15 };
  for (const [cx, cy] of FEATURES.cheeks)
    if (Math.hypot(x - cx, y - cy) < 0.22)
      return { region: "cheek", spread: 0.72, reach: 1.25 };
  if (y > 0.72) return { region: "foot", spread: 0.3, reach: 0.85 };
  return { region: "body", spread: 0.52, reach: MAX_PULL };
}
export const RETURN_SECONDS = { gentle: 0.36, playful: 0.78 } as const;
/** Finite analytical return: Gentle never crosses rest; Playful crosses once. */
export function returnAmount(elapsed: number, motion: "gentle" | "playful") {
  const t = clamp(elapsed / RETURN_SECONDS[motion], 0, 1);
  const smooth = t * t * t * (t * (t * 6 - 15) + 10);
  return (1 - smooth) * (motion === "playful" ? Math.cos(Math.PI * t) : 1);
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
