import type {
  SceneServices,
  ToyPointer,
  ToyScene,
  View,
} from "../../core/types";
import {
  ANCHORS,
  displace,
  radiusAt,
  restRadius,
  type Grab,
} from "./deformation";
import { drawMesh, restMesh, targetMesh, validMesh } from "./mesh";
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
          (v, i) => Number.isFinite(v) && Math.abs(v - restMesh[i]) <= 0.36,
        ) &&
        validMesh(Float64Array.from(mesh))
      ) {
        this.mesh.set(mesh);
        this.meshMoving = true;
      }
    }
  }
  resize(view: View): void {
    this.cancelAll();
    this.view = view;
    this.radius = Math.min(view.width, view.height) * 0.29;
  }
  private center() {
    return { x: this.view.width / 2, y: this.view.height / 2 };
  }
  pointerDown(p: ToyPointer): void {
    const c = this.center(),
      x = (p.x - c.x) / this.radius,
      y = (p.y - c.y) / this.radius;
    const a = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2),
      i = Math.round((a / (Math.PI * 2)) * ANCHORS) % ANCHORS;
    // Include the rendered curl/toes and bounded texture displacement. This deliberately
    // forgiving envelope accepts near-body touches; it never takes an existing grab.
    const hitRadius = this.services.image?.("friend")
      ? 1.45
      : this.radii[i] + 0.035;
    if (
      Math.hypot(x, y) <= hitRadius &&
      this.grabs.size < 4 &&
      ![...this.grabs.values()].some((g) => Math.hypot(x - g.x, y - g.y) < 0.12)
    ) {
      this.grabs.set(p.id, { id: p.id, x, y, dx: 0, dy: 0 });
      this.services.sound("squishy");
    }
    if (this.marks.length === 24) this.marks.shift();
    this.marks.push({ x: p.x, y: p.y, life: 0.25 });
  }
  pointerMove(p: ToyPointer): void {
    const g = this.grabs.get(p.id);
    if (!g) return;
    const c = this.center();
    let dx = (p.x - c.x) / this.radius - g.x,
      dy = (p.y - c.y) / this.radius - g.y;
    const l = Math.hypot(dx, dy);
    if (l > 0.35) {
      dx *= 0.35 / l;
      dy *= 0.35 / l;
    }
    g.dx = dx;
    g.dy = dy;
  }
  pointerEnd(id: number): void {
    this.grabs.delete(id);
  }
  cancelAll(): void {
    this.grabs.clear();
  }
  update(dt: number): boolean {
    const blend = 1 - Math.exp(-Math.min(dt, 0.05) * 18);
    let moving = false;
    targetMesh(this.meshTarget, this.grabs.values());
    this.meshMoving = false;
    for (let i = 0; i < this.mesh.length; i++) {
      const d = this.meshTarget[i] - this.mesh[i];
      if (Math.abs(d) > 0.00015) {
        this.mesh[i] += d * (this.grabs.size ? 1 : blend);
        moving = true;
      } else this.mesh[i] = this.meshTarget[i];
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
      if (this.meshMoving) drawMesh(ctx, sprite, this.mesh, r, c.x, c.y);
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
      ...this.center(),
    };
  }
  dispose(): void {
    this.cancelAll();
    this.marks = [];
    this.face.clear();
  }
}
