// Lighting for the lit renderer: tinted shade tables, an ordered-dither
// matrix and a per-cell light map with soft shadows.
//
// Everything stays inside the palette: light only chooses which shade table
// row a pixel is looked up in. No RGB math happens at render time.

import { PALETTE_RGB, PALETTE_SIZE, nearestColor } from './palette.js';

// 4x4 Bayer matrix, values in [0, 1). Added to a fractional shade level
// before flooring, so neighbouring pixels pick neighbouring levels and hard
// steps become a fine pattern.
export const BAYER4 = Float32Array.from(
  [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5],
  (v) => (v + 0.5) / 16,
);

// tints: [[r, g, b], ...] light color multipliers, [1, 1, 1] = white light.
// Level 0 is `maxBright` (over-bright, near a torch), the last level is black.
// A texture shown at brightness 1.0 sits at level (1 - 1/maxBright) * (levels-1).
// table[(tint * levels + level) * PALETTE_SIZE + color] -> palette index.
export function buildLitTables({ tints, levels = 32, maxBright = 1.5, limit = PALETTE_SIZE }) {
  const table = new Uint8Array(tints.length * levels * PALETTE_SIZE);
  tints.forEach(([tr, tg, tb], t) => {
    for (let l = 0; l < levels; l++) {
      const f = maxBright * (1 - l / (levels - 1));
      // Deep shadows drift slightly toward blue, like old colormaps did.
      const cold = f < 0.6 ? 1 + (0.6 - f) * 0.25 : 1;
      for (let c = 0; c < PALETTE_SIZE; c++) {
        const [r, g, b] = PALETTE_RGB[c];
        table[(t * levels + l) * PALETTE_SIZE + c] = nearestColor(
          Math.min(255, r * f * tr), Math.min(255, g * f * tg), Math.min(255, b * f * tb * cold), limit,
        );
      }
    }
  });
  return { table, levels, maxBright, tints: tints.length };
}

// ------------------------------------------------------------ light map

const LOS_SAMPLES = [[0, 0], [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]];

// Light reaches a point if no wall cell lies on the straight line to it.
function lineOfSight(isWall, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  let mx = Math.floor(x0), my = Math.floor(y0);
  const tx = Math.floor(x1), ty = Math.floor(y1);
  const ddx = dx === 0 ? 1e30 : Math.abs(1 / dx);
  const ddy = dy === 0 ? 1e30 : Math.abs(1 / dy);
  const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
  let sdx = dx < 0 ? (x0 - mx) * ddx : (mx + 1 - x0) * ddx;
  let sdy = dy < 0 ? (y0 - my) * ddy : (my + 1 - y0) * ddy;
  for (let i = 0; i < 64; i++) {
    if (mx === tx && my === ty) return true;
    if (sdx < sdy) { if (sdx > 1) return true; sdx += ddx; mx += sx; }
    else { if (sdy > 1) return true; sdy += ddy; my += sy; }
    if (isWall(mx, my) && !(mx === tx && my === ty)) return false;
  }
  return true;
}

export class LightMap {
  // isWall(x, y) -> boolean. tints = number of light colors in the tables.
  constructor(w, h, isWall, tints) {
    this.w = w; this.h = h;
    this.isWall = isWall;
    this.tints = tints;
    const n = w * h;
    this.ambient = new Float32Array(n);
    this.ambientTint = new Uint8Array(n);
    this.level = new Float32Array(n);   // brightness, 1.0 = texture as drawn
    this.tint = new Uint8Array(n);      // dominant light color per cell
    this.acc = new Float32Array(n * tints);
    this.lights = [];
  }

  setAmbient(x0, y0, x1, y1, value, tint = 0) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        this.ambient[y * this.w + x] = value;
        this.ambientTint[y * this.w + x] = tint;
      }
    }
  }

  // light: { x, y, radius, intensity, tint, flicker = 0 } in world units.
  // Visibility is baked once; only the intensity changes per frame.
  addLight(light) {
    this.lights.push({ flicker: 0, phase: this.lights.length * 2.39, ...light, ...this.bake(light) });
  }

  bake({ x, y, radius }) {
    const cells = [], weights = [];
    const r = Math.ceil(radius);
    for (let cy = Math.floor(y) - r; cy <= Math.floor(y) + r; cy++) {
      for (let cx = Math.floor(x) - r; cx <= Math.floor(x) + r; cx++) {
        if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h || this.isWall(cx, cy)) continue;
        const d = Math.hypot(cx + 0.5 - x, cy + 0.5 - y);
        if (d >= radius) continue;
        let vis = 0;
        for (const [ox, oy] of LOS_SAMPLES) {
          if (lineOfSight(this.isWall, x, y, cx + 0.5 + ox, cy + 0.5 + oy)) vis++;
        }
        if (!vis) continue;
        const k = 1 - (d / radius) ** 2;
        cells.push(cy * this.w + cx);
        weights.push(k * k * (vis / LOS_SAMPLES.length));
      }
    }
    return { cells: Int32Array.from(cells), weights: Float32Array.from(weights) };
  }

  // time in ms. dynamic: lights that move (the player's lantern), baked
  // fresh every frame.
  update(time, dynamic = []) {
    const { w, h, tints, acc } = this;
    const n = w * h;
    acc.fill(0);
    for (let i = 0; i < n; i++) acc[i * tints + this.ambientTint[i]] += this.ambient[i];

    const add = (light, cells, weights) => {
      let k = light.intensity;
      if (light.flicker) {
        const p = light.phase;
        k *= 1 + light.flicker * (0.55 * Math.sin(time * 0.0113 + p) + 0.45 * Math.sin(time * 0.0291 + p * 1.7)) * 0.5;
      }
      for (let j = 0; j < cells.length; j++) acc[cells[j] * tints + light.tint] += k * weights[j];
    };
    for (const l of this.lights) add(l, l.cells, l.weights);
    for (const l of dynamic) { const b = this.bake(l); add({ ...l, flicker: 0 }, b.cells, b.weights); }

    for (let i = 0; i < n; i++) {
      let sum = 0, best = 0, bestV = -1;
      for (let t = 0; t < tints; t++) {
        const v = acc[i * tints + t];
        sum += v;
        if (v > bestV) { bestV = v; best = t; }
      }
      this.level[i] = sum;
      this.tint[i] = best;
    }
    // Wall cells borrow light from their open neighbours, so sampling right
    // at a wall face (and bilinear filtering near walls) stays bright.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!this.isWall(x, y)) continue;
        let sum = 0, cnt = 0, bestV = -1, best = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || this.isWall(nx, ny)) continue;
          const v = this.level[ny * w + nx];
          sum += v; cnt++;
          if (v > bestV) { bestV = v; best = this.tint[ny * w + nx]; }
        }
        this.level[y * w + x] = cnt ? sum / cnt : 0;
        this.tint[y * w + x] = best;
      }
    }
  }
}
