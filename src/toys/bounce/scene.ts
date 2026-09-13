import type { SceneServices, ToyPointer, ToyScene, View } from '../../core/types';
import { BounceWorld, DEFLECTOR_TARGET_RADIUS, deflectorSegment, hitsDeflector, type Point } from './physics';

type Contact = Point & { mechanism: number | null };
type Glow = Point & { life: number; color: string };
const TAU = Math.PI * 2;
const colors = ['#7dbab5', '#aaa1d1', '#e7b48e', '#82b9d7'];

export class BounceScene implements ToyScene {
  readonly id = 'bounce' as const;
  private world: BounceWorld;
  private pointers = new Map<number, Contact>();
  private mechanismOwners = new Map<number, number>();
  private glows: Glow[] = [];
  private disposed = false;
  constructor(private services: SceneServices, snapshot?: unknown) {
    this.world = new BounceWorld({ width: 800, height: 600 }, { cap: services.settings.bounceBallCount, motion: services.settings.motion }, snapshot);
  }
  resize(view: View): void { this.cancelAll(); this.world.resize(view); }
  private glow(point: Point, color = '#6baba6'): void {
    if (this.glows.length >= 24) this.glows.shift();
    this.glows.push({ x: point.x, y: point.y, life: .26, color });
  }
  pointerDown(p: ToyPointer): void {
    if (this.disposed || this.pointers.has(p.id) || this.pointers.size >= 4 || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    const shape = this.world.deflectors.find(candidate => hitsDeflector(p, candidate));
    this.pointers.set(p.id, { x: p.x, y: p.y, mechanism: shape?.index ?? null });
    if (shape) {
      if (this.mechanismOwners.has(shape.index)) return;
      this.mechanismOwners.set(shape.index, p.id);
      this.world.rotateDeflector(shape.index);
      this.glow(shape, '#bd916d');
    } else {
      const ball = this.world.spawn(p);
      this.glow(ball, colors[ball.tint]);
    }
    this.services.sound('bounce');
  }
  pointerMove(p: ToyPointer): void {
    const contact = this.pointers.get(p.id); if (!contact || this.disposed || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    if (contact.mechanism === null) this.world.nudge(contact, p);
    contact.x = p.x; contact.y = p.y;
  }
  pointerEnd(id: number, _reason: 'up' | 'cancel' = 'up'): void {
    const contact = this.pointers.get(id); if (!contact) return;
    if (contact.mechanism !== null && this.mechanismOwners.get(contact.mechanism) === id) this.mechanismOwners.delete(contact.mechanism);
    this.pointers.delete(id);
  }
  cancelAll(): void { this.pointers.clear(); this.mechanismOwners.clear(); }
  update(delta: number): boolean {
    if (this.disposed) return false;
    const moving = this.world.step(delta);
    if (this.world.impacts.length) {
      // The common service supplies the 150 ms / two-voice cap. Geometry still
      // responds to every collision; no audio or visual event backlog exists.
      this.services.sound('bounce');
      if (this.services.settings.motion === 'playful') for (const impact of this.world.impacts) this.glow(impact);
    }
    const dt = Number.isFinite(delta) ? Math.max(0, Math.min(delta, 1 / 15)) : 0;
    for (const glow of this.glows) glow.life -= dt;
    this.glows = this.glows.filter(glow => glow.life > 0);
    return moving || this.glows.length > 0;
  }
  render(ctx: CanvasRenderingContext2D): void {
    const world = this.world, { width: w, height: h } = world.view, b = world.bounds, r = world.radius;
    ctx.fillStyle = '#fbf7ef'; ctx.fillRect(0, 0, w, h);
    // A single quiet board with generous lanes. Static shading only.
    const board = ctx.createLinearGradient(0, b.top, 0, b.bottom);
    board.addColorStop(0, '#edf5f0'); board.addColorStop(.55, '#e5f0eb'); board.addColorStop(1, '#dcebe6');
    ctx.beginPath(); ctx.roundRect(b.left - 7, b.top - 5, b.right - b.left + 14, b.bottom - b.top + 15, 30);
    ctx.fillStyle = board; ctx.fill(); ctx.strokeStyle = '#bad1c8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(b.left + 5, b.top + 7, b.right - b.left - 10, b.bottom - b.top - 10, 24); ctx.strokeStyle = '#ffffff9e'; ctx.lineWidth = 2; ctx.stroke();

    // Original penguin stays behind the physics, so balls are never hidden by
    // decorative artwork. Scene retains no image object or asynchronous load.
    const penguin = this.services.image?.('penguin');
    const penguinSize = Math.min(176, w * .24, h * .25);
    const penguinX = b.right - penguinSize - 12, penguinY = world.troughTop - penguinSize + 24;
    if (penguin) ctx.drawImage(penguin, penguinX, penguinY, penguinSize, penguinSize);
    else this.drawPenguin(ctx, penguinX + penguinSize / 2, penguinY + penguinSize / 2, penguinSize / 2);

    // Shallow receiving trough, with a readable back wall and open upper edge.
    ctx.beginPath(); ctx.roundRect(b.left + 8, world.troughTop, b.right - b.left - 16, b.bottom - world.troughTop + 3, [18, 18, 24, 24]);
    const tray = ctx.createLinearGradient(0, world.troughTop, 0, b.bottom); tray.addColorStop(0, '#bed6cf'); tray.addColorStop(1, '#d7e7de');
    ctx.fillStyle = tray; ctx.fill(); ctx.strokeStyle = '#99bdb2'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.left + 25, world.troughTop + 8); ctx.lineTo(b.right - 25, world.troughTop + 8); ctx.strokeStyle = '#f1f8ee'; ctx.lineWidth = 2; ctx.stroke();

    for (const peg of world.pegs) {
      ctx.fillStyle = '#638d8422'; ctx.beginPath(); ctx.ellipse(peg.x, peg.y + peg.radius + 4, peg.radius * .9, peg.radius * .3, 0, 0, TAU); ctx.fill();
      const ceramic = ctx.createRadialGradient(peg.x - peg.radius * .35, peg.y - peg.radius * .4, 1, peg.x, peg.y + peg.radius * .3, peg.radius * 1.4);
      ceramic.addColorStop(0, '#fffbec'); ceramic.addColorStop(.65, '#efdbb7'); ceramic.addColorStop(1, '#c4a97e');
      ctx.beginPath(); ctx.arc(peg.x, peg.y, peg.radius, 0, TAU); ctx.fillStyle = ceramic; ctx.fill(); ctx.strokeStyle = '#a38e6c'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    for (const shape of world.deflectors) {
      const [start, end] = deflectorSegment(shape);
      // Visible broad capsule corresponds to the generous 72px pointer target.
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.strokeStyle = '#cadfd5'; ctx.lineWidth = DEFLECTOR_TARGET_RADIUS * 2; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(start.x, start.y + 3); ctx.lineTo(end.x, end.y + 3); ctx.strokeStyle = '#7b9c872b'; ctx.lineWidth = 27; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.strokeStyle = '#a77858'; ctx.lineWidth = shape.radius * 2 + 3; ctx.stroke();
      ctx.strokeStyle = shape.index === 0 ? '#eebf91' : '#e2ae91'; ctx.lineWidth = shape.radius * 2 - 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(start.x, start.y - 3); ctx.lineTo(end.x, end.y - 3); ctx.strokeStyle = '#ffe4bd'; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(shape.x, shape.y, 7, 0, TAU); ctx.fillStyle = '#fff1d1'; ctx.fill(); ctx.strokeStyle = '#ac8462'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(shape.x - 2, shape.y - 2); ctx.lineTo(shape.x + 2, shape.y + 2); ctx.strokeStyle = '#9b7558'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    for (const ball of world.balls) {
      ctx.fillStyle = '#466d6620'; ctx.beginPath(); ctx.ellipse(ball.x, ball.y + r + 3, r * .85, r * .2, 0, 0, TAU); ctx.fill();
      const image = this.services.image?.(ball.tint % 2 === 0 ? 'ball' : 'ballTwo');
      if (image) {
        ctx.save(); ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, TAU); ctx.clip(); ctx.drawImage(image, ball.x - r, ball.y - r, r * 2, r * 2); ctx.restore();
        ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, TAU); ctx.strokeStyle = ball.tint % 2 === 0 ? '#78709b' : '#497c71'; ctx.lineWidth = 1.3; ctx.stroke();
      } else {
        const material = ctx.createRadialGradient(ball.x - r * .35, ball.y - r * .4, 1, ball.x, ball.y + r * .2, r * 1.3); material.addColorStop(0, '#f5f6e8'); material.addColorStop(.33, colors[ball.tint]); material.addColorStop(1, ball.tint % 2 ? '#797396' : '#4e9089');
        ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, TAU); ctx.fillStyle = material; ctx.fill(); ctx.strokeStyle = ball.tint % 2 ? '#746c8c' : '#52857d'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    // Thin front lip never covers the playable balls' centres or hit region.
    ctx.beginPath(); ctx.moveTo(b.left + 20, b.bottom + 4); ctx.quadraticCurveTo(w / 2, b.bottom + 18, b.right - 20, b.bottom + 4); ctx.strokeStyle = '#739e92'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
    for (const glow of this.glows) {
      const progress = 1 - glow.life / .26;
      const size = this.services.settings.motion === 'playful' ? 12 + progress * 10 : 12;
      ctx.globalAlpha = glow.life / .26 * .55; ctx.strokeStyle = glow.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(glow.x, glow.y, size, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  }
  private drawPenguin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    if (size <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
    ctx.fillStyle = '#6e969d'; ctx.beginPath(); ctx.ellipse(0, .06, .69, .86, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f9f3de'; ctx.beginPath(); ctx.ellipse(0, .21, .49, .61, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#284b49'; for (const eyeX of [-.24, .24]) { ctx.beginPath(); ctx.ellipse(eyeX, -.19, .045, .061, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#eeb47f'; ctx.beginPath(); ctx.moveTo(-.1, -.05); ctx.quadraticCurveTo(0, .07, .1, -.05); ctx.quadraticCurveTo(0, -.13, -.1, -.05); ctx.fill();
    ctx.fillStyle = '#dbaa76'; for (const footX of [-.31, .31]) { ctx.beginPath(); ctx.ellipse(footX, .86, .21, .09, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  snapshot(): unknown { return this.world.snapshot(); }
  debug() { return { ...this.world.debug(), pointers: this.pointers.size, mechanismOwners: this.mechanismOwners.size, effects: this.glows.length, ballStates: this.world.balls.map(ball => ({ ...ball })), pegStates: this.world.pegs.map(peg => ({ ...peg })), deflectorStates: this.world.deflectors.map(shape => ({ ...shape })), bounds: { ...this.world.bounds }, troughTop: this.world.troughTop }; }
  dispose(): void { this.disposed = true; this.cancelAll(); this.glows = []; this.world.balls = []; this.world.impacts = []; }
}
