/** Small deterministic circle world. CSS coordinates, no DOM, clock, randomness, or engine. */
export interface Point { x: number; y: number }
export interface View { width: number; height: number }
export interface Ball extends Point { id: number; vx: number; vy: number; settled: boolean; stillTime: number; tint: number }
export interface Peg extends Point { radius: number }
export interface Deflector extends Point { index: number; halfLength: number; radius: number; angleIndex: number }
export interface Impact extends Point { strength: number }
export interface WorldOptions { cap: 8 | 16 | 24; motion: 'gentle' | 'playful' }
export const FIXED_STEP = 1 / 120;
export const MAX_STEPS = 8;
export const MAX_BALLS = 24;
export const MAX_IMPACTS = 24;
export const DEFLECTOR_TARGET_RADIUS = 36;
export const DEFLECTOR_ANGLES = [-.68, -.25, .25, .68] as const;
const TAU = Math.PI * 2;
const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function closestOnSegment(point: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x, dy = end.y - start.y;
  const denominator = dx * dx + dy * dy;
  const t = denominator > 0 ? clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / denominator, 0, 1) : 0;
  return { x: start.x + dx * t, y: start.y + dy * t };
}
export function deflectorSegment(shape: Deflector): [Point, Point] {
  const angle = DEFLECTOR_ANGLES[shape.angleIndex];
  const dx = Math.cos(angle) * shape.halfLength, dy = Math.sin(angle) * shape.halfLength;
  return [{ x: shape.x - dx, y: shape.y - dy }, { x: shape.x + dx, y: shape.y + dy }];
}
/** A 72 CSS pixel-wide capsule, matching the visible broad control backing. */
export function hitsDeflector(point: Point, shape: Deflector): boolean {
  const [start, end] = deflectorSegment(shape), nearest = closestOnSegment(point, start, end);
  return Math.hypot(point.x - nearest.x, point.y - nearest.y) <= DEFLECTOR_TARGET_RADIUS;
}
export function limitVelocity(ball: Ball, limit: number): void {
  if (!finite(ball.vx) || !finite(ball.vy)) { ball.vx = 0; ball.vy = 0; return; }
  const length = Math.hypot(ball.vx, ball.vy);
  if (length > limit) { ball.vx *= limit / length; ball.vy *= limit / length; }
}

export class BounceWorld {
  view: View;
  readonly options: WorldOptions;
  balls: Ball[] = [];
  pegs: Peg[] = [];
  deflectors: Deflector[] = [];
  impacts: Impact[] = [];
  radius = 20;
  bounds = { left: 24, right: 776, top: 24, bottom: 570 };
  troughTop = 500;
  maxSpeed = 600;
  private nextId = 1;
  private accumulator = 0;
  private hasStepped = false;
  stepsLastUpdate = 0;
  clampedUpdates = 0;
  constructor(view: View, options: WorldOptions, snapshot?: unknown) {
    this.view = { width: Math.max(160, view.width), height: Math.max(180, view.height) };
    this.options = { cap: [8, 16, 24].includes(options.cap) ? options.cap : 16, motion: options.motion === 'playful' ? 'playful' : 'gentle' };
    this.layout();
    if (!this.restore(snapshot)) {
      // First frame is quiet: visible balls already rest in the trough. Input
      // creates movement, never an attention-seeking autoplay or countdown.
      for (let i = 0; i < 3; i++) {
        const x = this.view.width / 2 + (i - 1) * (this.radius * 2 + 8);
        this.balls.push({ id: this.nextId++, x, y: this.bounds.bottom - this.radius, vx: 0, vy: 0, settled: true, stillTime: 1, tint: i });
      }
    }
  }
  private layout(): void {
    const w = this.view.width, h = this.view.height;
    this.radius = clamp(Math.min(w * .031, h * .036), 11, 22);
    this.maxSpeed = (this.options.motion === 'gentle' ? 560 : 680) * this.radius / 20;
    this.bounds = { left: 24, right: w - 24, top: 24, bottom: h - 32 };
    this.troughTop = this.bounds.bottom - Math.max(76, this.radius * 3.7);
    const top = this.bounds.top + Math.max(78, h * .105);
    const usableHeight = Math.max(100, this.troughTop - top - 68);
    this.pegs = [];
    // Four staggered rows, with up to 14 pegs. The lower row stays above the
    // receiving trough; pegs near a turning mechanism are omitted below.
    for (let row = 0; row < 4; row++) {
      const columns = row % 2 === 0 ? 3 : 4;
      for (let column = 0; column < columns; column++) {
        this.pegs.push({ x: this.bounds.left + (column + 1) / (columns + 1) * (this.bounds.right - this.bounds.left), y: top + usableHeight * row / 3, radius: clamp(this.radius * .5, 7, 11) });
      }
    }
    const halfLength = clamp(w * .092, 39, 79);
    const oldAngles = this.deflectors.map(shape => shape.angleIndex);
    this.deflectors = [
      { index: 0, x: w * .29, y: top + usableHeight * .47, halfLength, radius: 10, angleIndex: oldAngles[0] ?? 2 },
      { index: 1, x: w * .71, y: top + usableHeight * .74, halfLength, radius: 10, angleIndex: oldAngles[1] ?? 1 },
    ];
    // Keep each peg readable beyond the whole 72px backing at every angle,
    // and leave a full ball diameter plus margin between physical surfaces.
    // This is layout work only: rotation never moves or hides a live peg.
    this.pegs = this.pegs.filter(peg => this.deflectors.every(shape =>
      DEFLECTOR_ANGLES.every((_, angleIndex) => {
        const [start, end] = deflectorSegment({ ...shape, angleIndex });
        const nearest = closestOnSegment(peg, start, end);
        const clearance = peg.radius + Math.max(DEFLECTOR_TARGET_RADIUS + 10, shape.radius + this.radius * 2 + 8);
        return Math.hypot(peg.x - nearest.x, peg.y - nearest.y) >= clearance;
      }),
    ));
  }
  resize(view: View): void {
    if (!finite(view.width) || !finite(view.height) || view.width < 160 || view.height < 180) return;
    const old = this.view, oldBottom = this.bounds.bottom, oldRadius = this.radius;
    this.view = { ...view }; this.layout(); this.accumulator = 0; this.impacts = [];
    for (const ball of this.balls) {
      const onFloor = ball.settled && Math.abs(ball.y - (oldBottom - oldRadius)) < 2;
      ball.x = ball.x / old.width * view.width;
      ball.y = onFloor ? this.bounds.bottom - this.radius : ball.y / old.height * view.height;
      ball.vx *= view.width / old.width; ball.vy *= view.height / old.height;
      this.clampBall(ball); limitVelocity(ball, this.maxSpeed);
      if (this.hasStepped && !onFloor) { ball.settled = false; ball.stillTime = 0; }
    }
    this.removeOverlaps();
    this.wakeUnsupported();
  }
  private clampBall(ball: Ball): void {
    ball.x = clamp(finite(ball.x) ? ball.x : this.view.width / 2, this.bounds.left + this.radius, this.bounds.right - this.radius);
    ball.y = clamp(finite(ball.y) ? ball.y : this.bounds.top + this.radius, this.bounds.top + this.radius, this.bounds.bottom - this.radius);
  }
  private impact(x: number, y: number, strength: number): void {
    if (strength < 28 || this.impacts.length >= MAX_IMPACTS) return;
    this.impacts.push({ x, y, strength: Math.min(strength, this.maxSpeed) });
  }
  spawn(point: Point): Ball {
    // Recycle the oldest settled ball first. Array order is insertion order,
    // so recycling is predictable and never grows the live pool.
    if (this.balls.length >= this.options.cap) {
      const settled = this.balls.findIndex(ball => ball.settled);
      this.balls.splice(settled >= 0 ? settled : 0, 1);
    }
    const id = this.nextId;
    this.nextId = this.nextId >= 1_000_000_000 ? 1 : this.nextId + 1;
    const ball: Ball = {
      id, x: finite(point.x) ? point.x : this.view.width / 2, y: finite(point.y) ? point.y : this.bounds.top + this.radius,
      vx: ((id % 5) - 2) * 9, vy: this.options.motion === 'gentle' ? -95 : -155,
      settled: false, stillTime: 0, tint: id % 4,
    };
    this.clampBall(ball);
    this.balls.push(ball);
    this.projectFromShapes(ball);
    this.removeOverlaps();
    this.wakeUnsupported();
    return ball;
  }
  rotateDeflector(index: number): boolean {
    const shape = this.deflectors[index]; if (!shape) return false;
    const [oldStart, oldEnd] = deflectorSegment(shape);
    shape.angleIndex = (shape.angleIndex + 1) % DEFLECTOR_ANGLES.length;
    const [start, end] = deflectorSegment(shape);
    for (const ball of this.balls) {
      const p = closestOnSegment(ball, start, end);
      const old = closestOnSegment(ball, oldStart, oldEnd);
      if (Math.min(Math.hypot(ball.x - p.x, ball.y - p.y), Math.hypot(ball.x - old.x, ball.y - old.y)) < this.radius + shape.radius + 10) {
        ball.settled = false; ball.stillTime = 0;
        this.projectFromShapes(ball); limitVelocity(ball, this.maxSpeed);
      }
    }
    this.wakeUnsupported();
    return true;
  }
  nudge(from: Point, to: Point): number {
    if (![from.x, from.y, to.x, to.y].every(finite)) return 0;
    let dx = to.x - from.x, dy = to.y - from.y;
    const length = Math.hypot(dx, dy); if (length < .1) return 0;
    if (length > 70) { dx *= 70 / length; dy *= 70 / length; }
    let influenced = 0;
    const reach = Math.max(82, this.radius * 5);
    const force = this.options.motion === 'gentle' ? 1.6 : 2.15;
    for (const ball of this.balls) {
      const closest = closestOnSegment(ball, from, to);
      const distance = Math.hypot(ball.x - closest.x, ball.y - closest.y);
      if (distance > reach) continue;
      const weight = 1 - distance / reach;
      ball.vx += dx * force * weight; ball.vy += dy * force * weight;
      ball.settled = false; ball.stillTime = 0; limitVelocity(ball, this.maxSpeed); influenced++;
    }
    return influenced;
  }
  private shapeCollision(ball: Ball, center: Point, shapeRadius: number): boolean {
    let dx = ball.x - center.x, dy = ball.y - center.y;
    let distance = Math.hypot(dx, dy);
    const minimum = this.radius + shapeRadius;
    if (distance >= minimum) return false;
    if (distance < .0001) { const angle = (ball.id % 7) / 7 * TAU; dx = Math.cos(angle); dy = Math.sin(angle); distance = 1; }
    const nx = dx / distance, ny = dy / distance;
    ball.x += nx * (minimum - distance + .01); ball.y += ny * (minimum - distance + .01);
    const normalVelocity = ball.vx * nx + ball.vy * ny;
    if (normalVelocity < 0) {
      const restitution = this.options.motion === 'gentle' ? .38 : .57;
      ball.vx -= (1 + restitution) * normalVelocity * nx;
      ball.vy -= (1 + restitution) * normalVelocity * ny;
      ball.vx *= .989; ball.vy *= .989;
      this.impact(center.x + nx * shapeRadius, center.y + ny * shapeRadius, -normalVelocity);
      // A perfectly centred drop cannot balance forever on a round peg. A
      // small deterministic sideways roll carries it back into an open lane.
      if (ny < -.96 && Math.abs(ball.vx) < 12) ball.vx = (ball.id % 2 ? 1 : -1) * 18 * this.radius / 20;
    }
    return ny < -.25;
  }
  private projectFromShapes(ball: Ball): void {
    for (const peg of this.pegs) this.shapeCollision(ball, peg, peg.radius);
    for (const shape of this.deflectors) {
      const [start, end] = deflectorSegment(shape);
      this.shapeCollision(ball, closestOnSegment(ball, start, end), shape.radius);
    }
    this.clampBall(ball);
  }
  private pairCollision(a: Ball, b: Ball): [boolean, boolean] {
    let dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
    const minimum = this.radius * 2;
    if (distance >= minimum) return [false, false];
    if (distance < .0001) { dx = a.id <= b.id ? 1 : -1; dy = 0; distance = 1; }
    const nx = dx / distance, ny = dy / distance;
    const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (relative < -35) {
      if (a.settled) { a.settled = false; a.stillTime = 0; }
      if (b.settled) { b.settled = false; b.stillTime = 0; }
    }
    const aWeight = a.settled ? 0 : 1, bWeight = b.settled ? 0 : 1, total = aWeight + bWeight;
    if (!total) return [ny > .25, ny < -.25];
    const penetration = minimum - distance + .005;
    a.x -= nx * penetration * aWeight / total; a.y -= ny * penetration * aWeight / total;
    b.x += nx * penetration * bWeight / total; b.y += ny * penetration * bWeight / total;
    if (relative < 0) {
      const restitution = this.options.motion === 'gentle' ? .28 : .43;
      const impulse = -(1 + restitution) * relative / total;
      a.vx -= impulse * nx * aWeight; a.vy -= impulse * ny * aWeight;
      b.vx += impulse * nx * bWeight; b.vy += impulse * ny * bWeight;
      this.impact((a.x + b.x) / 2, (a.y + b.y) / 2, -relative);
    }
    return [ny > .25, ny < -.25];
  }
  private removeOverlaps(): void {
    // Four bounded position passes, used only after input/layout changes. This
    // also resolves a tap exactly atop an existing stationary ball.
    for (let pass = 0; pass < 4; pass++) for (let i = 0; i < this.balls.length; i++) for (let j = i + 1; j < this.balls.length; j++) {
      const a = this.balls[i], b = this.balls[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) >= this.radius * 2) continue;
      if (a.settled && b.settled) { b.settled = false; b.stillTime = 0; }
      this.pairCollision(a, b); this.clampBall(a); this.clampBall(b);
    }
  }
  private supportedAtRest(ball: Ball): boolean {
    if (ball.y >= this.bounds.bottom - this.radius - 1) return true;
    for (const peg of this.pegs) if (ball.y < peg.y && Math.abs(Math.hypot(ball.x - peg.x, ball.y - peg.y) - this.radius - peg.radius) < 1.5) return true;
    for (const shape of this.deflectors) {
      const [start, end] = deflectorSegment(shape), nearest = closestOnSegment(ball, start, end);
      if (ball.y < nearest.y && Math.abs(Math.hypot(ball.x - nearest.x, ball.y - nearest.y) - this.radius - shape.radius) < 1.5) return true;
    }
    return this.balls.some(other => other !== ball && other.y > ball.y + this.radius * .3 && Math.abs(Math.hypot(ball.x - other.x, ball.y - other.y) - this.radius * 2) < 1.5);
  }
  private wakeUnsupported(): void {
    for (const ball of this.balls) if (ball.settled && !this.supportedAtRest(ball)) { ball.settled = false; ball.stillTime = 0; }
  }
  private substep(): void {
    this.wakeUnsupported();
    const dt = FIXED_STEP, gravity = (this.options.motion === 'gentle' ? 730 : 930) * this.radius / 20;
    const supported = new Uint8Array(this.balls.length);
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i]; if (ball.settled) continue;
      ball.vy += gravity * dt; ball.vx *= .997; ball.vy *= .999;
      limitVelocity(ball, this.maxSpeed); ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      for (const peg of this.pegs) if (this.shapeCollision(ball, peg, peg.radius)) supported[i] = 1;
      for (const shape of this.deflectors) {
        const [start, end] = deflectorSegment(shape);
        if (this.shapeCollision(ball, closestOnSegment(ball, start, end), shape.radius)) supported[i] = 1;
      }
    }
    // Two bounded contact passes give small stacks room without a general solver.
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < this.balls.length; i++) for (let j = i + 1; j < this.balls.length; j++) {
      if (this.balls[i].settled && this.balls[j].settled) continue;
      const [aSupport, bSupport] = this.pairCollision(this.balls[i], this.balls[j]);
      if (aSupport) supported[i] = 1; if (bSupport) supported[j] = 1;
    }
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i]; if (ball.settled) continue;
      const left = this.bounds.left + this.radius, right = this.bounds.right - this.radius, floor = this.bounds.bottom - this.radius, top = this.bounds.top + this.radius;
      if (ball.x <= left) { ball.x = left; if (ball.vx < 0) { this.impact(left - this.radius, ball.y, -ball.vx); ball.vx *= -.45; } }
      if (ball.x >= right) { ball.x = right; if (ball.vx > 0) { this.impact(right + this.radius, ball.y, ball.vx); ball.vx *= -.45; } }
      if (ball.y <= top) { ball.y = top; if (ball.vy < 0) ball.vy *= -.3; }
      if (ball.y >= floor) {
        ball.y = floor; supported[i] = 1;
        if (ball.vy > 0) {
          this.impact(ball.x, floor + this.radius, ball.vy);
          ball.vy = ball.vy > 30 ? -ball.vy * (this.options.motion === 'gentle' ? .25 : .4) : 0;
        }
        ball.vx *= .9;
      }
      limitVelocity(ball, this.maxSpeed);
      // A coherent stack or contact can rest anywhere on the board. A height
      // cutoff leaves stable upper stack balls awake forever. Require real
      // contact both when accumulating rest and after layout/input changes.
      if (supported[i] && this.supportedAtRest(ball) && Math.hypot(ball.vx, ball.vy) < 24) ball.stillTime += dt;
      else ball.stillTime = Math.max(0, ball.stillTime - dt * .4);
      if (ball.stillTime > .45) { ball.settled = true; ball.vx = 0; ball.vy = 0; }
      this.clampBall(ball);
    }
  }
  step(delta: number): boolean {
    this.impacts = []; this.stepsLastUpdate = 0;
    if (!finite(delta) || delta <= 0) { this.accumulator = 0; return this.balls.some(ball => !ball.settled); }
    if (this.balls.every(ball => ball.settled)) { this.accumulator = 0; return false; }
    this.hasStepped = true;
    const maximum = FIXED_STEP * MAX_STEPS;
    if (delta > maximum) this.clampedUpdates++;
    this.accumulator = Math.min(maximum, this.accumulator + Math.min(delta, maximum));
    while (this.accumulator + 1e-10 >= FIXED_STEP && this.stepsLastUpdate < MAX_STEPS) {
      this.substep(); this.accumulator = Math.max(0, this.accumulator - FIXED_STEP); this.stepsLastUpdate++;
    }
    const moving = this.balls.some(ball => !ball.settled);
    if (!moving) this.accumulator = 0;
    return moving;
  }
  snapshot(): unknown {
    return { version: 1, nextId: this.nextId, angles: this.deflectors.map(shape => shape.angleIndex), balls: this.balls.map(ball => ({ id: ball.id, x: ball.x / this.view.width, y: ball.y / this.view.height, vx: ball.vx / this.view.width, vy: ball.vy / this.view.height, settled: ball.settled, stillTime: Math.min(1, ball.stillTime), tint: ball.tint })) };
  }
  private restore(input: unknown): boolean {
    if (!input || typeof input !== 'object') return false;
    const saved = input as { version?: unknown; nextId?: unknown; angles?: unknown; balls?: unknown };
    if (saved.version !== 1 || !Array.isArray(saved.balls) || saved.balls.length > MAX_BALLS || !Array.isArray(saved.angles) || saved.angles.length !== 2 || !saved.angles.every(value => Number.isInteger(value) && value >= 0 && value < 4)) return false;
    const restored: Ball[] = [], ids = new Set<number>();
    for (const item of saved.balls) {
      if (!item || typeof item !== 'object') return false;
      const ball = item as Ball;
      if (![ball.x, ball.y, ball.vx, ball.vy, ball.stillTime].every(finite) || ball.x < 0 || ball.x > 1 || ball.y < 0 || ball.y > 1 || Math.abs(ball.vx) > 10 || Math.abs(ball.vy) > 10 || !Number.isInteger(ball.id) || ball.id < 1 || ball.id > 1_000_000_000 || ids.has(ball.id) || typeof ball.settled !== 'boolean' || !Number.isInteger(ball.tint) || ball.tint < 0 || ball.tint > 3 || ball.stillTime < 0 || ball.stillTime > 1) return false;
      ids.add(ball.id);
      const next: Ball = { id: ball.id, x: ball.x * this.view.width, y: ball.y * this.view.height, vx: ball.settled ? 0 : ball.vx * this.view.width, vy: ball.settled ? 0 : ball.vy * this.view.height, settled: ball.settled, stillTime: ball.stillTime, tint: ball.tint };
      this.clampBall(next); limitVelocity(next, this.maxSpeed); restored.push(next);
    }
    this.balls = restored.slice(-this.options.cap);
    this.deflectors.forEach((shape, index) => { shape.angleIndex = (saved.angles as number[])[index]; });
    this.nextId = Number.isInteger(saved.nextId) && (saved.nextId as number) >= 1 && (saved.nextId as number) <= 1_000_000_000 ? saved.nextId as number : Math.max(0, ...this.balls.map(ball => ball.id)) % 1_000_000_000 + 1;
    while (ids.has(this.nextId)) this.nextId = this.nextId >= 1_000_000_000 ? 1 : this.nextId + 1;
    this.hasStepped = true; this.removeOverlaps(); this.wakeUnsupported();
    return true;
  }
  debug() { return { balls: this.balls.length, activeBalls: this.balls.filter(ball => !ball.settled).length, settledBalls: this.balls.filter(ball => ball.settled).length, pegs: this.pegs.length, deflectors: this.deflectors.length, cap: this.options.cap, stepsLastUpdate: this.stepsLastUpdate, clampedUpdates: this.clampedUpdates, impacts: this.impacts.length, radius: this.radius, maxSpeed: this.maxSpeed }; }
}
