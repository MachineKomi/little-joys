import { describe, expect, it } from "vitest";
import { defaults } from "../../src/core/settings";
import { type Grab } from "../../src/toys/squishy/deformation";
import {
  restMesh,
  signedArea,
  targetMesh,
  triangles,
} from "../../src/toys/squishy/mesh";
import { SquishyScene } from "../../src/toys/squishy/scene";

function verifyOrientation(points: Float64Array) {
  for (let t = 0; t < triangles.length; t += 3) {
    const [a, b, c] = [triangles[t], triangles[t + 1], triangles[t + 2]];
    expect(signedArea(points, a, b, c)).toBeGreaterThanOrEqual(
      signedArea(restMesh, a, b, c) * 0.3 - 1e-12,
    );
  }
}

describe("actual textured deformation geometry", () => {
  it("T01/T08: the loaded sprite toe and outer belly are grabbable beyond the fallback contour", () => {
    const scene = new SquishyScene({
      settings: { ...defaults },
      sound: () => {},
      image: () =>
        ({ naturalWidth: 768, naturalHeight: 768 }) as HTMLImageElement,
    });
    scene.resize({ width: 810, height: 972 });
    const radius = 810 * 0.29;
    // Opaque points inspected on the 768px runtime sprite: a toe and outer belly.
    for (const [id, sourceX, sourceY] of [
      [1, 190, 700],
      [2, 700, 545],
    ]) {
      const x = 405 + ((sourceX / 768) * 2 - 1) * 1.17 * radius;
      const y = 486 + ((sourceY / 768) * 2 - 1) * 1.17 * radius;
      scene.pointerDown({ id, x, y, previousX: x, previousY: y, timeMs: 0 });
    }
    expect(scene.debug().grabs).toBe(2);
  });

  it("T08: scene pointer movement actually changes nearby texture vertices", () => {
    const scene = new SquishyScene({
      settings: { ...defaults },
      sound: () => {},
    });
    scene.resize({ width: 810, height: 972 });
    scene.pointerDown({
      id: 1,
      x: 559,
      y: 486,
      previousX: 559,
      previousY: 486,
      timeMs: 0,
    });
    scene.pointerMove({
      id: 1,
      x: 712,
      y: 486,
      previousX: 559,
      previousY: 486,
      timeMs: 16,
    });
    scene.update(1 / 60);
    const mesh = (scene.snapshot() as { mesh: number[] }).mesh;
    let largestNearDisplacement = 0;
    for (let i = 0; i < mesh.length; i += 2)
      if (
        restMesh[i] > 0.3 &&
        restMesh[i] < 1 &&
        Math.abs(restMesh[i + 1]) < 0.4
      )
        largestNearDisplacement = Math.max(
          largestNearDisplacement,
          mesh[i] - restMesh[i],
        );
    expect(largestNearDisplacement).toBeGreaterThan(0.2);
    verifyOrientation(new Float64Array(mesh));
  });

  it("T08: one-use Map iterators produce the same deformation as arrays", () => {
    const grabs: Grab[] = [{ id: 1, x: 0.8, y: 0, dx: 0.35, dy: 0 }];
    const arrayResult = new Float64Array(restMesh.length),
      iteratorResult = new Float64Array(restMesh.length);
    targetMesh(arrayResult, grabs);
    targetMesh(
      iteratorResult,
      new Map(grabs.map((grab) => [grab.id, grab])).values(),
    );
    expect([...iteratorResult]).toEqual([...arrayResult]);
  });

  it("T08: raster vertices move locally, preserving the far side rather than scaling the image", () => {
    const output = new Float64Array(restMesh.length);
    targetMesh(output, [{ id: 1, x: 0.8, y: 0, dx: 0.35, dy: 0 }]);
    let near = 0,
      far = 0;
    for (let i = 0; i < output.length; i += 2) {
      const delta = Math.hypot(
        output[i] - restMesh[i],
        output[i + 1] - restMesh[i + 1],
      );
      if (restMesh[i] > 0.6) near += delta;
      if (restMesh[i] < -0.6) far += delta;
    }
    expect(near).toBeGreaterThan(1);
    expect(far).toBeLessThan(near / 10);
    verifyOrientation(output);
  });

  it("T09: four opposing full-limit drags never invert or reflect an affine triangle", () => {
    const output = new Float64Array(restMesh.length);
    const grabs: Grab[] = [
      { id: 1, x: 0.8, y: 0, dx: 0.35, dy: 0 },
      { id: 2, x: -0.8, y: 0, dx: -0.35, dy: 0 },
      { id: 3, x: 0, y: 0.8, dx: 0, dy: 0.35 },
      { id: 4, x: 0, y: -0.8, dx: 0, dy: -0.35 },
    ];
    targetMesh(output, grabs);
    verifyOrientation(output);
    for (let i = 0; i < output.length; i += 2)
      expect(
        Math.hypot(output[i] - restMesh[i], output[i + 1] - restMesh[i + 1]),
      ).toBeLessThan(0.4);
    // Every intermediate frame of a Gentle return must also preserve winding.
    for (let step = 1; step <= 20; step++) {
      const frame = Float64Array.from(
        output,
        (value, i) => value + (restMesh[i] - value) * (step / 20),
      );
      verifyOrientation(frame);
    }
  });

  it("T09: deterministic adversarial four-contact combinations preserve triangle winding", () => {
    let seed = 73191;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const output = new Float64Array(restMesh.length);
    for (let n = 0; n < 160; n++) {
      const grabs = Array.from({ length: 4 }, (_, id) => {
        const angle = random() * Math.PI * 2;
        return {
          id,
          x: random() * 2 - 1,
          y: random() * 2 - 1,
          dx: Math.cos(angle) * 0.35,
          dy: Math.sin(angle) * 0.35,
        };
      });
      targetMesh(output, grabs);
      expect([...output].every(Number.isFinite)).toBe(true);
      verifyOrientation(output);
    }
  });

  it("T09: a bounded but inverted saved mesh is rejected before rendering", () => {
    const malformed = Array.from(restMesh);
    [malformed[0], malformed[2]] = [malformed[2], malformed[0]];
    [malformed[1], malformed[3]] = [malformed[3], malformed[1]];
    expect(
      signedArea(
        new Float64Array(malformed),
        triangles[0],
        triangles[1],
        triangles[2],
      ),
    ).toBeLessThan(0);
    const scene = new SquishyScene(
      { settings: { ...defaults }, sound: () => {} },
      { mesh: malformed },
    );
    const snapshot = scene.snapshot() as { mesh: number[] };
    verifyOrientation(new Float64Array(snapshot.mesh));
  });
});
