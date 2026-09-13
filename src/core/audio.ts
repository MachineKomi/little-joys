import type { ToyId } from "./types";
export class AudioService {
  private context?: AudioContext;
  private voices = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();
  private last = -Infinity;
  private activation = 0;
  enabled = false;
  gain = 0.15;
  /** Shared context access for the streaming music graph; does not enable SFX. */
  streamingContext(): AudioContext | null {
    try {
      return (this.context ??= new AudioContext());
    } catch {
      return null;
    }
  }
  async enable(): Promise<boolean> {
    const activation = ++this.activation;
    try {
      this.context ??= new AudioContext();
      await this.context.resume();
      if (activation !== this.activation) return false;
      this.enabled = this.context.state === "running";
      return this.enabled;
    } catch {
      this.enabled = false;
      return false;
    }
  }
  play(toy: ToyId): void {
    const c = this.context;
    if (
      !c ||
      !this.enabled ||
      this.gain <= 0 ||
      c.state !== "running" ||
      c.currentTime - this.last < 0.15 ||
      this.voices.size >= 2
    )
      return;
    this.last = c.currentTime;
    const oscillator = c.createOscillator(),
      gain = c.createGain();
    const voice = { oscillator, gain };
    this.voices.add(voice);
    oscillator.type = "sine";
    oscillator.frequency.value = {
      squishy: 240,
      bubbles: 440,
      nest: 320,
      bounce: 360,
    }[toy];
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(
      Math.min(0.3, Math.max(0, this.gain)),
      c.currentTime + 0.018,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(c.destination);
    oscillator.onended = () => {
      this.voices.delete(voice);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start();
    oscillator.stop(c.currentTime + 0.18);
  }
  stop(): void {
    const c = this.context;
    for (const voice of this.voices) {
      try {
        if (c) {
          voice.gain.gain.cancelScheduledValues(c.currentTime);
          voice.gain.gain.setTargetAtTime(0, c.currentTime, 0.003);
          voice.oscillator.stop(c.currentTime + 0.012);
        }
      } catch {
        /* Already ended. */
      }
    }
  }
  mute(): void {
    this.activation++;
    this.enabled = false;
    this.stop();
  }
  status() {
    return {
      audioEnabled: this.enabled,
      audioState: this.context?.state ?? "not-created",
      voices: this.voices.size,
    };
  }
  dispose(): void {
    this.mute();
    void this.context?.close().catch(() => {});
  }
}
