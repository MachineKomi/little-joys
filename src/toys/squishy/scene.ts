import type {
  SceneServices,
  ToyPointer,
  ToyScene,
  View,
} from "../../core/types";
import {
  ANCHORS,
  displace,
  MAX_PULL,
  RETURN_SECONDS,
  returnAmount,
  radiusAt,
  regionAt,
  restRadius,
  type Grab,
  type Region,
} from "./deformation";
import {
  constrainMesh,
  drawMesh,
  EXTENT,
  materialPoint,
  restMesh,
  surfacePoint,
  targetMesh,
  validMesh,
  type MeshBounds,
} from "./mesh";
import { prepareTexture } from "./texture";
import {
  apply,
  BodyMotion,
  bodyMatrix,
  invert,
  type BodyLimits,
  type BodyPose,
  type Matrix,
} from "./body";

/** A finger on the friend: its material point plus where the finger is now, in view pixels. */
interface Contact extends Grab {
  region: Region;
  fingerX: number;
  fingerY: number;
  startX: number;
  startY: number;
}
/** The painted outline of the shipped 768px sprite, traced from its alpha at 24
 * angles around the centre (rest radii). It follows the mesh and the pose. */
export const OUTLINE = [
  [0.856, 0], [0.96, 0.259], [0.966, 0.558], [0.81, 0.81], [0.591, 1.021], [0.259, 0.96],
  [0, 0.975], [-0.256, 0.957], [-0.588, 1.021], [-0.814, 0.814], [-0.972, 0.561], [-0.966, 0.259],
  [-0.859, 0], [-0.771, -0.207], [-0.682, -0.393], [-0.555, -0.555], [-0.393, -0.679], [-0.207, -0.771],
  [0, -0.981], [0.262, -0.981], [0.387, -0.67], [0.548, -0.548], [0.673, -0.39], [0.762, -0.204],
] as const;
/** Painted silhouette bounds through a deformed mesh and a body matrix, in the
 * matrix's output pixels. */
export function silhouetteBounds(mesh: Float64Array, matrix: Matrix, radius: number) {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const [x, y] of OUTLINE) {
    const surface = surfacePoint(mesh, x, y) ?? { x, y };
    const p = apply(matrix, surface.x * radius, surface.y * radius);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}
/** Pixels kept between the traced outline and the inset, covering the curve between samples. */
const OUTLINE_MARGIN = 3;
/** A release after less finger travel than this (rest radii) is a poke. */
const POKE_TRAVEL = 0.12;
const sameMatrix = (a: Matrix, b: Matrix) => a.every((value, i) => value === b[i]);

export class SquishyScene implements ToyScene {
  readonly id = "squishy" as const;
  private view: View = { width: 800, height: 600 };
  private grabs = new Map<number, Contact>();
  private radii = Float64Array.from({ length: ANCHORS }, (_, i) =>
    restRadius((i * 2 * Math.PI) / ANCHORS),
  );
  private face = new Map<string, { x: number; y: number }>();
  private marks: { x: number; y: number; life: number }[] = [];
  private radius = 180;
  private mesh = new Float64Array(restMesh);
  private meshTarget = new Float64Array(restMesh);
  private meshScratch = new Float64Array(restMesh.length);
  private returnStart = new Float64Array(restMesh);
  private baseMesh = new Float64Array(restMesh);
  private returning = new Map<
    number,
    { grab: Grab; elapsed: number; motion: "gentle" | "playful" }
  >();
  private returnElapsed: number | null = null;
  private returnMotion: "gentle" | "playful" = "gentle";
  /** Whole-body Playful response: travel, edge squash, lean and sway. */
  private body = new BodyMotion();
  private matrix: Matrix = [1, 0, 0, 1, 400, 300];
  private inverse: Matrix = [1, 0, 0, 1, -400, -300];
  private dirty = false;
  private materialTexture?: HTMLCanvasElement;
  private textureAttempted = false;
  private meshMoving = false;
  /** The traced outline on the current deformed surface, refreshed once per frame. */
  private outline: { x: number; y: number }[] = OUTLINE.map(([x, y]) => ({ x, y }));
  constructor(
    private services: SceneServices,
    snapshot?: unknown,
  ) {
    if (snapshot && typeof snapshot === "object") {
      const s = snapshot as { radii?: unknown; face?: unknown },
        r = s.radii;
      if (
        Array.isArray(r) &&
        r.length === ANCHORS &&
        r.every(
          (v) =>
            typeof v === "number" && Number.isFinite(v) && v > 0.5 && v < 1.5,
        )
      )
        this.radii.set(r);
      if (s.face && typeof s.face === "object")
        for (const key of [
          "leftEye",
          "rightEye",
          "leftCheek",
          "rightCheek",
          "mouth",
        ]) {
          const p = (s.face as Record<string, unknown>)[key];
          if (p && typeof p === "object") {
            const { x, y } = p as { x: number; y: number };
            if (
              Number.isFinite(x) &&
              Number.isFinite(y) &&
              Math.abs(x) < 0.8 &&
              Math.abs(y) < 0.8
            )
              this.face.set(key, { x, y });
          }
        }
      const mesh = (snapshot as { mesh?: unknown }).mesh;
      if (
        Array.isArray(mesh) &&
        mesh.length === restMesh.length &&
        mesh.every(
          (v, i) => Number.isFinite(v) && Math.abs(v - restMesh[i]) <= 1.5,
        ) &&
        validMesh(Float64Array.from(mesh))
      ) {
        this.mesh.set(mesh);
        this.meshMoving = true;
        this.beginReturn(undefined, "cancel");
      }
    }
  }
  resize(view: View): void {
    this.cancelAll();
    this.view = view;
    this.radius = Math.min(view.width, view.height) * 0.29;
    // A new layout starts the body at home; no animation across the change.
    this.body.reset();
    this.updateMatrix();
    constrainMesh(this.mesh, this.bounds());
    constrainMesh(this.returnStart, this.bounds());
    constrainMesh(this.baseMesh, this.bounds());
  }
  private updateMatrix() {
    this.matrix = bodyMatrix(
      this.body,
      this.view.width / 2,
      this.view.height / 2,
      this.radius,
    );
    this.inverse = invert(this.matrix);
  }
  private center() {
    return {
      x: this.view.width / 2 + this.body.x,
      y: this.view.height / 2 + this.body.y,
    };
  }
  /** One-sided local mesh limits for wherever the body is: the whole texture
   * square stays inside the 24px inset, except that the rest mesh is always
   * allowed, so a body resting against a wall keeps its transparent margin. */
  private bounds(): MeshBounds {
    const r = this.radius,
      halfWidth = this.view.width / 2 - 24,
      halfHeight = this.view.height / 2 - 24;
    return {
      x: EXTENT,
      y: EXTENT,
      left: Math.min(-EXTENT, (-halfWidth - this.body.x) / r),
      right: Math.max(EXTENT, (halfWidth - this.body.x) / r),
      top: Math.min(-EXTENT, (-halfHeight - this.body.y) / r),
      bottom: Math.max(EXTENT, (halfHeight - this.body.y) / r),
    };
  }
  /** Re-map the traced outline onto the current deformed surface, once per frame. */
  private measureOutline() {
    this.outline = OUTLINE.map(([x, y]) => surfacePoint(this.mesh, x, y) ?? { x, y });
  }
  /** Room for the body centre so the painted silhouette, with its current
   * deformation, lean, sway and squash, stays inside the 24px inset. */
  private bodyLimits(body: BodyPose): BodyLimits {
    const r = this.radius,
      pose = bodyMatrix({ ...body, x: 0, y: 0 }, 0, 0, r);
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const surface of this.outline) {
      const p = apply(pose, surface.x * r, surface.y * r);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const halfWidth = this.view.width / 2 - 24 - OUTLINE_MARGIN,
      halfHeight = this.view.height / 2 - 24 - OUTLINE_MARGIN;
    return {
      left: -halfWidth - minX,
      right: halfWidth - maxX,
      top: -halfHeight - minY,
      bottom: halfHeight - maxY,
    };
  }
  /** CSS pixels by which the painted outline on `mesh`, at the current body
   * matrix, passes the inset kept for the body (zero or less when inside). */
  private outlineExcess(mesh: Float64Array): number {
    const r = this.radius,
      edge = 24 + OUTLINE_MARGIN,
      right = this.view.width - edge,
      bottom = this.view.height - edge;
    let excess = -Infinity;
    for (const [x, y] of OUTLINE) {
      const surface = surfacePoint(mesh, x, y) ?? { x, y };
      const p = apply(this.matrix, surface.x * r, surface.y * r);
      excess = Math.max(excess, edge - p.x, p.x - right, edge - p.y, p.y - bottom);
    }
    return excess;
  }
  private refreshMesh() {
    const r = this.radius,
      influences: Grab[] = [];
    for (const g of this.grabs.values()) {
      // Each finger is mapped through the current body pose, so a caught,
      // leaning or squashed friend is pulled exactly where it is touched.
      const local = apply(this.inverse, g.fingerX, g.fingerY);
      let dx = local.x / r - g.x,
        dy = local.y / r - g.y;
      const length = Math.hypot(dx, dy),
        reach = g.reach ?? MAX_PULL;
      if (!Number.isFinite(length)) continue;
      if (length > reach) {
        dx *= reach / length;
        dy *= reach / length;
      }
      g.dx = dx;
      g.dy = dy;
      influences.push(g);
    }
    for (const state of this.returning.values()) {
      const amount = returnAmount(state.elapsed, state.motion);
      influences.push({
        ...state.grab,
        dx: state.grab.dx * amount,
        dy: state.grab.dy * amount,
        pressure: amount,
      });
    }
    const local = influences.map((g) => {
      const anchor = surfacePoint(this.baseMesh, g.x, g.y) ?? g;
      return {
        ...g,
        x: anchor.x,
        y: anchor.y,
        dx: g.x + g.dx - anchor.x,
        dy: g.y + g.dy - anchor.y,
      };
    });
    targetMesh(
      this.meshTarget,
      local,
      this.bounds(),
      this.meshScratch,
      this.baseMesh,
    );
    // Away from home or mid-response, a pull toward an edge cannot push the
    // painted outline past the inset: keep the largest share of this frame's
    // new deformation that still fits. At rest, bounds() already guarantees it.
    if (
      (this.body.mode !== "rest" || this.body.x !== 0 || this.body.y !== 0) &&
      this.outlineExcess(this.meshTarget) > 0 &&
      this.outlineExcess(this.baseMesh) <= 0
    ) {
      let keep = 0,
        drop = 1;
      for (let i = 0; i < 10; i++) {
        const share = (keep + drop) / 2;
        for (let j = 0; j < this.meshScratch.length; j++)
          this.meshScratch[j] =
            this.baseMesh[j] + (this.meshTarget[j] - this.baseMesh[j]) * share;
        if (validMesh(this.meshScratch) && this.outlineExcess(this.meshScratch) <= 0)
          keep = share;
        else drop = share;
      }
      for (let j = 0; j < this.meshTarget.length; j++)
        this.meshTarget[j] =
          this.baseMesh[j] + (this.meshTarget[j] - this.baseMesh[j]) * keep;
    }
    this.mesh.set(this.meshTarget);
    this.dirty = false;
  }
  private beginReturn(grab: Contact | undefined, reason: "up" | "cancel") {
    this.returnStart.set(this.mesh);
    this.baseMesh.set(this.mesh);
    this.returnElapsed = this.mesh.some(
      (v, i) => Math.abs(v - restMesh[i]) > 1e-7,
    )
      ? 0
      : null;
    this.returnMotion =
      reason === "up" ? this.services.settings.motion : "gentle";
    this.returning.clear();
    this.dirty = false;
    // Gentle, system reduced motion and every cancellation finish quietly.
    if (!grab || reason !== "up" || this.services.settings.motion !== "playful") {
      this.body.settle();
      return;
    }
    const r = this.radius,
      pullX = grab.fingerX - grab.startX,
      pullY = grab.fingerY - grab.startY,
      travel = Math.hypot(pullX, pullY);
    // A tap is a poke, even on a part still springing back: what counts is how
    // far the finger drew the material, not where that material currently is.
    if (travel < POKE_TRAVEL * r) this.body.poke(grab.x, grab.y);
    else {
      // A pull slings the friend opposite to it, no further than its reach.
      const limit = (grab.reach ?? MAX_PULL) * r,
        scale = travel > limit ? limit / travel : 1;
      this.body.launch(pullX * scale, pullY * scale);
    }
  }
  pointerDown(p: ToyPointer): void {
    const local = apply(this.inverse, p.x, p.y),
      x = local.x / this.radius,
      y = local.y / this.radius;
    const material = materialPoint(this.mesh, x, y);
    const a = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2),
      i = Math.round((a / (Math.PI * 2)) * ANCHORS) % ANCHORS;
    // Include the rendered curl/toes and bounded texture displacement. This deliberately
    // forgiving envelope accepts near-body touches; it never takes an existing grab.
    const hitRadius = this.services.image?.("friend")
      ? 1.45
      : this.radii[i] + 0.035;
    if (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      (Boolean(material) || Math.hypot(x, y) <= hitRadius) &&
      this.grabs.size < 4 &&
      ![...this.grabs.values()].some(
        (g) =>
          Math.hypot((material?.x ?? x) - g.x, (material?.y ?? y) - g.y) < 0.12,
      )
    ) {
      const anchor = material ?? { x, y };
      this.returning.delete(p.id);
      while (this.grabs.size + this.returning.size >= 4)
        this.returning.delete(this.returning.keys().next().value!);
      // Keep the existing return as a decaying base. A new local influence is
      // composed over it, so an opposite-side touch cannot discard that pose.
      const profile = regionAt(anchor.x, anchor.y);
      this.grabs.set(p.id, {
        id: p.id,
        x: anchor.x,
        y: anchor.y,
        dx: x - anchor.x,
        dy: y - anchor.y,
        spread: profile.spread,
        reach: profile.reach,
        region: profile.region,
        fingerX: p.x,
        fingerY: p.y,
        startX: p.x,
        startY: p.y,
      });
      // Touching the friend catches it wherever it is.
      this.body.hold();
      this.dirty = true;
      this.services.sound("squishy");
    }
    if (this.marks.length === 24) this.marks.shift();
    this.marks.push({ x: p.x, y: p.y, life: 0.25 });
  }
  pointerMove(p: ToyPointer): void {
    const g = this.grabs.get(p.id);
    if (!g || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    g.fingerX = p.x;
    g.fingerY = p.y;
    this.dirty = true;
  }
  pointerEnd(id: number, reason: "up" | "cancel" = "up"): void {
    const grab = this.grabs.get(id);
    if (!grab) return;
    // A complete quick tap can arrive between frames. Capture its local response
    // before starting the finite return; do not drop it as an untouched rest pose.
    if (this.dirty) this.refreshMesh();
    this.grabs.delete(id);
    if (!this.grabs.size) this.beginReturn(grab, reason);
    else
      this.returning.set(id, {
        grab: { ...grab },
        elapsed: 0,
        motion: reason === "up" ? this.services.settings.motion : "gentle",
      });
  }
  cancelAll(): void {
    this.grabs.clear();
    this.returning.clear();
    this.beginReturn(undefined, "cancel");
  }
  update(dt: number): boolean {
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
    const blend = 1 - Math.exp(-dt * 18);
    let moving = false;
    if (this.returnElapsed !== null) {
      this.returnElapsed += dt;
      const amount = returnAmount(this.returnElapsed, this.returnMotion);
      for (let i = 0; i < this.mesh.length; i++)
        this.baseMesh[i] =
          restMesh[i] + (this.returnStart[i] - restMesh[i]) * amount;
      constrainMesh(this.baseMesh, this.bounds());
      if (this.returnElapsed >= RETURN_SECONDS[this.returnMotion])
        this.returnElapsed = null;
      else moving = true;
      this.dirty = true;
    }
    for (const [id, state] of this.returning) {
      state.elapsed += dt;
      if (state.elapsed >= RETURN_SECONDS[state.motion])
        this.returning.delete(id);
      this.dirty = true;
    }
    if (this.body.mode !== "rest") {
      const before = this.matrix;
      this.measureOutline();
      const continuing = this.body.step(dt, (pose) => this.bodyLimits(pose));
      this.updateMatrix();
      // Held fingers follow the relaxing pose; re-map them this frame.
      if (this.grabs.size && !sameMatrix(before, this.matrix)) this.dirty = true;
      if (continuing) moving = true;
    }
    if (this.dirty) this.refreshMesh();
    moving ||= this.returning.size > 0;
    this.meshMoving = false;
    for (let i = 0; i < this.mesh.length; i++) {
      if (Math.abs(this.mesh[i] - restMesh[i]) > 0.00015)
        this.meshMoving = true;
    }
    for (let i = 0; i < ANCHORS; i++) {
      const target = radiusAt((i * 2 * Math.PI) / ANCHORS, this.grabs.values());
      const d = target - this.radii[i];
      if (Math.abs(d) > 0.00015) {
        this.radii[i] += d * (this.grabs.size ? 1 : blend);
        moving = true;
      } else this.radii[i] = target;
    }
    const features: Record<string, [number, number]> = {
      leftEye: [-0.28, -0.1],
      rightEye: [0.28, -0.1],
      leftCheek: [-0.43, 0.16],
      rightCheek: [0.43, 0.16],
      mouth: [0, 0.19],
    };
    for (const [name, [x, y]] of Object.entries(features)) {
      const target = displace(x, y, this.grabs.values());
      const old = this.face.get(name) ?? { x, y };
      const delta = Math.hypot(target.x - old.x, target.y - old.y);
      if (delta > 0.00015) moving = true;
      const b = this.grabs.size ? 1 : blend;
      this.face.set(name, {
        x: old.x + (target.x - old.x) * b,
        y: old.y + (target.y - old.y) * b,
      });
    }
    for (const mark of this.marks) mark.life -= dt;
    this.marks = this.marks.filter((m) => m.life > 0);
    return moving || this.marks.length > 0;
  }
  render(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h } = this.view,
      r = this.radius,
      m = this.matrix;
    ctx.fillStyle = "#fbf7ef";
    ctx.fillRect(0, 0, w, h);
    // The floor shadow stays on the ground under the body and shrinks as it rises.
    const lift = Math.max(0, -this.body.y),
      shadow = Math.max(0.55, 1 - lift / (r * 2.4));
    ctx.fillStyle = "#eee9df";
    ctx.beginPath();
    ctx.ellipse(
      w / 2 + this.body.x,
      h / 2 + r * 1.08 + Math.max(0, this.body.y),
      r * 0.77 * shadow,
      r * 0.075 * shadow,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    const sprite = this.services.image?.("friend");
    ctx.save();
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    if (sprite) {
      if (!this.textureAttempted) {
        this.textureAttempted = true;
        this.materialTexture = prepareTexture(sprite);
      }
      // Whole-body travel, lean, sway and squash are this one transform; the
      // triangle mesh is drawn only while the painted surface is deformed.
      if (this.meshMoving)
        drawMesh(ctx, this.materialTexture ?? sprite, this.mesh, r, 0, 0);
      else ctx.drawImage(sprite, -r * 1.17, -r * 1.17, r * 2.34, r * 2.34);
    } else {
      ctx.scale(r, r);
      const points = Array.from(this.radii, (rr, i) => {
        const a = (i * 2 * Math.PI) / ANCHORS;
        return { x: Math.cos(a) * rr, y: Math.sin(a) * rr };
      });
      const last = points[ANCHORS - 1],
        first = points[0];
      ctx.beginPath();
      ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
      for (let i = 0; i < ANCHORS; i++) {
        const p = points[i],
          n = points[(i + 1) % ANCHORS];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + n.x) / 2, (p.y + n.y) / 2);
      }
      ctx.closePath();
      const body = ctx.createRadialGradient(-0.35, -0.5, 0.05, 0.1, 0.25, 1.45);
      body.addColorStop(0, "#b3e9ce");
      body.addColorStop(0.45, "#77cdb1");
      body.addColorStop(1, "#319b8b");
      ctx.fillStyle = body;
      ctx.fill();
      ctx.lineWidth = 0.018;
      ctx.strokeStyle = "#337d70";
      ctx.stroke();
      const feature = (name: string, fallback: { x: number; y: number }) =>
        this.face.get(name) ?? fallback;
      for (const [name, x] of [
        ["leftCheek", -0.43],
        ["rightCheek", 0.43],
      ] as const) {
        const p = feature(name, { x, y: 0.16 });
        ctx.fillStyle = "#f6b092";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 0.145, 0.082, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const [name, x] of [
        ["leftEye", -0.28],
        ["rightEye", 0.28],
      ] as const) {
        const p = feature(name, { x, y: -0.1 });
        ctx.fillStyle = "#244942";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 0.057, 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff8e8";
        ctx.beginPath();
        ctx.arc(p.x - 0.015, p.y - 0.027, 0.015, 0, Math.PI * 2);
        ctx.fill();
      }
      const mouth = feature("mouth", { x: 0, y: 0.19 });
      ctx.beginPath();
      ctx.moveTo(mouth.x - 0.088, mouth.y);
      ctx.quadraticCurveTo(mouth.x, mouth.y + 0.105, mouth.x + 0.088, mouth.y);
      ctx.strokeStyle = "#244942";
      ctx.lineWidth = 0.02;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.restore();
    for (const mk of this.marks) {
      ctx.globalAlpha = (mk.life / 0.25) * 0.38;
      ctx.strokeStyle = "#7aa99d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  snapshot(): unknown {
    return {
      radii: Array.from(this.radii),
      face: Object.fromEntries(this.face),
      mesh: Array.from(this.mesh),
    };
  }
  debug() {
    return {
      grabs: this.grabs.size,
      effects: this.marks.length,
      radii: Array.from(this.radii),
      radius: this.radius,
      meshDisplacement: Math.max(
        ...this.mesh.map((value, i) => Math.abs(value - restMesh[i])),
      ),
      returning: this.returnElapsed !== null || this.returning.size > 0,
      mesh: Array.from(this.mesh),
      preparedRasterBytes: this.materialTexture
        ? this.materialTexture.width * this.materialTexture.height * 4
        : 0,
      bodyMode: this.body.mode,
      bodyBounces: this.body.bounces,
      bodyPose: {
        tilt: this.body.tilt,
        sway: this.body.sway,
        squash: this.body.squash,
      },
      matrix: [...this.matrix],
      regions: [...this.grabs.values()].map((g) => g.region),
      ...this.center(),
    };
  }
  dispose(): void {
    this.cancelAll();
    this.body.reset();
    this.marks = [];
    this.face.clear();
    if (this.materialTexture)
      this.materialTexture.width = this.materialTexture.height = 0;
    this.materialTexture = undefined;
  }
}
