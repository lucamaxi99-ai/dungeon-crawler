// 64x64 wall, floor and ceiling textures. All procedural and seeded.
// Technique: build a height field (noise, block bevels, cell domes), light
// it from the top left ("emboss"), then pick from a color ramp with a little
// ordered dithering.

import { C } from '../engine/palette.js';
import { blank, rng, fbm, voronoi, glowMask } from '../engine/texgen.js';
import { BAYER4 } from '../engine/lighting.js';
import { drawText } from '../engine/font.js';

export const S = 64;

const idx = (x, y) => (((y % S) + S) % S) * S + (((x % S) + S) % S);
const set = (t, x, y, c) => { t.data[idx(x, y)] = c; };
const get = (t, x, y) => t.data[idx(x, y)];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function normalize(a) {
  let mn = Infinity, mx = -Infinity;
  for (const v of a) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const k = mx > mn ? 1 / (mx - mn) : 1;
  for (let i = 0; i < a.length; i++) a[i] = (a[i] - mn) * k;
  return a;
}

// Ramp pick with ordered dither (d = dither strength in levels).
export function pick(ramp, v, x, y, d = 0.7) {
  const n = ramp.length;
  let f = clamp01(v) * (n - 1) + 0.5 + (BAYER4[((y & 3) << 2) | (x & 3)] - 0.5) * d;
  f = f < 0 ? 0 : f > n - 1 ? n - 1 : f;
  return ramp[f | 0];
}

// Light from the top left on a height field (wrapping).
function emboss(h, x, y) {
  return h[idx(x - 1, y - 1)] - h[idx(x + 1, y + 1)];
}

// Text at 2x scale with the 3x5 font.
function bigText(t, str, x, y, color) {
  const tmp = { set: (px, py, c) => { for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) set(t, x + px * 2 + a, y + py * 2 + b, c); } };
  drawText(tmp, str, 0, 0, color);
}

function smallText(t, str, x, y, color) {
  drawText({ set: (px, py, c) => set(t, x + px, y + py, c) }, str, 0, 0, color);
}

// ------------------------------------------------------------ stone blocks

// Returns per-pixel block info for an ashlar wall: rows of 16 px, random widths.
function ashlarLayout(seed, rowH = 16) {
  const r = rng(seed);
  const info = new Array(S * S);
  for (let row = 0; row * rowH < S; row++) {
    const cuts = [];
    let x = Math.floor(r() * 12);
    while (x < S + 64) { cuts.push(x); x += 14 + Math.floor(r() * 16); }
    // Make it wrap: last cut must equal first + 64.
    const first = cuts[0];
    const end = cuts.findIndex((c) => c >= first + S - 10);
    cuts.length = end; cuts.push(first + S);
    const bases = cuts.map(() => r());
    for (let yy = 0; yy < rowH; yy++) {
      for (let xx = 0; xx < S; xx++) {
        let gx = xx; if (gx < first) gx += S;
        let i = 0; while (cuts[i + 1] <= gx) i++;
        info[(row * rowH + yy) * S + xx] = {
          id: row * 100 + i, base: bases[i], lx: gx - cuts[i], ly: yy, bw: cuts[i + 1] - cuts[i], bh: rowH,
        };
      }
    }
  }
  return info;
}

function stoneBlocks(seed, { ramp, mortar, rough = 0.5, rowH = 16 }) {
  const t = blank(S, mortar);
  const layout = ashlarLayout(seed, rowH);
  const n = normalize(fbm(S, seed + 7, { base: 8, octaves: 3 }));
  const h = new Float32Array(S * S);
  const r = rng(seed + 3);
  for (let i = 0; i < S * S; i++) {
    const b = layout[i];
    const edge = Math.min(b.lx, b.ly, b.bw - 1 - b.lx, b.bh - 1 - b.ly);
    // Rounded, chipped edges: height falls off within 2 px of the border.
    h[i] = edge <= 0 ? 0 : Math.min(1, edge / 2.5) * 0.7 + n[i] * rough * 0.6;
  }
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x, b = layout[i];
      const edge = Math.min(b.lx, b.ly, b.bw - 1 - b.lx, b.bh - 1 - b.ly);
      const corner = Math.min(b.lx, b.bw - 1 - b.lx) + Math.min(b.ly, b.bh - 1 - b.ly);
      if (edge <= 0 || corner <= 1) { t.data[i] = mortar; continue; }
      let v = 0.34 + b.base * 0.28 + (n[i] - 0.5) * 0.45 + emboss(h, x, y) * 0.85;
      if (r() < 0.025) v -= 0.35;   // pits
      t.data[i] = pick(ramp, v, x, y);
    }
  }
  // Hairline cracks in a few blocks.
  for (let k = 0; k < 5; k++) {
    let x = Math.floor(r() * S), y = Math.floor(r() * S);
    const len = 4 + Math.floor(r() * 8);
    for (let s = 0; s < len; s++) {
      if (get(t, x, y) !== mortar) set(t, x, y, ramp[0]);
      x += Math.round(r() * 2 - 1); y += r() < 0.7 ? 1 : 0;
    }
  }
  return { t, layout };
}

const STONE_RAMP = [C.NIGHT, C.STONE_D, C.STONE, C.STONE_M, C.STONE_L, C.SILVER];
const DARK_STONE = [C.SOOT, C.NIGHT, C.SHADOW, C.STONE_D, C.STONE, C.STONE_M];
const GRAVEL_RAMP = [C.SOOT, C.GRAVEL_D, C.GRAVEL, C.GRAVEL_M, C.GRAVEL_L];
const MOSS_RAMP = [C.MOSS_D, C.MOSS, C.GREEN, C.LIME];
const WOOD_RAMP = [C.SOOT, C.WOOD_D, C.WOOD, C.WOOD_L, C.LEATHER];
const STEEL_RAMP = [C.BLACK, C.STEEL_D, C.STEEL, C.STEEL_M, C.STEEL_L];

function stoneWall() {
  return stoneBlocks(11, { ramp: STONE_RAMP, mortar: C.SOOT }).t;
}

function mossyWall() {
  const { t, layout } = stoneBlocks(12, { ramp: [C.NIGHT, C.STONE_D, C.STONE, C.STONE_M, C.STONE_L], mortar: C.MOSS_D, rough: 0.7 });
  const m = normalize(fbm(S, 33, { base: 4, octaves: 4 }));
  const m2 = normalize(fbm(S, 34, { base: 16, octaves: 2 }));
  const r = rng(35);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x, b = layout[i];
      const nearJoint = Math.min(b.lx, b.ly, b.bw - 1 - b.lx, b.bh - 1 - b.ly) <= 2;
      const score = m[i] * 0.75 + (y / S) * 0.3 + (nearJoint ? 0.12 : 0);
      if (score > 0.74) {
        const v = m2[i] * 0.7 + (score - 0.74) * 1.5 + (b.ly <= 3 ? 0.15 : 0);
        t.data[i] = pick(MOSS_RAMP, v, x, y, 1);
      }
    }
  }
  // Wet drips running down from the moss.
  for (let k = 0; k < 9; k++) {
    const x = Math.floor(r() * S);
    let y = Math.floor(r() * S * 0.6);
    const len = 4 + Math.floor(r() * 14);
    for (let s = 0; s < len; s++, y++) {
      const c = get({ data: t.data }, x, y);
      set(t, x, y, s === 0 ? C.TEAL : MOSS_RAMP.includes(c) ? C.MOSS_D : C.TEAL_D);
    }
  }
  return t;
}

function caveRock() {
  const h = normalize(fbm(S, 21, { base: 4, octaves: 5, gain: 0.55 }));
  const ridge = normalize(fbm(S, 22, { base: 8, octaves: 3 }));
  const t = blank(S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const strata = Math.sin(y * 0.35 + h[i] * 7) * 0.06;
      let v = 0.45 + (h[i] - 0.5) * 0.35 + emboss(h, x, y) * 2.2 + strata;
      if (Math.abs(ridge[i] - 0.5) < 0.025) v -= 0.4; // cracks
      t.data[i] = pick(GRAVEL_RAMP, v, x, y);
    }
  }
  return t;
}

function stairwell() {
  const t = stoneWall();
  const cx = 31.5;
  for (let y = 8; y < S; y++) {
    for (let x = 10; x < 54; x++) {
      const ax = x - cx, ay = y - 26;
      const inArch = y >= 26 ? Math.abs(ax) <= 21 : ax * ax + ay * ay <= 21 * 21;
      const rim = y >= 26 ? Math.abs(ax) <= 24 : ax * ax + ay * ay <= 24.5 * 24.5;
      if (inArch) {
        // Darkness gets deeper toward the middle.
        const d = 1 - Math.min(1, Math.hypot(ax / 21, (y - 40) / 30));
        set(t, x, y, d > 0.55 ? C.BLACK : d > 0.3 ? C.SOOT : C.NIGHT);
      } else if (rim) {
        const v = 0.6 + (ax < 0 ? 0.2 : -0.15) + (y < 26 && ay < 0 ? 0.1 : 0);
        set(t, x, y, pick(STONE_RAMP, v, x, y));
      }
    }
  }
  // Steps going down, each one darker.
  const steps = [[60, 0.8, 12, 52], [55, 0.6, 14, 50], [50, 0.45, 16, 48], [46, 0.3, 18, 46], [43, 0.15, 20, 44]];
  for (const [y, v, x0, x1] of steps) {
    for (let x = x0; x < x1; x++) {
      set(t, x, y, pick(STONE_RAMP, v, x, y));
      set(t, x, y + 1, pick(STONE_RAMP, v - 0.35, x, y + 1));
      set(t, x, y + 2, C.SOOT);
    }
  }
  // Glowing arrow sign above the arch.
  const arrow = ['..ooooo..', '..ooooo..', 'ooooooooo', '.ooooooo.', '..ooooo..', '...ooo...', '....o....'];
  arrow.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'o') set(t, 27 + x, 0 + y, y < 2 ? C.AMBER : C.HOT); }));
  t.glow = glowMask([C.AMBER, C.HOT]);
  return t;
}

function neonScreen() {
  const t = blank(S, C.STEEL_D);
  const plate = normalize(fbm(S, 41, { base: 8, octaves: 3 }));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      let v = 0.35 + (plate[i] - 0.5) * 0.3;
      if (y % 32 === 0 || x % 32 === 0) v = 0.05;
      if (y % 32 === 1 || x % 32 === 1) v += 0.3;
      t.data[i] = pick(STEEL_RAMP, v, x, y);
    }
  }
  // Rivets
  for (const [x, y] of [[4, 4], [59, 4], [4, 59], [59, 59], [4, 30], [59, 30]]) {
    set(t, x, y, C.STEEL_L); set(t, x + 1, y + 1, C.BLACK);
  }
  // Screen with bezel
  for (let y = 9; y < 46; y++) {
    for (let x = 6; x < 58; x++) {
      const border = y === 9 || y === 45 || x === 6 || x === 57;
      if (border) { set(t, x, y, y === 45 || x === 57 ? C.STEEL_L : C.BLACK); continue; }
      // Scanlines and a soft vignette.
      const vig = Math.hypot((x - 32) / 26, (y - 27) / 18);
      let c = y % 2 ? C.PLUM_D : C.NIGHT;
      if (vig > 0.95) c = C.BLACK;
      set(t, x, y, c);
    }
  }
  // Text with a dim halo.
  const halo = (x, y) => { if (get(t, x, y) === C.PLUM_D || get(t, x, y) === C.NIGHT) set(t, x, y, C.PLUM); };
  const tmp = blank(S, 0);
  bigText(tmp, 'BORANT', 9, 14, 1);
  smallText(tmp, 'SPONSORED', 14, 30, 2);
  smallText(tmp, 'STAY TUNED', 12, 37, 2);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (tmp.data[y * S + x] === 1) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) halo(x + dx, y + dy);
    }
  }
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = tmp.data[y * S + x];
      if (v === 1) set(t, x, y, (x + y) % 7 === 0 ? C.WHITE : C.NEON);
      else if (v === 2) set(t, x, y, C.LILAC);
    }
  }
  t.glow = glowMask([C.NEON, C.WHITE, C.LILAC, C.PLUM, C.MAGENTA]);
  return t;
}

// Borant recruitment poster: parchment nailed onto the stone wall.
function borantPoster() {
  const t = stoneWall();
  const grain = normalize(fbm(S, 61, { base: 8, octaves: 3 }));
  const r = rng(62);
  const x0 = 5, x1 = 59, y0 = 7, y1 = 55;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      // Torn, uneven edge and a curled lower right corner.
      const e = Math.min(x - x0, y - y0, x1 - 1 - x, y1 - 1 - y);
      if (e === 0 && r() < 0.35) continue;
      if (x - x0 + (y1 - y) < 7) continue;
      let v = 0.62 + (grain[y * S + x] - 0.5) * 0.45 - (e < 2 ? 0.25 : 0);
      if ((x * 7 + y * 13) % 29 === 0) v -= 0.2; // stains
      t.data[y * S + x] = pick([C.WOOD, C.LEATHER, C.TAN, C.PARCHMENT], v, x, y, 0.8);
    }
  }
  // Curl shadow and back side.
  for (let k = 0; k < 7; k++) { set(t, x1 - 7 + k, y1 - 1 - k, C.WOOD_D); if (k) set(t, x1 - 7 + k, y1 - k, C.SOOT); }
  bigText(t, 'BORANT', 9, 11, C.BLOOD);
  for (let x = 9; x < 55; x++) { set(t, x, 23, C.BLOOD_D); }
  smallText(t, 'NOW HIRING', 12, 27, C.GORE);
  smallText(t, 'CRAWLERS', 16, 34, C.GORE);
  // Fine print nobody reads.
  for (let line = 0; line < 3; line++) {
    for (let x = 10; x < 52; x++) if ((x * 3 + line * 5) % 7 > 1) set(t, x, 42 + line * 3, C.WOOD);
  }
  // Nails
  for (const [x, y] of [[7, 9], [56, 9], [7, 52]]) { set(t, x, y, C.STEEL_L); set(t, x + 1, y + 1, C.SOOT); }
  return t;
}

function door() {
  const t = stoneWall();
  const grain = normalize(fbm(S, 51, { base: 4, octaves: 4 }));
  const r = rng(52);
  const x0 = 12, x1 = 52, top = 18;
  for (let y = 4; y < S; y++) {
    for (let x = x0 - 3; x < x1 + 3; x++) {
      const ax = (x - 31.5) / 20, ay = (y - top) / 14;
      const inside = y >= top ? x >= x0 && x < x1 : ax * ax + ay * ay <= 1 && y > 4;
      const frame = y >= top ? x >= x0 - 3 && x < x1 + 3 : ((x - 31.5) / 23) ** 2 + ((y - top) / 17) ** 2 <= 1;
      if (inside) {
        const plank = Math.floor((x - x0) / 8), lx = (x - x0) % 8;
        // Vertical grain: noise stretched along y.
        const g = grain[((y >> 2) % S) * S + ((x * 3 + plank * 17) % S)];
        let v = 0.45 + (g - 0.5) * 0.5 + Math.sin(y * 0.4 + plank * 2.1 + g * 6) * 0.06;
        if (lx === 0) v = 0.02; else if (lx === 1) v += 0.15; else if (lx === 7) v -= 0.18;
        set(t, x, y, pick(WOOD_RAMP, v, x, y));
      } else if (frame) {
        const v = 0.55 + (x < 32 ? 0.12 : -0.1) + (r() - 0.5) * 0.2;
        set(t, x, y, pick(STONE_RAMP, v, x, y));
      }
    }
  }
  // Iron bands with rivets.
  for (const by of [26, 50]) {
    for (let x = x0; x < x1; x++) {
      set(t, x, by - 1, C.STEEL_L); set(t, x, by, C.STEEL_M); set(t, x, by + 1, C.STEEL); set(t, x, by + 2, C.STEEL_D); set(t, x, by + 3, C.BLACK);
      if ((x - x0) % 8 === 4) { set(t, x, by, C.WHITE); set(t, x, by + 1, C.STEEL_L); }
    }
  }
  // Ring handle and lock plate.
  for (let a = 0; a < 40; a++) {
    const ang = (a / 40) * Math.PI * 2;
    const x = Math.round(43 + Math.cos(ang) * 4), y = Math.round(40 + Math.sin(ang) * 4);
    set(t, x, y, Math.sin(ang) < -0.2 || Math.cos(ang) < -0.5 ? C.STEEL_L : C.STEEL_D);
  }
  for (let y = 33; y < 37; y++) for (let x = 41; x < 46; x++) set(t, x, y, y === 33 ? C.STEEL_L : C.STEEL);
  set(t, 43, 35, C.BLACK);
  return t;
}

// Carved, glowing runes on dark stone.
function runeWall() {
  const { t, layout } = stoneBlocks(61, { ramp: DARK_STONE, mortar: C.BLACK, rough: 0.6 });
  const r = rng(62);
  const done = new Set();
  for (let i = 0; i < S * S; i++) {
    const b = layout[i];
    if (done.has(b.id) || b.bw < 14) continue;
    done.add(b.id);
    if (r() < 0.35) continue;
    // Glyph on a 5x7 grid centred in the block, made from 3-4 strokes.
    const ox = (i % S) - b.lx + Math.floor((b.bw - 7) / 2), oy = Math.floor(i / S) - b.ly + 4;
    const strokes = 3 + Math.floor(r() * 2);
    const glyph = new Set();
    for (let s = 0; s < strokes; s++) {
      let x = Math.floor(r() * 5), y = Math.floor(r() * 7);
      const dir = [[0, 1], [1, 0], [1, 1], [1, -1], [-1, 1]][Math.floor(r() * 5)];
      const len = 2 + Math.floor(r() * 4);
      for (let k = 0; k < len; k++) {
        if (x < 0 || x > 4 || y < 0 || y > 6) break;
        glyph.add(`${x},${y}`); x += dir[0]; y += dir[1];
      }
    }
    for (const key of glyph) {
      const [gx, gy] = key.split(',').map(Number);
      const X = ox + gx + 1, Y = oy + gy;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]]) if (!glyph.has(`${gx + dx},${gy + dy}`)) set(t, X + dx, Y + dy, C.VIOLET_D);
    }
    for (const key of glyph) {
      const [gx, gy] = key.split(',').map(Number);
      set(t, ox + gx + 1, oy + gy, (gx + gy) % 3 === 0 ? C.LILAC : C.VIOLET_M);
    }
  }
  t.glow = glowMask([C.VIOLET_M, C.LILAC]);
  return t;
}

// ------------------------------------------------------------ flats

function cobbles() {
  const v = voronoi(S, 71, 25, 0.38);
  const n = normalize(fbm(S, 72, { base: 16, octaves: 2 }));
  const r = rng(73);
  const base = Array.from({ length: v.count }, r);
  const h = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) h[i] = Math.sqrt(Math.min(v.edge[i], 5) / 5);
  const t = blank(S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      if (v.edge[i] < 1.1) { t.data[i] = C.SOOT; continue; }
      const val = 0.4 + base[v.id[i]] * 0.3 + emboss(h, x, y) * 0.9 + (h[i] - 0.6) * 0.3 + (n[i] - 0.5) * 0.25;
      t.data[i] = pick(GRAVEL_RAMP, val, x, y);
    }
  }
  return t;
}

function wetFlagstones() {
  const t = blank(S);
  const n = normalize(fbm(S, 81, { base: 8, octaves: 3 }));
  const puddle = normalize(fbm(S, 82, { base: 2, octaves: 3 }));
  const ramp = [C.NIGHT, C.STONE_D, C.STONE, C.STONE_M, C.STEEL_M];
  const r = rng(83);
  const tileBase = [r(), r(), r(), r()];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const tx = (x + (y >= 32 ? 16 : 0)) % S;
      const lx = tx % 32, ly = y % 32;
      if (lx === 0 || ly === 0) { t.data[i] = n[i] > 0.6 ? C.MOSS_D : C.SOOT; continue; }
      let v = 0.35 + tileBase[(tx >> 5) + 2 * (y >> 5)] * 0.25 + (n[i] - 0.5) * 0.4;
      if (lx === 1 || ly === 1) v += 0.15;
      if (lx === 31 || ly === 31) v -= 0.15;
      if (puddle[i] > 0.78) {
        // Standing water: dark, cool, with a few bright glints.
        t.data[i] = r() < 0.006 ? C.ICE : (puddle[i] > 0.88 ? C.STEEL_D : C.NAVY);
        continue;
      }
      t.data[i] = pick(ramp, v, x, y);
    }
  }
  return t;
}

function planksFloor() {
  const t = blank(S);
  const g = normalize(fbm(S, 91, { base: 4, octaves: 4 }));
  const r = rng(92);
  const seams = [r(), r(), r(), r()].map((v) => Math.floor(v * S));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const p = y >> 4, ly = y & 15;
      const gg = g[((p * 16 + (ly >> 1)) % S) * S + ((x >> 1) + p * 23) % S];
      let v = 0.35 + p * 0.04 + (gg - 0.5) * 0.6 + Math.sin(x * 0.18 + gg * 9 + p) * 0.05;
      if (ly === 0) v = 0; else if (ly === 1) v += 0.12; else if (ly === 15) v -= 0.15;
      if (x === seams[p]) v = 0.02;
      if ((x === (seams[p] + 3) % S || x === (seams[p] + S - 3) % S) && (ly === 4 || ly === 11)) {
        t.data[y * S + x] = C.STEEL_L; continue;
      }
      t.data[y * S + x] = pick(WOOD_RAMP, v, x, y);
    }
  }
  return t;
}

function carpet() {
  const t = blank(S);
  const n = normalize(fbm(S, 101, { base: 16, octaves: 2 }));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      // Diamond lattice every 16 px with a gold stud at each crossing.
      const a = ((x + y) % 16 + 16) % 16, b = ((x - y) % 16 + 16) % 16;
      let c;
      if ((a === 0 || b === 0) && (x % 16 === 8 || y % 16 === 8 || true)) c = C.MAGENTA;
      else if (a === 1 || b === 1 || a === 15 || b === 15) c = C.PLUM;
      else c = n[i] > 0.55 ? C.WINE : (n[i] < 0.3 ? C.PLUM_D : C.WINE);
      if (x % 16 === 0 && y % 16 === 0) c = C.GOLD;
      if (x % 16 === 8 && y % 16 === 8) c = C.AMBER;
      t.data[i] = c;
    }
  }
  return t;
}

function gravel() {
  const t = blank(S);
  const n = normalize(fbm(S, 111, { base: 4, octaves: 5 }));
  const v = voronoi(S, 112, 60);
  const r = rng(113);
  const pebble = Array.from({ length: v.count }, () => r() < 0.35);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      let val = 0.3 + (n[i] - 0.5) * 0.35 + emboss(n, x, y) * 1.2;
      if (pebble[v.id[i]] && v.dist[i] < 2.2) val = 0.65 - v.dist[i] * 0.12 + ((x + y) % 2) * 0.05;
      t.data[i] = pick([C.SOOT, C.GRAVEL_D, C.GRAVEL, C.GRAVEL_M, C.GRAVEL_L], val, x, y);
    }
  }
  return t;
}

function beamCeiling() {
  const t = planksFloor();
  const g = normalize(fbm(S, 121, { base: 4, octaves: 3 }));
  for (let y = 0; y < S; y++) {
    for (let x = 24; x < 40; x++) {
      const lx = x - 24;
      let v = 0.3 + (g[y * S + x] - 0.5) * 0.4;
      if (lx === 0 || lx === 15) v = 0; else if (lx === 1) v += 0.2; else if (lx === 14) v -= 0.15;
      t.data[y * S + x] = pick(WOOD_RAMP, v, x, y);
    }
  }
  return t;
}

function vaultCeiling() {
  return stoneBlocks(131, { ramp: DARK_STONE, mortar: C.BLACK, rowH: 32 }).t;
}

function caveCeiling() {
  const t = caveRock();
  for (let i = 0; i < t.data.length; i++) {
    const c = t.data[i];
    t.data[i] = c === C.GRAVEL_L ? C.GRAVEL : c === C.GRAVEL_M ? C.GRAVEL_D : c === C.GRAVEL ? C.SOOT : c;
  }
  return t;
}

function steelCeiling() {
  const t = blank(S);
  const n = normalize(fbm(S, 141, { base: 8, octaves: 2 }));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const lx = x % 32, ly = y % 32;
      let v = 0.25 + (n[y * S + x] - 0.5) * 0.3;
      if (lx === 0 || ly === 0) v = 0; else if (lx === 1 || ly === 1) v += 0.25;
      t.data[y * S + x] = pick(STEEL_RAMP, v, x, y);
    }
  }
  // Neon strip along the middle of every cell.
  for (let x = 0; x < S; x++) { set(t, x, 31, C.MAGENTA); set(t, x, 32, C.NEON); set(t, x, 33, C.MAGENTA); }
  t.glow = glowMask([C.NEON, C.MAGENTA]);
  return t;
}

// ------------------------------------------------------------ portrait frame

// Wraps a painted image (64 px wide, engine sprite) in a gilded frame on stone.
export function framedPortrait(img) {
  const t = stoneWall();
  // Frame sized so the painting maps 1:1 (no resampling).
  const x0 = Math.floor((S - img.w) / 2) - 4, y0 = Math.floor((S - img.h) / 2) - 4;
  const x1 = x0 + img.w + 8, y1 = y0 + img.h + 8;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const e = Math.min(x - x0, y - y0, x1 - 1 - x, y1 - 1 - y);
      if (e < 4) {
        const lit = (x - x0 < 4 || y - y0 < 4) && e < 3;
        set(t, x, y, e === 0 ? C.SOOT : e === 3 ? C.WOOD_D : lit ? (e === 1 ? C.YELLOW : C.GOLD) : (e === 1 ? C.RUST : C.AMBER));
      } else {
        const c = img.data[(y - y0 - 4) * img.w + (x - x0 - 4)];
        set(t, x, y, c === 255 ? C.PLUM_D : c);
      }
    }
  }
  if (img.glow) t.glow = img.glow;
  return t;
}

// ------------------------------------------------------------ registry

// Wall ids (map cells, 0 = open) and flat ids (floor/ceiling per cell).
export const WALL = { STONE: 1, ROCK: 2, MOSSY: 3, STAIRS: 4, NEON: 5, DOOR: 6, RUNES: 7, PORTRAIT: 8, POSTER: 9 };
export const FLAT = { COBBLE: 0, WET: 1, PLANKS: 2, CARPET: 3, GRAVEL: 4, BEAMS: 5, VAULT: 6, CAVE: 7, STEEL: 8 };

// Texture size in pixels (one wall = 64 x 64).
export const TEX = S;

// portraitImg: optional engine sprite shown in the PORTRAIT wall's frame.
export function buildTextures(portraitImg = null) {
  const walls = [];
  walls[WALL.STONE] = stoneWall();
  walls[WALL.ROCK] = caveRock();
  walls[WALL.MOSSY] = mossyWall();
  walls[WALL.STAIRS] = stairwell();
  walls[WALL.NEON] = neonScreen();
  walls[WALL.DOOR] = door();
  walls[WALL.RUNES] = runeWall();
  walls[WALL.PORTRAIT] = portraitImg ? framedPortrait(portraitImg) : stoneWall();
  walls[WALL.POSTER] = borantPoster();
  const flats = [];
  flats[FLAT.COBBLE] = cobbles();
  flats[FLAT.WET] = wetFlagstones();
  flats[FLAT.PLANKS] = planksFloor();
  flats[FLAT.CARPET] = carpet();
  flats[FLAT.GRAVEL] = gravel();
  flats[FLAT.BEAMS] = beamCeiling();
  flats[FLAT.VAULT] = vaultCeiling();
  flats[FLAT.CAVE] = caveCeiling();
  flats[FLAT.STEEL] = steelCeiling();
  return { walls, flats };
}
