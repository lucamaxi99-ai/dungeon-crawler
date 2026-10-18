// Procedural sprite painter.
//
// A sprite is built from simple 3D-ish primitives (ellipsoids, tapered
// capsules, flat polygons, lines) that write into a depth buffer with a
// surface normal and a material per pixel. shade() then lights the result
// from one direction and maps the brightness onto each material's palette
// ramp, adds specular highlights, contact shadows and selective outlines.
// The output is a normal engine sprite: palette indices, TRANSPARENT holes.

import { TRANSPARENT } from './framebuffer.js';
import { BAYER4 } from './lighting.js';

const LIGHT = norm3([-0.55, -0.7, 0.6]);

function norm3([x, y, z]) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// scale: paint the same figure at a different resolution. All coordinates,
// radii and depths passed in stay in the original units; 0.5 gives a sprite
// with half the pixels in each direction (a chunkier, older look).
export class Painter {
  constructor(w, h, { seed = 1, scale = 1 } = {}) {
    this.s = scale;
    w = Math.ceil(w * scale); h = Math.ceil(h * scale);
    this.w = w; this.h = h; this.seed = seed;
    const n = w * h;
    this.z = new Float32Array(n).fill(-Infinity);
    this.nx = new Float32Array(n);
    this.ny = new Float32Array(n);
    this.nz = new Float32Array(n);
    this.mat = new Int16Array(n).fill(-1);
    this.over = new Int16Array(n).fill(-1);  // color decals applied after shading
  }

  // Raw pixel write (pixel coordinates, scaled depth).
  put(x, y, z, nx, ny, nz, mat) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (z <= this.z[i]) return;
    this.z[i] = z; this.nx[i] = nx; this.ny[i] = ny; this.nz[i] = nz; this.mat[i] = mat;
    this.over[i] = -1;
  }

  // Pixel write in original units (used for hand-made effects like flames).
  write(x, y, z, nx, ny, nz, mat) {
    const s = this.s;
    this.put(Math.floor(x * s), Math.floor(y * s), z * s, nx, ny, nz, mat);
  }

  // Ellipsoid seen from the front. depth scales how far it bulges toward
  // the viewer (relative to its radii); z is its base distance.
  ellipse(cx, cy, rx, ry, mat, { z = 0, depth = 1 } = {}) {
    const k = this.s;
    cx *= k; cy *= k; z *= k;
    rx = Math.max(rx * k, 0.55); ry = Math.max(ry * k, 0.55);
    const rz = Math.min(rx, ry) * depth;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const dz = Math.sqrt(1 - d2);
        const [nx, ny, nz] = norm3([dx / rx, dy / ry, dz / Math.max(rz, 0.01)]);
        this.put(x, y, z + dz * rz, nx, ny, nz, mat);
      }
    }
    return this;
  }

  // Tapered capsule from (x0, y0) radius r0 to (x1, y1) radius r1: limbs,
  // tails, bones. z0/z1 interpolate along the length.
  capsule(x0, y0, r0, x1, y1, r1, mat, { z0 = 0, z1 = z0, depth = 1 } = {}) {
    const k = this.s;
    x0 *= k; y0 *= k; x1 *= k; y1 *= k; z0 *= k; z1 *= k;
    r0 = Math.max(r0 * k, 0.55); r1 = Math.max(r1 * k, 0.55);
    const minX = Math.floor(Math.min(x0 - r0, x1 - r1)), maxX = Math.ceil(Math.max(x0 + r0, x1 + r1));
    const minY = Math.floor(Math.min(y0 - r0, y1 - r1)), maxY = Math.ceil(Math.max(y0 + r0, y1 + r1));
    const vx = x1 - x0, vy = y1 - y0, len2 = vx * vx + vy * vy || 1e-6;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5 - x0, py = y + 0.5 - y0;
        let t = (px * vx + py * vy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const r = r0 + (r1 - r0) * t;
        const ox = px - vx * t, oy = py - vy * t;
        const d = Math.hypot(ox, oy);
        if (d > r) continue;
        const dz = Math.sqrt(1 - (d / r) ** 2);
        const [nx, ny, nz] = norm3([ox / r, oy / r, dz / depth]);
        this.put(x, y, z0 + (z1 - z0) * t + dz * r * depth, nx, ny, nz, mat);
      }
    }
    return this;
  }

  // Filled polygon with a fixed normal (flat faces: blades, box sides, cloth).
  poly(points, mat, { z = 0, normal = [0, 0, 1], zFn = null } = {}) {
    const k = this.s;
    points = points.map(([x, y]) => [x * k, y * k]);
    z *= k;
    const n = norm3(normal);
    const ys = points.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5;
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x < Math.ceil(xs[k + 1] - 0.5); x++) {
          this.put(x, y, zFn ? zFn(x / k, y / k) * k : z, n[0], n[1], n[2], mat);
        }
      }
    }
    return this;
  }

  // 1 px line (whiskers, strings, cracks).
  line(x0, y0, x1, y1, mat, { z = 0, normal = [0, 0, 1] } = {}) {
    const k = this.s;
    x0 *= k; y0 *= k; x1 *= k; y1 *= k; z *= k;
    const n = norm3(normal);
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.put(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), z, n[0], n[1], n[2], mat);
    }
    return this;
  }

  // Paints a fixed palette color on top of whatever surface is there
  // (eyes, patterns, text). Only where something has been drawn.
  dot(x, y, color) {
    x = Math.floor((Math.round(x) + 0.5) * this.s); y = Math.floor((Math.round(y) + 0.5) * this.s);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    const i = y * this.w + x;
    if (this.mat[i] >= 0) this.over[i] = color;
    return this;
  }

  // Decal by function over a rectangle: fn(x, y) -> color or -1.
  decal(x0, y0, x1, y1, fn) {
    const k = this.s;
    for (let y = Math.floor(y0 * k); y <= y1 * k; y++) {
      for (let x = Math.floor(x0 * k); x <= x1 * k; x++) {
        // fn sees original coordinates (pixel centre mapped back).
        const c = fn((x + 0.5) / k - 0.5, (y + 0.5) / k - 0.5);
        if (c < 0 || x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        const i = y * this.w + x;
        if (this.mat[i] >= 0) this.over[i] = c;
      }
    }
    return this;
  }

  // Removes pixels (holes, eye sockets cut through).
  erase(fn) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (fn((x + 0.5) / this.s - 0.5, (y + 0.5) / this.s - 0.5)) { const i = y * this.w + x; this.mat[i] = -1; this.z[i] = -Infinity; this.over[i] = -1; }
      }
    }
    return this;
  }

  // materials[id] = {
  //   ramp: [palette indices, dark -> light]
  //   spec?: palette index for highlights, shine?: 0..1 (how easily they appear)
  //   rough?: noise amount, outline?: palette index for the selective outline
  //   glow?: true (ignores lighting in the game), flat?: true (no shading)
  // }
  shade(materials, { name = 'painted', unit = Math.round(64 * this.s), light = LIGHT, ambient = 0.28, dither = 0.55, outline = true, glowColors = [] } = {}) {
    const { w, h } = this;
    const L = norm3(light);
    const H = norm3([L[0], L[1], L[2] + 1]);
    const data = new Uint8Array(w * h).fill(TRANSPARENT);
    const glow = new Uint8Array(256);
    for (const c of glowColors) glow[c] = 1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const m = this.mat[i];
        if (m < 0) continue;
        const M = materials[m];
        if (!M) throw new Error(`painter: no material ${m}`);
        const ramp = M.ramp;
        if (M.glow) for (const c of ramp) glow[c] = 1;
        let v;
        if (M.flat) {
          v = 0.6;
        } else {
          const nx = this.nx[i], ny = this.ny[i], nz = this.nz[i];
          const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
          v = ambient + diff * (1 - ambient) * 1.05;
          // Contact shadow: something nearby sits clearly in front of us.
          let occl = 0;
          for (const [dx, dy] of [[-2, -2], [0, -2], [2, -2], [-2, 0], [2, 0], [0, 2], [-1, -3], [1, -3]]) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            if (this.z[yy * w + xx] > this.z[i] + 2.5 * this.s) occl++;
          }
          v *= 1 - Math.min(0.45, occl * 0.12);
          if (M.rough) v += (hash(x, y, this.seed + m) - 0.5) * M.rough;
          if (M.spec !== undefined) {
            const s = Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]);
            if (s > 1 - 0.12 * (M.shine ?? 0.5)) { data[i] = M.spec; continue; }
          }
        }
        let f = v * (ramp.length - 1) + 0.5 + (BAYER4[((y & 3) << 2) | (x & 3)] - 0.5) * dither;
        f = f < 0 ? 0 : f > ramp.length - 1 ? ramp.length - 1 : f;
        data[i] = ramp[f | 0];
      }
    }

    if (outline) {
      const out = data.slice();
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const m = this.mat[i];
          if (m < 0) continue;
          const M = materials[m];
          if (M.glow || M.noOutline) continue;
          const oc = M.outline ?? M.ramp[0];
          let edge = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) { edge = true; break; }
            const j = yy * w + xx;
            // Outer outline, or an inner edge where a part in front covers us.
            if (this.mat[j] < 0) { edge = true; break; }
            if (this.mat[j] !== m && this.z[j] > this.z[i] + 1.5 * this.s) { edge = true; break; }
          }
          if (edge) out[i] = oc;
        }
      }
      data.set(out);
    }

    for (let i = 0; i < w * h; i++) if (this.over[i] >= 0) data[i] = this.over[i];
    const anyGlow = glow.some((g) => g);
    return { name, w, h, data, glow: anyGlow ? glow : null, unit };
  }
}
