// Sprites are defined as ASCII rasters: one character per pixel, mapped to a
// palette index through a key. '.' (or space) is always transparent.
//
//   defineSprite({
//     key: { k: C.BLACK, w: C.WOOD },
//     rows: ['..kk..', '.kwwk.', ...],
//   })
//
// A sprite is a plain object { name, w, h, data, glow }:
//   data  Uint8Array of palette indices, TRANSPARENT for holes
//   glow  null or a Uint8Array(256) mask; glow[c] = 1 means color c ignores
//         distance shading (flames, magic runes, eyes in the dark)
//
// Animations are { frames, frameMs, mode } where mode is 'loop', 'pingpong'
// or 'once'. Use frameAt() to pick the frame for a point in time.

import { TRANSPARENT } from './framebuffer.js';
import { PALETTE_SIZE } from './palette.js';

function glowMaskFor(key, glow) {
  if (!glow) return null;
  const mask = new Uint8Array(256);
  for (const ch of glow) {
    if (!(ch in key)) throw new Error(`glow char '${ch}' is not in the key`);
    mask[key[ch]] = 1;
  }
  return mask;
}

export function defineSprite({ key, rows, glow = '', name = 'sprite' }) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const data = new Uint8Array(w * h).fill(TRANSPARENT);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ') continue;
      if (!(ch in key)) throw new Error(`Sprite "${name}": unknown key '${ch}' at ${x},${y}`);
      data[y * w + x] = key[ch];
    }
  }
  return { name, w, h, data, glow: glowMaskFor(key, glow) };
}

// Several frames sharing one key. All frames must have the same size so the
// sprite doesn't jump around while it animates.
//
//   defineFrames({ name: 'torch', key, glow: 'fy', frames: [[...rows], [...rows]] })
export function defineFrames({ key, frames, glow = '', name = 'sprite' }) {
  const list = frames.map((rows, i) => defineSprite({ key, rows, glow, name: `${name}_${i}` }));
  const { w, h } = list[0];
  list.forEach((f, i) => {
    if (f.w !== w || f.h !== h) {
      throw new Error(`Sprite "${name}": frame ${i} is ${f.w}x${f.h}, frame 0 is ${w}x${h}`);
    }
  });
  return list;
}

// ------------------------------------------------------------ animation

export function animation(frames, { frameMs = 150, mode = 'loop' } = {}) {
  const list = Array.isArray(frames) ? frames : [frames];
  return { frames: list, frameMs, mode };
}

// Frame index for a time in ms. `phase` shifts the cycle by whole frames so
// several copies of the same animation don't move in lockstep.
export function frameIndex(anim, timeMs, phase = 0) {
  const n = anim.frames.length;
  if (n <= 1 || !anim.frameMs) return 0;
  const t = Math.floor(timeMs / anim.frameMs) + phase;
  if (anim.mode === 'once') return Math.min(n - 1, Math.max(0, t));
  if (anim.mode === 'pingpong') {
    const period = 2 * n - 2;
    const p = ((t % period) + period) % period;
    return p < n ? p : period - p;
  }
  return ((t % n) + n) % n;
}

export function frameAt(anim, timeMs, phase = 0) {
  return anim.frames[frameIndex(anim, timeMs, phase)];
}

// ------------------------------------------------------------ variants
//
// recolor, mirror and flip accept a sprite, an array of frames or an
// animation, and return the same kind of thing. That way a whole animated
// monster can be turned into its "elite" variant in one line.

function mapVariant(target, fn) {
  if (Array.isArray(target)) return target.map(fn);
  if (target && target.frames) return { ...target, frames: target.frames.map(fn) };
  return fn(target);
}

// Swap colors: recolor(sprite, { [C.RED]: C.BLUE }).
// Glow follows the colors: a glowing color stays glowing after the swap.
// Note that glow is per palette index, so if a non-glowing color is mapped
// onto a glowing one, those pixels glow too.
export function recolor(target, map, suffix = 'recolor') {
  return mapVariant(target, (s) => {
    const data = s.data.map((c) => (c in map ? map[c] : c));
    let glow = null;
    if (s.glow) {
      glow = new Uint8Array(256);
      for (let c = 0; c < PALETTE_SIZE; c++) if (s.glow[c]) glow[c in map ? map[c] : c] = 1;
    }
    return { ...s, name: `${s.name}_${suffix}`, data, glow };
  });
}

// Builds a recolor map that swaps one color ramp for another, light to dark
// or dark to light as long as both lists use the same order:
//   rampMap([C.RED, C.FIRE, C.GOLD], [C.BLUE_D, C.BLUE, C.SKY])
// If `to` is shorter, its last color is reused.
export function rampMap(from, to) {
  const map = {};
  from.forEach((c, i) => { map[c] = to[Math.min(i, to.length - 1)]; });
  return map;
}

function remapPixels(s, suffix, src) {
  const { w, h } = s;
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) data[y * w + x] = s.data[src(x, y)];
  }
  return { ...s, name: `${s.name}_${suffix}`, data };
}

// Horizontal mirror, handy for symmetric designs and walk frames.
export function mirror(target) {
  return mapVariant(target, (s) => remapPixels(s, 'mirror', (x, y) => y * s.w + (s.w - 1 - x)));
}

// Vertical flip.
export function flip(target) {
  return mapVariant(target, (s) => remapPixels(s, 'flip', (x, y) => (s.h - 1 - y) * s.w + x));
}

// ------------------------------------------------------------ ASCII export

// Default key character for every palette index (see C in palette.js):
//   k black  n night  h shadow  u dusk  a ash  o fog  v silver  b bone
//   d wood_d w wood   l wood_l  e leather t tan
//   j blood_d r blood R red  f fire  g gold  y yellow
//   m moss_d M moss  G green  i lime
//   N navy  B blue_d  c blue  p sky  I ice
//   1 2 3 4 stone_d, stone, stone_m, stone_l
export const KEY_CHARS = 'knhuaovbdwletjrRfgymMGiNBcpI1234';

// Turns one or more frames back into ASCII rows plus a key, the inverse of
// defineFrames. Only colors that are used end up in the key. Returns
// { key: {char: index}, glow: 'chars', frames: [[row, ...], ...], w, h }.
export function spriteToAscii(target, chars = KEY_CHARS) {
  const frames = Array.isArray(target) ? target : target.frames || [target];
  const { w, h } = frames[0];
  const used = new Set();
  for (const f of frames) for (const c of f.data) if (c !== TRANSPARENT) used.add(c);

  const key = {};
  const charOf = new Map();
  for (const c of [...used].sort((a, b) => a - b)) {
    const ch = chars[c];
    if (!ch || ch === '.' || ch === ' ') throw new Error(`no key char for palette index ${c}`);
    key[ch] = c;
    charOf.set(c, ch);
  }

  let glow = '';
  for (const c of [...used].sort((a, b) => a - b)) {
    if (frames.some((f) => f.glow && f.glow[c])) glow += charOf.get(c);
  }

  const rows = frames.map((f) => {
    const out = [];
    for (let y = 0; y < h; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        const c = f.data[y * w + x];
        row += c === TRANSPARENT ? '.' : charOf.get(c);
      }
      out.push(row);
    }
    return out;
  });
  return { key, glow, frames: rows, w, h };
}
