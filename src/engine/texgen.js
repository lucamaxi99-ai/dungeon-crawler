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
