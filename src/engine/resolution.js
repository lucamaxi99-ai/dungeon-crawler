// Automatic render resolution. Watches how long the 3D view takes to render
// and how long whole frames take, and steps the resolution down when the
// frame budget is blown, back up when there is clearly room again.
//
// steps: [{ w, h }, ...] from highest to lowest resolution.
// Call sample(renderMs, frameMs) once per frame; it returns the step index
// to switch to, or -1 to keep the current one.

export class AutoResolution {
  constructor(steps, {
    start = 0,
    window = 45,        // frames averaged per decision
    budgetMs = 11,      // render time that forces a step down
    slowFrameMs = 21,   // whole-frame time (below ~48 FPS) that forces a step down...
    minRenderMs = 4,    // ...if the 3D view is a real part of it
    upMs = 8,           // a step up must be predicted to stay under this
    upWindows = 3,      // ...for this many windows in a row
    cooldownMs = 8000,  // no step up for this long after a step down
  } = {}) {
    this.steps = steps;
    this.index = start;
    this.mode = 'auto';     // 'auto' or a fixed step index
    this.opts = { window, budgetMs, slowFrameMs, minRenderMs, upMs, upWindows, cooldownMs };
    this.reset();
    this.lastDown = -Infinity;
  }

  reset() {
    this.n = 0; this.render = 0; this.frame = 0; this.good = 0;
    this.skip = 10; // let a fresh resolution settle (allocation, caches)
  }

  // Fixed step (number) or 'auto'. Returns the step index to use now.
  setMode(mode) {
    this.mode = mode;
    if (mode !== 'auto') this.index = mode;
    this.reset();
    return this.index;
  }

  get step() {
    return this.steps[this.index];
  }

  sample(renderMs, frameMs, now = performance.now()) {
    if (this.mode !== 'auto') return -1;
    if (this.skip > 0) { this.skip--; return -1; }
    // Hidden tabs and long hitches (tab switches, GC) say nothing about speed.
    if (frameMs > 250) return -1;
    this.n++; this.render += renderMs; this.frame += frameMs;
    const o = this.opts;
    if (this.n < o.window) return -1;

    const render = this.render / this.n, frame = this.frame / this.n;
    this.n = 0; this.render = 0; this.frame = 0;

    const slow = render > o.budgetMs || (frame > o.slowFrameMs && render > o.minRenderMs);
    if (slow && this.index < this.steps.length - 1) {
      this.index++; this.lastDown = now; this.reset();
      return this.index;
    }
    if (this.index > 0 && now - this.lastDown > o.cooldownMs) {
      const cur = this.steps[this.index], up = this.steps[this.index - 1];
      const predicted = render * ((up.w * up.h) / (cur.w * cur.h));
      this.good = predicted < o.upMs && frame < o.slowFrameMs ? this.good + 1 : 0;
      if (this.good >= o.upWindows) {
        this.index--; this.reset();
        return this.index;
      }
    }
    return -1;
  }
}
