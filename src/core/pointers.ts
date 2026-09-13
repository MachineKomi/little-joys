import type { ToyPointer } from "./types";
export class PointerTracker {
  readonly active = new Map<number, ToyPointer>();
  private ignored = new Set<number>();
  down(p: ToyPointer): boolean {
    if (this.active.has(p.id) || this.ignored.has(p.id)) return false;
    if (this.active.size >= 4) {
      this.ignored.add(p.id);
      return false;
    }
    this.active.set(p.id, p);
    return true;
  }
  move(p: ToyPointer): ToyPointer | null {
    const old = this.active.get(p.id);
    if (!old) return null;
    const next = { ...p, previousX: old.x, previousY: old.y };
    this.active.set(p.id, next);
    return next;
  }
  end(id: number): boolean {
    this.ignored.delete(id);
    return this.active.delete(id);
  }
  clear(): void {
    this.active.clear();
    this.ignored.clear();
  }
}
