import { describe, expect, it } from "vitest";
import { defaults } from "../../src/core/settings";
import { SquishyScene, silhouetteBounds } from "../../src/toys/squishy/scene";
import { apply, type Matrix } from "../../src/toys/squishy/body";
import { FEATURES, regionAt } from "../../src/toys/squishy/deformation";
import {
  EXTENT,
  ease,
  restMesh,
  surfacePoint,
  targetMesh,
  validMesh,
} from "../../src/toys/squishy/mesh";

// Portrait reference layout shared with the other scene tests.
const W = 810,
  H = 972,
  R = 810 * 0.29;
function fixture(motion: "gentle" | "playful" = "playful") {
  const scene = new SquishyScene({
    settings: { ...defaults, motion },
    sound: () => {},
    image: () =>
      ({ naturalWidth: 768, naturalHeight: 768 }) as HTMLImageElement,
  });
  scene.resize({ width: W, height: H });
  return scene;
}
const at = (id: number, x: number, y: number) => ({
  id,
  x,
  y,
  previousX: x,
  previousY: y,
  timeMs: 0,
});
const meshOf = (scene: SquishyScene) =>
  new Float64Array(scene.debug().mesh as number[]);
/** View position of a material point on the current deformed, posed friend. */
function viewPoint(scene: SquishyScene, mx: number, my: number) {
  const s = surfacePoint(meshOf(scene), mx, my)!;
  return apply(scene.debug().matrix as Matrix, s.x * R, s.y * R);
}
function slingLeft(scene: SquishyScene) {
  scene.pointerDown(at(1, W / 2 + 0.6 * R, H / 2));
  scene.pointerMove(at(1, W / 2 + 1.7 * R, H / 2));
  scene.update(1 / 60);
  scene.pointerEnd(1);
}

describe("Squishy Friend review repairs", () => {
  it("ease is the identity for most of the room, monotonic, never reaches the limit, and gives no outward motion without room", () => {
    for (const room of [0.05, 0.3, 1.2]) {
      let previous = -Infinity;
      for (let d = -2; d <= 2; d += 0.01) {
        const value = ease(d, -room, room);
        expect(value).toBeGreaterThanOrEqual(previous - 1e-12);
        previous = value;
        expect(value).toBeLessThan(room + 1e-12);
        expect(value).toBeGreaterThan(-room - 1e-12);
        if (Math.abs(d) <= room - Math.min(0.15, room / 2))
          expect(value).toBeCloseTo(d, 12);
      }
    }
    expect(ease(0.4, -0.2, 0)).toBe(0);
    expect(ease(-0.4, 0, 0.2)).toBe(0);
  });

  it("one-sided bounds hold every vertex on its own side while opposing pulls stay valid", () => {
    const out = new Float64Array(restMesh.length);
    const bounds = { x: EXTENT, y: EXTENT, left: -EXTENT, right: 1.5, top: -1.3, bottom: EXTENT };
    targetMesh(out, [
      { id: 1, x: 0.6, y: 0, dx: 1.1, dy: 0 },
      { id: 2, x: -0.6, y: 0, dx: -1.1, dy: 0 },
      { id: 3, x: 0.1, y: -0.8, dx: 0, dy: -1.1 },
    ], bounds);
    for (let i = 0; i < out.length; i += 2) {
      expect(out[i]).toBeGreaterThanOrEqual(bounds.left - 1e-9);
      expect(out[i]).toBeLessThanOrEqual(bounds.right + 1e-9);
      expect(out[i + 1]).toBeGreaterThanOrEqual(bounds.top - 1e-9);
      expect(out[i + 1]).toBeLessThanOrEqual(bounds.bottom + 1e-9);
    }
    expect(validMesh(out)).toBe(true);
    // The pulled right side reaches well past rest without touching its limit.
    expect(Math.max(...out.filter((_, i) => i % 2 === 0))).toBeGreaterThan(1.3);
  });

  it("a still finger on the friend lets the scheduler sleep in both motions", () => {
    for (const motion of ["gentle", "playful"] as const) {
      const scene = fixture(motion);
      scene.pointerDown(at(1, W / 2 + 0.6 * R, H / 2));
      scene.pointerMove(at(1, W / 2 + 1.3 * R, H / 2));
      let frames = 0;
      while (scene.update(1 / 60) && frames < 600) frames++;
      expect(frames, motion).toBeLessThan(120);
      const held = scene.debug();
      expect(held.grabs).toBe(1);
      expect(held.meshDisplacement).toBeGreaterThan(0.3);
      expect(scene.update(1 / 60)).toBe(false);
      expect(scene.debug().mesh).toEqual(held.mesh);
    }
  });

  it("a friend caught mid-flight still sleeps under a still finger once its pose relaxes", () => {
    const scene = fixture("playful");
    slingLeft(scene);
    for (let frame = 0; frame < 5; frame++) scene.update(1 / 60);
    const body = viewPoint(scene, 0, 0.3);
    scene.pointerDown(at(2, body.x, body.y));
    let frames = 0;
    while (scene.update(1 / 60) && frames < 600) frames++;
    expect(frames).toBeLessThan(120);
    expect(scene.debug()).toMatchObject({ grabs: 1, bodyMode: "held" });
    expect(Math.abs((scene.debug().x as number) - W / 2)).toBeGreaterThan(10);
  });

  it("a friend caught against a wall cannot be pulled past the inset", () => {
    const scene = fixture("playful");
    slingLeft(scene);
    let frames = 0;
    while (scene.debug().bodyBounces === 0 && frames < 240) {
      scene.update(1 / 120);
      frames++;
    }
    expect(scene.debug().bodyBounces).toBeGreaterThan(0);
    const edge = viewPoint(scene, -0.8, 0.1);
    scene.pointerDown(at(2, edge.x, edge.y));
    expect(scene.debug().grabs).toBe(1);
    for (let step = 1; step <= 30; step++) {
      scene.pointerMove(at(2, edge.x - step * 12, edge.y));
      scene.update(1 / 60);
      const state = scene.debug(),
        mesh = meshOf(scene);
      const box = silhouetteBounds(mesh, state.matrix as Matrix, R);
      expect(box.minX, `step ${step}`).toBeGreaterThanOrEqual(24 - 1e-6);
      expect(validMesh(mesh)).toBe(true);
    }
  });

  it("SQ10: pickup lands on the travelling, leaning friend's actual painted material", () => {
    const scene = fixture("playful");
    slingLeft(scene);
    for (let frame = 0; frame < 6; frame++) scene.update(1 / 60);
    const moving = scene.debug();
    expect(Math.abs((moving.x as number) - W / 2)).toBeGreaterThan(20);
    const pose = moving.bodyPose as { tilt: number; sway: number };
    expect(Math.abs(pose.tilt) + Math.abs(pose.sway)).toBeGreaterThan(0);
    const [ex, ey] = FEATURES.eyes[0];
    const eye = viewPoint(scene, ex, ey);
    scene.pointerDown(at(2, eye.x, eye.y));
    expect(scene.debug().regions).toEqual(["eye"]);
  });

  it("SQ09: each region answers differently while its far side stays much steadier than the touched side", () => {
    for (const [name, x, y, dx, dy] of [
      ["curl", 0.14, -0.85, 0.3, -1.1],
      ["eye", -0.37, -0.1, -0.7, -0.4],
      ["cheek", 0.56, 0.15, 1.0, 0.2],
      ["foot", -0.6, 0.9, -0.5, 0.5],
      ["body", 0.2, 0.5, 0.6, 0.6],
    ] as const) {
      expect(regionAt(x, y).region).toBe(name);
      const scene = fixture("gentle");
      scene.pointerDown(at(1, W / 2 + x * R, H / 2 + y * R));
      scene.pointerMove(at(1, W / 2 + (x + dx) * R, H / 2 + (y + dy) * R));
      scene.update(1 / 60);
      expect(scene.debug().regions).toEqual([name]);
      const m = meshOf(scene);
      let near = 0,
        far = 0;
      for (let i = 0; i < m.length; i += 2) {
        const moved = Math.hypot(m[i] - restMesh[i], m[i + 1] - restMesh[i + 1]);
        const distance = Math.hypot(restMesh[i] - x, restMesh[i + 1] - y);
        if (distance < 0.45) near = Math.max(near, moved);
        if (distance > 1.6) far = Math.max(far, moved);
      }
      expect(near, name).toBeGreaterThan(0.2);
      expect(far, name).toBeLessThan(near / 3);
      expect(validMesh(m)).toBe(true);
    }
  });

  it("a quick tap on a part still springing back pokes rather than slinging the friend", () => {
    const scene = fixture("playful");
    scene.pointerDown(at(1, W / 2 + 0.14 * R, H / 2 - 0.85 * R));
    scene.pointerMove(at(1, W / 2 + 0.14 * R, H / 2 - 1.9 * R));
    scene.update(1 / 60);
    scene.pointerEnd(1);
    // Hold the travelling friend still, then tap the still-stretched curl.
    const body = viewPoint(scene, 0, 0.3);
    scene.pointerDown(at(2, body.x, body.y));
    scene.update(1 / 60);
    const tip = viewPoint(scene, 0.2, -0.95);
    scene.pointerDown(at(3, tip.x, tip.y));
    scene.pointerEnd(3);
    scene.pointerEnd(2);
    const x = scene.debug().x as number;
    for (let frame = 0; frame < 12; frame++) scene.update(1 / 60);
    // A poke only squashes and sways; it never flings the body sideways.
    expect(Math.abs((scene.debug().x as number) - x)).toBeLessThan(40);
  });
});
