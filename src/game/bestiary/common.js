// Helpers shared by the bestiary painters.

import { drawText } from '../../engine/font.js';

// Pose flags: idle0/idle1 (breathing cycle), lunge (attack), flinch (hit).
export function poseFlags(pose) {
  return {
    b: pose === 'idle1' ? 1 : 0,
    lunge: pose === 'lunge' ? 1 : 0,
    flinch: pose === 'flinch' ? 1 : 0,
  };
}

// Distance from a point to a segment, for thin decal lines.
export function segDist(x, y, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - x0 - dx * t, y - y0 - dy * t);
}

// Decal: filled ellipse in one color.
export function spot(p, cx, cy, rx, ry, color) {
  p.decal(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1,
    (x, y) => (Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry) <= 1 ? color : -1));
}

// Decal: a polyline of thin segments (wires, cracks, mesh).
export function strokes(p, segs, color, width = 0.55) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [a, b, c, d] of segs) {
    x0 = Math.min(x0, a, c); y0 = Math.min(y0, b, d); x1 = Math.max(x1, a, c); y1 = Math.max(y1, b, d);
  }
  p.decal(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (x, y) => (segs.some((g) => segDist(x + 0.5, y + 0.5, ...g) < width) ? color : -1));
}

// Decal: text in the 3x5 pixel font (only on painted pixels).
export function text(p, str, x, y, color) {
  drawText({ set: (px, py, c) => p.dot(px, py, c) }, str, x, y, color);
}

// Two eyes as decals: open (iris + pupil + glint), squeezed shut when hit.
export function eyes(p, cx, cy, gap, { r = 1.6, iris, pupil, glint, shut = false, angry = 0 } = {}) {
  for (const s of [-1, 1]) {
    const ex = cx + s * gap;
    if (shut) {
      strokes(p, [[ex - r, cy - 0.3 * s * 0, ex + r, cy]], pupil, 0.6);
      continue;
    }
    p.decal(ex - r - 1, cy - r - 1, ex + r + 1, cy + r + 1, (x, y) => {
      const dx = x + 0.5 - ex, dy = y + 0.5 - cy;
      // Angry brow: cut the inner top corner.
      if (angry && dy < -r * 0.2 && dx * -s > -r * 0.4 + dy * angry) return -1;
      const d = Math.hypot(dx, dy);
      if (d > r) return -1;
      if (glint !== undefined && dx < -0.2 && dy < -0.2 && d < r * 0.55) return glint;
      return d < r * 0.55 ? pupil : iris;
    });
  }
}
