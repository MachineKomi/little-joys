/** Small deterministic circle world. CSS coordinates, no DOM, clock, randomness, or engine. */
export interface Point { x: number; y: number }
export interface View { width: number; height: number }
export interface Ball extends Point { id: number; vx: number; vy: number; settled: boolean; stillTime: number; tint: number }
export interface Peg extends Point { radius: number; hue: number }
export interface Deflector extends Point { index: number; halfLength: number; radius: number; angleIndex: number }
/** A round pinball bumper: contact pushes the ball away at a fixed generous speed. */
export interface Bumper extends Point { index: number; radius: number; hue: number }
/** A four-arm pinwheel. Ball contact and taps change its spin; spin fades on its own. */
export interface Spinner extends Point { index: number; armLength: number; radius: number; angle: number; spin: number }
/** A fixed segment: funnel rails above the trough. */
export interface Rail { start: Point; end: Point; radius: number }
export type ImpactKind = 'peg' | 'bumper' | 'deflector' | 'spinner' | 'rail' | 'wall' | 'ball';
export interface Impact extends Point { strength: number; kind: ImpactKind; hue: number }
export interface WorldOptions { cap: 8 | 16 | 24; motion: 'gentle' | 'playful' }
export const FIXED_STEP = 1 / 120;
export const MAX_STEPS = 8;
export const MAX_BALLS = 24;
export const MAX_IMPACTS = 24;
export const TINTS = 6;
export const DEFLECTOR_TARGET_RADIUS = 36;
export const DEFLECTOR_ANGLES = [-.68, -.25, .25, .68] as const;
/** Passive flow keeps supplying balls for this long after the last touch or scene entry. */
export const ATTENTION_SECONDS = 120;
/** Seconds between dispensed balls while the board is attended. */
export const FLOW_INTERVAL = { gentle: 1.8, playful: 1 } as const;
/** Delay before the first dispensed ball after entry or a restored attention window. */
export const FLOW_FIRST_DELAY = 1.6;
export const MAX_SPIN = { gentle: 5, playful: 9 } as const;
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
/** The four arm segments of a pinwheel at its current angle. */
export function spinnerArms(shape: Spinner): [Point, Point][] {
  return [0, 1, 2, 3].map(arm => {
    const angle = shape.angle + arm * Math.PI / 2;
    return [{ x: shape.x, y: shape.y }, { x: shape.x + Math.cos(angle) * shape.armLength, y: shape.y + Math.sin(angle) * shape.armLength }];
  });
}
/** A 72 CSS pixel-wide capsule, matching the visible broad control backing. */
export function hitsDeflector(point: Point, shape: Deflector): boolean {
  const [start, end] = deflectorSegment(shape), nearest = closestOnSegment(point, start, end);
  return Math.hypot(point.x - nearest.x, point.y - nearest.y) <= DEFLECTOR_TARGET_RADIUS;
}
/** Broad round target around the whole pinwheel, at least 72 CSS pixels wide. */
export function hitsSpinner(point: Point, shape: Spinner): boolean {
  return Math.hypot(point.x - shape.x, point.y - shape.y) <= Math.max(DEFLECTOR_TARGET_RADIUS, shape.armLength + 8);
}
export function hitsBumper(point: Point, shape: Bumper): boolean {
  return Math.hypot(point.x - shape.x, point.y - shape.y) <= Math.max(DEFLECTOR_TARGET_RADIUS, shape.radius + 12);
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
  bumpers: Bumper[] = [];
  spinners: Spinner[] = [];
  rails: Rail[] = [];
  impacts: Impact[] = [];
  /** Balls removed by recycling during the last step, for local feedback. */
  recycled: Point[] = [];
  /** Balls dispensed by passive flow during the last step. */
  dispensed: Point[] = [];
  radius = 20;
  bounds = { left: 24, right: 776, top: 24, bottom: 570 };
  troughTop = 500;
  /** The penguin's shelf occupies the band above bounds.top; the chute opens at its centre. */
  shelf = { top: 0, bottom: 0 };
  chute = { x: 400, y: 40 };
  maxSpeed = 600;
  /** Remaining attended seconds. Passive flow and wakefulness end at zero. */
  attention = ATTENTION_SECONDS;
  private flowClock = FLOW_FIRST_DELAY;
  inputSpawns = 0;
  flowSpawns = 0;
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
      // First frame is quiet: visible balls already rest in the trough. The
      // penguin then dispenses at a fixed pace; no countdown or attract loop.
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
    // The penguin shelf is a physical ceiling band; balls never enter it.
    const shelfHeight = clamp(Math.min(w * .2, h * .17), 64, 132);
    this.shelf = { top: 10, bottom: 10 + shelfHeight };
    this.bounds = { left: 24, right: w - 24, top: this.shelf.bottom + 4, bottom: h - 32 };
    this.troughTop = this.bounds.bottom - Math.max(76, this.radius * 3.7);
    this.chute = { x: w / 2, y: this.bounds.top + this.radius + 2 };
    const top = this.bounds.top + this.radius * 2.2;
    const fieldHeight = Math.max(120, this.troughTop - top - this.radius * 2.6);
    const fx = (fraction: number) => this.bounds.left + fraction * (this.bounds.right - this.bounds.left);
    const fy = (fraction: number) => top + fraction * fieldHeight;
    const ballClearance = this.radius * 2 + 8;
    // Funnel rails guide wall-side balls toward the middle. Their tips end well
    // above a full trough so a resting pile can never wedge against them.
    const railBottom = Math.min(this.troughTop - this.radius * 3.2, fy(.95)), railTop = Math.min(fy(.8), railBottom - this.radius * 2);
    this.rails = [
      { start: { x: this.bounds.left + 2, y: railTop }, end: { x: fx(.24), y: railBottom }, radius: 7 },
      { start: { x: this.bounds.right - 2, y: railTop }, end: { x: fx(.76), y: railBottom }, radius: 7 },
    ];
    // Mechanism sizes follow the available field, so compact boards stay open.
    const halfLength = clamp(Math.min(w * .092, fieldHeight * .13), 34, 79);
    const bumperRadius = clamp(Math.min(this.radius * 1.35, fieldHeight * .05), 12, 30);
    const armLength = clamp(Math.min(w * .085, fieldHeight * .1), 26, 62);
    const oldAngles = this.deflectors.map(shape => shape.angleIndex);
    const oldSpinner = this.spinners[0];
    this.deflectors = [
      { index: 0, x: fx(.27), y: fy(.5), halfLength, radius: 10, angleIndex: oldAngles[0] ?? 2 },
      { index: 1, x: fx(.73), y: fy(.7), halfLength, radius: 10, angleIndex: oldAngles[1] ?? 1 },
    ];
    this.bumpers = [
      { index: 0, x: fx(.2), y: fy(.22), radius: bumperRadius, hue: 0 },
      { index: 1, x: fx(.8), y: fy(.22), radius: bumperRadius, hue: 1 },
      { index: 2, x: fx(.5), y: fy(.66), radius: bumperRadius, hue: 3 },
    ];
    this.spinners = [{ index: 0, x: fx(.5), y: fy(.36), armLength, radius: 7, angle: oldSpinner?.angle ?? .3, spin: oldSpinner?.spin ?? 0 }];
    this.separateMechanisms(ballClearance, top);
    this.pegs = [];
    const hues = [4, 0, 2, 1, 5, 3];
    const pegRadius = clamp(this.radius * .48, 7, 11);
    const clear = (peg: Peg) => {
      // A full ball passage beside both walls, so nothing can wedge against a peg there.
      if (peg.x - peg.radius - this.bounds.left < ballClearance || this.bounds.right - peg.x - peg.radius < ballClearance) return false;
      for (const shape of this.deflectors) for (let angleIndex = 0; angleIndex < DEFLECTOR_ANGLES.length; angleIndex++) {
        const [start, end] = deflectorSegment({ ...shape, angleIndex });
        const nearest = closestOnSegment(peg, start, end);
        if (Math.hypot(peg.x - nearest.x, peg.y - nearest.y) < peg.radius + Math.max(DEFLECTOR_TARGET_RADIUS + 10, shape.radius + ballClearance)) return false;
      }
      for (const shape of this.bumpers) if (Math.hypot(peg.x - shape.x, peg.y - shape.y) < peg.radius + shape.radius + ballClearance) return false;
      for (const shape of this.spinners) if (Math.hypot(peg.x - shape.x, peg.y - shape.y) < peg.radius + shape.armLength + shape.radius + ballClearance) return false;
      for (const rail of this.rails) {
        const nearest = closestOnSegment(peg, rail.start, rail.end);
        if (Math.hypot(peg.x - nearest.x, peg.y - nearest.y) < peg.radius + rail.radius + ballClearance) return false;
      }
      return this.pegs.every(other => Math.hypot(peg.x - other.x, peg.y - other.y) >= peg.radius + other.radius + ballClearance);
    };
    // The splitter peg below the chute sends dispensed balls left or right.
    const splitter = { x: this.chute.x, y: this.bounds.top + this.radius * 3.4, radius: clamp(this.radius * .5, 7, 11), hue: 2 };
    if (clear(splitter)) this.pegs.push(splitter);
    // Greedy fill of a staggered candidate grid whose spacing follows the ball
    // size, so wide, tall and phone boards all get a dense pachinko field.
    // Every accepted peg keeps a full ball passage from walls, mechanisms,
    // rails, the chute splitter and its neighbours.
    const minimumGap = pegRadius * 2 + ballClearance;
    const columns = Math.max(3, Math.floor((this.bounds.right - this.bounds.left) / (minimumGap * 1.3)));
    const rowGap = minimumGap * .8;
    for (let row = 0, y = fy(.05); y <= fy(.97); row++, y += rowGap) {
      const offset = row % 2 ? .5 : 1, count = row % 2 ? columns + 1 : columns;
      for (let column = 0; column < count; column++) {
        const peg: Peg = { x: fx((column + offset) / (columns + 1)), y, radius: pegRadius, hue: hues[(row + column) % hues.length] };
        if (clear(peg)) this.pegs.push(peg);
      }
    }
  }
  /** Bounded deterministic relaxation: every pair of mechanisms (using the full
   * sweep of anything that turns), each mechanism and rail, and each mechanism
   * and wall keep a full ball passage wherever the board has room. */
  private separateMechanisms(clearance: number, fieldTop: number): void {
    const bodies: { point: Point; reach: number }[] = [
      ...this.deflectors.map(shape => ({ point: shape, reach: shape.halfLength + shape.radius })),
      ...this.spinners.map(shape => ({ point: shape, reach: shape.armLength + shape.radius })),
      ...this.bumpers.map(shape => ({ point: shape, reach: shape.radius })),
    ];
    for (let pass = 0; pass < 64; pass++) {
      let moved = false;
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i].point, b = bodies[j].point;
        let dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
        const need = bodies[i].reach + bodies[j].reach + clearance;
        if (distance >= need) continue;
        if (distance < 1e-6) { dx = 0; dy = 1; distance = 1; }
        const push = (need - distance) / 2 + .01;
        a.x -= dx / distance * push; a.y -= dy / distance * push;
        b.x += dx / distance * push; b.y += dy / distance * push;
        moved = true;
      }
      for (const body of bodies) {
        for (const rail of this.rails) {
          const nearest = closestOnSegment(body.point, rail.start, rail.end);
          let dx = body.point.x - nearest.x, dy = body.point.y - nearest.y, distance = Math.hypot(dx, dy);
          const need = body.reach + rail.radius + clearance;
          if (distance >= need) continue;
          if (distance < 1e-6) { dx = 0; dy = -1; distance = 1; }
          body.point.x += dx / distance * (need - distance + .01); body.point.y += dy / distance * (need - distance + .01);
          moved = true;
        }
        const left = this.bounds.left + body.reach + clearance, right = this.bounds.right - body.reach - clearance;
        const upper = fieldTop + body.reach, lower = this.troughTop - body.reach - clearance;
        body.point.x = left <= right ? clamp(body.point.x, left, right) : (this.bounds.left + this.bounds.right) / 2;
        body.point.y = upper <= lower ? clamp(body.point.y, upper, lower) : (upper + lower) / 2;
      }
      if (!moved) break;
    }
  }
  resize(view: View): void {
    if (!finite(view.width) || !finite(view.height) || view.width < 160 || view.height < 180) return;
    const old = this.view, oldBottom = this.bounds.bottom, oldRadius = this.radius;
    this.view = { ...view }; this.layout(); this.accumulator = 0; this.impacts = []; this.recycled = []; this.dispensed = [];
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
  /** Any accepted input renews the attended window. */
  touch(): void {
    this.attention = ATTENTION_SECONDS;
  }
  private clampBall(ball: Ball): void {
    ball.x = clamp(finite(ball.x) ? ball.x : this.view.width / 2, this.bounds.left + this.radius, this.bounds.right - this.radius);
    ball.y = clamp(finite(ball.y) ? ball.y : this.bounds.top + this.radius, this.bounds.top + this.radius, this.bounds.bottom - this.radius);
  }
  private impact(x: number, y: number, strength: number, kind: ImpactKind, hue: number): void {
    if (strength < 28 || this.impacts.length >= MAX_IMPACTS) return;
    this.impacts.push({ x, y, strength: Math.min(strength, this.maxSpeed), kind, hue });
  }
  private makeBall(point: Point, vx: number, vy: number): Ball {
    // Recycle the oldest settled ball first, preferring one already resting in
    // the trough. Array order is insertion order, so recycling is predictable
    // and never grows the live pool.
    if (this.balls.length >= this.options.cap) {
      const inTrough = this.balls.findIndex(ball => ball.settled && ball.y > this.troughTop);
      const settled = inTrough >= 0 ? inTrough : this.balls.findIndex(ball => ball.settled);
      const index = settled >= 0 ? settled : 0;
      const [removed] = this.balls.splice(index, 1);
      if (this.recycled.length < MAX_IMPACTS) this.recycled.push({ x: removed.x, y: removed.y });
    }
    const id = this.nextId;
    this.nextId = this.nextId >= 1_000_000_000 ? 1 : this.nextId + 1;
    const ball: Ball = {
      id, x: finite(point.x) ? point.x : this.view.width / 2, y: finite(point.y) ? point.y : this.bounds.top + this.radius,
      vx, vy, settled: false, stillTime: 0, tint: id % TINTS,
    };
    this.clampBall(ball);
    this.balls.push(ball);
    this.projectFromShapes(ball);
    this.removeOverlaps();
    this.wakeUnsupported();
    return ball;
  }
  spawn(point: Point): Ball {
    this.inputSpawns++;
    const id = this.nextId;
    return this.makeBall(point, ((id % 5) - 2) * 9, this.options.motion === 'gentle' ? -95 : -155);
  }
  /** The penguin drops one ball from the chute. Used by passive flow and penguin taps. */
  dispense(): Ball {
    this.flowSpawns++;
    const id = this.nextId, side = id % 2 ? 1 : -1;
    const ball = this.makeBall({ x: this.chute.x + side * this.radius * .35, y: this.chute.y }, side * (26 + (id % 3) * 9) * this.radius / 20, 40 * this.radius / 20);
    if (this.dispensed.length < MAX_IMPACTS) this.dispensed.push({ x: ball.x, y: ball.y });
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
  /** A tap adds a bounded push of spin in the pinwheel's current direction. */
  spinSpinner(index: number): boolean {
    const shape = this.spinners[index]; if (!shape) return false;
    const limit = MAX_SPIN[this.options.motion];
    const direction = shape.spin < 0 ? -1 : 1;
    shape.spin = clamp(shape.spin + direction * limit * .7, -limit, limit);
    for (const ball of this.balls) if (Math.hypot(ball.x - shape.x, ball.y - shape.y) < shape.armLength + this.radius + shape.radius + 4) { ball.settled = false; ball.stillTime = 0; }
    return true;
  }
  /** A tap pulses a bumper: nearby balls are pushed away without precision. */
  pulseBumper(index: number): number {
    const shape = this.bumpers[index]; if (!shape) return 0;
    const reach = shape.radius + this.radius * 4, push = (this.options.motion === 'gentle' ? 190 : 300) * this.radius / 20;
    let influenced = 0;
    for (const ball of this.balls) {
      const dx = ball.x - shape.x, dy = ball.y - shape.y, distance = Math.hypot(dx, dy);
      if (distance > reach || distance < .0001) continue;
      const weight = 1 - distance / reach;
      ball.vx += dx / distance * push * weight; ball.vy += dy / distance * push * weight - push * .25 * weight;
      ball.settled = false; ball.stillTime = 0; limitVelocity(ball, this.maxSpeed); influenced++;
    }
    return influenced;
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
  private shapeCollision(ball: Ball, center: Point, shapeRadius: number, kind: ImpactKind, hue: number, restitutionScale = 1): boolean {
    let dx = ball.x - center.x, dy = ball.y - center.y;
    let distance = Math.hypot(dx, dy);
    const minimum = this.radius + shapeRadius;
    if (distance >= minimum) return false;
    if (distance < .0001) { const angle = (ball.id % 7) / 7 * TAU; dx = Math.cos(angle); dy = Math.sin(angle); distance = 1; }
    const nx = dx / distance, ny = dy / distance;
    ball.x += nx * (minimum - distance + .01); ball.y += ny * (minimum - distance + .01);
    const normalVelocity = ball.vx * nx + ball.vy * ny;
    if (normalVelocity < 0) {
      const restitution = (this.options.motion === 'gentle' ? .38 : .57) * restitutionScale;
      ball.vx -= (1 + restitution) * normalVelocity * nx;
      ball.vy -= (1 + restitution) * normalVelocity * ny;
      ball.vx *= .989; ball.vy *= .989;
      this.impact(center.x + nx * shapeRadius, center.y + ny * shapeRadius, -normalVelocity, kind, hue);
      // A perfectly centred drop cannot balance forever on a round peg. A
      // small deterministic sideways roll carries it back into an open lane.
      if (ny < -.96 && Math.abs(ball.vx) < 12) ball.vx = (ball.id % 2 ? 1 : -1) * 18 * this.radius / 20;
    }
    return ny < -.25;
  }
  private bumperCollision(ball: Ball, shape: Bumper): boolean {
    const dx = ball.x - shape.x, dy = ball.y - shape.y, distance = Math.hypot(dx, dy);
    const minimum = this.radius + shape.radius;
    if (distance >= minimum) return false;
    const nx = distance > .0001 ? dx / distance : 0, ny = distance > .0001 ? dy / distance : -1;
    ball.x += nx * (minimum - distance + .01); ball.y += ny * (minimum - distance + .01);
    const normalVelocity = ball.vx * nx + ball.vy * ny;
    if (normalVelocity < 0) {
      // A slow contact is a resting ball, not a strike, and an unattended board
      // adds no energy: treat the dome like a peg so balls roll off and settle.
      if (this.attention <= 0 || normalVelocity > -70 * this.radius / 20) {
        ball.vx -= (1 + .3) * normalVelocity * nx; ball.vy -= (1 + .3) * normalVelocity * ny;
        if (ny < -.6 && Math.abs(ball.vx) < 30 * this.radius / 20) ball.vx = (ball.id % 2 ? 1 : -1) * 34 * this.radius / 20;
        return ny < -.25;
      }
      // Pinball bumper: leave at a generous fixed speed regardless of approach.
      const kick = (this.options.motion === 'gentle' ? 260 : 420) * this.radius / 20;
      const tangentX = -ny, tangentY = nx, tangential = ball.vx * tangentX + ball.vy * tangentY;
      const outward = Math.max(kick, -normalVelocity * .8);
      ball.vx = nx * outward + tangentX * tangential * .85;
      ball.vy = ny * outward + tangentY * tangential * .85;
      // A strike from directly above still needs a sideways component to leave.
      if (ny < -.85 && Math.abs(ball.vx) < 40 * this.radius / 20) ball.vx = (ball.id % 2 ? 1 : -1) * 60 * this.radius / 20;
      this.impact(shape.x + nx * shape.radius, shape.y + ny * shape.radius, Math.max(80, -normalVelocity), 'bumper', shape.hue);
    }
    return false;
  }
  private spinnerCollision(ball: Ball, shape: Spinner): boolean {
    let supported = false;
    for (const [start, end] of spinnerArms(shape)) {
      const nearest = closestOnSegment(ball, start, end);
      const dx = ball.x - nearest.x, dy = ball.y - nearest.y, distance = Math.hypot(dx, dy);
      if (distance >= this.radius + shape.radius) continue;
      // Surface speed of the arm at the contact point, perpendicular to the arm radius.
      const rx = nearest.x - shape.x, ry = nearest.y - shape.y, reach = Math.hypot(rx, ry);
      const surfaceX = -ry * shape.spin, surfaceY = rx * shape.spin;
      ball.vx -= surfaceX; ball.vy -= surfaceY;
      const before = { vx: ball.vx, vy: ball.vy };
      if (this.shapeCollision(ball, nearest, shape.radius, 'spinner', 4 + (shape.index % 2), .8)) supported = true;
      ball.vx += surfaceX; ball.vy += surfaceY;
      // While attended, the ball's impulse turns the wheel with bounded torque.
      const impulseX = ball.vx - before.vx - surfaceX, impulseY = ball.vy - before.vy - surfaceY;
      if (reach > 1 && this.attention > 0) {
        const torque = (rx * impulseY - ry * impulseX) / (reach * reach) * .35;
        const limit = MAX_SPIN[this.options.motion];
        shape.spin = clamp(shape.spin + torque, -limit, limit);
      }
      limitVelocity(ball, this.maxSpeed);
    }
    return supported && Math.abs(shape.spin) < .05;
  }
  private projectFromShapes(ball: Ball): void {
    for (const peg of this.pegs) this.shapeCollision(ball, peg, peg.radius, 'peg', peg.hue);
    for (const shape of this.deflectors) {
      const [start, end] = deflectorSegment(shape);
      this.shapeCollision(ball, closestOnSegment(ball, start, end), shape.radius, 'deflector', 1);
    }
    for (const shape of this.bumpers) this.bumperCollision(ball, shape);
    for (const shape of this.spinners) this.spinnerCollision(ball, shape);
    for (const rail of this.rails) this.shapeCollision(ball, closestOnSegment(ball, rail.start, rail.end), rail.radius, 'rail', 3);
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
      this.impact((a.x + b.x) / 2, (a.y + b.y) / 2, -relative, 'ball', a.tint);
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
    for (const shape of this.bumpers) if (ball.y < shape.y && Math.abs(Math.hypot(ball.x - shape.x, ball.y - shape.y) - this.radius - shape.radius) < 1.5) return true;
    for (const shape of this.deflectors) {
      const [start, end] = deflectorSegment(shape), nearest = closestOnSegment(ball, start, end);
      if (ball.y < nearest.y && Math.abs(Math.hypot(ball.x - nearest.x, ball.y - nearest.y) - this.radius - shape.radius) < 1.5) return true;
    }
    for (const rail of this.rails) {
      const nearest = closestOnSegment(ball, rail.start, rail.end);
      if (ball.y < nearest.y && Math.abs(Math.hypot(ball.x - nearest.x, ball.y - nearest.y) - this.radius - rail.radius) < 1.5) return true;
    }
    for (const shape of this.spinners) if (Math.abs(shape.spin) < .05) for (const [start, end] of spinnerArms(shape)) {
      const nearest = closestOnSegment(ball, start, end);
      if (ball.y < nearest.y && Math.abs(Math.hypot(ball.x - nearest.x, ball.y - nearest.y) - this.radius - shape.radius) < 1.5) return true;
    }
    return this.balls.some(other => other !== ball && other.y > ball.y + this.radius * .3 && Math.abs(Math.hypot(ball.x - other.x, ball.y - other.y) - this.radius * 2) < 1.5);
  }
  private wakeUnsupported(): void {
    for (const ball of this.balls) if (ball.settled && !this.supportedAtRest(ball)) { ball.settled = false; ball.stillTime = 0; }
  }
  private substep(): void {
    const dt = FIXED_STEP;
    for (const shape of this.spinners) {
      if (Math.abs(shape.spin) < .04) shape.spin = 0;
      else {
        // Unattended, the wheel winds down within about a second.
        shape.spin *= this.attention <= 0 ? .96 : this.options.motion === 'gentle' ? .992 : .995;
        shape.angle = (shape.angle + shape.spin * dt) % TAU;
        // A turning wheel cannot support a resting ball.
        for (const ball of this.balls) if (ball.settled && Math.hypot(ball.x - shape.x, ball.y - shape.y) < shape.armLength + this.radius + shape.radius + 2) { ball.settled = false; ball.stillTime = 0; }
      }
    }
    this.wakeUnsupported();
    const gravity = (this.options.motion === 'gentle' ? 730 : 930) * this.radius / 20;
    const supported = new Uint8Array(this.balls.length);
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i]; if (ball.settled) continue;
      ball.vy += gravity * dt; ball.vx *= .997; ball.vy *= .999;
      limitVelocity(ball, this.maxSpeed); ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      for (const peg of this.pegs) if (this.shapeCollision(ball, peg, peg.radius, 'peg', peg.hue)) supported[i] = 1;
      for (const shape of this.deflectors) {
        const [start, end] = deflectorSegment(shape);
        if (this.shapeCollision(ball, closestOnSegment(ball, start, end), shape.radius, 'deflector', 1)) supported[i] = 1;
      }
      for (const shape of this.bumpers) if (this.bumperCollision(ball, shape)) supported[i] = 1;
      for (const shape of this.spinners) if (this.spinnerCollision(ball, shape)) supported[i] = 1;
      for (const rail of this.rails) if (this.shapeCollision(ball, closestOnSegment(ball, rail.start, rail.end), rail.radius, 'rail', 3)) supported[i] = 1;
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
      if (ball.x <= left) { ball.x = left; if (ball.vx < 0) { this.impact(left - this.radius, ball.y, -ball.vx, 'wall', 3); ball.vx *= -.45; } }
      if (ball.x >= right) { ball.x = right; if (ball.vx > 0) { this.impact(right + this.radius, ball.y, ball.vx, 'wall', 3); ball.vx *= -.45; } }
      if (ball.y <= top) { ball.y = top; if (ball.vy < 0) ball.vy *= -.3; }
      if (ball.y >= floor) {
        ball.y = floor; supported[i] = 1;
        if (ball.vy > 0) {
          this.impact(ball.x, floor + this.radius, ball.vy, 'wall', ball.tint);
          ball.vy = ball.vy > 30 ? -ball.vy * (this.options.motion === 'gentle' ? .25 : .4) : 0;
        }
        // Felt floor: slow sideways drift stops outright; faster rolls slow down.
        ball.vx = Math.abs(ball.vx) < 40 * this.radius / 20 ? 0 : ball.vx * .9;
      }
      // The trough is lined like a felt tray: a ball resting on something there
      // loses sideways drift, so a deep pile comes to rest instead of creeping.
      if (supported[i] && ball.y > this.troughTop - this.radius) ball.vx *= .975;
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
  /** Flow and attention advance only through actual stepped time: pause and
   * hidden tabs do not accumulate, and a resumed frame is clamped by MAX_STEPS. */
  private flow(seconds: number): void {
    if (this.attention <= 0) return;
    this.attention = Math.max(0, this.attention - seconds);
    this.flowClock -= seconds;
    if (this.flowClock <= 0) {
      this.flowClock = FLOW_INTERVAL[this.options.motion];
      this.dispense();
    }
  }
  private spinning(): boolean {
    return this.spinners.some(shape => shape.spin !== 0);
  }
  step(delta: number): boolean {
    this.impacts = []; this.recycled = []; this.dispensed = []; this.stepsLastUpdate = 0;
    if (!finite(delta) || delta <= 0) { this.accumulator = 0; return this.attention > 0 || this.spinning() || this.balls.some(ball => !ball.settled); }
    if (this.attention <= 0 && !this.spinning() && this.balls.every(ball => ball.settled)) { this.accumulator = 0; return false; }
    this.hasStepped = true;
    const maximum = FIXED_STEP * MAX_STEPS;
    if (delta > maximum) this.clampedUpdates++;
    this.accumulator = Math.min(maximum, this.accumulator + Math.min(delta, maximum));
    while (this.accumulator + 1e-10 >= FIXED_STEP && this.stepsLastUpdate < MAX_STEPS) {
      this.flow(FIXED_STEP);
      this.substep(); this.accumulator = Math.max(0, this.accumulator - FIXED_STEP); this.stepsLastUpdate++;
    }
    const moving = this.attention > 0 || this.spinning() || this.balls.some(ball => !ball.settled);
    if (!moving) this.accumulator = 0;
    return moving;
  }
  snapshot(): unknown {
    return {
      version: 2, nextId: this.nextId, angles: this.deflectors.map(shape => shape.angleIndex),
      spinners: this.spinners.map(shape => ({ angle: shape.angle, spin: shape.spin })),
      balls: this.balls.map(ball => ({ id: ball.id, x: ball.x / this.view.width, y: ball.y / this.view.height, vx: ball.vx / this.view.width, vy: ball.vy / this.view.height, settled: ball.settled, stillTime: Math.min(1, ball.stillTime), tint: ball.tint })),
    };
  }
  private restore(input: unknown): boolean {
    if (!input || typeof input !== 'object') return false;
    const saved = input as { version?: unknown; nextId?: unknown; angles?: unknown; spinners?: unknown; balls?: unknown };
    if (saved.version !== 2 || !Array.isArray(saved.balls) || saved.balls.length > MAX_BALLS || !Array.isArray(saved.angles) || saved.angles.length !== 2 || !saved.angles.every(value => Number.isInteger(value) && value >= 0 && value < 4)) return false;
    if (!Array.isArray(saved.spinners) || saved.spinners.length !== this.spinners.length) return false;
    for (const item of saved.spinners) {
      const spinner = item as { angle?: unknown; spin?: unknown };
      if (!item || typeof item !== 'object' || !finite(spinner.angle) || !finite(spinner.spin) || Math.abs(spinner.spin) > MAX_SPIN.playful) return false;
    }
    const restored: Ball[] = [], ids = new Set<number>();
    for (const item of saved.balls) {
      if (!item || typeof item !== 'object') return false;
      const ball = item as Ball;
      if (![ball.x, ball.y, ball.vx, ball.vy, ball.stillTime].every(finite) || ball.x < 0 || ball.x > 1 || ball.y < 0 || ball.y > 1 || Math.abs(ball.vx) > 10 || Math.abs(ball.vy) > 10 || !Number.isInteger(ball.id) || ball.id < 1 || ball.id > 1_000_000_000 || ids.has(ball.id) || typeof ball.settled !== 'boolean' || !Number.isInteger(ball.tint) || ball.tint < 0 || ball.tint >= TINTS || ball.stillTime < 0 || ball.stillTime > 1) return false;
      ids.add(ball.id);
      const next: Ball = { id: ball.id, x: ball.x * this.view.width, y: ball.y * this.view.height, vx: ball.settled ? 0 : ball.vx * this.view.width, vy: ball.settled ? 0 : ball.vy * this.view.height, settled: ball.settled, stillTime: ball.stillTime, tint: ball.tint };
      this.clampBall(next); limitVelocity(next, this.maxSpeed); restored.push(next);
    }
    this.balls = restored.slice(-this.options.cap);
    this.deflectors.forEach((shape, index) => { shape.angleIndex = (saved.angles as number[])[index]; });
    this.spinners.forEach((shape, index) => {
      const item = (saved.spinners as { angle: number; spin: number }[])[index];
      shape.angle = item.angle % TAU; shape.spin = clamp(item.spin, -MAX_SPIN[this.options.motion], MAX_SPIN[this.options.motion]);
    });
    this.nextId = Number.isInteger(saved.nextId) && (saved.nextId as number) >= 1 && (saved.nextId as number) <= 1_000_000_000 ? saved.nextId as number : Math.max(0, ...this.balls.map(ball => ball.id)) % 1_000_000_000 + 1;
    while (ids.has(this.nextId)) this.nextId = this.nextId >= 1_000_000_000 ? 1 : this.nextId + 1;
    this.hasStepped = true; this.removeOverlaps(); this.wakeUnsupported();
    return true;
  }
  debug() {
    return {
      balls: this.balls.length, activeBalls: this.balls.filter(ball => !ball.settled).length, settledBalls: this.balls.filter(ball => ball.settled).length,
      pegs: this.pegs.length, deflectors: this.deflectors.length, bumpers: this.bumpers.length, spinners: this.spinners.length, rails: this.rails.length,
      cap: this.options.cap, stepsLastUpdate: this.stepsLastUpdate, clampedUpdates: this.clampedUpdates, impacts: this.impacts.length, radius: this.radius, maxSpeed: this.maxSpeed,
      attention: this.attention, flowActive: this.attention > 0, inputSpawns: this.inputSpawns, flowSpawns: this.flowSpawns,
    };
  }
}
