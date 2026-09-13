// Local bounded timing summaries only. No coordinates, paths or personal data.
export class Diagnostics {
  enabled = false;
  private intervals: number[] = [];
  private work: number[] = [];
  private input: number[] = [];
  private add(list: number[], v: number) {
    if (!this.enabled) return;
    if (list.length === 3600) list.shift();
    list.push(v);
  }
  frame(interval: number, work: number) {
    if (interval > 0) this.add(this.intervals, interval);
    this.add(this.work, work);
  }
  inputRender(ms: number) {
    this.add(this.input, ms);
  }
  clear() {
    this.intervals = [];
    this.work = [];
    this.input = [];
  }
  summary() {
    const stats = (values: number[]) => {
      const a = [...values].sort((a, b) => a - b);
      return {
        samples: a.length,
        p50: a[Math.floor(a.length * 0.5)] ?? 0,
        p95: a[Math.min(a.length - 1, Math.floor(a.length * 0.95))] ?? 0,
        max: a.at(-1) ?? 0,
        over50ms: a.filter((n) => n > 50).length,
      };
    };
    return {
      frameIntervalsMs: stats(this.intervals),
      updateDrawMs: stats(this.work),
      inputToRenderMs: stats(this.input),
    };
  }
}
