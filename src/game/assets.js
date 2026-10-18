// Game content registry: textures and object sprites.
// Textures live in textures.js (64 x 64, procedural), object sprites in
// objects.js (painted, 64 px per wall height).

import { animation, recolor, rampMap } from '../engine/sprite.js';
import { FIRE_COLORS, COLD_COLORS } from './materials.js';
import { paintBrazier, paintWallTorch, paintChest, paintBarrel, paintBones } from './objects.js';
import { LIGHT_PRESETS } from './lights.js';

export { buildTextures, WALL, FLAT, TEX } from './textures.js';

const brazier = animation(paintBrazier(), { frameMs: 110 });
const torch = animation(paintWallTorch(), { frameMs: 100 });
// Recolor variant: same fire, cold blue "sponsored" flame.
const coldMap = rampMap(FIRE_COLORS, COLD_COLORS);

// Chest: closed, then lid up with glowing loot, then empty once the System
// has whisked the loot into your inventory. Plays once from `openedAt`.
const chest = { closed: paintChest('closed'), ajar: paintChest('ajar'), full: paintChest('full'), empty: paintChest('empty') };
const chestOpen = animation(
  [chest.closed, chest.ajar, chest.full, chest.full, chest.full, chest.full, chest.empty],
  { frameMs: 110, mode: 'once' },
);

// Every object type has an animation (single-frame ones just never change).
//   solid: blocks movement. light: preset from lights.js the object emits.
//   wall: hangs on a wall (decoration, placed with a lift, not interactive).
//   open: animation played once when the object is opened (flags.openedAt).
export const SPRITES = {
  chest: { anim: animation(chest.closed), open: chestOpen, solid: true },
  barrel: { anim: animation(paintBarrel()), solid: true },
  brazier: { anim: brazier, solid: true, light: LIGHT_PRESETS.brazier },
  coldBrazier: { anim: recolor(brazier, coldMap, 'cold'), solid: true, light: LIGHT_PRESETS.coldBrazier },
  bones: { anim: animation(paintBones()), solid: false },
  torch: { anim: torch, wall: true, light: LIGHT_PRESETS.torch },
  coldTorch: { anim: recolor(torch, coldMap, 'cold'), wall: true, light: LIGHT_PRESETS.coldTorch },
};
