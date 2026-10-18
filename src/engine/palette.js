// Fixed 64-color palette. Every pixel in the game is an index into this table.
// Index 0 is pure black and is also the darkest shade every color fades into.
//
// Indices 0-31 are the original "classic" palette and never change, so older
// sprites keep their colors. Indices 32-63 extend it with skin, neon, teal,
// steel, warm stone, extra reds and violets for the higher-detail look.

export const PALETTE_HEX = [
  '#000000', '#1a1220', '#2e2233', '#4a3a4f', // 0-3   black, deep purples
  '#6e5b6e', '#9a8a96', '#c9bfc0', '#f2ece0', // 4-7   grey-violet to bone white
  '#3b2a1c', '#5e4128', '#87602f', '#b88a4a', // 8-11  browns (wood, leather)
  '#e0b878', '#3f1a14', '#7a2418', '#b8381f', // 12-15 tan, blood reds
  '#e8682a', '#ffb03a', '#ffe27a', '#1c2b1f', // 16-19 fire, gold, dark moss
  '#2f4a2a', '#4f7a35', '#8ab048', '#142233', // 20-23 greens, night blue
  '#22406a', '#3a6fa8', '#6aa8d8', '#b0e0f0', // 24-27 blues, ice
  '#2a2a30', '#45454e', '#6a6a74', '#95959e', // 28-31 stone ramp
  // ---- extended
  '#4a2a20', '#7c4a32', '#b47a56', '#e6b48c', // 32-35 skin ramp
  '#2c0f33', '#5c1a5e', '#a52e8c', '#ff5fc8', // 36-39 plum to neon pink
  '#0d3134', '#1b5f5a', '#30a08a', '#86ecc8', // 40-43 teal to mint
  '#1a2029', '#343f4e', '#5b6c82', '#9fb1c6', // 44-47 steel ramp
  '#352b24', '#57483b', '#80705f', '#b5a48d', // 48-51 warm stone, gravel
  '#4c0b12', '#9a5420', '#dc8e3c', '#fff6d2', // 52-55 gore, rust, amber, hot white
  '#241944', '#46378a', '#7a68d0', '#c6b8ff', // 56-59 violet ramp
  '#ffffff', '#140c0a', '#e2d6b2', '#5e0f2c', // 60-63 white, soot, parchment, wine
];

// Named indices so game code never hard-codes numbers.
export const C = {
  BLACK: 0, NIGHT: 1, SHADOW: 2, DUSK: 3, ASH: 4, FOG: 5, SILVER: 6, BONE: 7,
  WOOD_D: 8, WOOD: 9, WOOD_L: 10, LEATHER: 11, TAN: 12,
  BLOOD_D: 13, BLOOD: 14, RED: 15, FIRE: 16, GOLD: 17, YELLOW: 18,
  MOSS_D: 19, MOSS: 20, GREEN: 21, LIME: 22,
  NAVY: 23, BLUE_D: 24, BLUE: 25, SKY: 26, ICE: 27,
  STONE_D: 28, STONE: 29, STONE_M: 30, STONE_L: 31,
  SKIN_D: 32, SKIN: 33, SKIN_M: 34, SKIN_L: 35,
  PLUM_D: 36, PLUM: 37, MAGENTA: 38, NEON: 39,
  TEAL_D: 40, TEAL: 41, TEAL_M: 42, MINT: 43,
  STEEL_D: 44, STEEL: 45, STEEL_M: 46, STEEL_L: 47,
  GRAVEL_D: 48, GRAVEL: 49, GRAVEL_M: 50, GRAVEL_L: 51,
  GORE: 52, RUST: 53, AMBER: 54, HOT: 55,
  VIOLET_D: 56, VIOLET: 57, VIOLET_M: 58, LILAC: 59,
  WHITE: 60, SOOT: 61, PARCHMENT: 62, WINE: 63,
};

export const PALETTE_SIZE = PALETTE_HEX.length;
export const CLASSIC_SIZE = 32;
export const SHADE_LEVELS = 16;

export const PALETTE_RGB = PALETTE_HEX.map((h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]);

// RGBA words for fast ImageData writes (little-endian: ABGR).
export const RGBA32 = new Uint32Array(
  PALETTE_RGB.map(([r, g, b]) => (255 << 24) | (b << 16) | (g << 8) | r),
);

// Nearest palette color, searching only the first `limit` entries.
export function nearestColor(r, g, b, limit = PALETTE_SIZE) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < limit; i++) {
    const [pr, pg, pb] = PALETTE_RGB[i];
    // Perceptual-ish weights.
    const d = 3 * (pr - r) ** 2 + 4 * (pg - g) ** 2 + 2 * (pb - b) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// SHADE[level * PALETTE_SIZE + color] -> palette index. Level 0 = full
// brightness, level 15 = black. Like a 90s colormap: darkening stays inside
// the palette. The classic table only uses the classic 32 colors so the
// original look stays exactly as it was.
export const SHADE = new Uint8Array(SHADE_LEVELS * PALETTE_SIZE);
for (let l = 0; l < SHADE_LEVELS; l++) {
  const f = 1 - l / (SHADE_LEVELS - 1);
  for (let c = 0; c < PALETTE_SIZE; c++) {
    const [r, g, b] = PALETTE_RGB[c];
    // Slight cold tint as things fade into the dark.
    SHADE[l * PALETTE_SIZE + c] = nearestColor(r * f, g * f, b * Math.min(1, f * 1.08), CLASSIC_SIZE);
  }
}

export function shade(color, level) {
  const l = level < 0 ? 0 : level > SHADE_LEVELS - 1 ? SHADE_LEVELS - 1 : level | 0;
  return SHADE[l * PALETTE_SIZE + color];
}
