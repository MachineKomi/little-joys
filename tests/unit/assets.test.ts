import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetStore } from "../../src/core/assets";

class FakeImage {
  static created: FakeImage[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  constructor() {
    FakeImage.created.push(this);
  }
}
afterEach(() => {
  vi.unstubAllGlobals();
  FakeImage.created = [];
});

describe("bounded asynchronous runtime art", () => {
  it("T32/T43: the store loads only six local images and failed optional art stays absent", () => {
    vi.stubGlobal("Image", FakeImage);
    const ready = vi.fn();
    const store = new AssetStore();
    store.load(ready);
    expect(FakeImage.created).toHaveLength(6);
    expect(
      FakeImage.created.some((image) => image.src === "/assets/penguin.webp"),
    ).toBe(true);
    expect(
      FakeImage.created.every((image) => image.src.startsWith("/assets/")),
    ).toBe(true);
    FakeImage.created[0].onload?.();
    FakeImage.created[1].onerror?.();
    expect(store.count).toBe(1);
    expect(store.get("friend")).toBeDefined();
    expect(store.get("bowl")).toBeUndefined();
    expect(ready).toHaveBeenCalledTimes(1);
    store.dispose();
    expect(store.count).toBe(0);
  });

  it("T33: disposal clears pending handlers and stale successful load cannot revive a resource", () => {
    vi.stubGlobal("Image", FakeImage);
    const ready = vi.fn();
    const store = new AssetStore();
    store.load(ready);
    const pending = [...FakeImage.created];
    const staleLoad = pending[0].onload!;
    store.dispose();
    store.dispose();
    staleLoad();
    expect(ready).not.toHaveBeenCalled();
    expect(store.count).toBe(0);
    expect(store.get("friend")).toBeUndefined();
    for (const image of pending) {
      expect(image.onload).toBeNull();
      expect(image.onerror).toBeNull();
      expect(image.src).toBe("");
    }
  });

  it("T33: disposal releases loaded images as well as still-pending images", () => {
    vi.stubGlobal("Image", FakeImage);
    const store = new AssetStore();
    store.load(() => {});
    FakeImage.created[0].onload?.();
    FakeImage.created[1].onload?.();
    expect(store.count).toBe(2);
    store.dispose();
    expect(store.count).toBe(0);
    expect(store.get("friend")).toBeUndefined();
    expect(store.get("bowl")).toBeUndefined();
  });
});
