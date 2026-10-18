// Sprites are defined as ASCII rasters: one character per pixel, mapped to a
// palette index through a key. '.' is always transparent.
//
//   defineSprite({
//     key: { k: C.BLACK, w: C.WOOD },
//     rows: ['..kk..', '.kwwk.', ...],
//   })

import { TRANSPARENT } from './framebuffer.js';

// Optional `glow`: string of key chars whose colors ignore distance shading
// (flames, magic runes, eyes in the dark).
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
  let glowMask = null;
  if (glow) {
    glowMask = new Uint8Array(256);
    for (const ch of glow) glowMask[key[ch]] = 1;
  }
  return { name, w, h, data, glow: glowMask };
}

// Returns a copy with colors swapped: recolor(sprite, { [C.RED]: C.BLUE }).
export function recolor(sprite, map, name = sprite.name + '_recolor') {
  const data = sprite.data.map((c) => (c in map ? map[c] : c));
  return { ...sprite, name, data };
}

// Horizontal mirror, handy for symmetric designs and walk frames.
export function mirror(sprite) {
  const { w, h } = sprite;
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) data[y * w + x] = sprite.data[y * w + (w - 1 - x)];
  }
  return { ...sprite, name: sprite.name + '_mirror', data };
}
