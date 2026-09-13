import type { SettingsV1, ToyId, ToyPointer, ToyScene, View } from "./types";
import { backingScale, coordinates } from "./coordinates";
import { PointerTracker } from "./pointers";
import { AudioService } from "./audio";
import { MusicService } from "./music";
import { Diagnostics } from "./diagnostics";
import { SquishyScene } from "../toys/squishy/scene";
import { BubbleScene } from "../toys/bubbles/scene";
import { NestScene } from "../toys/nest/scene";
import { BounceScene } from "../toys/bounce/scene";
import { AssetStore, type ArtKey } from "./assets";
export class Runtime {
  private scene: ToyScene;
  private settings: SettingsV1;
  private snapshots = new Map<ToyId, unknown>();
  private pointers = new PointerTracker();
  private audio = new AudioService();
  private music = new MusicService(() => this.audio.streamingContext());
  private assets = new AssetStore();
  private diagnostics = new Diagnostics();
  private observer: ResizeObserver;
  private view: View = { width: 1, height: 1 };
  private frame = 0;
  private previous = 0;
  private inputAt = 0;
  private paused = false;
  private hidden = false;
  private disposed = false;
  private ctx: CanvasRenderingContext2D;
  constructor(
    private canvas: HTMLCanvasElement,
    toy: ToyId,
    settings: SettingsV1,
  ) {
    this.settings = settings;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas2D unavailable");
    this.ctx = ctx;
    this.scene = this.create(toy);
    this.diagnostics.enabled = settings.diagnosticsEnabled;
    this.audio.gain = settings.sfxGain;
    this.music.gain = settings.musicGain;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    canvas.addEventListener("pointerdown", this.down);
    canvas.addEventListener("pointermove", this.move);
    canvas.addEventListener("pointerup", this.up);
    canvas.addEventListener("pointercancel", this.cancel);
    canvas.addEventListener("lostpointercapture", this.cancel);
    window.addEventListener("blur", this.blur);
    window.addEventListener("focus", this.focus);
    document.addEventListener("visibilitychange", this.visibility);
    this.resize();
    this.assets.load(() => {
      this.canvas.dataset.art = String(this.assets.count);
      this.request();
    });
  }
  private create(toy: ToyId): ToyScene {
    const services = {
      settings: this.settings,
      sound: (id: ToyId) => this.audio.play(id),
      image: (key: ArtKey) => this.assets.get(key),
    };
    if (toy === "bubbles")
      return new BubbleScene(services, this.snapshots.get(toy));
    if (toy === "nest") return new NestScene(services, this.snapshots.get(toy));
    if (toy === "bounce")
      return new BounceScene(services, this.snapshots.get(toy));
    return new SquishyScene(services, this.snapshots.get("squishy"));
  }
  private point(e: PointerEvent): ToyPointer {
    const p = coordinates(
      e.clientX,
      e.clientY,
      this.canvas.getBoundingClientRect(),
      this.view,
    );
    return {
      id: e.pointerId,
      ...p,
      previousX: p.x,
      previousY: p.y,
      timeMs: e.timeStamp,
    };
  }
  private down = (e: PointerEvent) => {
    if (this.paused || this.hidden || e.button > 0) return;
    const p = this.point(e);
    if (!this.pointers.down(p)) return;
    this.music.resumeFromGesture();
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* Synthetic input cannot capture. */
    }
    this.scene.pointerDown(p);
    if (!this.inputAt) this.inputAt = performance.now();
    this.request();
    this.counts();
  };
  private move = (e: PointerEvent) => {
    if (this.paused || this.hidden) return;
    let events: PointerEvent[] = [];
    try {
      events = e.getCoalescedEvents?.() ?? [];
    } catch {}
    if (events.length === 0) events = [e];
    for (const event of events) {
      const p = this.pointers.move(this.point(event));
      if (p) {
        this.scene.pointerMove(p);
        if (!this.inputAt) this.inputAt = performance.now();
        this.request();
      }
    }
  };
  private end(e: PointerEvent, reason: "up" | "cancel") {
    if (this.pointers.end(e.pointerId)) {
      this.scene.pointerEnd(e.pointerId, reason);
      try {
        if (this.canvas.hasPointerCapture(e.pointerId))
          this.canvas.releasePointerCapture(e.pointerId);
      } catch {}
      this.request();
    }
    this.counts();
  }
  private up = (e: PointerEvent) => this.end(e, "up");
  private cancel = (e: PointerEvent) => this.end(e, "cancel");
  private cancelAll() {
    for (const id of this.pointers.active.keys()) {
      try {
        if (this.canvas.hasPointerCapture(id))
          this.canvas.releasePointerCapture(id);
      } catch {}
    }
    this.pointers.clear();
    this.scene.cancelAll();
    this.audio.stop();
    this.counts();
  }
  private blur = () => {
    this.hidden = true;
    this.music.pause();
    this.cancelAll();
    this.sleep();
  };
  private focus = () => {
    this.hidden = document.hidden;
    this.previous = 0;
    this.request();
  };
  private visibility = () => {
    if (document.hidden) this.blur();
    else this.focus();
  };
  private resize() {
    this.cancelAll();
    const rect = this.canvas.getBoundingClientRect();
    this.view = {
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
    };
    const scale = backingScale(this.view, window.devicePixelRatio);
    this.canvas.width = Math.floor(this.view.width * scale);
    this.canvas.height = Math.floor(this.view.height * scale);
    this.ctx.setTransform(
      this.canvas.width / this.view.width,
      0,
      0,
      this.canvas.height / this.view.height,
      0,
      0,
    );
    this.scene.resize(this.view);
    this.scene.render(this.ctx);
    this.request();
  }
  private counts() {
    this.canvas.dataset.pointers = String(this.pointers.active.size);
    this.canvas.dataset.toy = this.scene.id;
  }
  private request = () => {
    if (!this.frame && !this.paused && !this.hidden && !this.disposed) {
      this.frame = requestAnimationFrame(this.tick);
    }
  };
  private tick = (time: number) => {
    this.frame = 0;
    if (this.paused || this.hidden || this.disposed) return;
    const interval = this.previous ? time - this.previous : 0;
    const dt = this.previous ? Math.min(0.05, interval / 1000) : 1 / 60;
    this.previous = time;
    const start = performance.now();
    const more = this.scene.update(dt);
    this.scene.render(this.ctx);
    const end = performance.now();
    this.diagnostics.frame(interval, end - start);
    if (this.inputAt) {
      this.diagnostics.inputRender(end - this.inputAt);
      this.inputAt = 0;
    }
    if (more) this.request();
    else this.previous = 0;
  };
  private sleep() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.previous = 0;
    this.inputAt = 0;
  }
  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) {
      this.music.pause();
      this.cancelAll();
      this.sleep();
    } else {
      this.hidden = document.hidden;
      if (!this.hidden) this.music.resumeFromGesture();
      this.request();
    }
  }
  setToy(toy: ToyId) {
    if (this.scene.id === toy) return;
    this.music.pause();
    this.cancelAll();
    this.sleep();
    this.snapshots.set(this.scene.id, this.scene.snapshot());
    this.scene.dispose();
    this.scene = this.create(toy);
    this.scene.resize(this.view);
    this.counts();
    this.scene.render(this.ctx);
    this.request();
  }
  configure(settings: SettingsV1) {
    this.cancelAll();
    this.settings = settings;
    this.audio.gain = settings.sfxGain;
    this.music.gain = settings.musicGain;
    if (!settings.soundEnabled) this.audio.mute();
    if (!settings.musicEnabled) this.music.mute();
    if (this.diagnostics.enabled && !settings.diagnosticsEnabled)
      this.diagnostics.clear();
    this.diagnostics.enabled = settings.diagnosticsEnabled;
    this.snapshots.set(this.scene.id, this.scene.snapshot());
    const id = this.scene.id;
    this.scene.dispose();
    this.scene = this.create(id);
    this.scene.resize(this.view);
    this.scene.render(this.ctx);
    this.request();
  }
  enableAudio(): Promise<boolean> {
    return this.audio.enable();
  }
  enableMusic(): Promise<boolean> {
    return this.music.enable();
  }
  disableAudio() {
    this.audio.mute();
  }
  disableMusic() {
    this.music.mute();
  }
  mute() {
    this.audio.mute();
    this.music.mute();
  }
  status() {
    const debug = this.scene.debug();
    return {
      buildId: __BUILD_ID__,
      toy: this.scene.id,
      paused: this.paused,
      effectiveMotion: this.settings.motion,
      residentImages: this.assets.count,
      pointers: this.pointers.active.size,
      canvasPixels: this.canvas.width * this.canvas.height,
      backingScale: backingScale(this.view, window.devicePixelRatio),
      effectiveBubbleCount: debug.effectiveBubbleCount,
      bubbleLayoutLimited: debug.bubbleLayoutLimited,
      bounceBalls: this.scene.id === "bounce" ? debug.balls : undefined,
      bounceBallLimit: this.scene.id === "bounce" ? debug.cap : undefined,
      bounceActiveBalls:
        this.scene.id === "bounce" ? debug.activeBalls : undefined,
      bounceSettledBalls:
        this.scene.id === "bounce" ? debug.settledBalls : undefined,
      effects: debug.effects,
      ...this.audio.status(),
      ...this.music.status(),
      diagnosticsEnabled: this.diagnostics.enabled,
      timings: this.diagnostics.summary(),
    };
  }
  dispose() {
    this.disposed = true;
    this.cancelAll();
    this.sleep();
    this.observer.disconnect();
    this.scene.dispose();
    this.audio.dispose();
    this.music.dispose();
    this.assets.dispose();
    this.snapshots.clear();
    this.canvas.removeEventListener("pointerdown", this.down);
    this.canvas.removeEventListener("pointermove", this.move);
    this.canvas.removeEventListener("pointerup", this.up);
    this.canvas.removeEventListener("pointercancel", this.cancel);
    this.canvas.removeEventListener("lostpointercapture", this.cancel);
    window.removeEventListener("blur", this.blur);
    window.removeEventListener("focus", this.focus);
    document.removeEventListener("visibilitychange", this.visibility);
  }
}
