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
import { paintSlimeFront, paintSlimeSide } from './bestiary/classics.js';
import { paintGoblinFront, paintGoblinSide } from './bestiary/goblins.js';
import {
  paintRoboVacFront, paintRoboVacSide, paintLlamaFront, paintLlamaSide, paintCartFront, paintCartSide,
  paintRaccoonFront, paintRaccoonSide, paintGnomeFront, paintGnomeSide,
} from './bestiary/modern.js';

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
// Squashed flat from the bottom (a slime's last puddle).
function squash(s, k) {
  const h = Math.max(1, Math.round(s.h * k));
  const data = new Uint8Array(s.w * h);
  for (let y = 0; y < h; y++) data.set(s.data.subarray(Math.floor(y / k) * s.w, Math.floor(y / k) * s.w + s.w), y * s.w);
  return { ...s, h, data, name: `${s.name}_squash` };
}

// Fallen over sideways: rotated a quarter turn (feet to the right), cropped
// to what is painted, resting on the floor.
function lieDown(s) {
  const w = s.h, h = s.w;
  const data = new Uint8Array(w * h).fill(TRANSPARENT);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) data[x * w + (s.h - 1 - y)] = s.data[y * s.w + x];
  const rows = [];
  for (let y = 0; y < h; y++) if (data.subarray(y * w, y * w + w).some((c) => c !== TRANSPARENT)) rows.push(y);
  const y0 = rows[0], y1 = rows[rows.length - 1];
  return { ...s, w, h: y1 - y0 + 2, data: Uint8Array.from([...new Array(w).fill(TRANSPARENT), ...data.subarray(y0 * w, (y1 + 1) * w)]), name: `${s.name}_lying` };
}

// Painted at scale k but shown that much bigger in the world (minibosses,
// leaders): the painter would otherwise keep the wall height the same.
const big = (paint, k, kit) => (pose) => ({ ...paint(pose, k, kit), unit: 64 });

// opts.dead: recolor map for the corpse (glowing eyes go out).
// opts.corpse: 'flip' (on its back, default) or 'squash' (a puddle).
// opts.disguise: a still image it shows while pretending to be furniture.
function creature(paint, paintFront, frameMs, opts = {}) {
  const idle = [paint('idle0'), paint('idle1')];
  const L = { idle: animation(idle, { frameMs }), lunge: paint('lunge'), flinch: paint('flinch') };
  const R = { idle: mirror(L.idle), lunge: mirror(L.lunge), flinch: mirror(L.flinch) };
  const F = { idle: animation([paintFront('idle0'), paintFront('idle1')], { frameMs }), lunge: paintFront('lunge'), flinch: paintFront('flinch') };
  const body = opts.corpse === 'squash' ? squash(paint('flinch'), 0.5)
    : opts.corpse === 'lie' ? lieDown(paint('flinch')) : trimBottom(flip(idle[0]));
  const corpse = recolor(body, opts.dead || {}, 'dead');
  return { L, R, F, corpse, disguise: opts.disguise || null };
}
const GOBLIN_DEAD = { [C.YELLOW]: C.SOOT, [C.AMBER]: C.MOSS_D, [C.LILAC]: C.SOOT, [C.VIOLET_M]: C.MOSS_D };
const goblin = (kit, ms) => creature((pose) => paintGoblinSide(kit, pose), (pose) => paintGoblinFront(kit, pose), ms, { dead: GOBLIN_DEAD, corpse: 'lie' });
const EYES_OUT = { [C.YELLOW]: C.SOOT, [C.AMBER]: C.SOOT };
const RAT_DEAD = { [C.RED]: C.SOOT, [C.FIRE]: C.GORE };
const SLIME_DEAD = { [C.SKY]: C.NIGHT, [C.ICE]: C.STEEL_D }; // the phone finally dies too
export const CREATURES = {
  rat: creature(paintRat, paintRatFront, 260, { dead: RAT_DEAD }),
  ratAlpha: creature(big(paintRat, 1.25, 'alpha'), big(paintRatFront, 1.25, 'alpha'), 300, { dead: RAT_DEAD }),
  slime: creature(paintSlimeSide, paintSlimeFront, 180, { dead: SLIME_DEAD, corpse: 'squash' }),
  goblinGrunt: goblin('grunt', 380),
  goblinSapper: goblin('sapper', 300),
  goblinShaman: goblin('shaman', 420),
  goblinBoss: goblin('boss', 450),
  roboVac: creature(paintRoboVacSide, paintRoboVacFront, 120, { dead: { [C.SKY]: C.STEEL_D, [C.RED]: C.STEEL_D, [C.AMBER]: C.STEEL_D } }),
  raccoon: creature(paintRaccoonSide, paintRaccoonFront, 360, { dead: EYES_OUT, corpse: 'lie' }),
  gnome: creature(paintGnomeSide, paintGnomeFront, 480, { corpse: 'lie' }),
  gnomeCaptain: creature(big(paintGnomeSide, 1.2, 'captain'), big(paintGnomeFront, 1.2, 'captain'), 520, { corpse: 'lie' }),
  cartMimic: creature(paintCartSide, paintCartFront, 400, { dead: EYES_OUT, disguise: paintCartSide('disguise') }),
  badLlama: creature(paintLlamaSide, paintLlamaFront, 520, { corpse: 'lie' }),
  slimeXL: creature(big(paintSlimeSide, 1.35, 'xl'), big(paintSlimeFront, 1.35, 'xl'), 220, { dead: SLIME_DEAD, corpse: 'squash' }),
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
  torch: { anim: torch, wall: true, light: LIGHT_PRESETS.torch },
  coldTorch: { anim: recolor(torch, coldMap, 'cold'), wall: true, light: LIGHT_PRESETS.coldTorch },
};
// Every creature leaves a corpse: '<sprite>Corpse'.
for (const [k, c] of Object.entries(CREATURES)) SPRITES[`${k}Corpse`] = { anim: animation(c.corpse), solid: false };
