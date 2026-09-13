/** One lazy streaming element. No full-track decodeAudioData or sample buffers. */
export class MusicService {
  private element?: HTMLAudioElement;
  private epoch = 0;
  private requested = false;
  private level = 0.08;
  private unavailable = false;
  private source?: MediaElementAudioSourceNode;
  private output?: GainNode;
  enabled = false;
  constructor(
    private getContext: () => AudioContext | null,
    private createElement: () => HTMLAudioElement = () => new Audio(),
  ) {}
  set gain(value: number) {
    this.level = Number.isFinite(value)
      ? Math.min(0.2, Math.max(0, value))
      : 0.08;
    if (this.output && this.enabled && this.requested)
      this.output.gain.value = this.level;
  }
  async enable(): Promise<boolean> {
    this.pause();
    this.enabled = false;
    this.unavailable = false;
    const ticket = ++this.epoch;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const context = this.getContext();
      if (!context) {
        this.unavailable = true;
        return false;
      }
      const element = (this.element ??= this.createElement());
      element.preload = "none";
      element.loop = true;
      if (!element.getAttribute("src")) element.src = "/assets/music.mp3";
      // Route streaming audio through the existing context. iOS media-element
      // volume is not a dependable attenuation control; GainNode is explicit.
      if (!this.output) {
        this.output = context.createGain();
        this.output.gain.value = 0;
        this.source = context.createMediaElementSource(element);
        this.source.connect(this.output);
        this.output.connect(context.destination);
      }
      this.output.gain.value = 0;
      // Both calls occur synchronously within the adult gesture. The stream is
      // primed silently and remains paused until the user returns to play.
      const ready = Promise.all([context.resume(), element.play()]).then(() => {
        if (ticket !== this.epoch && !this.requested) element.pause();
      });
      await Promise.race([
        ready,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error("music-timeout")),
            12_000,
          );
        }),
      ]);
      if (ticket !== this.epoch) {
        if (!this.requested) element.pause();
        return false;
      }
      element.pause();
      this.enabled = true;
      return true;
    } catch {
      if (ticket === this.epoch) {
        this.epoch++;
        this.element?.pause();
        this.unavailable = true;
      }
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
  /** Invoked only when the user returns to play or touches it after backgrounding. */
  resumeFromGesture(): void {
    if (!this.enabled || !this.element || this.requested) return;
    const element = this.element,
      ticket = ++this.epoch;
    this.requested = true;
    if (this.output) this.output.gain.value = this.level;
    void element
      .play()
      .then(() => {
        if (ticket !== this.epoch && !this.requested) element.pause();
      })
      .catch(() => {
        if (ticket === this.epoch) {
          element.pause();
          this.requested = false;
          this.enabled = false;
          this.unavailable = true;
        }
      });
  }
  pause(): void {
    this.epoch++;
    this.requested = false;
    if (this.output) this.output.gain.value = 0;
    this.element?.pause();
  }
  mute(): void {
    this.enabled = false;
    this.pause();
  }
  status() {
    return {
      musicEnabled: this.enabled,
      musicPlaying:
        this.enabled && this.requested && this.element?.paused === false,
      musicState: this.unavailable
        ? "unavailable"
        : this.element
          ? "streaming-element"
          : "not-created",
      musicElements: this.element ? 1 : 0,
    };
  }
  dispose(): void {
    this.mute();
    this.source?.disconnect();
    this.output?.disconnect();
    this.source = undefined;
    this.output = undefined;
    this.element?.removeAttribute("src");
    this.element?.load();
    this.element = undefined;
  }
}
