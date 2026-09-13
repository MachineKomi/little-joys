import type { Grab } from "./deformation";
export const GRID = 8;
export const VERTICES = (GRID + 1) ** 2;
export const EXTENT = 1.17;
export const restMesh = Float64Array.from({ length: VERTICES * 2 }, (_, i) => {
  const v = Math.floor(i / 2);
  return (
    (((i % 2 === 0 ? v % (GRID + 1) : Math.floor(v / (GRID + 1))) / GRID) * 2 -
      1) *
    EXTENT
  );
});
export const triangles = Uint16Array.from(
  Array.from({ length: GRID * GRID }, (_, i) => {
    const a = (i % GRID) + Math.floor(i / GRID) * (GRID + 1),
      b = a + 1,
      c = a + GRID + 1,
      d = c + 1;
    return [a, b, c, b, d, c];
  }).flat(),
);
export function signedArea(
  points: Float64Array,
  a: number,
  b: number,
  c: number,
) {
  return (
    (points[b * 2] - points[a * 2]) * (points[c * 2 + 1] - points[a * 2 + 1]) -
    (points[b * 2 + 1] - points[a * 2 + 1]) * (points[c * 2] - points[a * 2])
  );
}
export interface MeshBounds {
  x: number;
  y: number;
}
const unbounded = { x: 4, y: 4 };
const STEPS = 16;

/** Compose small local warps along each finger's path. Large pulls extend material
 * progressively rather than being attenuated by one rest-space Gaussian. */
export function targetMesh(
  out: Float64Array,
  grabs: Iterable<Grab>,
  bounds: MeshBounds = unbounded,
  scratch = new Float64Array(out.length),
  base = restMesh,
) {
  const contacts = Array.from(grabs)
    .slice(0, 4)
    .filter((g) =>
      [g.x, g.y, g.dx, g.dy, g.pressure ?? 1].every(Number.isFinite),
    );
  out.set(base);
  if (!contacts.length) return;
  for (let step = 0; step < STEPS; step++) {
    const progress = step / STEPS;
    for (let i = 0; i < VERTICES; i++) {
      const x = out[i * 2],
        y = out[i * 2 + 1];
      let dx = 0,
        dy = 0,
        weight = 0;
      for (const g of contacts) {
        const ox = x - (g.x + g.dx * progress),
          oy = y - (g.y + g.dy * progress);
        const w = Math.exp(-(ox * ox + oy * oy) / 0.52);
        const pressure = g.pressure ?? 1;
        dx += (g.dx - ox * 0.11 * pressure) * w;
        dy += (g.dy - oy * 0.11 * pressure) * w;
        weight += w;
      }
      scratch[i * 2] = Math.max(
        -bounds.x,
        Math.min(bounds.x, x + dx / (Math.max(1, weight) * STEPS)),
      );
      scratch[i * 2 + 1] = Math.max(
        -bounds.y,
        Math.min(bounds.y, y + dy / (Math.max(1, weight) * STEPS)),
      );
    }
    // Guard this small step against its previous valid state. Never halve the
    // entire accumulated deformation because one compressed triangle is tight.
    let valid = validMesh(scratch);
    for (let repair = 0; !valid && repair < 10; repair++) {
      for (let i = 0; i < out.length; i++)
        scratch[i] = (out[i] + scratch[i]) * 0.5;
      valid = validMesh(scratch);
    }
    if (valid) out.set(scratch);
  }
}

/** Clamp an interpolated/recovered frame toward rest without introducing folds. */
export function constrainMesh(points: Float64Array, bounds: MeshBounds) {
  let amount = 1;
  for (let i = 0; i < points.length; i++) {
    const d = points[i] - restMesh[i],
      limit = i % 2 ? bounds.y : bounds.x;
    if (!Number.isFinite(points[i])) {
      points.set(restMesh);
      return;
    }
    if (d > 0) amount = Math.min(amount, (limit - restMesh[i]) / d);
    if (d < 0) amount = Math.min(amount, (-limit - restMesh[i]) / d);
  }
  amount = Math.max(0, Math.min(1, amount));
  if (amount < 1)
    for (let i = 0; i < points.length; i++)
      points[i] = restMesh[i] + (points[i] - restMesh[i]) * amount;
  for (let repair = 0; !validMesh(points) && repair < 12; repair++)
    for (let i = 0; i < points.length; i++)
      points[i] = (points[i] + restMesh[i]) * 0.5;
  if (!validMesh(points)) points.set(restMesh);
}

/** Inverse barycentric mapping: new fingers pick up the visible material. */
function mapPoint(
  points: Float64Array,
  destination: Float64Array,
  x: number,
  y: number,
) {
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t] * 2,
      b = triangles[t + 1] * 2,
      c = triangles[t + 2] * 2;
    const bx = points[b] - points[a],
      by = points[b + 1] - points[a + 1];
    const cx = points[c] - points[a],
      cy = points[c + 1] - points[a + 1];
    const px = x - points[a],
      py = y - points[a + 1],
      det = bx * cy - by * cx;
    if (det <= 0) continue;
    const u = (px * cy - py * cx) / det,
      v = (bx * py - by * px) / det;
    if (u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7)
      return {
        x:
          destination[a] +
          u * (destination[b] - destination[a]) +
          v * (destination[c] - destination[a]),
        y:
          destination[a + 1] +
          u * (destination[b + 1] - destination[a + 1]) +
          v * (destination[c + 1] - destination[a + 1]),
      };
  }
  return undefined;
}
export const materialPoint = (points: Float64Array, x: number, y: number) =>
  mapPoint(points, restMesh, x, y);
export const surfacePoint = (points: Float64Array, x: number, y: number) =>
  mapPoint(restMesh, points, x, y);
export function validMesh(points: Float64Array) {
  if (points.length !== restMesh.length || !points.every(Number.isFinite))
    return false;
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t] * 2,
      b = triangles[t + 1] * 2,
      c = triangles[t + 2] * 2;
    const bx = restMesh[b] - restMesh[a],
      by = restMesh[b + 1] - restMesh[a + 1];
    const cx = restMesh[c] - restMesh[a],
      cy = restMesh[c + 1] - restMesh[a + 1];
    const dbx = points[b] - points[a] - bx,
      dby = points[b + 1] - points[a + 1] - by;
    const dcx = points[c] - points[a] - cx,
      dcy = points[c + 1] - points[a + 1] - cy;
    const area = bx * cy - by * cx,
      linear = bx * dcy + dbx * cy - by * dcx - dby * cx;
    const quadratic = dbx * dcy - dby * dcx;
    if (area + linear + quadratic < area * 0.3) return false;
    // Check the entire straight path to rest, not only its endpoints. This
    // prevents an intermediate fold or corrective snap during Gentle return.
    const minimum = quadratic > 0 ? -linear / (2 * quadratic) : -1;
    if (
      minimum > 0 &&
      minimum < 1 &&
      area + linear * minimum + quadratic * minimum * minimum < area * 0.3
    )
      return false;
  }
  return true;
}
/** Bounded affine patches. At rest the caller uses one normal drawImage. */
export function drawMesh(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  points: Float64Array,
  radius: number,
  cx: number,
  cy: number,
) {
  const iw = "naturalWidth" in image ? image.naturalWidth : image.width,
    ih = "naturalHeight" in image ? image.naturalHeight : image.height;
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t],
      b = triangles[t + 1],
      c = triangles[t + 2];
    const sx0 = ((restMesh[a * 2] / EXTENT + 1) * iw) / 2,
      sy0 = ((restMesh[a * 2 + 1] / EXTENT + 1) * ih) / 2,
      sx1 = ((restMesh[b * 2] / EXTENT + 1) * iw) / 2,
      sy1 = ((restMesh[b * 2 + 1] / EXTENT + 1) * ih) / 2,
      sx2 = ((restMesh[c * 2] / EXTENT + 1) * iw) / 2,
      sy2 = ((restMesh[c * 2 + 1] / EXTENT + 1) * ih) / 2;
    const x0 = cx + points[a * 2] * radius,
      y0 = cy + points[a * 2 + 1] * radius,
      x1 = cx + points[b * 2] * radius,
      y1 = cy + points[b * 2 + 1] * radius,
      x2 = cx + points[c * 2] * radius,
      y2 = cy + points[c * 2 + 1] * radius;
    const det = (sx1 - sx0) * (sy2 - sy0) - (sx2 - sx0) * (sy1 - sy0);
    const ma = ((x1 - x0) * (sy2 - sy0) - (x2 - x0) * (sy1 - sy0)) / det,
      mc = ((sx1 - sx0) * (x2 - x0) - (sx2 - sx0) * (x1 - x0)) / det,
      mb = ((y1 - y0) * (sy2 - sy0) - (y2 - y0) * (sy1 - sy0)) / det,
      md = ((sx1 - sx0) * (y2 - y0) - (sx2 - sx0) * (y1 - y0)) / det;
    const side0 = Math.hypot(x1 - x2, y1 - y2),
      side1 = Math.hypot(x0 - x2, y0 - y2),
      side2 = Math.hypot(x0 - x1, y0 - y1),
      perimeter = side0 + side1 + side2;
    const mx = (x0 * side0 + x1 * side1 + x2 * side2) / perimeter,
      my = (y0 * side0 + y1 * side1 + y2 * side2) / perimeter;
    const inradius =
      Math.abs((x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)) / perimeter;
    // Incenter expansion moves each EDGE outward by a constant amount. Radial
    // expansion around the centroid left hairlines along thin triangles' edges.
    const expansion = 0.75 / Math.max(0.1, inradius);
    const expand = (x: number, y: number) => ({
      x: x + (x - mx) * expansion,
      y: y + (y - my) * expansion,
    });
    const p0 = expand(x0, y0),
      p1 = expand(x1, y1),
      p2 = expand(x2, y2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.clip();
    ctx.transform(
      ma,
      mb,
      mc,
      md,
      x0 - ma * sx0 - mc * sy0,
      y0 - mb * sx0 - md * sy0,
    );
    const padding = Math.ceil(2 + (iw / GRID) * expansion);
    const left = Math.max(0, Math.min(sx0, sx1, sx2) - padding),
      top = Math.max(0, Math.min(sy0, sy1, sy2) - padding),
      width = Math.min(iw - left, iw / GRID + padding * 2),
      height = Math.min(ih - top, ih / GRID + padding * 2);
    ctx.drawImage(image, left, top, width, height, left, top, width, height);
    ctx.restore();
  }
}
