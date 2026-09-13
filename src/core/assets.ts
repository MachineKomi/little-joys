const paths = {
  friend: "/assets/friend.webp",
  bowl: "/assets/bowl.webp",
  ball: "/assets/ball.webp",
  ballTwo: "/assets/ball-two.webp",
  bubble: "/assets/bubble.webp",
  penguin: "/assets/penguin.webp",
} as const;
export type ArtKey = keyof typeof paths;
/** A single bounded set; scene disposal never retains an image or an async callback. */
export class AssetStore {
  private images = new Map<ArtKey, HTMLImageElement>();
  private pending = new Set<HTMLImageElement>();
  private disposed = false;
  get(key: ArtKey) {
    return this.images.get(key);
  }
  load(onReady: () => void) {
    for (const [key, path] of Object.entries(paths) as [ArtKey, string][]) {
      const img = new Image();
      this.pending.add(img);
      img.onload = () => {
        this.pending.delete(img);
        if (this.disposed) return;
        this.images.set(key, img);
        img.onload = null;
        img.onerror = null;
        onReady();
      };
      img.onerror = () => {
        this.pending.delete(img);
        img.onload = null;
        img.onerror = null;
      };
      img.src = path;
    }
  }
  dispose() {
    this.disposed = true;
    for (const img of this.pending) {
      img.onload = null;
      img.onerror = null;
      img.src = "";
    }
    this.pending.clear();
    this.images.clear();
  }
  get count() {
    return this.images.size;
  }
}
