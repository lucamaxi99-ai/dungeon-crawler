// Shared building blocks for painted sprites (Painter): palette materials,
// helpers and the procedural flame. Used by the game's objects and by the
// graphics prototype.

import { C } from '../engine/palette.js';

// Material = { ramp, spec?, shine?, rough?, outline?, glow?, flat? } (see Painter.shade).
export const M = {
  gold: { ramp: [C.RUST, C.AMBER, C.GOLD, C.YELLOW], spec: C.HOT, shine: 0.8, outline: C.WOOD_D },
  coin: { ramp: [C.WOOD_D, C.RUST, C.AMBER, C.GOLD, C.YELLOW], spec: C.HOT, shine: 0.15, outline: C.WOOD_D },
  steel: { ramp: [C.STEEL_D, C.STEEL, C.STEEL_M, C.STEEL_L], spec: C.WHITE, shine: 0.6, outline: C.BLACK },
  rust: { ramp: [C.SOOT, C.RUST, C.STEEL, C.STEEL_M], rough: 0.35, outline: C.BLACK },
  bone: { ramp: [C.GRAVEL, C.GRAVEL_M, C.GRAVEL_L, C.PARCHMENT, C.BONE], outline: C.SOOT, rough: 0.12 },
  slime: { ramp: [C.TEAL_D, C.TEAL, C.TEAL_M, C.MINT], spec: C.WHITE, shine: 1, outline: C.NIGHT },
  fur: { ramp: [C.SOOT, C.GRAVEL_D, C.GRAVEL, C.GRAVEL_M, C.GRAVEL_L], rough: 0.3, outline: C.BLACK },
  pink: { ramp: [C.SKIN_D, C.SKIN, C.SKIN_M, C.SKIN_L], outline: C.SOOT },
  chitin: { ramp: [C.BLACK, C.NIGHT, C.SHADOW, C.DUSK, C.ASH], spec: C.FOG, shine: 0.5, outline: C.BLACK },
  gob: { ramp: [C.MOSS_D, C.MOSS, C.GREEN, C.LIME], outline: C.SOOT, rough: 0.08 },
  leather: { ramp: [C.SOOT, C.WOOD_D, C.WOOD, C.LEATHER], rough: 0.2, outline: C.BLACK },
  cloth: { ramp: [C.SOOT, C.GORE, C.BLOOD, C.RED], rough: 0.15, outline: C.BLACK },
  wood: { ramp: [C.SOOT, C.WOOD_D, C.WOOD, C.WOOD_L], rough: 0.2, outline: C.BLACK },
  iron: { ramp: [C.BLACK, C.STEEL_D, C.STEEL, C.STEEL_M], spec: C.STEEL_L, shine: 0.4, outline: C.BLACK },
  stone: { ramp: [C.SOOT, C.STONE_D, C.STONE, C.STONE_M, C.STONE_L], rough: 0.2, outline: C.BLACK },
  coal: { ramp: [C.BLOOD_D, C.BLOOD, C.RED, C.FIRE], glow: true, rough: 0.6 },
  ruby: { ramp: [C.GORE, C.BLOOD, C.RED, C.FIRE], spec: C.WHITE, shine: 1, outline: C.BLACK },
  emerald: { ramp: [C.TEAL_D, C.TEAL, C.TEAL_M, C.MINT], spec: C.WHITE, shine: 1, outline: C.BLACK },
  // Stuff from the world above (bestiary): safety orange, plastics, wool ...
  safety: { ramp: [C.BLOOD, C.RED, C.FIRE, C.AMBER], rough: 0.08, outline: C.BLACK },
  cone: { ramp: [C.BLOOD, C.RED, C.FIRE, C.AMBER], spec: C.HOT, shine: 0.35, outline: C.BLACK },
  hardhat: { ramp: [C.RUST, C.AMBER, C.GOLD, C.YELLOW], spec: C.HOT, shine: 0.5, outline: C.BLACK },
  chrome: { ramp: [C.STEEL_D, C.STEEL_M, C.STEEL_L, C.WHITE], spec: C.WHITE, shine: 0.9, outline: C.BLACK },
  plastic: { ramp: [C.BLACK, C.SOOT, C.SHADOW, C.DUSK, C.ASH], spec: C.STEEL_L, shine: 0.6, outline: C.BLACK },
  bomb: { ramp: [C.BLACK, C.SOOT, C.STEEL_D, C.STEEL], spec: C.STEEL_L, shine: 0.6, outline: C.BLACK },
  wool: { ramp: [C.GRAVEL_D, C.GRAVEL_M, C.TAN, C.PARCHMENT, C.BONE], rough: 0.35, outline: C.WOOD_D },
  hide: { ramp: [C.SOOT, C.WOOD_D, C.WOOD, C.LEATHER, C.TAN], rough: 0.12, outline: C.BLACK },
  enamel: { ramp: [C.GORE, C.BLOOD, C.RED, C.FIRE], spec: C.WHITE, shine: 0.45, outline: C.BLACK },
  robe: { ramp: [C.PLUM_D, C.PLUM, C.VIOLET, C.VIOLET_M], rough: 0.15, outline: C.BLACK },
  nylonRed: { ramp: [C.GORE, C.BLOOD, C.RED, C.FIRE], spec: C.AMBER, shine: 0.3, outline: C.BLACK },
  nylonGold: { ramp: [C.RUST, C.AMBER, C.GOLD, C.YELLOW], spec: C.HOT, shine: 0.3, outline: C.BLACK },
  ceramicSkin: { ramp: [C.SKIN, C.SKIN_M, C.SKIN_L, C.PARCHMENT], spec: C.WHITE, shine: 0.9, outline: C.SOOT },
  ceramicRed: { ramp: [C.GORE, C.BLOOD, C.RED, C.FIRE], spec: C.WHITE, shine: 0.9, outline: C.BLACK },
  ceramicBlue: { ramp: [C.NAVY, C.BLUE_D, C.BLUE, C.SKY], spec: C.WHITE, shine: 0.9, outline: C.BLACK },
  beard: { ramp: [C.FOG, C.SILVER, C.BONE, C.WHITE], spec: C.WHITE, shine: 0.7, outline: C.ASH },
  rubber: { ramp: [C.BLACK, C.SOOT, C.NIGHT, C.SHADOW], outline: C.BLACK },
  // Matte versions for flat polygons: a glossy flat face would turn into one
  // big highlight, because every pixel has the same normal.
  tin: { ramp: [C.STEEL_D, C.STEEL, C.STEEL_M, C.STEEL_L], outline: C.BLACK },
  sign: { ramp: [C.GORE, C.BLOOD, C.RED, C.FIRE], outline: C.BLACK },
  bag: { ramp: [C.BLACK, C.SOOT, C.SHADOW, C.DUSK], spec: C.STEEL_M, shine: 0.8, outline: C.BLACK },
};

// Turns the M object into an indexed list for Painter.shade.
export function mats(...names) {
  const list = names.map((n) => (typeof n === 'string' ? M[n] : n));
  const id = Object.fromEntries(names.map((n, i) => [typeof n === 'string' ? n : `m${i}`, i]));
  return { list, id };
}

export function frames(n, fn) {
  return Array.from({ length: n }, (_, i) => fn(i, n));
}

// Flame painted as a heat field into material ids matIds[0..4] (dark to hot).
// t is the animation phase; flames are flat, glowing materials (fireMats).
export function flame(p, cx, baseY, width, height, t, matIds) {
  // Flame intensity field: tapering teardrop plus moving noise.
  for (let y = Math.floor(baseY - height); y <= baseY; y++) {
    for (let x = Math.floor(cx - width); x <= Math.ceil(cx + width); x++) {
      const v = (baseY - y) / height;                // 0 at base, 1 at tip
      const half = width * Math.pow(1 - v, 0.6) * (0.75 + 0.25 * Math.sin(v * 7 + t * 2.1));
      const dx = Math.abs(x + 0.5 - cx - Math.sin(v * 4 + t * 1.7) * v * width * 0.35);
      if (dx > half) continue;
      const n = Math.sin(x * 1.3 + t * 3.1) * Math.cos(y * 0.9 - t * 4.3) * 0.18;
      const heat = (1 - dx / half) * (1 - v * 0.8) + n;
      if (heat < 0.08) continue;
      const k = heat > 0.75 ? 4 : heat > 0.55 ? 3 : heat > 0.35 ? 2 : heat > 0.18 ? 1 : 0;
      p.write(x, y, 30 + heat * 5, 0, 0, 1, matIds[k]);
    }
  }
}

// Fire colors, dark to bright, and the cold "sponsored" flame they recolor to.
export const FIRE_COLORS = [C.BLOOD, C.RED, C.FIRE, C.AMBER, C.YELLOW];
export const COLD_COLORS = [C.NAVY, C.BLUE_D, C.BLUE, C.SKY, C.ICE];
export const fireMats = () => FIRE_COLORS.map((c) => ({ ramp: [c], flat: true, glow: true }));
