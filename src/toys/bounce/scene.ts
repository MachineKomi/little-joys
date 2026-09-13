import type { SceneServices, ToyPointer, ToyScene, View } from '../../core/types';
import { BounceWorld, DEFLECTOR_TARGET_RADIUS, TINTS, deflectorSegment, hitsBumper, hitsDeflector, hitsSpinner, spinnerArms, type Point } from './physics';

type Contact = Point & { mechanism: string | null };
type Glow = Point & { life: number; duration: number; color: string; kind: 'input' | 'impact' | 'pop'; strength: number };
const TAU = Math.PI * 2;
/** One bright, coherent six-colour palette shared by balls, pegs, bumpers and lights. */
export const PALETTE = ['#ff7a5c', '#ffc23d', '#3ccf9e', '#4fb3f2', '#a98af5', '#ff86c0'] as const;
const PALETTE_DEEP = ['#d94f33', '#d99a12', '#1f9f74', '#2686c9', '#7b5fd1', '#d9558f'] as const;
const REACTION_SECONDS = .48;

export class BounceScene implements ToyScene {
  readonly id = 'bounce' as const;
  private world: BounceWorld;
  private pointers = new Map<number, Contact>();
  private mechanismOwners = new Map<string, number>();
  private glows: Glow[] = [];
  private bumperCharge = [0, 0, 0];
  private reaction = 0;
  private disposed = false;
  private tinted: HTMLCanvasElement[] = [];
  private tintedSize = 0;
  private tintedSource?: HTMLImageElement;
  constructor(private services: SceneServices, snapshot?: unknown) {
    this.world = new BounceWorld({ width: 800, height: 600 }, { cap: services.settings.bounceBallCount, motion: services.settings.motion }, snapshot);
  }
  resize(view: View): void { this.cancelAll(); this.world.resize(view); }
  private playful(): boolean { return this.services.settings.motion === 'playful'; }
  private glow(point: Point, color: string, kind: Glow['kind'] = 'input', strength = 1): void {
    if (kind === 'impact') {
      // Repeated contact in one spot strengthens one smooth pulse, without
      // restarting it or piling multiple flashes onto the same surface.
      const existing = this.glows.find(glow => glow.kind === 'impact' && Math.hypot(glow.x - point.x, glow.y - point.y) < 20);
      if (existing) { existing.strength = Math.max(existing.strength, strength); return; }
    }
    if (this.glows.length >= 24) {
      const oldImpact = this.glows.findIndex(glow => glow.kind === 'impact');
      this.glows.splice(oldImpact >= 0 ? oldImpact : 0, 1);
    }
    const duration = this.playful() ? kind === 'input' ? .46 : .38 : .3;
    this.glows.push({ x: point.x, y: point.y, life: duration, duration, color, kind, strength });
  }
  private react(): void {
    // One bounded character response clock; repetition restarts it, never queues it.
    this.reaction = REACTION_SECONDS;
  }
  private penguinHit(p: Point): boolean {
    const shelf = this.world.shelf, size = this.penguinSize();
    return p.y < this.world.bounds.top && Math.abs(p.x - this.world.chute.x) <= size * .5 + 16 && p.y >= shelf.top - 8;
  }
  pointerDown(p: ToyPointer): void {
    if (this.disposed || this.pointers.has(p.id) || this.pointers.size >= 4 || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    this.world.touch();
    const deflector = this.world.deflectors.find(candidate => hitsDeflector(p, candidate));
    const spinner = deflector ? undefined : this.world.spinners.find(candidate => hitsSpinner(p, candidate));
    const bumper = deflector || spinner ? undefined : this.world.bumpers.find(candidate => hitsBumper(p, candidate));
    const mechanism = deflector ? `deflector-${deflector.index}` : spinner ? `spinner-${spinner.index}` : bumper ? `bumper-${bumper.index}` : this.penguinHit(p) ? 'penguin' : null;
    this.pointers.set(p.id, { x: p.x, y: p.y, mechanism });
    if (mechanism) {
      if (this.mechanismOwners.has(mechanism)) return;
      this.mechanismOwners.set(mechanism, p.id);
      if (deflector) { this.world.rotateDeflector(deflector.index); this.glow(deflector, PALETTE[1]); }
      else if (spinner) { this.world.spinSpinner(spinner.index); this.glow(spinner, PALETTE[4]); }
      else if (bumper) { this.world.pulseBumper(bumper.index); this.bumperCharge[bumper.index] = 1; this.glow(bumper, PALETTE[bumper.hue]); }
      else { const ball = this.world.dispense(); this.glow(ball, PALETTE[ball.tint]); this.react(); }
    } else {
      const ball = this.world.spawn(p);
      this.glow(ball, PALETTE[ball.tint]);
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
    const playful = this.playful();
    if (this.world.impacts.length) {
      // The common service supplies the 150 ms / two-voice cap. Geometry still
      // responds to every collision; no audio or visual event backlog exists.
      this.services.sound('bounce');
      for (const impact of this.world.impacts) {
        const strength = .5 + .5 * Math.min(1, impact.strength / this.world.maxSpeed);
        if (impact.kind === 'bumper') this.bumperCharge[this.world.bumpers.findIndex(b => Math.hypot(b.x - impact.x, b.y - impact.y) <= b.radius + 2)] = 1;
        // Gentle keeps a quiet static fade; Playful adds coloured blooms and rays.
        if (playful || impact.kind === 'bumper' || impact.kind === 'spinner') this.glow(impact, PALETTE[impact.hue % PALETTE.length], 'impact', playful ? strength : Math.min(strength, .7));
      }
    }
    for (const point of this.world.recycled) this.glow(point, '#ffffff', 'pop', .8);
    if (this.world.dispensed.length) this.react();
    const dt = Number.isFinite(delta) ? Math.max(0, Math.min(delta, 1 / 15)) : 0;
    for (const glow of this.glows) glow.life -= dt;
    this.glows = this.glows.filter(glow => glow.life > 0);
    for (let i = 0; i < this.bumperCharge.length; i++) this.bumperCharge[i] = Math.max(0, this.bumperCharge[i] - dt * 2.2);
    this.reaction = Math.max(0, this.reaction - dt);
    return moving || this.glows.length > 0 || this.reaction > 0 || this.bumperCharge.some(charge => charge > 0);
  }
  private penguinSize(): number {
    const shelf = this.world.shelf;
    return Math.min((shelf.bottom - shelf.top) / .88, this.world.view.width * .3);
  }
  /** Six ball colours from the two painted sprites, prepared once per layout size. */
  private prepareTints(image: HTMLImageElement, size: number): void {
    if (this.tintedSource === image && this.tintedSize === size && this.tinted.length === TINTS) return;
    this.releaseTints();
    for (let tint = 0; tint < TINTS; tint++) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { this.releaseTints(); return; }
      ctx.drawImage(image, 0, 0, size, size);
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = PALETTE[tint];
      ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(image, 0, 0, size, size);
      ctx.globalCompositeOperation = 'source-over';
      this.tinted.push(canvas);
    }
    this.tintedSource = image; this.tintedSize = size;
  }
  private releaseTints(): void {
    for (const canvas of this.tinted) canvas.width = canvas.height = 0;
    this.tinted = []; this.tintedSize = 0; this.tintedSource = undefined;
  }
  render(ctx: CanvasRenderingContext2D): void {
    const world = this.world, { width: w, height: h } = world.view, b = world.bounds, r = world.radius, playful = this.playful();
    ctx.fillStyle = '#fbf7ef'; ctx.fillRect(0, 0, w, h);
    // Bright icy board inside a warm cream frame.
    const frameTop = world.shelf.top - 4;
    const board = ctx.createLinearGradient(0, frameTop, 0, b.bottom);
    board.addColorStop(0, '#eafaff'); board.addColorStop(.5, '#d3efff'); board.addColorStop(1, '#bfe3fb');
    ctx.beginPath(); ctx.roundRect(b.left - 9, frameTop, b.right - b.left + 18, b.bottom - frameTop + 16, 30);
    ctx.fillStyle = board; ctx.fill(); ctx.strokeStyle = '#8fc4e6'; ctx.lineWidth = 3; ctx.stroke();
    // Snow shelf across the top: the penguin's stand and the chute.
    const shelf = world.shelf;
    ctx.beginPath(); ctx.roundRect(b.left - 6, shelf.top, b.right - b.left + 12, shelf.bottom - shelf.top + 2, [26, 26, 18, 18]);
    const snow = ctx.createLinearGradient(0, shelf.top, 0, shelf.bottom); snow.addColorStop(0, '#ffffff'); snow.addColorStop(1, '#e6f4fc');
    ctx.fillStyle = snow; ctx.fill();
    ctx.beginPath(); ctx.moveTo(b.left + 10, shelf.bottom + 1); ctx.lineTo(b.right - 10, shelf.bottom + 1); ctx.strokeStyle = '#9fd0ee'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    // Chute mouth under the penguin.
    ctx.beginPath(); ctx.ellipse(world.chute.x, shelf.bottom + 2, r * 1.15, r * .42, 0, 0, TAU); ctx.fillStyle = '#5c8fb3'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(world.chute.x, shelf.bottom + 1, r * .95, r * .3, 0, 0, TAU); ctx.fillStyle = '#2f5f82'; ctx.fill();

    // Deep receiving trough with a bright rim.
    ctx.beginPath(); ctx.roundRect(b.left + 8, world.troughTop, b.right - b.left - 16, b.bottom - world.troughTop + 3, [18, 18, 24, 24]);
    const tray = ctx.createLinearGradient(0, world.troughTop, 0, b.bottom); tray.addColorStop(0, '#7fb6d6'); tray.addColorStop(1, '#a9d4ec');
    ctx.fillStyle = tray; ctx.fill(); ctx.strokeStyle = '#5b95bd'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.left + 25, world.troughTop + 8); ctx.lineTo(b.right - 25, world.troughTop + 8); ctx.strokeStyle = '#e9f7ff'; ctx.lineWidth = 2; ctx.stroke();

    for (const rail of world.rails) {
      ctx.beginPath(); ctx.moveTo(rail.start.x, rail.start.y + 3); ctx.lineTo(rail.end.x, rail.end.y + 3); ctx.strokeStyle = '#7fb0cf66'; ctx.lineWidth = rail.radius * 2 + 4; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rail.start.x, rail.start.y); ctx.lineTo(rail.end.x, rail.end.y); ctx.strokeStyle = '#4f8fb8'; ctx.lineWidth = rail.radius * 2 + 2; ctx.stroke();
      ctx.strokeStyle = '#a6dcf8'; ctx.lineWidth = rail.radius * 2 - 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rail.start.x, rail.start.y - 3); ctx.lineTo(rail.end.x, rail.end.y - 3); ctx.strokeStyle = '#ffffffb0'; ctx.lineWidth = 3; ctx.stroke();
    }
    for (const peg of world.pegs) {
      ctx.fillStyle = '#2f6a8a22'; ctx.beginPath(); ctx.ellipse(peg.x, peg.y + peg.radius + 4, peg.radius * .9, peg.radius * .3, 0, 0, TAU); ctx.fill();
      const glaze = ctx.createRadialGradient(peg.x - peg.radius * .35, peg.y - peg.radius * .4, 1, peg.x, peg.y + peg.radius * .3, peg.radius * 1.4);
      glaze.addColorStop(0, '#ffffff'); glaze.addColorStop(.35, PALETTE[peg.hue]); glaze.addColorStop(1, PALETTE_DEEP[peg.hue]);
      ctx.beginPath(); ctx.arc(peg.x, peg.y, peg.radius, 0, TAU); ctx.fillStyle = glaze; ctx.fill(); ctx.strokeStyle = PALETTE_DEEP[peg.hue]; ctx.lineWidth = 1.4; ctx.stroke();
    }
    world.bumpers.forEach((shape, index) => {
      const charge = this.bumperCharge[index];
      if (charge > 0) {
        // In-place brightening only: a static halo that fades, in both modes.
        const halo = ctx.createRadialGradient(shape.x, shape.y, shape.radius * .6, shape.x, shape.y, shape.radius * 2.1);
        halo.addColorStop(0, `${PALETTE[shape.hue]}cc`); halo.addColorStop(1, `${PALETTE[shape.hue]}00`);
        ctx.globalAlpha = charge; ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(shape.x, shape.y, shape.radius * 2.1, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#2f6a8a22'; ctx.beginPath(); ctx.ellipse(shape.x, shape.y + shape.radius + 5, shape.radius * .95, shape.radius * .32, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(shape.x, shape.y, shape.radius + 4, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = PALETTE_DEEP[shape.hue]; ctx.lineWidth = 2; ctx.stroke();
      const dome = ctx.createRadialGradient(shape.x - shape.radius * .3, shape.y - shape.radius * .35, 2, shape.x, shape.y, shape.radius);
      dome.addColorStop(0, charge > .3 ? '#ffffff' : '#fff6d6'); dome.addColorStop(.45, PALETTE[shape.hue]); dome.addColorStop(1, PALETTE_DEEP[shape.hue]);
      ctx.beginPath(); ctx.arc(shape.x, shape.y, shape.radius, 0, TAU); ctx.fillStyle = dome; ctx.fill();
      ctx.beginPath(); ctx.arc(shape.x, shape.y, shape.radius * .45, 0, TAU); ctx.fillStyle = '#ffffffaa'; ctx.fill();
    });
    for (const shape of world.spinners) {
      ctx.fillStyle = '#2f6a8a22'; ctx.beginPath(); ctx.ellipse(shape.x, shape.y + shape.armLength * .3 + 6, shape.armLength * .6, shape.armLength * .16, 0, 0, TAU); ctx.fill();
      spinnerArms(shape).forEach(([start, end], arm) => {
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = PALETTE_DEEP[(arm * 2 + 1) % PALETTE_DEEP.length]; ctx.lineWidth = shape.radius * 2 + 3; ctx.lineCap = 'round'; ctx.stroke();
        ctx.strokeStyle = PALETTE[(arm * 2 + 1) % PALETTE.length]; ctx.lineWidth = shape.radius * 2 - 1; ctx.stroke();
        // A paddle blade on each arm reads as a pinwheel rather than a cross.
        const angle = Math.atan2(end.y - start.y, end.x - start.x), bx = end.x - Math.cos(angle) * shape.armLength * .34, by = end.y - Math.sin(angle) * shape.armLength * .34;
        ctx.beginPath(); ctx.ellipse(bx, by, shape.armLength * .3, shape.radius * 1.6, angle, 0, TAU); ctx.fillStyle = PALETTE[(arm * 2 + 1) % PALETTE.length]; ctx.fill(); ctx.strokeStyle = PALETTE_DEEP[(arm * 2 + 1) % PALETTE_DEEP.length]; ctx.lineWidth = 1.5; ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(shape.x, shape.y, shape.radius + 4, 0, TAU); ctx.fillStyle = '#fff6d6'; ctx.fill(); ctx.strokeStyle = '#8a6d4a'; ctx.lineWidth = 2; ctx.stroke();
    }
    for (const shape of world.deflectors) {
      const [start, end] = deflectorSegment(shape);
      // Visible broad capsule corresponds to the generous 72px pointer target.
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.strokeStyle = '#ffffff8c'; ctx.lineWidth = DEFLECTOR_TARGET_RADIUS * 2; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(start.x, start.y + 3); ctx.lineTo(end.x, end.y + 3); ctx.strokeStyle = '#2f6a8a30'; ctx.lineWidth = 27; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.strokeStyle = '#b56a3c'; ctx.lineWidth = shape.radius * 2 + 3; ctx.stroke();
      ctx.strokeStyle = shape.index === 0 ? '#ffb56b' : '#ff9d7a'; ctx.lineWidth = shape.radius * 2 - 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(start.x, start.y - 3); ctx.lineTo(end.x, end.y - 3); ctx.strokeStyle = '#ffe4bd'; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(shape.x, shape.y, 7, 0, TAU); ctx.fillStyle = '#fff1d1'; ctx.fill(); ctx.strokeStyle = '#ac8462'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(shape.x - 2, shape.y - 2); ctx.lineTo(shape.x + 2, shape.y + 2); ctx.strokeStyle = '#9b7558'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    const sprite = this.services.image?.('ball');
    if (sprite) this.prepareTints(sprite, Math.max(24, Math.ceil(r * 2 * 1.5)));
    for (const ball of world.balls) {
      ctx.fillStyle = '#2f6a8a24'; ctx.beginPath(); ctx.ellipse(ball.x, ball.y + r + 3, r * .85, r * .2, 0, 0, TAU); ctx.fill();
      const image = this.tinted[ball.tint % this.tinted.length];
      if (image) {
        ctx.drawImage(image, ball.x - r, ball.y - r, r * 2, r * 2);
        ctx.beginPath(); ctx.arc(ball.x, ball.y, r - .5, 0, TAU); ctx.strokeStyle = PALETTE_DEEP[ball.tint]; ctx.lineWidth = 1.2; ctx.stroke();
      } else {
        const material = ctx.createRadialGradient(ball.x - r * .35, ball.y - r * .4, 1, ball.x, ball.y + r * .2, r * 1.3); material.addColorStop(0, '#fffbe8'); material.addColorStop(.33, PALETTE[ball.tint]); material.addColorStop(1, PALETTE_DEEP[ball.tint]);
        ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, TAU); ctx.fillStyle = material; ctx.fill(); ctx.strokeStyle = PALETTE_DEEP[ball.tint]; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    // Thin front lip never covers the playable balls' centres or hit region.
    ctx.beginPath(); ctx.moveTo(b.left + 20, b.bottom + 4); ctx.quadraticCurveTo(w / 2, b.bottom + 18, b.right - 20, b.bottom + 4); ctx.strokeStyle = '#4f8fb8'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
    for (const glow of this.glows) {
      if (glow.kind === 'pop') this.drawPop(ctx, glow);
      else if (playful) this.drawLight(ctx, glow);
      else {
        // Gentle: a soft static halo at the contact that only fades.
        const fade = glow.life / glow.duration;
        const halo = ctx.createRadialGradient(glow.x, glow.y, 2, glow.x, glow.y, 18);
        halo.addColorStop(0, '#ffffff'); halo.addColorStop(.4, glow.color); halo.addColorStop(1, `${glow.color}00`);
        ctx.globalAlpha = fade * .7 * glow.strength; ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(glow.x, glow.y, 18, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    this.drawPenguinOnShelf(ctx);
  }
  private drawPenguinOnShelf(ctx: CanvasRenderingContext2D): void {
    const world = this.world, shelf = world.shelf, size = this.penguinSize();
    // Feet rest on the shelf edge; the sprite's opaque body spans 5.5%–93.4% of its height.
    const progress = this.reaction > 0 ? 1 - this.reaction / REACTION_SECONDS : 0;
    // Playful: one smooth dip and rise. Gentle: a single quiet dip that eases out.
    const amount = this.reaction > 0 ? this.playful() ? Math.sin(progress * Math.PI) : Math.sin(Math.min(1, progress * 1.6) * Math.PI) * .45 : 0;
    const dip = amount * Math.min(12, size * .08), squash = 1 - amount * .08;
    const x = world.chute.x, footY = shelf.bottom + 1 + dip;
    const penguin = this.services.image?.('penguin');
    ctx.save();
    ctx.translate(x, footY); ctx.scale(1 + (1 - squash) * .6, squash); ctx.translate(-x, -footY);
    const top = footY - size * .934;
    if (penguin) ctx.drawImage(penguin, x - size / 2, top, size, size);
    else this.drawPenguin(ctx, x, top + size * .5, size * .5);
    ctx.restore();
  }
  private drawPop(ctx: CanvasRenderingContext2D, glow: Glow): void {
    // A recycled ball leaves a brief soft ring where it rested; no expansion in Gentle.
    const fade = glow.life / glow.duration, playful = this.playful();
    const radius = this.world.radius * (playful ? 1 + (1 - fade) * .6 : 1.1);
    ctx.globalAlpha = fade * .75; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(glow.x, glow.y, radius, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  private drawLight(ctx: CanvasRenderingContext2D, glow: Glow): void {
    const progress = Math.max(0, Math.min(1, 1 - glow.life / glow.duration));
    const fade = 1 - progress, pulse = Math.sin(progress * Math.PI);
    const reach = (28 + progress * 15) * (.78 + glow.strength * .22);
    const bloom = ctx.createRadialGradient(glow.x, glow.y, 1, glow.x, glow.y, reach);
    bloom.addColorStop(0, '#fff8d8'); bloom.addColorStop(.22, glow.color); bloom.addColorStop(1, `${glow.color}00`);
    ctx.globalAlpha = .7 * pulse * glow.strength;
    ctx.fillStyle = bloom; ctx.beginPath(); ctx.arc(glow.x, glow.y, reach, 0, TAU); ctx.fill();

    // A bright coloured rim and five short rays identify the local contact.
    // Everything follows one outward arc and fade; no flicker or oscillation.
    ctx.globalAlpha = .9 * fade; ctx.strokeStyle = glow.color; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(glow.x, glow.y, 8 + progress * 19, 0, TAU); ctx.stroke();
    const turn = (glow.x + glow.y) * .015;
    ctx.beginPath();
    for (let ray = 0; ray < 5; ray++) {
      const angle = ray / 5 * TAU + turn, start = 13 + progress * 23, end = start + 6 * fade + 2;
      ctx.moveTo(glow.x + Math.cos(angle) * start, glow.y + Math.sin(angle) * start);
      ctx.lineTo(glow.x + Math.cos(angle) * end, glow.y + Math.sin(angle) * end);
    }
    ctx.stroke();
    ctx.globalAlpha = .8 * pulse; ctx.fillStyle = '#fff8dc';
    ctx.beginPath(); ctx.arc(glow.x, glow.y, 3.5 * fade, 0, TAU); ctx.fill();
  }
  private drawPenguin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    if (size <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
    ctx.fillStyle = '#2f5f82'; ctx.beginPath(); ctx.ellipse(0, .06, .69, .86, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f9f3de'; ctx.beginPath(); ctx.ellipse(0, .21, .49, .61, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#284b49'; for (const eyeX of [-.24, .24]) { ctx.beginPath(); ctx.ellipse(eyeX, -.19, .045, .061, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ff8a5c'; ctx.beginPath(); ctx.moveTo(-.1, -.05); ctx.quadraticCurveTo(0, .07, .1, -.05); ctx.quadraticCurveTo(0, -.13, -.1, -.05); ctx.fill();
    ctx.fillStyle = '#ff8a5c'; for (const footX of [-.31, .31]) { ctx.beginPath(); ctx.ellipse(footX, .86, .21, .09, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  snapshot(): unknown { return this.world.snapshot(); }
  debug() {
    return {
      ...this.world.debug(), pointers: this.pointers.size, mechanismOwners: this.mechanismOwners.size, effects: this.glows.length,
      preparedRasterBytes: this.tinted.length * this.tintedSize * this.tintedSize * 4,
      deflectorAngles: this.world.deflectors.map(shape => shape.angleIndex), spinnerSpin: this.world.spinners[0]?.spin ?? 0,
      ballStates: this.world.balls.map(ball => ({ ...ball })), pegStates: this.world.pegs.map(peg => ({ ...peg })), deflectorStates: this.world.deflectors.map(shape => ({ ...shape })),
      bumperStates: this.world.bumpers.map(shape => ({ ...shape })), spinnerStates: this.world.spinners.map(shape => ({ ...shape })),
      bounds: { ...this.world.bounds }, troughTop: this.world.troughTop, chute: { ...this.world.chute }, shelf: { ...this.world.shelf }, reaction: this.reaction,
    };
  }
  dispose(): void { this.disposed = true; this.cancelAll(); this.glows = []; this.releaseTints(); this.world.balls = []; this.world.impacts = []; this.world.attention = 0; }
}
