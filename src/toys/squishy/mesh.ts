import type { Grab } from "./deformation";
export const GRID = 8;
export const VERTICES = (GRID + 1) ** 2;
const EXTENT = 1.17;
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
export function targetMesh(out: Float64Array, grabs: Iterable<Grab>) {
  const contacts = Array.from(grabs);
  for (let i = 0; i < VERTICES; i++) {
    const x = restMesh[i * 2],
      y = restMesh[i * 2 + 1];
    let dx = 0,
      dy = 0,
      weight = 0;
    for (const g of contacts) {
      const ox = x - g.x,
        oy = y - g.y,
        w = Math.exp(-(ox * ox + oy * oy) / 0.52);
      dx += (g.dx - ox * 0.075) * w;
      dy += (g.dy - oy * 0.075) * w;
      weight += w;
    }
    dx /= Math.max(1, weight);
    dy /= Math.max(1, weight);
    out[i * 2] = x + dx;
    out[i * 2 + 1] = y + dy;
  }
  // Defensive positive-area barrier: preserve triangle orientation under any opposing inputs.
  for (let round = 0; round < 8; round++) {
    let valid = true;
    for (let t = 0; t < triangles.length; t += 3)
      if (
        signedArea(out, triangles[t], triangles[t + 1], triangles[t + 2]) <
        signedArea(restMesh, triangles[t], triangles[t + 1], triangles[t + 2]) *
          0.3
      ) {
        valid = false;
        break;
      }
    if (valid) break;
    for (let i = 0; i < out.length; i++) out[i] = (out[i] + restMesh[i]) / 2;
  }
}
export function validMesh(points: Float64Array) {
  for (let t = 0; t < triangles.length; t += 3)
    if (
      signedArea(points, triangles[t], triangles[t + 1], triangles[t + 2]) <
      signedArea(restMesh, triangles[t], triangles[t + 1], triangles[t + 2]) *
        0.3
    )
      return false;
  return true;
}
/** 128 small affine patches. At rest the caller uses one normal drawImage. */
export function drawMesh(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  points: Float64Array,
  radius: number,
  cx: number,
  cy: number,
) {
  const iw = image.naturalWidth,
    ih = image.naturalHeight;
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
    const mx = (x0 + x1 + x2) / 3,
      my = (y0 + y1 + y2) / 3;
    // Subpixel overlap prevents antialiased cracks; no blurred full-screen layer.
    const expand = (x: number, y: number) => {
      const d = Math.hypot(x - mx, y - my);
      return { x: x + ((x - mx) / d) * 1.1, y: y + ((y - my) / d) * 1.1 };
    };
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
    const left = Math.max(0, Math.min(sx0, sx1, sx2) - 2),
      top = Math.max(0, Math.min(sy0, sy1, sy2) - 2),
      width = Math.min(iw - left, iw / GRID + 4),
      height = Math.min(ih - top, ih / GRID + 4);
    ctx.drawImage(image, left, top, width, height, left, top, width, height);
    ctx.restore();
  }
}
