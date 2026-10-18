// The sprite document being edited: size, frames of palette indices, glow
// colors, animation settings, recolor pairs and an undo history.
// Pure data and pixel operations, no DOM.

import { TRANSPARENT } from '../engine/framebuffer.js';

export const MAX_SIZE = 64;
const HISTORY = 100;

export class SpriteDoc {
  constructor(w = 16, h = 16) {
    this.name = 'new_sprite';
    this.w = w;
    this.h = h;
    this.frames = [this.blank()];
    this.cur = 0;
    this.glow = new Set();      // palette indices that ignore shading
    this.frameMs = 150;
    this.mode = 'loop';
    this.recolor = [];          // [[from, to], ...] for the variant
    this.undoStack = [];
    this.redoStack = [];
  }

  blank() {
    return new Uint8Array(this.w * this.h).fill(TRANSPARENT);
  }

  get frame() { return this.frames[this.cur]; }

  // ---------------------------------------------------------- history

  snapshot() {
    return {
      name: this.name, w: this.w, h: this.h, cur: this.cur,
      frames: this.frames.map((f) => f.slice()),
      glow: [...this.glow], frameMs: this.frameMs, mode: this.mode,
      recolor: this.recolor.map((p) => p.slice()),
    };
  }

  restore(s) {
    this.name = s.name; this.w = s.w; this.h = s.h;
    this.frames = s.frames.map((f) => Uint8Array.from(f));
    this.cur = Math.min(s.cur, this.frames.length - 1);
    this.glow = new Set(s.glow);
    this.frameMs = s.frameMs; this.mode = s.mode;
    this.recolor = (s.recolor || []).map((p) => p.slice());
  }

  // Call before every change that should be undoable.
  checkpoint() {
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > HISTORY) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  undo() {
    if (!this.undoStack.length) return false;
    this.redoStack.push(this.snapshot());
    this.restore(this.undoStack.pop());
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    this.undoStack.push(this.snapshot());
    this.restore(this.redoStack.pop());
    return true;
  }

  // ---------------------------------------------------------- pixels

  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  get(x, y, frame = this.frame) {
    return this.inside(x, y) ? frame[y * this.w + x] : TRANSPARENT;
  }

  // Sets a pixel plus its mirror images when symmetry is on.
  plot(x, y, c, sym = {}, frame = this.frame) {
    const xs = sym.x ? [x, this.w - 1 - x] : [x];
    const ys = sym.y ? [y, this.h - 1 - y] : [y];
    for (const px of xs) for (const py of ys) {
      if (this.inside(px, py)) frame[py * this.w + px] = c;
    }
  }

  line(x0, y0, x1, y1, c, sym, frame) {
    for (const [x, y] of linePoints(x0, y0, x1, y1)) this.plot(x, y, c, sym, frame);
  }

  rect(x0, y0, x1, y1, c, sym, frame) {
    const [ax, bx] = x0 < x1 ? [x0, x1] : [x1, x0];
    const [ay, by] = y0 < y1 ? [y0, y1] : [y1, y0];
    for (let x = ax; x <= bx; x++) { this.plot(x, ay, c, sym, frame); this.plot(x, by, c, sym, frame); }
    for (let y = ay; y <= by; y++) { this.plot(ax, y, c, sym, frame); this.plot(bx, y, c, sym, frame); }
  }

  fill(x, y, c, sym = {}) {
    const starts = [[x, y]];
    if (sym.x) starts.push([this.w - 1 - x, y]);
    if (sym.y) starts.push([x, this.h - 1 - y]);
    if (sym.x && sym.y) starts.push([this.w - 1 - x, this.h - 1 - y]);
    for (const [sx, sy] of starts) this.flood(sx, sy, c);
  }

  flood(x, y, c) {
    const f = this.frame, w = this.w;
    const target = this.get(x, y);
    if (!this.inside(x, y) || target === c) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [px, py] = stack.pop();
      if (!this.inside(px, py) || f[py * w + px] !== target) continue;
      f[py * w + px] = c;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  }

  // ---------------------------------------------------------- whole frame

  flipH(all) {
    for (const f of all ? this.frames : [this.frame]) this.remap(f, (x, y) => [this.w - 1 - x, y]);
  }

  flipV(all) {
    for (const f of all ? this.frames : [this.frame]) this.remap(f, (x, y) => [x, this.h - 1 - y]);
  }

  shift(dx, dy, all) {
    for (const f of all ? this.frames : [this.frame]) this.remap(f, (x, y) => [x - dx, y - dy]);
  }

  // Copies the left half onto the right half, mirrored. Quick symmetry.
  mirrorLeft(all) {
    for (const f of all ? this.frames : [this.frame]) {
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w >> 1; x++) f[y * this.w + this.w - 1 - x] = f[y * this.w + x];
      }
    }
  }

  remap(f, src) {
    const old = f.slice();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const [sx, sy] = src(x, y);
        f[y * this.w + x] = this.inside(sx, sy) ? old[sy * this.w + sx] : TRANSPARENT;
      }
    }
  }

  replaceColor(from, to) {
    for (const f of this.frames) for (let i = 0; i < f.length; i++) if (f[i] === from) f[i] = to;
  }

  // New size, anchored bottom-center because sprites stand on the floor.
  resize(w, h) {
    w = clampSize(w); h = clampSize(h);
    const ox = Math.floor((w - this.w) / 2), oy = h - this.h;
    this.frames = this.frames.map((f) => {
      const out = new Uint8Array(w * h).fill(TRANSPARENT);
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          const nx = x + ox, ny = y + oy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = f[y * this.w + x];
        }
      }
      return out;
    });
    this.w = w; this.h = h;
  }

  // ---------------------------------------------------------- frames

  addFrame(copy) {
    const f = copy ? this.frame.slice() : this.blank();
    this.frames.splice(this.cur + 1, 0, f);
    this.cur++;
  }

  deleteFrame() {
    if (this.frames.length === 1) { this.frames[0] = this.blank(); return; }
    this.frames.splice(this.cur, 1);
    this.cur = Math.min(this.cur, this.frames.length - 1);
  }

  moveFrame(dir) {
    const to = this.cur + dir;
    if (to < 0 || to >= this.frames.length) return;
    [this.frames[this.cur], this.frames[to]] = [this.frames[to], this.frames[this.cur]];
    this.cur = to;
  }

  usedColors() {
    const used = new Set();
    for (const f of this.frames) for (const c of f) if (c !== TRANSPARENT) used.add(c);
    return used;
  }

  // Engine sprites ({name, w, h, data, glow}) for preview and export.
  toSprites(withVariant = false) {
    const map = withVariant ? this.recolorMap() : null;
    return this.frames.map((f, i) => {
      const data = map ? f.map((c) => (c in map ? map[c] : c)) : f.slice();
      let glow = null;
      if (this.glow.size) {
        glow = new Uint8Array(256);
        for (const c of this.glow) glow[map && c in map ? map[c] : c] = 1;
      }
      return { name: `${this.name}_${i}`, w: this.w, h: this.h, data, glow };
    });
  }

  recolorMap() {
    const map = {};
    for (const [from, to] of this.recolor) if (from !== to) map[from] = to;
    return map;
  }

  // Replaces the document with engine frames (from the game or an import).
  load({ name, frames, glow, frameMs, mode }) {
    this.name = name || 'sprite';
    this.w = frames[0].w;
    this.h = frames[0].h;
    this.frames = frames.map((f) => Uint8Array.from(f.data));
    this.cur = 0;
    this.glow = new Set();
    for (const f of frames) if (f.glow) for (let c = 0; c < 256; c++) if (f.glow[c]) this.glow.add(c);
    if (glow) for (const c of glow) this.glow.add(c);
    this.frameMs = frameMs || 150;
    this.mode = mode || 'loop';
    this.recolor = [];
  }
}

export function clampSize(n) {
  return Math.max(1, Math.min(MAX_SIZE, Math.round(Number(n)) || 1));
}

export function linePoints(x0, y0, x1, y1) {
  const pts = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    pts.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return pts;
}
