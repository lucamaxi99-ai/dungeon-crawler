// Loot box sprites: a cube in three-quarter view with metal bands, a
// glowing seam under the lid and the tier's letter on the front. Six tiers
// share one shape and differ only in their colors. Frames 0-2 pulse the
// seam; the open box has lost its lid and glows from inside.
// (Moved here from the graphics showroom, which now uses this one.)

import { C } from '../engine/palette.js';
import { Painter } from '../engine/paint.js';

export const BOX_ART = {
  bronze: { body: [C.SOOT, C.WOOD_D, C.RUST, C.AMBER], trim: [C.WOOD_D, C.RUST, C.AMBER, C.TAN], glow: C.AMBER, letter: 'B' },
  silver: { body: [C.STEEL_D, C.STEEL, C.STEEL_M, C.STEEL_L], trim: [C.STEEL, C.STEEL_M, C.STEEL_L, C.WHITE], glow: C.ICE, letter: 'S' },
  gold: { body: [C.RUST, C.AMBER, C.GOLD, C.YELLOW], trim: [C.WOOD_D, C.RUST, C.GOLD, C.HOT], glow: C.YELLOW, letter: 'G' },
  platinum: { body: [C.STEEL, C.STEEL_M, C.STEEL_L, C.ICE], trim: [C.STEEL_M, C.STEEL_L, C.ICE, C.WHITE], glow: C.SKY, letter: 'P' },
  legendary: { body: [C.PLUM_D, C.PLUM, C.MAGENTA, C.NEON], trim: [C.RUST, C.GOLD, C.YELLOW, C.HOT], glow: C.NEON, letter: 'L' },
  celestial: { body: [C.VIOLET_D, C.VIOLET, C.VIOLET_M, C.LILAC], trim: [C.TEAL, C.TEAL_M, C.MINT, C.WHITE], glow: C.MINT, letter: 'C' },
};

// 3x5 letters for the emblem.
const LETTERS = {
  B: ['110', '101', '110', '101', '110'], S: ['011', '100', '010', '001', '110'],
  G: ['011', '100', '101', '101', '011'], P: ['110', '101', '110', '100', '100'],
  L: ['100', '100', '100', '100', '111'], C: ['011', '100', '100', '100', '011'],
};

// tierId: one of BOX_ART. frame: 0..2 (seam pulse). open: lid gone.
// scale: as in Painter (1 = 34 x 32 at 64 px per wall, or HUD pixels).
export function paintLootBox(tierId, frame = 0, { open = false, scale = 1 } = {}) {
  const tier = BOX_ART[tierId];
  const body = { ramp: tier.body, outline: C.BLACK, rough: 0.1 };
  const trim = { ramp: tier.trim, spec: C.WHITE, shine: 0.7, outline: C.BLACK };
  const inner = { ramp: [tier.glow], flat: true, glow: true };
  const dark = { ramp: [C.BLACK, C.SOOT], flat: true };
  const p = new Painter(34, 32, { seed: 21, scale });
  const g = tier.glow;
  if (open) {
    // No lid: the body below the seam and a glowing inside.
    p.poly([[3, 15], [23, 15], [23, 31], [3, 31]], 0, { z: 10, normal: [-0.15, 0, 1] });
    p.poly([[23, 15], [31, 7], [31, 23], [23, 31]], 0, { z: 8, normal: [1, -0.1, 0.4] });
    p.poly([[3, 15], [10, 7], [31, 7], [23, 15]], 3, { z: 9 });
    p.poly([[8, 14], [12, 9], [27, 9], [21, 14]], 2, { z: 9.5 });
    p.poly([[3, 15], [23, 15], [23, 17], [3, 17]], 1, { z: 11, normal: [-0.15, -0.3, 1] });
    p.poly([[23, 15], [31, 7], [31, 9], [23, 17]], 1, { z: 10, normal: [1, -0.3, 0.4] });
    p.poly([[12, 15], [14, 15], [14, 31], [12, 31]], 1, { z: 11, normal: [-0.15, 0, 1] });
    for (const [x, y] of [[3, 15], [23, 15], [3, 31], [23, 31]]) p.ellipse(x + (x > 10 ? -1 : 1), y + (y > 20 ? -1.5 : 1), 2, 2, 1, { z: 12 });
  } else {
    // Cube in three-quarter view: front, top and right faces with fixed normals.
    p.poly([[3, 12], [23, 12], [23, 31], [3, 31]], 0, { z: 10, normal: [-0.15, 0, 1] });
    p.poly([[3, 12], [10, 4], [31, 4], [23, 12]], 0, { z: 9, normal: [0, -1, 0.5] });
    p.poly([[23, 12], [31, 4], [31, 23], [23, 31]], 0, { z: 8, normal: [1, -0.1, 0.4] });
    // Metal bands: lid seam, corners and a cross strap.
    p.poly([[3, 15], [23, 15], [23, 17], [3, 17]], 1, { z: 11, normal: [-0.15, -0.3, 1] });
    p.poly([[23, 15], [31, 7], [31, 9], [23, 17]], 1, { z: 10, normal: [1, -0.3, 0.4] });
    p.poly([[12, 12], [14, 12], [14, 31], [12, 31]], 1, { z: 11, normal: [-0.15, 0, 1] });
    p.poly([[12, 12], [19, 4], [21, 4], [14, 12]], 1, { z: 10, normal: [0, -1, 0.5] });
    for (const [x, y] of [[3, 12], [23, 12], [3, 31], [23, 31]]) p.ellipse(x + (x > 10 ? -1 : 1), y + (y > 20 ? -1.5 : 1), 2, 2, 1, { z: 12 });
    // Glowing seam under the lid.
    const pulse = frame % 3;
    for (let x = 4; x < 23; x++) p.dot(x, 17.5, x % 3 === pulse ? C.WHITE : g);
  }
  // The tier's letter on the front.
  LETTERS[tier.letter].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '1') p.dot(6 + x, 21 + y, g); }));
  return p.shade([body, trim, inner, dark], { name: `loot_${tierId}_${open ? 'open' : frame}`, glowColors: [g, C.WHITE] });
}
