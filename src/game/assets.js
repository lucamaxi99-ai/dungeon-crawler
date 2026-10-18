// All textures and sprites of the game, defined in code.
// Wall textures are referenced by index from the map (1..n).

import { C } from '../engine/palette.js';
import { defineSprite, defineFrames, animation, recolor, rampMap } from '../engine/sprite.js';
import { bricks, rock, overlay, planks, px, get } from '../engine/texgen.js';
import { drawText } from '../engine/font.js';

export const TEX = 32;

const STONE_RAMP = [C.STONE_D, C.STONE, C.STONE_M, C.STONE_L];
const ROCK_RAMP = [C.NIGHT, C.SHADOW, C.DUSK, C.ASH, C.STONE_M];
const MOSS_RAMP = [C.MOSS_D, C.MOSS, C.GREEN, C.LIME];

// Draw helper so the pixel font can write onto textures.
const onTex = (tex) => ({ set: (x, y, c) => px(tex, x, y, c) });

function stairwell() {
  const t = bricks(TEX, 404, { colors: STONE_RAMP, mortar: C.NIGHT });
  // Arch opening
  for (let y = 6; y < TEX; y++) {
    for (let x = 6; x < 26; x++) {
      const ax = x - 15.5, ay = y - 14;
      if (y < 14 && ax * ax + ay * ay > 100) continue;
      px(t, x, y, C.BLACK);
    }
  }
  // Arch rim
  for (let x = 5; x < 27; x++) {
    for (let y = 3; y < TEX; y++) {
      const ax = x - 15.5, ay = y - 14;
      const inArch = y >= 14 ? x >= 6 && x < 26 : ax * ax + ay * ay <= 100;
      const nearArch = y >= 14 ? x === 5 || x === 26 : ax * ax + ay * ay <= 132;
      if (!inArch && nearArch) px(t, x, y, C.STONE_L);
    }
  }
  // Steps going down into the dark
  const steps = [[29, C.STONE_M, 7, 25], [25, C.STONE, 8, 24], [21, C.STONE_D, 9, 23], [18, C.SHADOW, 10, 22]];
  for (const [y, c, x0, x1] of steps) {
    for (let x = x0; x < x1; x++) { px(t, x, y, c); px(t, x, y + 1, C.NIGHT); }
  }
  // Glowing down arrow above the arch
  const arrow = [[14, 0], [15, 0], [16, 0], [17, 0], [15, 1], [16, 1]];
  for (const [x, y] of arrow) px(t, x, y + 1, C.FIRE);
  return t;
}

function borantPoster() {
  const t = bricks(TEX, 77, { colors: STONE_RAMP, mortar: C.STONE_D });
  // Parchment sheet nailed to the wall
  for (let y = 4; y < 28; y++) {
    for (let x = 3; x < 29; x++) {
      const edge = (x + y * 7) % 11 === 0;
      px(t, x, y, edge ? C.LEATHER : C.TAN);
    }
  }
  for (let x = 3; x < 29; x++) { px(t, x, 27, C.LEATHER); }
  drawText(onTex(t), 'BORANT', 5, 6, C.BLOOD);
  for (let x = 5; x < 27; x++) px(t, x, 12, C.BLOOD_D);
  // "fine print"
  for (let line = 0; line < 4; line++) {
    for (let x = 5; x < 27; x++) if ((x * 3 + line * 5) % 7 > 1) px(t, x, 15 + line * 3, C.WOOD);
  }
  px(t, 4, 5, C.STONE_L); px(t, 27, 5, C.STONE_L); // nails
  return t;
}

export function buildTextures() {
  const stone = bricks(TEX, 1, { colors: STONE_RAMP, mortar: C.NIGHT, highlight: C.SILVER });
  const rough = rock(TEX, 2, { colors: ROCK_RAMP });
  const mossy = overlay(bricks(TEX, 3, { colors: STONE_RAMP, mortar: C.MOSS_D }), 33, { colors: MOSS_RAMP, amount: 0.5 });
  const floor = bricks(TEX, 5, { bw: 16, bh: 16, colors: [C.NIGHT, C.SHADOW, C.STONE_D, C.STONE], mortar: C.BLACK });
  const ceiling = planks(TEX, 6, { colors: [C.WOOD_D, C.WOOD, C.WOOD_L], gap: C.NIGHT, plank: 8 });

  // Sprinkle a few old blood stains on the floor. It's that kind of show.
  for (let i = 0; i < 6; i++) {
    const x = (i * 11 + 3) % TEX, y = (i * 7 + 5) % TEX;
    if (get(floor, x, y) !== C.BLACK) px(floor, x, y, C.BLOOD_D);
  }

  return {
    walls: [null, stone, rough, mossy, stairwell(), borantPoster()],
    floor,
    ceiling,
  };
}

// Wall ids used by the map parser.
export const WALL = { STONE: 1, ROCK: 2, MOSSY: 3, STAIRS: 4, POSTER: 5 };

// ---------------------------------------------------------------- sprites

const WOOD_KEY = { k: C.BLACK, d: C.WOOD_D, w: C.WOOD, l: C.WOOD_L, s: C.STONE, S: C.STONE_M, g: C.GOLD, y: C.YELLOW };

const chest = defineSprite({
  name: 'chest',
  key: WOOD_KEY,
  glow: 'y',
  rows: [
    '...kkkkkkkkkkkkkkkk...',
    '..kllllllllllllllllk..',
    '.klwwwwwwwwwwwwwwwwlk.',
    '.kwwwwwwwwwwwwwwwwwwk.',
    'kddddddddddddddddddddk',
    'kssssssssyyyyssssssssk',
    'kSSSSSSSSgkkgSSSSSSSSk',
    'kwwwwwwwwgkkgwwwwwwwwk',
    'klwwwwwwwwggwwwwwwwwlk',
    'kwwwwwwwwwwwwwwwwwwwwk',
    'kwdwwwwwdwwwwwwdwwwwwk',
    'kssssssssssssssssssssk',
    'kwwwwwwwwwwwwwwwwwwwwk',
    'kdwwwwwwwwwwwwwwwwwwdk',
    'kddddddddddddddddddddk',
    '.kkkkkkkkkkkkkkkkkkkk.',
  ],
});

const barrel = defineSprite({
  name: 'barrel',
  key: WOOD_KEY,
  rows: [
    '...kkkkkkkk...',
    '..kdwwllwwdk..',
    '.kssSSSSSSssk.',
    '.kdwwllllwwdk.',
    'kddwwllllwwddk',
    'kdwwwllllwwwdk',
    'kdwwwllllwwwdk',
    'kssSSSSSSSSssk',
    'kdwwwllllwwwdk',
    'kdwwwllllwwwdk',
    'kdwwwllllwwwdk',
    'kssSSSSSSSSssk',
    'kdwwwllllwwwdk',
    'kddwwllllwwddk',
    '.kdwwllllwwdk.',
    '.kssSSSSSSssk.',
    '..kddwwwwddk..',
    '...kkkkkkkk...',
  ],
});

const FIRE_KEY = { k: C.BLACK, s: C.STONE_D, S: C.STONE_M, L: C.STONE_L, r: C.RED, f: C.FIRE, g: C.GOLD, y: C.YELLOW };
const BRAZIER_BASE = [
  'kkkkkkkkkkkk',
  'kLLLLLLLLLLk',
  '.kSSSSSSSSk.',
  '..kssssssk..',
  '....kSsk....',
  '....kSsk....',
  '....kSsk....',
  '....kSsk....',
  '....kSsk....',
  '...kkSskk...',
  '..kSSSsssk..',
  '.kkkkkkkkkk.',
];

const brazierFrames = defineFrames({
  name: 'brazier',
  key: FIRE_KEY,
  glow: 'rfgy',
  frames: [
    [
      '.....y......',
      '.....yy.....',
      '....ygy.....',
      '...yggy..y..',
      '...gffgy.yg.',
      '..yfffggygf.',
      '..gfrrfgffg.',
      '.gfrrrffrrfg',
      '.frrrrrrrrrf',
      '..rrrrrrrr..',
      ...BRAZIER_BASE,
    ],
    [
      '......y.....',
      '......yy....',
      '.y...ygy....',
      '.yg..yggy...',
      '..gy.gffgy..',
      '..gfygfffgy.',
      '..gffrrfgfg.',
      '.gfrrrfrrrfg',
      '.frrrrrrrrrf',
      '..rrrrrrrr..',
      ...BRAZIER_BASE,
    ],
  ],
});
const brazier = animation(brazierFrames, { frameMs: 140 });

// Recolor variant: same brazier, cold blue "sponsored" flame.
const FIRE_RAMP = [C.RED, C.FIRE, C.GOLD, C.YELLOW];
const COLD_RAMP = [C.BLUE_D, C.BLUE, C.SKY, C.ICE];
const coldBrazier = recolor(brazier, rampMap(FIRE_RAMP, COLD_RAMP), 'cold');

const bones = defineSprite({
  name: 'bones',
  key: { k: C.BLACK, b: C.BONE, s: C.SILVER, a: C.ASH },
  rows: [
    '......bb........',
    '..b..bssb...bb..',
    '.bsb.bkkb..bssb.',
    '..bbbbsbbbbbbb..',
    '.bssbbbbsbsbbsb.',
    'bsaasbbsaabbsaab',
    '.aaaaaaaaaaaaaa.',
  ],
});

// Every object type has an animation (single-frame ones just never change).
export const SPRITES = {
  chest: { anim: animation(chest), solid: true },
  barrel: { anim: animation(barrel), solid: true },
  brazier: { anim: brazier, solid: true },
  coldBrazier: { anim: coldBrazier, solid: true },
  bones: { anim: animation(bones), solid: false },
};
