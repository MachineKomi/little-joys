/** Whole-body Playful response of Squishy Friend: a bounded slingshot recoil
 * that travels, squashes against the play-area edges, leans and sways like
 * jelly, then springs home and stops. Pure and deterministic: CSS pixels and
 * seconds, no DOM, clock or randomness. Local finger deformation stays in the
 * mesh; everything here is one affine transform, so it costs a single draw. */
export type Matrix = [number, number, number, number, number, number];
export interface BodyLimits {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
export type BodyMode = "rest" | "flying" | "held" | "settling";
export const BODY_STEP = 1 / 120;
/** A flight hands over to a quiet settle after this long. */
export const FLIGHT_SECONDS = 2.3;
/** No single release response lasts longer than this. */
export const RESPONSE_LIMIT_SECONDS = 3.6;
export const MAX_LAUNCH_SPEED = 1600;
export const MAX_TILT = 0.06;
export const MAX_SWAY = 0.14;
export const MAX_SQUASH = 0.22;
/** Launch speed per pixel of stretch, and the small hop added to every launch. */
export const LAUNCH_GAIN = 4;
export const LAUNCH_HOP = 140;
/** A soft home spring, so a strong pull carries the body to the play-area edge. */
const HOME = (2 * Math.PI * 0.75) ** 2;
const HOME_DAMPING = 2 * 0.28 * Math.sqrt(HOME);
const SWAY_W = 2 * Math.PI * 2.2,
  SWAY_Z = 0.2;
const SQUASH_W = 2 * Math.PI * 3,
  SQUASH_Z = 0.3;
const TILT_W = 9,
  TILT_Z = 0.7;
const RESTITUTION = 0.55;
const SETTLE_RATE = 9;
const HOLD_RATE = 14;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export class BodyMotion {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  tilt = 0;
  tiltV = 0;
  sway = 0;
  swayV = 0;
  squash = 0;
  squashV = 0;
  /** Compression direction (radians) and the local anchor, in radius units, that stays put. */
  squashAngle = 0;
  squashAnchorX = 0;
  squashAnchorY = 0;
  mode: BodyMode = "rest";
  /** Seconds since the current release response began. */
  elapsed = 0;
  bounces = 0;
  private accumulator = 0;

  /** Slingshot recoil opposite to a stretch vector in CSS pixels. */
  launch(stretchX: number, stretchY: number): void {
    if (!Number.isFinite(stretchX) || !Number.isFinite(stretchY)) return;
    let vx = -stretchX * LAUNCH_GAIN,
      vy = -stretchY * LAUNCH_GAIN - LAUNCH_HOP;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_LAUNCH_SPEED) {
      vx *= MAX_LAUNCH_SPEED / speed;
      vy *= MAX_LAUNCH_SPEED / speed;
    }
    // The top lags behind the sudden start, then sways back.
    this.swayV = clamp(this.swayV - (vx - this.vx) * 0.00115, -3, 3);
    this.vx = vx;
    this.vy = vy;
    this.begin();
  }
  /** A quick tap: a bounded squash along the tap axis and a small sway. */
  poke(directionX: number, directionY: number): void {
    const length = Math.hypot(directionX, directionY);
    if (!Number.isFinite(length)) return;
    const nx = length > 1e-9 ? directionX / length : 0,
      ny = length > 1e-9 ? directionY / length : -1;
    this.squashAngle = Math.atan2(ny, nx);
    this.squashAnchorX = 0;
    this.squashAnchorY = 0;
    this.squashV = clamp(this.squashV + 4.2, -6, 6);
    this.swayV = clamp(this.swayV - nx * 0.9, -3, 3);
    this.begin();
  }
  /** Any release lets a caught or offset body spring home with overshoot. */
  release(): void {
    if (this.mode === "held") this.begin();
  }
  /** A finger holds the body where it is; travel stops and the pose relaxes. */
  hold(): void {
    this.mode = "held";
    this.vx = 0;
    this.vy = 0;
    this.accumulator = 0;
  }
  /** Pause, cancellation or resize: finish quietly, never overshooting. */
  settle(): void {
    if (this.mode === "rest") return;
    this.mode = "settling";
    this.vx = this.vy = this.tiltV = this.swayV = this.squashV = 0;
    this.accumulator = 0;
  }
  reset(): void {
    this.x = this.y = this.vx = this.vy = 0;
    this.tilt = this.tiltV = this.sway = this.swayV = this.squash = this.squashV = 0;
    this.mode = "rest";
    this.elapsed = 0;
    this.accumulator = 0;
  }
  private begin(): void {
    this.mode = "flying";
    this.elapsed = 0;
    this.bounces = 0;
    this.accumulator = 0;
  }
  /** Fixed-step advance with capped catch-up. Returns whether motion continues.
   * Limits may depend on the pose, so a lean or sway never pushes the silhouette
   * past an edge; they are then re-evaluated on every fixed step. */
  step(delta: number, limits: BodyLimits | ((pose: BodyPose) => BodyLimits)): boolean {
    if (this.mode === "rest") {
      this.accumulator = 0;
      return false;
    }
    const dt = Number.isFinite(delta) ? clamp(delta, 0, 0.05) : 0;
    this.accumulator = Math.min(0.05, this.accumulator + dt);
    // substep() can end the response, so re-read the mode through a function.
    const resting = () => this.mode === "rest";
    while (this.accumulator >= BODY_STEP - 1e-12 && !resting()) {
      this.substep(limits);
      this.accumulator -= BODY_STEP;
    }
    if (resting()) this.accumulator = 0;
    return !resting();
  }
  private substep(limitsOf: BodyLimits | ((pose: BodyPose) => BodyLimits)): void {
    const h = BODY_STEP;
    const room = (): BodyLimits =>
      typeof limitsOf === "function" ? limitsOf(this) : limitsOf;
    if (this.mode === "held" || this.mode === "settling") {
      // Exponential decay is monotonic: no crossing, no oscillation.
      const k = Math.exp(-(this.mode === "held" ? HOLD_RATE : SETTLE_RATE) * h);
      if (this.mode === "settling") {
        this.x *= k;
        this.y *= k;
      }
      this.tilt *= k;
      this.sway *= k;
      this.squash *= k;
      this.vx = this.vy = this.tiltV = this.swayV = this.squashV = 0;
      if (
        this.mode === "settling" &&
        Math.abs(this.x) < 0.3 &&
        Math.abs(this.y) < 0.3 &&
        this.poseSmall()
      )
        this.reset();
      return;
    }
    this.elapsed += h;
    this.vx += (-HOME * this.x - HOME_DAMPING * this.vx) * h;
    this.vy += (-HOME * this.y - HOME_DAMPING * this.vy) * h;
    this.x += this.vx * h;
    this.y += this.vy * h;
    const limits = room();
    const left = Math.min(limits.left, 0),
      right = Math.max(limits.right, 0),
      top = Math.min(limits.top, 0),
      bottom = Math.max(limits.bottom, 0);
    if (this.x < left) {
      this.x = left;
      if (this.vx < 0) this.impact(-this.vx, 0, -1, 0, "x");
    } else if (this.x > right) {
      this.x = right;
      if (this.vx > 0) this.impact(this.vx, Math.PI, 1, 0, "x");
    }
    if (this.y < top) {
      this.y = top;
      if (this.vy < 0) this.impact(-this.vy, Math.PI / 2, 0, -1, "y");
    } else if (this.y > bottom) {
      this.y = bottom;
      if (this.vy > 0) this.impact(this.vy, -Math.PI / 2, 0, 1, "y");
    }
    const tiltTarget = clamp(
      (this.vx / MAX_LAUNCH_SPEED) * MAX_TILT * 2,
      -MAX_TILT,
      MAX_TILT,
    );
    this.tiltV += (TILT_W * TILT_W * (tiltTarget - this.tilt) - 2 * TILT_Z * TILT_W * this.tiltV) * h;
    this.tilt = clamp(this.tilt + this.tiltV * h, -MAX_TILT, MAX_TILT);
    this.swayV += (-SWAY_W * SWAY_W * this.sway - 2 * SWAY_Z * SWAY_W * this.swayV) * h;
    this.sway = clamp(this.sway + this.swayV * h, -MAX_SWAY, MAX_SWAY);
    this.squashV += (-SQUASH_W * SQUASH_W * this.squash - 2 * SQUASH_Z * SQUASH_W * this.squashV) * h;
    this.squash = clamp(this.squash + this.squashV * h, -MAX_SQUASH, MAX_SQUASH);
    if (typeof limitsOf === "function") {
      // The pose changed this step (a sway can lean the top into a wall), so
      // keep the whole painted silhouette inside the room it now needs.
      const after = limitsOf(this);
      this.x = clamp(this.x, Math.min(after.left, 0), Math.max(after.right, 0));
      this.y = clamp(this.y, Math.min(after.top, 0), Math.max(after.bottom, 0));
    }
    if (this.elapsed >= FLIGHT_SECONDS) this.settle();
    else if (
      Math.abs(this.x) < 0.5 &&
      Math.abs(this.y) < 0.5 &&
      Math.hypot(this.vx, this.vy) < 6 &&
      this.poseSmall() &&
      Math.abs(this.swayV) < 0.02 &&
      Math.abs(this.squashV) < 0.02
    )
      this.reset();
  }
  private poseSmall(): boolean {
    return (
      Math.abs(this.tilt) < 1e-3 &&
      Math.abs(this.sway) < 1e-3 &&
      Math.abs(this.squash) < 1e-3
    );
  }
  private impact(
    speed: number,
    angle: number,
    anchorX: number,
    anchorY: number,
    axis: "x" | "y",
  ): void {
    if (axis === "x") {
      const before = this.vx;
      this.vx = -this.vx * RESTITUTION;
      this.swayV = clamp(this.swayV - (this.vx - before) * 0.00115, -3, 3);
    } else this.vy = -this.vy * RESTITUTION;
    this.squashAngle = angle;
    this.squashAnchorX = anchorX;
    this.squashAnchorY = anchorY;
    this.squashV = clamp(this.squashV + speed * 0.01, -6, 6);
    this.bounces++;
  }
}

/** A ∘ B: apply B first, then A. Canvas order [a, b, c, d, e, f]. */
export function multiply(A: Matrix, B: Matrix): Matrix {
  return [
    A[0] * B[0] + A[2] * B[1],
    A[1] * B[0] + A[3] * B[1],
    A[0] * B[2] + A[2] * B[3],
    A[1] * B[2] + A[3] * B[3],
    A[0] * B[4] + A[2] * B[5] + A[4],
    A[1] * B[4] + A[3] * B[5] + A[5],
  ];
}
export function invert(M: Matrix): Matrix {
  const det = M[0] * M[3] - M[1] * M[2];
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return [1, 0, 0, 1, -M[4], -M[5]];
  return [
    M[3] / det,
    -M[1] / det,
    -M[2] / det,
    M[0] / det,
    (M[2] * M[5] - M[3] * M[4]) / det,
    (M[1] * M[4] - M[0] * M[5]) / det,
  ];
}
export function apply(M: Matrix, x: number, y: number) {
  return { x: M[0] * x + M[2] * y + M[4], y: M[1] * x + M[3] * y + M[5] };
}
const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
const rotate = (angle: number): Matrix => [
  Math.cos(angle),
  Math.sin(angle),
  -Math.sin(angle),
  Math.cos(angle),
  0,
  0,
];
export type BodyPose = Pick<
  BodyMotion,
  "x" | "y" | "tilt" | "sway" | "squash" | "squashAngle" | "squashAnchorX" | "squashAnchorY"
>;
/** Local body pixels (origin at the body centre) to view CSS pixels.
 * Lean and sway pivot at the feet; squash keeps its contact side in place. */
export function bodyMatrix(
  body: BodyPose,
  centerX: number,
  centerY: number,
  radius: number,
  base = 1,
): Matrix {
  const baseY = base * radius;
  let m = translate(centerX + body.x, centerY + body.y);
  if (body.tilt)
    m = multiply(m, multiply(translate(0, baseY), multiply(rotate(body.tilt), translate(0, -baseY))));
  if (body.sway) m = multiply(m, [1, 0, -body.sway, 1, body.sway * baseY, 0]);
  if (body.squash) {
    const ax = body.squashAnchorX * radius,
      ay = body.squashAnchorY * radius,
      s = body.squash;
    m = multiply(
      m,
      multiply(
        translate(ax, ay),
        multiply(
          rotate(body.squashAngle),
          multiply([1 - s, 0, 0, 1 + s * 0.5, 0, 0], multiply(rotate(-body.squashAngle), translate(-ax, -ay))),
        ),
      ),
    );
  }
  return m;
}
