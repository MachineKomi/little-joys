import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioService } from "../../src/core/audio";
class FakeAudio {
  static latest: FakeAudio;
  currentTime = 0;
  state = "running";
  destination = {};
  created = 0;
  nodes: { onended: null | (() => void); stop: ReturnType<typeof vi.fn> }[] =
    [];
  constructor() {
    FakeAudio.latest = this;
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  createOscillator() {
    this.created++;
    const node = {
      type: "",
      frequency: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as null | (() => void),
    };
    this.nodes.push(node);
    return node;
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
        setTargetAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
}
beforeEach(() => vi.stubGlobal("AudioContext", FakeAudio));
afterEach(() => vi.unstubAllGlobals());
describe("bounded optional audio T21–23", () => {
  it("never constructs context or sounds on fresh silent play", () => {
    const a = new AudioService();
    a.play("squishy");
    expect(a.status()).toEqual({
      audioEnabled: false,
      audioState: "not-created",
      voices: 0,
    });
  });
  it("caps rapid starts and overlapping voices, mute fades every current node", async () => {
    const a = new AudioService();
    await a.enable();
    const c = FakeAudio.latest;
    a.play("bubbles");
    a.play("nest");
    expect(c.created).toBe(1);
    c.currentTime = 0.16;
    a.play("nest");
    c.currentTime = 0.32;
    a.play("squishy");
    expect(c.created).toBe(2);
    expect(a.status().voices).toBe(2);
    a.mute();
    expect(a.enabled).toBe(false);
    expect(c.nodes.every((n) => n.stop.mock.calls.length === 2)).toBe(true);
    c.nodes.forEach((n) => n.onended?.());
    expect(a.status().voices).toBe(0);
    a.play("bubbles");
    expect(c.created).toBe(2);
  });
  it("does not queue suspended sounds or create voices at zero gain", async () => {
    const a = new AudioService();
    await a.enable();
    const c = FakeAudio.latest;
    c.state = "suspended";
    a.play("nest");
    expect(c.created).toBe(0);
    c.state = "running";
    a.gain = 0;
    a.play("nest");
    expect(c.created).toBe(0);
  });
  it("denied enable keeps playable silent status", async () => {
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          throw new Error("Denied");
        }
      },
    );
    const a = new AudioService();
    expect(await a.enable()).toBe(false);
    expect(() => a.play("nest")).not.toThrow();
  });
  it("a pending adult enable cannot override a subsequent mute", async () => {
    let resolve!: () => void;
    class Pending extends FakeAudio {
      override resume() {
        return new Promise<void>((r) => {
          resolve = r;
        });
      }
    }
    vi.stubGlobal("AudioContext", Pending);
    const a = new AudioService();
    const enabled = a.enable();
    a.mute();
    resolve();
    expect(await enabled).toBe(false);
    expect(a.enabled).toBe(false);
  });
});
