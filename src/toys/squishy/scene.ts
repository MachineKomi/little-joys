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
  restRadius,
  type Grab,
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
} from "./mesh";
import { prepareTexture } from "./texture";
export class SquishyScene implements ToyScene {
  readonly id = "squishy" as const;
  private view: View = { width: 800, height: 600 };
  private grabs = new Map<number, Grab>();
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
  private recoil = { x: 0, y: 0 };
  private offset = { x: 0, y: 0 };
  private returnOffset = { x: 0, y: 0 };
  private dirty = false;
  private materialTexture?: HTMLCanvasElement;
  private textureAttempted = false;
  private meshMoving = false;
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
    constrainMesh(this.mesh, this.bounds());
    constrainMesh(this.returnStart, this.bounds());
    constrainMesh(this.baseMesh, this.bounds());
    this.clampOffset();
  }
  private center() {
    return {
      x: this.view.width / 2 + this.offset.x,
      y: this.view.height / 2 + this.offset.y,
    };
  }
  private bounds() {
    return {
      x: Math.max(EXTENT, (this.view.width / 2 - 24) / this.radius),
      y: Math.max(EXTENT, (this.view.height / 2 - 24) / this.radius),
    };
  }
  private clampOffset() {
    const bounds = this.bounds();
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (let i = 0; i < this.mesh.length; i += 2) {
      minX = Math.min(minX, this.mesh[i]);
      maxX = Math.max(maxX, this.mesh[i]);
      minY = Math.min(minY, this.mesh[i + 1]);
      maxY = Math.max(maxY, this.mesh[i + 1]);
    }
    this.offset.x = Math.max(
      (-bounds.x - minX) * this.radius,
      Math.min((bounds.x - maxX) * this.radius, this.offset.x),
    );
    this.offset.y = Math.max(
      (-bounds.y - minY) * this.radius,
      Math.min((bounds.y - maxY) * this.radius, this.offset.y),
    );
  }
  private refreshMesh() {
    const influences = [...this.grabs.values()];
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
        dx: g.x + g.dx - this.offset.x / this.radius - anchor.x,
        dy: g.y + g.dy - this.offset.y / this.radius - anchor.y,
      };
    });
    targetMesh(
      this.meshTarget,
      local,
      this.bounds(),
      this.meshScratch,
      this.baseMesh,
    );
    this.mesh.set(this.meshTarget);
    this.dirty = false;
    this.clampOffset();
  }
  private beginReturn(grab: Grab | undefined, reason: "up" | "cancel") {
    this.returnStart.set(this.mesh);
    this.baseMesh.set(this.mesh);
    this.returnElapsed =
      this.mesh.some((v, i) => Math.abs(v - restMesh[i]) > 1e-7) ||
      this.offset.x ||
      this.offset.y
        ? 0
        : null;
    this.returnMotion =
      reason === "up" ? this.services.settings.motion : "gentle";
    this.returnOffset = { ...this.offset };
    const playful = grab && reason === "up" && this.returnMotion === "playful";
    this.recoil = playful
      ? {
          x: Math.max(-18, Math.min(18, -grab.dx * 18)),
          y:
            -Math.min(36, this.radius * 0.16) *
            Math.min(1, 0.35 + Math.hypot(grab.dx, grab.dy)),
        }
      : { x: 0, y: 0 };
    this.returning.clear();
    this.dirty = false;
  }
  pointerDown(p: ToyPointer): void {
    const c = this.center(),
      x = (p.x - c.x) / this.radius,
      y = (p.y - c.y) / this.radius;
    const material = materialPoint(this.mesh, x, y);
    const a = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2),
      i = Math.round((a / (Math.PI * 2)) * ANCHORS) % ANCHORS;
    // Include the rendered curl/toes and bounded texture displacement. This deliberately
    // forgiving envelope accepts near-body touches; it never takes an existing grab.
    const hitRadius = this.services.image?.("friend")
      ? 1.45
      : this.radii[i] + 0.035;
    if (
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
      this.grabs.set(p.id, {
        id: p.id,
        ...anchor,
        dx: x + this.offset.x / this.radius - anchor.x,
        dy: y + this.offset.y / this.radius - anchor.y,
      });
      this.dirty = true;
      this.services.sound("squishy");
    }
    if (this.marks.length === 24) this.marks.shift();
    this.marks.push({ x: p.x, y: p.y, life: 0.25 });
  }
  pointerMove(p: ToyPointer): void {
    const g = this.grabs.get(p.id);
    if (!g) return;
    const c = { x: this.view.width / 2, y: this.view.height / 2 };
    let dx = (p.x - c.x) / this.radius - g.x,
      dy = (p.y - c.y) / this.radius - g.y;
    const l = Math.hypot(dx, dy);
    if (!Number.isFinite(l)) return;
    if (l > MAX_PULL) {
      dx *= MAX_PULL / l;
      dy *= MAX_PULL / l;
    }
    g.dx = dx;
    g.dy = dy;
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
      const t = Math.min(
        1,
        this.returnElapsed / RETURN_SECONDS[this.returnMotion],
      );
      const bounce = Math.sin(Math.PI * t) * (1 - t);
      this.offset.x = this.returnOffset.x * (1 - t) + this.recoil.x * bounce;
      this.offset.y = this.returnOffset.y * (1 - t) + this.recoil.y * bounce;
      if (t === 1) {
        this.returnElapsed = null;
        this.offset = { x: 0, y: 0 };
      } else moving = true;
      this.dirty = true;
    }
    for (const [id, state] of this.returning) {
      state.elapsed += dt;
      if (state.elapsed >= RETURN_SECONDS[state.motion])
        this.returning.delete(id);
      this.dirty = true;
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
      c = this.center(),
      r = this.radius;
    ctx.fillStyle = "#fbf7ef";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#eee9df";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + r * 1.08, r * 0.77, r * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
    const sprite = this.services.image?.("friend");
    if (sprite) {
      if (!this.textureAttempted) {
        this.textureAttempted = true;
        this.materialTexture = prepareTexture(sprite);
      }
      if (this.meshMoving)
        drawMesh(ctx, this.materialTexture ?? sprite, this.mesh, r, c.x, c.y);
      else
        ctx.drawImage(
          sprite,
          c.x - r * 1.17,
          c.y - r * 1.17,
          r * 2.34,
          r * 2.34,
        );
    } else {
      ctx.save();
      ctx.translate(c.x, c.y);
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
      ctx.restore();
    }
    for (const m of this.marks) {
      ctx.globalAlpha = (m.life / 0.25) * 0.38;
      ctx.strokeStyle = "#7aa99d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 13, 0, Math.PI * 2);
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
      ...this.center(),
    };
  }
  dispose(): void {
    this.cancelAll();
    this.marks = [];
    this.face.clear();
    if (this.materialTexture)
      this.materialTexture.width = this.materialTexture.height = 0;
    this.materialTexture = undefined;
  }
}
