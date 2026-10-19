// Example sprites for the high-detail prototype, from easy to "at my limit".
// Two techniques:
//   hand  - ASCII rasters written character by character (defineSprite)
//   paint - built from 3D-ish primitives with the Painter and lit/shaded
// All sprites use 64 px per world unit (64 px = one wall high).

import { C } from '../engine/palette.js';
import { defineSprite, animation, recolor, rampMap } from '../engine/sprite.js';
import { Painter } from '../engine/paint.js';
import { M, mats, frames, FIRE_COLORS, COLD_COLORS } from '../game/materials.js';
import { paintBrazier, paintWallTorch } from '../game/objects.js';
import { paintRat } from '../game/creatures.js';
import { BOX_ART, paintLootBox } from '../game/lootbox-art.js';

const UNIT = 64;
const hd = (s) => ({ ...s, unit: UNIT });
const lo = (s) => ({ ...s, unit: UNIT / 2 });

// Resolution of the painted sprites: 1 = 64 px per wall height, 0.5 = 32 px.
let S = 1;

// ------------------------------------------------------------ hand drawn

const potion = hd(defineSprite({
  name: 'potion',
  key: {
    k: C.BLACK, l: C.WOOD_L, w: C.WOOD, d: C.WOOD_D,
    s: C.STEEL, S: C.STEEL_L, h: C.STEEL_D, W: C.WHITE,
    r: C.RED, R: C.BLOOD, j: C.BLOOD_D, f: C.FIRE,
  },
  rows: [
    '......kkkkkk......',
    '.....kllllwdk.....',
    '.....klwwwddk.....',
    '.....kkkkkkkk.....',
    '......kShhsk......',
    '......kShhsk......',
    '.....kkShhskk.....',
    '....kkShhhhskk....',
    '...kShhhhhhhhsk...',
    '..kSWhhhhhhhhhsk..',
    '..kSWhhhhhhhhhsk..',
    '.kSWfffffffffffRk.',
    '.kSrrrrrrrrrrrrRk.',
    '.kSWrrrrrrrrrrRRk.',
    '.kSWrrrrrrrrrrRjk.',
    '.ksrrrrrrrrrrRRjk.',
    '.ksrrrrrrrrrRRRjk.',
    '..ksRrrrrrrrRRjk..',
    '..kjRRrrrrrRRjjk..',
    '...kjRRRRRRRjjk...',
    '....kkjjjjjjkk....',
    '......kkkkkk......',
  ],
}));

const sword = hd(defineSprite({
  name: 'sword',
  key: {
    k: C.BLACK, G: C.YELLOW, g: C.GOLD, a: C.RUST, e: C.LEATHER, E: C.WOOD,
    1: C.STEEL_D, 2: C.STEEL, 3: C.STEEL_M, 4: C.STEEL_L, W: C.WHITE,
    t: C.GRAVEL_D, V: C.GRAVEL, Q: C.GRAVEL_M,
  },
  rows: [
    '.....kkk.....',
    '....kGgak....',
    '....kggak....',
    '.....kak.....',
    '.....kek.....',
    '.....kEk.....',
    '.....kek.....',
    '.....kEk.....',
    '.....kek.....',
    '.kkkkkkkkkkk.',
    'kGggggggggaak',
    'kaaaaaaaaaaak',
    '.kkk43231kkk.',
    '...k43231k...',
    '...k43231k...',
    '...k43231k...',
    '...kW3231k...',
    '...k43231k...',
    '...k43231k...',
    '...k43231k...',
    '...k43231k...',
    '...k43221k...',
    '...k43231k...',
    '...k43231k...',
    '...k43231k...',
    '...k43231k...',
    '...kW3231k...',
    '...k43231k...',
    '...k43231k...',
    '...k43211k...',
    '...k43231k...',
    '...k43231k...',
    '...k43231k...',
    '...k43231k...',
    '..tk43231kt..',
    '.tVVk323kVVt.',
    'tVQVVVVVQVVVt',
    'ttVVQVVVVVVtt',
  ],
}));

// The same two items drawn by hand at half resolution (32 px per wall).
const potionSmall = lo(defineSprite({
  name: 'potion_small',
  key: { k: C.BLACK, d: C.WOOD, S: C.STEEL_L, s: C.STEEL, h: C.STEEL_D, W: C.WHITE, f: C.FIRE, r: C.RED, R: C.BLOOD, j: C.BLOOD_D },
  rows: [
    '...kkk...',
    '...kdk...',
    '...kSk...',
    '..kShsk..',
    '.kSWhhsk.',
    'kSfffffRk',
    'kSrrrrrRk',
    'ksrrrrRjk',
    'kjRrrRRjk',
    '.kjRRRjk.',
    '..kkkkk..',
  ],
}));

const swordSmall = lo(defineSprite({
  name: 'sword_small',
  key: {
    k: C.BLACK, G: C.YELLOW, g: C.GOLD, a: C.RUST, e: C.LEATHER,
    2: C.STEEL, 3: C.STEEL_M, 4: C.STEEL_L, W: C.WHITE, t: C.GRAVEL_D, V: C.GRAVEL, Q: C.GRAVEL_M,
  },
  rows: [
    '..kkk..',
    '..kGk..',
    '..kek..',
    '..kek..',
    'kkkkkkk',
    'kGgggak',
    '.k432k.',
    '.k432k.',
    '.kW32k.',
    '.k432k.',
    '.k432k.',
    '.k432k.',
    '.k422k.',
    '.k432k.',
    '.k432k.',
    '.k432k.',
    '.tk3kt.',
    'tVVVVVt',
    'ttVQVtt',
  ],
}));

// ------------------------------------------------------------ coins

function coinPile() {
  const { list, id } = mats('coin', 'ruby', 'emerald');
  const p = new Painter(44, 24, { seed: 7, scale: S });
  let s = 11;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // Mound: coins further down sit further forward; each new coin lies on
  // top of the ones behind it, so the selective outline separates them.
  const coins = [];
  for (let k = 0; k < 60; k++) {
    const x = 4 + r() * 36;
    const top = 23 - 16 * Math.max(0, 1 - ((x - 22) / 19) ** 2);
    coins.push([x, top + r() * (23 - top)]);
  }
  coins.sort((a, b) => a[1] - b[1]);
  coins.forEach(([x, y], k) => p.ellipse(x, y, 3.3, 1.7, id.coin, { z: k * 0.8, depth: 1.4 }));
  // A few coins standing on edge.
  p.ellipse(15, 11, 1.4, 3.2, id.coin, { z: 60 });
  p.ellipse(29, 13, 1.4, 3.2, id.coin, { z: 60 });
  p.ellipse(22, 9, 3.2, 2.4, id.ruby, { z: 62, depth: 0.8 });
  p.ellipse(33, 17, 2.4, 2, id.emerald, { z: 62, depth: 0.8 });
  return p.shade(list, { name: 'coins', dither: 0.3 });
}

// ------------------------------------------------------------ slime

function slime() {
  const { list, id } = mats('slime');
  return frames(4, (f, n) => {
    const t = Math.sin((f / n) * Math.PI * 2);
    const p = new Painter(44, 36, { seed: 3, scale: S });
    const rx = 18 + t * 1.6, ry = 13 - t * 1.4;
    const cy = 35 - ry;
    p.ellipse(22, cy, rx, ry, id.slime, { depth: 0.9 });
    // Bottom flattened puddle.
    p.ellipse(22, 33.5, rx + 2, 2.5, id.slime, { z: -2, depth: 0.4 });
    // Bubbles inside, seen through the jelly.
    const bub = [[14, cy + 4, 2.2], [27, cy + 6, 1.6], [20, cy + 8, 1.2], [30, cy - 1, 1.1]];
    for (const [bx, by, br] of bub) {
      p.decal(bx - br, by - br, bx + br, by + br, (x, y) => {
        const d = Math.hypot(x + 0.5 - bx, y + 0.5 - by - f * 0.4);
        return d < br ? (d > br - 0.9 ? C.TEAL : C.TEAL_D) : -1;
      });
    }
    // Eyes
    for (const ex of [16, 27]) {
      const ey = cy - ry * 0.35;
      p.decal(ex - 3, ey - 3, ex + 3, ey + 3, (x, y) => {
        const d = Math.hypot((x + 0.5 - ex) / 2.6, (y + 0.5 - ey) / 3);
        if (d > 1) return -1;
        const pd = Math.hypot(x + 0.5 - ex - 0.6, y + 0.5 - ey - 0.8);
        return pd < 1.3 ? C.BLACK : C.WHITE;
      });
    }
    return p.shade(list, { name: `slime_${f}` });
  });
}

// ------------------------------------------------------------ rat
// The giant rat now lives in the game (src/game/creatures.js).

// ------------------------------------------------------------ spider

function spider() {
  const { list, id } = mats('chitin', 'cloth');
  return frames(2, (f) => {
    const p = new Painter(60, 34, { seed: 9, scale: S });
    const cx = 30;
    // Legs: four per side, knee up, foot down. Back legs first (further away).
    for (let i = 3; i >= 0; i--) {
      for (const side of [-1, 1]) {
        const lift = (f + i) % 2 ? 1.5 : 0;
        const hipX = cx + side * (4 + i), hipY = 19 + i * 0.5;
        const kneeX = cx + side * (12 + i * 4.5), kneeY = 5 + i * 2.5 - lift;
        const footX = cx + side * (15 + i * 4.2), footY = 33;
        const z = 8 - i * 2;
        p.capsule(hipX, hipY, 1.9, kneeX, kneeY, 1.4, id.chitin, { z0: z, z1: z - 1 });
        p.capsule(kneeX, kneeY, 1.4, footX, footY, 0.8, id.chitin, { z0: z - 1, z1: z - 2 });
      }
    }
    p.ellipse(cx, 12, 13, 10, id.chitin, { z: 0, depth: 0.9 });   // abdomen (behind)
    p.ellipse(cx, 21, 8, 6, id.chitin, { z: 10, depth: 0.8 });    // head/thorax
    p.capsule(cx - 2.5, 25, 1.6, cx - 2, 30, 0.8, id.chitin, { z0: 14 }); // fangs
    p.capsule(cx + 2.5, 25, 1.6, cx + 2, 30, 0.8, id.chitin, { z0: 14 });
    // Hourglass mark on the abdomen.
    p.decal(cx - 4, 4, cx + 4, 13, (x, y) => (Math.abs(x + 0.5 - cx) < Math.abs(y + 0.5 - 8.5) * 0.7 + 0.6 ? C.RED : -1));
    // Eight eyes.
    for (const [ex, ey, big] of [[-3, 19, 1], [3, 19, 1], [-1.5, 18, 0], [1.5, 18, 0], [-5, 20, 0], [5, 20, 0], [-2, 21.5, 0], [2, 21.5, 0]]) {
      p.dot(cx + ex - 0.5, ey, big ? C.RED : C.BLOOD);
      if (big) p.dot(cx + ex + 0.5, ey, C.FIRE);
    }
    return p.shade(list, { name: `spider_${f}`, glowColors: [C.FIRE, C.BLOOD] });
  });
}

// ------------------------------------------------------------ skeleton

function skeleton() {
  const { list, id } = mats('bone', 'rust', 'wood', 'iron');
  return frames(2, (f) => {
    const p = new Painter(48, 62, { seed: 13, scale: S });
    const cx = 22;
    const tilt = f ? 0.8 : 0;
    // Legs
    for (const s of [-1, 1]) {
      p.capsule(cx + s * 4, 40, 1.9, cx + s * 5, 50, 1.5, id.bone, { z0: 4 });
      p.capsule(cx + s * 5, 50, 1.6, cx + s * 5, 59, 1.2, id.bone, { z0: 4 });
      p.ellipse(cx + s * 5, 51, 2, 1.6, id.bone, { z: 6 });                 // knee
      p.capsule(cx + s * 5, 60, 1.3, cx + s * 7.5, 60.5, 1, id.bone, { z0: 6 }); // foot
    }
    // Pelvis with a hole.
    p.ellipse(cx, 38, 8, 4, id.bone, { z: 6, depth: 0.5 });
    // Spine
    for (let k = 0; k < 8; k++) p.ellipse(cx, 17 + k * 2.6, 1.7, 1.3, id.bone, { z: 3 });
    // Ribs: curved pairs, getting shorter toward the bottom.
    for (let k = 0; k < 5; k++) {
      const y = 20 + k * 3.2, len = 8 - k * 0.7;
      for (const s of [-1, 1]) {
        p.capsule(cx, y, 1, cx + s * len * 0.7, y - 0.5, 1, id.bone, { z0: 8, z1: 7 });
        p.capsule(cx + s * len * 0.7, y - 0.5, 1, cx + s * len, y + 3, 0.8, id.bone, { z0: 7, z1: 5 });
      }
    }
    p.capsule(cx, 19, 1.2, cx, 31, 1, id.bone, { z0: 9 });                // sternum
    p.capsule(cx - 9, 17, 1.2, cx + 9, 17, 1.2, id.bone, { z0: 7 });      // collarbones
    // Right arm (viewer's right) holds a rusty sword pointing down.
    p.capsule(cx + 9, 18, 1.8, cx + 12, 29, 1.4, id.bone, { z0: 7 });
    p.capsule(cx + 12, 29, 1.4, cx + 13, 38, 1.1, id.bone, { z0: 9, z1: 11 });
    p.poly([[cx + 12, 40], [cx + 15, 40], [cx + 15.5, 58], [cx + 13.5, 61], [cx + 11.5, 58]], id.rust, { z: 12, normal: [0.3, -0.2, 1] });
    p.capsule(cx + 9.5, 39.5, 1, cx + 17.5, 39.5, 1, id.iron, { z0: 13 });  // crossguard
    p.capsule(cx + 13.5, 35, 1.2, cx + 13.5, 39, 1.2, id.wood, { z0: 13 }); // grip
    p.ellipse(cx + 13.5, 38, 2, 1.8, id.bone, { z: 14 });                  // fist
    // Left arm with a round shield.
    p.capsule(cx - 9, 18, 1.8, cx - 12, 29, 1.4, id.bone, { z0: 7 });
    p.ellipse(cx - 13, 33, 8, 9, id.wood, { z: 12, depth: 0.25 });
    p.decal(cx - 22, 23, cx - 4, 43, (x, y) => {
      const d = Math.hypot((x + 0.5 - (cx - 13)) / 8, (y + 0.5 - 33) / 9);
      return d > 0.82 && d <= 1 ? (y < 33 ? C.STEEL_M : C.STEEL) : Math.abs(x + 0.5 - (cx - 13)) < 0.8 && d < 0.8 ? C.WOOD_D : -1;
    });
    p.ellipse(cx - 13, 33, 2, 2, id.iron, { z: 15 });                       // boss
    // Skull and jaw.
    p.ellipse(cx + tilt, 8, 6.5, 7, id.bone, { z: 9, depth: 0.9 });
    p.capsule(cx - 3 + tilt, 14.5 + tilt * 0.5, 2, cx + 3 + tilt, 14.5 + tilt * 0.5, 2, id.bone, { z0: 11 });
    // Eye sockets with cold glowing points, nose hole, teeth.
    for (const s of [-1, 1]) {
      const ex = cx + s * 2.6 + tilt;
      p.decal(ex - 2, 5, ex + 2, 10, (x, y) => (Math.hypot((x + 0.5 - ex) / 1.9, (y + 0.5 - 7.6) / 2.2) < 1 ? C.SOOT : -1));
      p.dot(ex, 7.6, C.ICE);
    }
    p.dot(cx + tilt, 11, C.SOOT).dot(cx + tilt - 1, 11, C.SOOT);
    for (let k = -2; k <= 2; k++) p.dot(cx + k + tilt, 13 + tilt * 0.5, k % 2 ? C.PARCHMENT : C.GRAVEL_D);
    return p.shade(list, { name: `skeleton_${f}`, glowColors: [C.ICE] });
  });
}

// ------------------------------------------------------------ goblin

function goblin() {
  const { list, id } = mats('gob', 'leather', 'cloth', 'steel', 'wood');
  return frames(3, (f) => {
    const p = new Painter(48, 56, { seed: 17, scale: S });
    const cx = 24, breathe = [0, 0.7, 0.3][f], stab = [0, -1, -2.5][f];
    // Legs and big feet.
    for (const s of [-1, 1]) {
      p.capsule(cx + s * 4, 38, 2.4, cx + s * 6, 46, 2, id.gob, { z0: 5 });
      p.capsule(cx + s * 6, 46, 2, cx + s * 6, 52, 1.8, id.gob, { z0: 5 });
      p.ellipse(cx + s * 7.5, 53.5, 4.5, 2.2, id.gob, { z: 7, depth: 0.7 });
    }
    // Loincloth and belt.
    p.poly([[cx - 8, 37], [cx + 8, 37], [cx + 6, 47], [cx + 1, 44], [cx - 3, 48], [cx - 7, 45]], id.cloth, { z: 11, normal: [0, -0.2, 1] });
    // Torso with leather vest, belly peeking out.
    p.ellipse(cx, 31 - breathe * 0.3, 9.5, 10 + breathe * 0.4, id.gob, { z: 6, depth: 0.8 });
    p.ellipse(cx - 4.5, 29, 5.5, 8, id.leather, { z: 8, depth: 0.6 });
    p.ellipse(cx + 4.5, 29, 5.5, 8, id.leather, { z: 8, depth: 0.6 });
    p.capsule(cx - 9, 37, 1.6, cx + 9, 37, 1.6, id.leather, { z0: 13 });
    p.ellipse(cx, 37, 1.8, 1.6, id.steel, { z: 15 });                    // buckle
    // Arms: left hangs, right holds a dagger forward.
    p.capsule(cx - 9, 24, 2.2, cx - 13, 33, 1.8, id.gob, { z0: 9 });
    p.capsule(cx - 13, 33, 1.8, cx - 12, 41, 1.6, id.gob, { z0: 9, z1: 10 });
    p.ellipse(cx - 12, 42, 2.4, 2.2, id.gob, { z: 11 });
    p.capsule(cx + 9, 24, 2.2, cx + 14, 31, 1.8, id.gob, { z0: 9 });
    p.capsule(cx + 14, 31, 1.8, cx + 15, 37 + stab, 1.6, id.gob, { z0: 11, z1: 14 });
    p.poly([[cx + 14, 36 + stab], [cx + 17, 36 + stab], [cx + 19.5, 26 + stab], [cx + 18.5, 22 + stab], [cx + 16.5, 26 + stab]], id.steel, { z: 17, normal: [0.5, -0.3, 1] });
    p.capsule(cx + 13, 37 + stab, 0.9, cx + 18.5, 36.5 + stab, 0.9, id.wood, { z0: 18 });
    p.ellipse(cx + 15, 38 + stab, 2.4, 2.2, id.gob, { z: 19 });
    // Head: big, with long ears.
    const hy = 14 + breathe * 0.4;
    p.capsule(cx - 7, hy - 1, 3, cx - 20, hy - 7, 0.6, id.gob, { z0: 8, z1: 6 });
    p.capsule(cx + 7, hy - 1, 3, cx + 20, hy - 7, 0.6, id.gob, { z0: 8, z1: 6 });
    p.ellipse(cx, hy, 9, 8.5, id.gob, { z: 10, depth: 0.85 });
    p.ellipse(cx, hy + 3, 7.5, 4.5, id.gob, { z: 13, depth: 0.5 });     // jaw
    p.ellipse(cx, hy + 1.5, 2.6, 3.2, id.gob, { z: 19, depth: 0.8 });   // nose
    // Inner ears
    for (const s of [-1, 1]) {
      p.decal(cx + s * 8 - 6, hy - 8, cx + s * 8 + 6, hy, (x, y) => {
        const t = (x + 0.5 - (cx + s * 7)) / (s * 13);
        if (t < 0.15 || t > 0.85) return -1;
        const ly = hy - 1 - t * 6;
        return Math.abs(y + 0.5 - ly) < 1.2 * (1 - t) ? C.WINE : -1;
      });
    }
    // Eyes, brows, grin.
    for (const s of [-1, 1]) {
      const ex = cx + s * 4;
      p.dot(ex - 1, hy - 2, C.YELLOW).dot(ex, hy - 2, C.YELLOW).dot(ex + 1, hy - 2, C.AMBER);
      p.dot(ex, hy - 1, C.AMBER).dot(ex + s * 0.0, hy - 2, C.BLACK);
      p.dot(ex - 2, hy - 4 + (s > 0 ? 0 : 0), C.MOSS_D).dot(ex - 1, hy - 4, C.MOSS_D).dot(ex, hy - 3.6, C.MOSS_D).dot(ex + 1, hy - 3.2, C.MOSS_D);
    }
    for (let x = -5; x <= 5; x++) {
      const y = hy + 5 + Math.round((x * x) / 14);
      p.dot(cx + x, y, C.SOOT);
      if (x % 2 === 0 && Math.abs(x) < 5) p.dot(cx + x, y - 1, C.BONE);
    }
    return p.shade(list, { name: `goblin_${f}`, glowColors: [C.YELLOW, C.AMBER] });
  });
}

// ------------------------------------------------------------ loot boxes

// The painter lives in the game now (src/game/lootbox-art.js).
const TIERS = Object.keys(BOX_ART);
const lootBox = (tier, f) => paintLootBox(tier, f, { scale: S });

// ------------------------------------------------------------ portrait

// The hardest case: a human face, front view. Invented sponsor rep, not a
// character from the books.
function portrait() {
  const skin = { ramp: [C.SKIN_D, C.SKIN, C.SKIN_M, C.SKIN_L], outline: C.WOOD_D };
  const hair = { ramp: [C.PLUM_D, C.PLUM, C.VIOLET, C.VIOLET_M], spec: C.LILAC, shine: 0.5, outline: C.BLACK };
  const suit = { ramp: [C.BLACK, C.NIGHT, C.SHADOW, C.DUSK], outline: C.BLACK };
  const shirt = { ramp: [C.GRAVEL_L, C.PARCHMENT, C.BONE, C.WHITE], outline: C.GRAVEL };
  const p = new Painter(40, 50, { seed: 31, scale: S });
  // Shoulders and suit
  p.ellipse(20, 51, 20, 11, 2, { z: 0, depth: 0.5 });
  p.poly([[16, 40], [24, 40], [20, 49]], 3, { z: 8, normal: [0, -0.2, 1] });
  p.poly([[16, 40], [20, 46], [18, 50], [11, 42]], 2, { z: 9, normal: [-0.6, -0.2, 1] });
  p.poly([[24, 40], [29, 42], [22, 50], [20, 46]], 2, { z: 9, normal: [0.6, -0.2, 1] });
  // Neck
  p.capsule(20, 31, 3.8, 20, 40, 4.4, 0, { z0: 4 });
  // Hair: a bob that frames the face down to the chin.
  p.ellipse(20, 22, 13.5, 16.5, 1, { z: 0, depth: 0.6 });
  // Face
  p.ellipse(20, 21.5, 9.2, 11.5, 0, { z: 8, depth: 0.85 });
  p.ellipse(20, 24, 1.5, 3, 0, { z: 17, depth: 0.7 }); // nose
  // Side locks in front of the ears, and the fringe.
  p.ellipse(10.8, 24, 3.4, 10, 1, { z: 13, depth: 0.5 });
  p.ellipse(29.2, 24, 3.4, 10, 1, { z: 13, depth: 0.5 });
  p.poly([[9, 17], [11, 9], [20, 6], [29, 9], [31, 17], [28, 14], [24, 15], [20, 13], [15, 15], [12, 14]], 1, { z: 19, normal: [-0.2, -0.3, 1] });
  // Eyes: white, iris, pupil, lid line, brows
  for (const s of [-1, 1]) {
    const ex = 20 + s * 4.2, ey = 20.5;
    p.decal(ex - 3, ey - 2, ex + 3, ey + 2, (x, y) => {
      const d = Math.hypot((x + 0.5 - ex) / 2.4, (y + 0.5 - ey) / 1.3);
      if (d > 1) return -1;
      const di = Math.hypot(x + 0.5 - ex, y + 0.5 - ey);
      return di < 0.9 ? C.BLACK : di < 1.6 ? C.TEAL_M : C.WHITE;
    });
    for (let x = -2; x <= 2; x++) p.dot(ex + x, ey - 2, C.SOOT);
    for (let x = -2; x <= 2; x++) p.dot(ex + x, ey - 4 + (x * s > 0 ? 0 : 0), C.PLUM_D);
  }
  // Nostrils, mouth, cheeks
  p.dot(19, 26, C.SKIN_D).dot(21, 26, C.SKIN_D);
  for (let x = -2; x <= 2; x++) p.dot(20 + x, 29, C.WINE);
  for (let x = -1; x <= 1; x++) p.dot(20 + x, 30, C.BLOOD);
  p.dot(18, 31, C.SKIN_D).dot(22, 31, C.SKIN_D);
  // Neon earrings
  p.dot(10, 30, C.NEON).dot(30, 30, C.NEON);
  // Borant pin
  p.dot(13, 45, C.GOLD).dot(14, 45, C.YELLOW);
  return p.shade([skin, hair, suit, shirt], { name: 'portrait', glowColors: [C.NEON], dither: 0.2 });
}

// ------------------------------------------------------------ registry

export function buildSprites(scale = 1) {
  S = scale;
  const small = scale < 1;
  const brazierFrames = paintBrazier(S);
  const fire = animation(brazierFrames, { frameMs: 110 });
  const coldMap = rampMap(FIRE_COLORS, COLD_COLORS);
  const goblinAnim = animation(goblin(), { frameMs: 380, mode: 'pingpong' });
  return {
    potion: animation(small ? potionSmall : potion),
    sword: animation(small ? swordSmall : sword),
    coins: animation(coinPile()),
    slime: animation(slime(), { frameMs: 160 }),
    rat: animation([paintRat('idle0', S), paintRat('idle1', S)], { frameMs: 260 }),
    spider: animation(spider(), { frameMs: 300 }),
    skeleton: animation(skeleton(), { frameMs: 700 }),
    goblin: goblinAnim,
    // Recolor variant: a goblin "shaman" from the same frames.
    goblinShaman: recolor(goblinAnim, rampMap([C.MOSS_D, C.MOSS, C.GREEN, C.LIME, C.GORE, C.BLOOD, C.RED], [C.VIOLET_D, C.VIOLET, C.VIOLET_M, C.LILAC, C.TEAL_D, C.TEAL, C.TEAL_M]), 'shaman'),
    lootboxes: TIERS.map((t) => animation([lootBox(t, 0), lootBox(t, 1), lootBox(t, 2)], { frameMs: 220 })),
    brazier: fire,
    coldBrazier: recolor(fire, coldMap, 'cold'),
    torch: animation(paintWallTorch(S), { frameMs: 100 }),
    coldTorch: recolor(animation(paintWallTorch(S), { frameMs: 100 }), coldMap, 'cold'),
    portrait: portrait(),
  };
}
