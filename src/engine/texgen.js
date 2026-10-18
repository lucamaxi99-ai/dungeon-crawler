// Procedural texture toolkit. Textures are square images of palette indices.
// Everything is seeded, so the same seed always gives the same texture.

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function blank(size, color = 0) {
  return { w: size, h: size, data: new Uint8Array(size * size).fill(color) };
}

export function px(tex, x, y, c) {
  const s = tex.w;
  tex.data[(((y % s) + s) % s) * s + (((x % s) + s) % s)] = c;
}

export function get(tex, x, y) {
  const s = tex.w;
  return tex.data[(((y % s) + s) % s) * s + (((x % s) + s) % s)];
}

// Picks from a color ramp (array of palette indices) with a 0..1 value.
export function ramp(colors, v) {
  const i = Math.max(0, Math.min(colors.length - 1, Math.floor(v * colors.length)));
  return colors[i];
}

// Running-bond bricks. Each brick gets its own base brightness, plus speckle,
// lit top edges and dark mortar.
export function bricks(size, seed, { bw = 16, bh = 8, colors, mortar, highlight }) {
  const r = rng(seed);
  const tex = blank(size, mortar);
  for (let row = 0; row * bh < size; row++) {
    const offset = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * bw < size; col++) {
      const base = 0.25 + r() * 0.5;
      const x0 = col * bw + offset;
      const y0 = row * bh;
      for (let y = 1; y < bh; y++) {
        for (let x = 1; x < bw; x++) {
          let v = base + (r() - 0.5) * 0.35;
          if (y === 1) v += 0.25;            // lit top edge
          if (y === bh - 1) v -= 0.2;        // shaded bottom edge
          if (r() < 0.03) v -= 0.4;          // pits and chips
          px(tex, x0 + x, y0 + y, v > 0.95 && highlight !== undefined ? highlight : ramp(colors, v));
        }
      }
    }
  }
  return tex;
}

// Irregular rock: value noise blended at two scales.
export function rock(size, seed, { colors }) {
  const r = rng(seed);
  // 8x8 lattice sampled with wrap-around, so the texture tiles seamlessly.
  const coarse = Array.from({ length: 8 }, () => Array.from({ length: 8 }, r));
  const sample = (x, y) => {
    const fx = (x / size) * 8, fy = (y / size) * 8;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const ix1 = (ix + 1) % 8, iy1 = (iy + 1) % 8;
    const a = coarse[iy][ix], b = coarse[iy][ix1];
    const c = coarse[iy1][ix], d = coarse[iy1][ix1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
  const tex = blank(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = sample(x, y) * 0.75 + r() * 0.25;
      px(tex, x, y, ramp(colors, v));
    }
  }
  // A few cracks.
  for (let k = 0; k < 4; k++) {
    let x = Math.floor(r() * size), y = Math.floor(r() * size);
    for (let s = 0; s < 10; s++) {
      px(tex, x, y, colors[0]);
      x += Math.round(r() * 2 - 1);
      y += 1;
    }
  }
  return tex;
}

// Splotchy overlay (moss, rust, blood) concentrated toward the bottom.
export function overlay(tex, seed, { colors, amount = 0.3, gravity = 0.6 }) {
  const r = rng(seed);
  const out = { ...tex, data: tex.data.slice() };
  const blobs = Math.floor(tex.w * amount);
  for (let b = 0; b < blobs; b++) {
    const cx = r() * tex.w;
    const cy = tex.h * (gravity + (1 - gravity) * r()) - r() * tex.h * (1 - gravity);
    const rad = 1 + r() * 3;
    for (let y = -4; y <= 4; y++) {
      for (let x = -4; x <= 4; x++) {
        if (x * x + y * y > rad * rad + r() * 2) continue;
        px(out, Math.floor(cx + x), Math.floor(cy + y), ramp(colors, r()));
      }
    }
    // Drips
    if (r() < 0.5) {
      let y = Math.floor(cy);
      const x = Math.floor(cx);
      const len = 2 + Math.floor(r() * 5);
      for (let i = 0; i < len; i++) px(out, x, y++, colors[0]);
    }
  }
  return out;
}

// Wooden planks running horizontally or vertically.
export function planks(size, seed, { colors, gap, plank = 8, vertical = false }) {
  const r = rng(seed);
  const tex = blank(size, gap);
  for (let p = 0; p * plank < size; p++) {
    const base = 0.3 + r() * 0.4;
    const seam = Math.floor(r() * size);
    for (let a = 1; a < plank; a++) {
      for (let b = 0; b < size; b++) {
        const grain = Math.sin((b + p * 13) * 0.6 + a * 1.7) * 0.12;
        let v = base + grain + (r() - 0.5) * 0.15;
        if (b === seam) { px(tex, vertical ? p * plank + a : b, vertical ? b : p * plank + a, gap); continue; }
        if (a === 1) v += 0.15;
        const x = vertical ? p * plank + a : b;
        const y = vertical ? b : p * plank + a;
        px(tex, x, y, ramp(colors, v));
      }
    }
  }
  return tex;
}

// ------------------------------------------------------------ noise
// Tileable noise for higher-resolution textures. All functions return
// Float32Array(size*size) with values roughly in [0, 1].

// Smooth value noise on a `cells` x `cells` lattice that wraps around.
export function valueNoise(size, seed, cells) {
  const r = rng(seed);
  const lat = Float32Array.from({ length: cells * cells }, r);
  const out = new Float32Array(size * size);
  const s = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * cells, iy = Math.floor(fy), ty = s(fy - iy);
    const y0 = iy % cells, y1 = (iy + 1) % cells;
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells, ix = Math.floor(fx), tx = s(fx - ix);
      const x0 = ix % cells, x1 = (ix + 1) % cells;
      const a = lat[y0 * cells + x0], b = lat[y0 * cells + x1];
      const c = lat[y1 * cells + x0], d = lat[y1 * cells + x1];
      out[y * size + x] = (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
    }
  }
  return out;
}

// Fractal noise: octaves of value noise, each twice as fine and half as strong.
export function fbm(size, seed, { base = 4, octaves = 4, gain = 0.5 } = {}) {
  const out = new Float32Array(size * size);
  let amp = 1, total = 0, cells = base;
  for (let o = 0; o < octaves && cells <= size; o++) {
    const n = valueNoise(size, seed + o * 101, cells);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp;
    amp *= gain;
    cells *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

// Tileable Voronoi cells (cobblestones, scales, cracked earth).
// With `jitter` set, points sit on a jittered grid (count rounded to a
// square), which gives evenly sized cells; otherwise they are random.
// Returns { id: Int32Array, edge: Float32Array (distance to the nearest
// border in pixels), dist: Float32Array (distance to own center), count }.
export function voronoi(size, seed, count, jitter = null) {
  const r = rng(seed);
  let pts;
  if (jitter === null) {
    pts = Array.from({ length: count }, () => [r() * size, r() * size]);
  } else {
    const g = Math.round(Math.sqrt(count)), cell = size / g;
    pts = [];
    for (let j = 0; j < g; j++) for (let i = 0; i < g; i++) {
      pts.push([(i + 0.5 + (r() - 0.5) * 2 * jitter) * cell, (j + 0.5 + (r() - 0.5) * 2 * jitter) * cell]);
    }
    count = pts.length;
  }
  const id = new Int32Array(size * size), edge = new Float32Array(size * size), dist = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let d1 = Infinity, d2 = Infinity, best = 0;
      for (let i = 0; i < count; i++) {
        let ddx = Math.abs(x + 0.5 - pts[i][0]), ddy = Math.abs(y + 0.5 - pts[i][1]);
        if (ddx > size / 2) ddx = size - ddx;
        if (ddy > size / 2) ddy = size - ddy;
        const d = Math.hypot(ddx, ddy);
        if (d < d1) { d2 = d1; d1 = d; best = i; } else if (d < d2) d2 = d;
      }
      const k = y * size + x;
      id[k] = best; edge[k] = (d2 - d1) / 2; dist[k] = d1;
    }
  }
  return { id, edge, dist, count };
}

// Glow mask (like sprites) for textures: colors that ignore lighting.
export function glowMask(colors) {
  const m = new Uint8Array(256);
  for (const c of colors) m[c] = 1;
  return m;
}
