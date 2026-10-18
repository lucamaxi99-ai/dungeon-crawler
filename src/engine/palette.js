// Fixed 32-color palette. Every pixel in the game is an index into this table.
// Index 0 is pure black and is also the darkest shade every color fades into.

export const PALETTE_HEX = [
  '#000000', '#1a1220', '#2e2233', '#4a3a4f', // 0-3   black, deep purples
  '#6e5b6e', '#9a8a96', '#c9bfc0', '#f2ece0', // 4-7   grey-violet to bone white
  '#3b2a1c', '#5e4128', '#87602f', '#b88a4a', // 8-11  browns (wood, leather)
  '#e0b878', '#3f1a14', '#7a2418', '#b8381f', // 12-15 tan, blood reds
  '#e8682a', '#ffb03a', '#ffe27a', '#1c2b1f', // 16-19 fire, gold, dark moss
  '#2f4a2a', '#4f7a35', '#8ab048', '#142233', // 20-23 greens, night blue
  '#22406a', '#3a6fa8', '#6aa8d8', '#b0e0f0', // 24-27 blues, ice
  '#2a2a30', '#45454e', '#6a6a74', '#95959e', // 28-31 stone ramp
];

// Named indices so game code never hard-codes numbers.
export const C = {
  BLACK: 0, NIGHT: 1, SHADOW: 2, DUSK: 3, ASH: 4, FOG: 5, SILVER: 6, BONE: 7,
  WOOD_D: 8, WOOD: 9, WOOD_L: 10, LEATHER: 11, TAN: 12,
  BLOOD_D: 13, BLOOD: 14, RED: 15, FIRE: 16, GOLD: 17, YELLOW: 18,
  MOSS_D: 19, MOSS: 20, GREEN: 21, LIME: 22,
  NAVY: 23, BLUE_D: 24, BLUE: 25, SKY: 26, ICE: 27,
  STONE_D: 28, STONE: 29, STONE_M: 30, STONE_L: 31,
};

export const PALETTE_SIZE = PALETTE_HEX.length;
export const SHADE_LEVELS = 16;

const RGB = PALETTE_HEX.map((h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]);

// RGBA words for fast ImageData writes (little-endian: ABGR).
export const RGBA32 = new Uint32Array(
  RGB.map(([r, g, b]) => (255 << 24) | (b << 16) | (g << 8) | r),
);

function nearest(r, g, b) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < RGB.length; i++) {
    const [pr, pg, pb] = RGB[i];
    // Perceptual-ish weights.
    const d = 3 * (pr - r) ** 2 + 4 * (pg - g) ** 2 + 2 * (pb - b) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// SHADE[level * 32 + color] -> palette index. Level 0 = full brightness,
// level 15 = black. Like a 90s colormap: darkening stays inside the palette.
export const SHADE = new Uint8Array(SHADE_LEVELS * PALETTE_SIZE);
for (let l = 0; l < SHADE_LEVELS; l++) {
  const f = 1 - l / (SHADE_LEVELS - 1);
  for (let c = 0; c < PALETTE_SIZE; c++) {
    const [r, g, b] = RGB[c];
    // Slight cold tint as things fade into the dark.
    SHADE[l * PALETTE_SIZE + c] = nearest(r * f, g * f, b * Math.min(1, f * 1.08));
  }
}

export function shade(color, level) {
  const l = level < 0 ? 0 : level > SHADE_LEVELS - 1 ? SHADE_LEVELS - 1 : level | 0;
  return SHADE[l * PALETTE_SIZE + color];
}
