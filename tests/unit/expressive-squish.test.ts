import { describe, expect, it } from "vitest";
import { defaults } from "../../src/core/settings";
import { SquishyScene } from "../../src/toys/squishy/scene";
import {
  MAX_PULL,
  returnAmount,
  type Grab,
} from "../../src/toys/squishy/deformation";
import {
  GRID,
  materialPoint,
  restMesh,
  surfacePoint,
  signedArea,
  targetMesh,
  triangles,
  validMesh,
} from "../../src/toys/squishy/mesh";

function fixture(
  motion: "gentle" | "playful" = "gentle",
  width = 810,
  height = 972,
) {
  const scene = new SquishyScene({
    settings: { ...defaults, motion },
    sound: () => {},
    image: () =>
      ({ naturalWidth: 768, naturalHeight: 768 }) as HTMLImageElement,
  });
  scene.resize({ width, height });
  const radius = Math.min(width, height) * 0.29;
  const point = (id: number, x: number, y: number) => ({
    id,
    x: width / 2 + x * radius,
    y: height / 2 + y * radius,
    previousX: 0,
    previousY: 0,
    timeMs: 0,
  });
  const mesh = () =>
    new Float64Array((scene.snapshot() as { mesh: number[] }).mesh);
  return { scene, radius, point, mesh };
}
const delta = (m: Float64Array) =>
  m.reduce((sum, v, i) => sum + (v - restMesh[i]) ** 2, 0);
function inBounds(m: Float64Array, x: number, y: number) {
  return m.every((v, i) => Math.abs(v) <= (i % 2 ? y : x) + 1e-9);
}
function hasBoundaryCrossing(m: Float64Array) {
  const edge = [
    ...Array.from({ length: GRID }, (_, i) => i),
    ...Array.from({ length: GRID }, (_, i) => i * (GRID + 1) + GRID),
    ...Array.from({ length: GRID }, (_, i) => (GRID + 1) ** 2 - 1 - i),
    ...Array.from({ length: GRID }, (_, i) => (GRID - i) * (GRID + 1)),
  ];
  for (let i = 0; i < edge.length; i++)
    for (let j = i + 2; j < edge.length; j++) {
      if (i === 0 && j === edge.length - 1) continue;
      const a = edge[i],
        b = edge[(i + 1) % edge.length],
        c = edge[j],
        d = edge[(j + 1) % edge.length];
      if (
        signedArea(m, a, b, c) * signedArea(m, a, b, d) < -1e-12 &&
        signedArea(m, c, d, a) * signedArea(m, c, d, b) < -1e-12
      )
        return true;
    }
  return false;
}

describe("v0.1.2 expressive squish requirements", () => {
  it("T45/SQ01: a standard side pull exceeds 0.65 radii locally, with a stable far side", () => {
    const { scene, point, mesh } = fixture();
    scene.pointerDown(point(1, 0.6, 0));
    scene.pointerMove(point(1, 1.7, 0));
    scene.update(1 / 60);
    const m = mesh();
    let near = 0,
      far = 0;
    for (let i = 0; i < m.length; i += 2) {
      const d = Math.hypot(m[i] - restMesh[i], m[i + 1] - restMesh[i + 1]);
      if (restMesh[i] > 0.3 && Math.abs(restMesh[i + 1]) < 0.3)
        near = Math.max(near, d);
      if (restMesh[i] < -0.6) far = Math.max(far, d);
    }
    expect(near).toBeGreaterThanOrEqual(0.65);
    expect(far).toBeLessThan(near / 3);
    expect(validMesh(m)).toBe(true);
  });

  it("T45/SQ02: crossed/extreme four-contact warps and every return fraction preserve winding, boundary and viewport", () => {
    let seed = 913120;
    const random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    const m = new Float64Array(restMesh),
      scratch = new Float64Array(restMesh.length);
    for (const [width, height] of [
      [360, 540],
      [810, 972],
      [1080, 702],
    ]) {
      const r = Math.min(width, height) * 0.29,
        bounds = { x: (width / 2 - 24) / r, y: (height / 2 - 24) / r };
      for (let run = 0; run < 80; run++) {
        const grabs: Grab[] = Array.from({ length: 4 }, (_, id) => {
          const a = random() * Math.PI * 2;
          return {
            id,
            x: random() * 2 - 1,
            y: random() * 2 - 1,
            dx: Math.cos(a) * MAX_PULL,
            dy: Math.sin(a) * MAX_PULL,
          };
        });
        targetMesh(m, grabs, bounds, scratch);
        expect(validMesh(m)).toBe(true);
        expect(inBounds(m, bounds.x, bounds.y)).toBe(true);
        expect(hasBoundaryCrossing(m)).toBe(false);
        for (let frame = 1; frame < 10; frame++) {
          const intermediate = Float64Array.from(
            m,
            (v, i) => restMesh[i] + ((v - restMesh[i]) * frame) / 10,
          );
          expect(validMesh(intermediate)).toBe(true);
          expect(hasBoundaryCrossing(intermediate)).toBe(false);
        }
      }
    }
  });

  it("T46/SQ03: inverse mapping recovers material coordinates from a deformed triangle", () => {
    const m = new Float64Array(restMesh);
    targetMesh(m, [{ id: 1, x: 0.6, y: 0, dx: 1.1, dy: 0.25 }]);
    for (let t = 0; t < triangles.length; t += 9) {
      const [a, b, c] = [
        triangles[t] * 2,
        triangles[t + 1] * 2,
        triangles[t + 2] * 2,
      ];
      const x = m[a] * 0.5 + m[b] * 0.2 + m[c] * 0.3,
        y = m[a + 1] * 0.5 + m[b + 1] * 0.2 + m[c + 1] * 0.3;
      const p = materialPoint(m, x, y)!;
      expect(p).toBeDefined();
      expect(p.x).toBeCloseTo(
        restMesh[a] * 0.5 + restMesh[b] * 0.2 + restMesh[c] * 0.3,
        7,
      );
      expect(p.y).toBeCloseTo(
        restMesh[a + 1] * 0.5 + restMesh[b + 1] * 0.2 + restMesh[c + 1] * 0.3,
        7,
      );
    }
    expect(materialPoint(m, 100, 100)).toBeUndefined();
  });

  it("T46/SQ03: a second finger can own a stretched curl outside the old fixed pickup radius", () => {
    const { scene, point, mesh } = fixture();
    scene.pointerDown(point(1, 0, -0.8));
    scene.pointerMove(point(1, 0, -1.9));
    scene.update(1 / 60);
    // Fixed material location on the curl, independent of mesh subdivision.
    const p = surfacePoint(mesh(), 0.195, -0.975)!;
    expect(Math.hypot(p.x, p.y)).toBeGreaterThan(1.45);
    scene.pointerDown(point(2, p.x, p.y));
    expect(scene.debug().grabs).toBe(2);
    scene.pointerEnd(1);
    scene.pointerMove(point(2, p.x + 0.15, p.y + 0.1));
    scene.update(1 / 60);
    expect(scene.debug().grabs).toBe(1);
    expect(validMesh(mesh())).toBe(true);
  });

  it("T46/SQ03: an opposite-side re-grab preserves the previous return instead of snapping it away", () => {
    for (const motion of ["gentle", "playful"] as const) {
      const natural = fixture(motion),
        regrab = fixture(motion);
      for (const f of [natural, regrab]) {
        f.scene.pointerDown(f.point(1, 0.6, 0));
        f.scene.pointerMove(f.point(1, 1.7, 0));
        f.scene.update(1 / 60);
        f.scene.pointerEnd(1);
        f.scene.update(1 / 60);
      }
      regrab.scene.pointerDown(regrab.point(2, -0.6, 0));
      natural.scene.update(1 / 60);
      regrab.scene.update(1 / 60);
      const expected = natural.mesh(),
        actual = regrab.mesh();
      let farDifference = 0;
      for (let i = 0; i < actual.length; i += 2)
        if (restMesh[i] > 0.6)
          farDifference = Math.max(
            farDifference,
            Math.hypot(
              actual[i] - expected[i],
              actual[i + 1] - expected[i + 1],
            ),
          );
      expect(farDifference).toBeLessThan(0.08);
      expect(delta(actual)).toBeGreaterThan(delta(expected) * 0.8);
      expect(validMesh(actual)).toBe(true);
      expect(regrab.scene.debug().grabs).toBe(1);
    }
  });

  it("T47/SQ04: Gentle return monotonically approaches the exact rest mesh and sleeps", () => {
    const { scene, point, mesh } = fixture();
    scene.pointerDown(point(1, 0.6, 0));
    scene.pointerMove(point(1, 1.7, 0.2));
    scene.update(1 / 60);
    scene.pointerEnd(1);
    let previous = delta(mesh());
    for (let frame = 0; frame < 80; frame++) {
      scene.update(frame === 0 ? 3600 : 1 / 120);
      const m = mesh();
      expect(validMesh(m)).toBe(true);
      expect(delta(m)).toBeLessThanOrEqual(previous + 1e-9);
      previous = delta(m);
    }
    expect([...mesh()]).toEqual([...restMesh]);
    expect(scene.update(1 / 60)).toBe(false);
  });

  it("T47/SQ04: Playful crosses rest exactly once, has a small bounded body response, and sleeps", () => {
    const { scene, point, mesh } = fixture("playful");
    scene.pointerDown(point(1, 0.6, 0));
    scene.pointerMove(point(1, 1.7, 0));
    scene.update(1 / 60);
    const start = mesh();
    scene.pointerEnd(1);
    let crossings = 0,
      sign = 1,
      maxBody = 0,
      minRatio = 0;
    const norm = delta(start);
    for (let frame = 0; frame < 130; frame++) {
      scene.update(1 / 120);
      const m = mesh();
      expect(validMesh(m)).toBe(true);
      const ratio =
        m.reduce(
          (sum, v, i) => sum + (v - restMesh[i]) * (start[i] - restMesh[i]),
          0,
        ) / norm;
      if (Math.abs(ratio) > 1e-9 && Math.sign(ratio) !== sign) {
        crossings++;
        sign = Math.sign(ratio);
      }
      minRatio = Math.min(minRatio, ratio);
      maxBody = Math.max(
        maxBody,
        Math.hypot(scene.debug().x - 405, scene.debug().y - 486),
      );
      expect(inBounds(m, (405 - 24) / 234.9, (486 - 24) / 234.9)).toBe(true);
    }
    expect(crossings).toBe(1);
    expect(minRatio).toBeLessThan(-0.03);
    expect(minRatio).toBeGreaterThan(-0.2);
    expect(maxBody).toBeGreaterThan(3);
    expect(maxBody).toBeLessThan(24);
    expect([...mesh()]).toEqual([...restMesh]);
    expect(scene.update(1 / 60)).toBe(false);
  });

  it("T47/SQ04: a quick tap completed between frames still has a local response", () => {
    const { scene, point, mesh } = fixture("playful");
    scene.pointerDown(point(1, 0.1, 0.1));
    scene.pointerEnd(1);
    scene.update(1 / 60);
    expect(delta(mesh())).toBeGreaterThan(0.001);
    for (let frame = 0; frame < 70; frame++) scene.update(1 / 60);
    expect(scene.update(1 / 60)).toBe(false);
  });

  it("T46/T47: a reused pointer can interrupt returns repeatedly without a queue or stuck contact", () => {
    const { scene, point, mesh } = fixture("playful");
    for (let n = 0; n < 100; n++) {
      scene.pointerDown(point(1, -0.6, 0));
      scene.pointerDown(point(2, 0.6, 0));
      scene.pointerMove(point(1, -1.6, -0.2));
      scene.update(1 / 60);
      scene.pointerEnd(1);
      scene.update(1 / 60);
      scene.pointerDown(point(1, -0.5, 0.15));
      scene.pointerMove(point(1, -1.3, 0.1));
      scene.update(1 / 60);
      expect(scene.debug().grabs).toBe(2);
      expect(validMesh(mesh())).toBe(true);
      scene.pointerEnd(1);
      scene.pointerEnd(2);
      scene.update(1 / 60);
    }
    for (let n = 0; n < 80; n++) scene.update(1 / 60);
    expect(scene.debug().grabs).toBe(0);
    expect(scene.update(1 / 60)).toBe(false);
    expect(delta(mesh())).toBe(0);
  });

  it("T47/SQ05: cancellation in Playful creates no overshoot or new body impulse", () => {
    for (const cancel of ["pointer", "all", "resize"] as const) {
      const { scene, point, mesh } = fixture("playful");
      scene.pointerDown(point(1, 0.6, 0));
      scene.pointerMove(point(1, 1.7, 0));
      scene.update(1 / 60);
      if (cancel === "pointer") scene.pointerEnd(1, "cancel");
      else if (cancel === "all") scene.cancelAll();
      else scene.resize({ width: 810, height: 972 });
      let previous = delta(mesh());
      for (let n = 0; n < 70; n++) {
        scene.update(1 / 60);
        expect(delta(mesh())).toBeLessThanOrEqual(previous + 1e-9);
        previous = delta(mesh());
        expect(scene.debug().x).toBe(405);
        expect(scene.debug().y).toBe(486);
      }
      expect(scene.update(1 / 60)).toBe(false);
    }
  });

  it("T47/SQ05: resize recovers a tall stretched pose inside a shorter landscape viewport", () => {
    const { scene, point, mesh } = fixture("playful");
    scene.pointerDown(point(1, 0, -0.8));
    scene.pointerMove(point(1, 0, -1.9));
    scene.update(1 / 60);
    scene.resize({ width: 1080, height: 702 });
    const r = 702 * 0.29;
    expect(validMesh(mesh())).toBe(true);
    expect(inBounds(mesh(), (540 - 24) / r, (351 - 24) / r)).toBe(true);
    expect(scene.debug().grabs).toBe(0);
  });

  it("T45: corrupt/nonfinite saved meshes are rejected, including a valid-length NaN array", () => {
    for (const replacement of [NaN, Infinity, -Infinity, 100]) {
      const bad = Array.from(restMesh);
      bad[20] = replacement;
      const scene = new SquishyScene(
        { settings: { ...defaults }, sound: () => {} },
        { mesh: bad },
      );
      scene.resize({ width: 810, height: 972 });
      expect(
        validMesh(
          new Float64Array((scene.snapshot() as { mesh: number[] }).mesh),
        ),
      ).toBe(true);
    }
    expect(validMesh(Float64Array.from(restMesh, () => NaN))).toBe(false);
  });

  it("T47: finite return curves have exact endpoints and a bounded single overshoot", () => {
    for (const motion of ["gentle", "playful"] as const) {
      expect(returnAmount(0, motion)).toBe(1);
      expect(returnAmount(99, motion) === 0).toBe(true);
      for (let i = 0; i < 120; i++) {
        const a = returnAmount(i / 100, motion);
        expect(a).toBeLessThanOrEqual(1);
        expect(a).toBeGreaterThan(motion === "gentle" ? -0.000001 : -0.2);
      }
    }
  });
});
