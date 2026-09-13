import { afterEach, describe, expect, it, vi } from "vitest";
import { MusicService } from "../../src/core/music";
import { defaults, validateSettings } from "../../src/core/settings";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixture() {
  const gain = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const context = {
    resume: vi.fn(async () => {}),
    createGain: vi.fn(() => gain),
    createMediaElementSource: vi.fn(() => source),
    destination: {},
  };
  const element = {
    paused: true,
    volume: 1,
    src: "",
    preload: "",
    loop: false,
    getAttribute: vi.fn(() => element.src),
    removeAttribute: vi.fn(() => {
      element.src = "";
    }),
    load: vi.fn(),
    play: vi.fn(async () => {
      element.paused = false;
    }),
    pause: vi.fn(() => {
      element.paused = true;
    }),
  };
  const factory = vi.fn(() => element as unknown as HTMLAudioElement);
  const service = new MusicService(
    () => context as unknown as AudioContext,
    factory,
  );
  return { service, element, context, gain, source, factory };
}
afterEach(() => vi.useRealTimers());
describe("Optional bounded streaming music", () => {
  it("is independently off by default and validates old/corrupt settings", () => {
    expect(defaults).toMatchObject({
      soundEnabled: false,
      musicEnabled: false,
      musicGain: 0.08,
    });
    expect(validateSettings({ soundEnabled: true })).toMatchObject({
      soundEnabled: true,
      musicEnabled: false,
      musicGain: 0.08,
    });
    expect(
      validateSettings({ musicEnabled: "yes", musicGain: Infinity }),
    ).toMatchObject({ musicEnabled: false, musicGain: 0.08 });
    expect(validateSettings({ musicGain: 100 }).musicGain).toBe(0.2);
    expect(validateSettings({ musicGain: -1 }).musicGain).toBe(0);
  });
  it("does not create a media element or make a request before adult enabling", () => {
    const { service, factory } = fixture();
    service.resumeFromGesture();
    service.pause();
    service.gain = 0.15;
    expect(factory).not.toHaveBeenCalled();
    expect(service.status()).toMatchObject({
      musicEnabled: false,
      musicPlaying: false,
      musicElements: 0,
    });
  });
  it("primes silently, streams one element through one gain, and waits for returning to play", async () => {
    const { service, element, gain, context, source, factory } = fixture();
    expect(await service.enable()).toBe(true);
    expect(element).toMatchObject({
      src: "/assets/music.mp3",
      preload: "none",
      loop: true,
      paused: true,
    });
    expect(gain.gain.value).toBe(0);
    expect(context.createMediaElementSource).toHaveBeenCalledTimes(1);
    expect(source.connect).toHaveBeenCalledWith(gain);
    service.resumeFromGesture();
    await Promise.resolve();
    expect(gain.gain.value).toBe(0.08);
    expect(element.paused).toBe(false);
    service.pause();
    service.resumeFromGesture();
    service.resumeFromGesture();
    await Promise.resolve();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(context.createGain).toHaveBeenCalledTimes(1);
  });
  it("uses bounded Web Audio gain instead of relying on media-element volume", async () => {
    const { service, gain, element } = fixture();
    await service.enable();
    service.resumeFromGesture();
    service.gain = 999;
    expect(gain.gain.value).toBe(0.2);
    expect(element.volume).toBe(1);
    service.gain = -99;
    expect(gain.gain.value).toBe(0);
    service.gain = NaN;
    expect(gain.gain.value).toBe(0.08);
    service.pause();
    service.gain = 0.19;
    expect(gain.gain.value).toBe(0);
  });
  it("pause and mute are immediate, preserve no queued sound, and do not resume automatically", async () => {
    const { service, element, gain } = fixture();
    await service.enable();
    service.resumeFromGesture();
    await Promise.resolve();
    service.pause();
    expect(element.paused).toBe(true);
    expect(gain.gain.value).toBe(0);
    expect(service.enabled).toBe(true);
    await Promise.resolve();
    expect(element.paused).toBe(true);
    service.mute();
    service.resumeFromGesture();
    expect(element.paused).toBe(true);
    expect(service.enabled).toBe(false);
  });
  it("a pending enable cannot override a later mute", async () => {
    const { service, element, gain } = fixture();
    const pending = deferred();
    element.play.mockImplementationOnce(async () => {
      await pending.promise;
      element.paused = false;
    });
    const enable = service.enable();
    service.mute();
    pending.resolve();
    expect(await enable).toBe(false);
    expect(service.enabled).toBe(false);
    expect(element.paused).toBe(true);
    expect(gain.gain.value).toBe(0);
  });
  it("a pending resume cannot override pause/backgrounding", async () => {
    const { service, element, gain } = fixture();
    await service.enable();
    const pending = deferred();
    element.play.mockImplementationOnce(async () => {
      await pending.promise;
      element.paused = false;
    });
    service.resumeFromGesture();
    service.pause();
    pending.resolve();
    await pending.promise;
    await Promise.resolve();
    await Promise.resolve();
    expect(element.paused).toBe(true);
    expect(gain.gain.value).toBe(0);
    expect(service.status().musicPlaying).toBe(false);
  });
  it("denied playback remains silent and is not retried on every touch", async () => {
    const { service, element } = fixture();
    element.play.mockRejectedValueOnce(new Error("denied"));
    expect(await service.enable()).toBe(false);
    service.resumeFromGesture();
    service.resumeFromGesture();
    expect(element.play).toHaveBeenCalledTimes(1);
    expect(service.status()).toMatchObject({
      musicEnabled: false,
      musicState: "unavailable",
    });
  });
  it("bounds a stalled enable request and suppresses its late completion", async () => {
    vi.useFakeTimers();
    const { service, element, gain } = fixture();
    const pending = deferred();
    element.play.mockImplementationOnce(async () => {
      await pending.promise;
      element.paused = false;
    });
    const enable = service.enable();
    await vi.advanceTimersByTimeAsync(12_001);
    expect(await enable).toBe(false);
    pending.resolve();
    await pending.promise;
    await Promise.resolve();
    await Promise.resolve();
    expect(gain.gain.value).toBe(0);
    expect(element.paused).toBe(true);
  });
  it("disposes the sole element and graph without retaining a source URL", async () => {
    const { service, element, source, gain } = fixture();
    await service.enable();
    service.dispose();
    expect(element.paused).toBe(true);
    expect(element.src).toBe("");
    expect(source.disconnect).toHaveBeenCalled();
    expect(gain.disconnect).toHaveBeenCalled();
    expect(service.status().musicElements).toBe(0);
  });
  it("absence of an AudioContext fails quietly without playing unattenuated media", async () => {
    const factory = vi.fn();
    const service = new MusicService(() => null, factory);
    expect(await service.enable()).toBe(false);
    expect(factory).not.toHaveBeenCalled();
  });
});
