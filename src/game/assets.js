// Game content registry: textures and object sprites.
// Textures live in textures.js (64 x 64, procedural), object sprites in
// objects.js (painted, 64 px per wall height).

import { animation, recolor, rampMap, mirror, flip } from '../engine/sprite.js';
import { TRANSPARENT } from '../engine/framebuffer.js';
import { C } from '../engine/palette.js';
import { FIRE_COLORS, COLD_COLORS } from './materials.js';
import { paintBrazier, paintWallTorch, paintChest, paintBarrel, paintBones, paintBag } from './objects.js';
import { LIGHT_PRESETS } from './lights.js';
import { paintRat, paintRatFront } from './creatures.js';

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
// Sponsored chest: the same chest in Borant pink, lit by its own neon glow.
const pinkMap = { [C.WOOD_D]: C.PLUM_D, [C.WOOD]: C.PLUM, [C.WOOD_L]: C.MAGENTA, [C.LEATHER]: C.NEON };

// Creatures: idle cycle, lunge and flinch frames, facing left (L), right (R)
// and the viewer (F, front view), plus the corpse (side view on its back)
// that stays on the floor.
function trimBottom(s) {
  let h = s.h;
  while (h > 1 && s.data.subarray((h - 1) * s.w, h * s.w).every((c) => c === TRANSPARENT)) h--;
  return { ...s, h, data: s.data.slice(0, h * s.w) };
}
function creature(paint, paintFront, frameMs) {
  const idle = [paint('idle0'), paint('idle1')];
  const L = { idle: animation(idle, { frameMs }), lunge: paint('lunge'), flinch: paint('flinch') };
  const R = { idle: mirror(L.idle), lunge: mirror(L.lunge), flinch: mirror(L.flinch) };
  const F = { idle: animation([paintFront('idle0'), paintFront('idle1')], { frameMs }), lunge: paintFront('lunge'), flinch: paintFront('flinch') };
  // The corpse's eye stops glowing.
  const corpse = recolor(trimBottom(flip(idle[0])), { [C.RED]: C.SOOT, [C.FIRE]: C.GORE }, 'dead');
  return { L, R, F, corpse };
}
export const CREATURES = {
  rat: creature(paintRat, paintRatFront, 260),
};

// Every object type has an animation (single-frame ones just never change).
//   solid: blocks movement. light: preset from lights.js the object emits.
//   wall: hangs on a wall (decoration, placed with a lift, not interactive).
//   open: animation played once when the object is opened (flags.openedAt).
export const SPRITES = {
  chest: { anim: animation(chest.closed), open: chestOpen, solid: true, chest: true },
  sponsoredChest: {
    anim: recolor(animation(chest.closed), pinkMap, 'sponsored'), open: recolor(chestOpen, pinkMap, 'sponsored'),
    solid: true, chest: true, light: LIGHT_PRESETS.sponsor,
  },
  barrel: { anim: animation(paintBarrel()), solid: true },
  brazier: { anim: brazier, solid: true, light: LIGHT_PRESETS.brazier },
  coldBrazier: { anim: recolor(brazier, coldMap, 'cold'), solid: true, light: LIGHT_PRESETS.coldBrazier },
  bones: { anim: animation(paintBones()), solid: false },
  bag: { anim: animation(paintBag()), solid: false },
  ratCorpse: { anim: animation(CREATURES.rat.corpse), solid: false },
  torch: { anim: torch, wall: true, light: LIGHT_PRESETS.torch },
  coldTorch: { anim: recolor(torch, coldMap, 'cold'), wall: true, light: LIGHT_PRESETS.coldTorch },
};
