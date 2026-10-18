// The prototype "showroom" floor: five rooms with their own materials and
// light moods, connected by corridors. Built from room rectangles in code.

import { WALL_HD, FLAT_HD } from './textures.js';

// Light colors, index into the lit shade tables (see TINTS in main.js).
export const TINT = { NEUTRAL: 0, TORCH: 1, COLD: 2, SEWER: 3, NEON: 4, RUNE: 5 };
export const TINTS = [
  [1, 1, 1],          // neutral
  [1.2, 0.95, 0.72],  // torch fire
  [0.62, 0.82, 1.25], // cold blue
  [0.8, 1.15, 0.72],  // sewer green
  [1.22, 0.62, 1.15], // neon pink
  [0.85, 0.72, 1.3],  // rune violet
];

const W = 34, H = 22;

const ROOMS = [
  { id: 'hall', name: 'Entrance hall', x: 2, y: 2, w: 9, h: 7, wall: WALL_HD.STONE, floor: FLAT_HD.COBBLE, ceil: FLAT_HD.BEAMS, ambient: 0.13, tint: TINT.TORCH },
  { id: 'sewer', name: 'Sewer', x: 14, y: 2, w: 8, h: 7, wall: WALL_HD.MOSSY, floor: FLAT_HD.WET, ceil: FLAT_HD.VAULT, ambient: 0.14, tint: TINT.SEWER },
  { id: 'cave', name: 'Goblin cave', x: 25, y: 2, w: 7, h: 8, wall: WALL_HD.ROCK, floor: FLAT_HD.GRAVEL, ceil: FLAT_HD.CAVE, ambient: 0.06, tint: TINT.TORCH },
  { id: 'crypt', name: 'Crypt', x: 2, y: 12, w: 9, h: 7, wall: WALL_HD.RUNES, floor: FLAT_HD.VAULT, ceil: FLAT_HD.VAULT, ambient: 0.1, tint: TINT.COLD },
  { id: 'sponsor', name: 'Sponsor lounge', x: 14, y: 12, w: 10, h: 7, wall: WALL_HD.STONE, floor: FLAT_HD.CARPET, ceil: FLAT_HD.STEEL, ambient: 0.26, tint: TINT.NEON },
];

const CORRIDORS = [
  { x: 11, y: 5, w: 3, h: 1 },  // hall -> sewer
  { x: 22, y: 5, w: 3, h: 1 },  // sewer -> cave
  { x: 6, y: 9, w: 1, h: 3 },   // hall -> crypt
  { x: 11, y: 15, w: 3, h: 1 }, // crypt -> sponsor
  { x: 18, y: 9, w: 1, h: 3 },  // sewer -> sponsor
];
const CORRIDOR = { wall: WALL_HD.STONE, floor: FLAT_HD.COBBLE, ceil: FLAT_HD.VAULT, ambient: 0.07, tint: TINT.NEUTRAL };

// Special wall cells.
const FEATURES = [
  [1, 5, WALL_HD.DOOR],
  [28, 1, WALL_HD.STAIRS],
  [16, 19, WALL_HD.NEON], [19, 19, WALL_HD.NEON], [22, 19, WALL_HD.NEON],
  [24, 13, WALL_HD.NEON], [24, 17, WALL_HD.NEON],
  [24, 15, WALL_HD.PORTRAIT],
];

// Light sources: wall torches sit just in front of their wall.
const L = (x, y, radius, intensity, tint, flicker = 0) => ({ x, y, radius, intensity, tint, flicker });
const LIGHTS = [
  L(4.5, 2.15, 5, 0.8, TINT.TORCH, 0.3), L(8.5, 2.15, 5, 0.8, TINT.TORCH, 0.3),
  L(2.15, 7.5, 4, 0.8, TINT.TORCH, 0.3),
  L(12.5, 5.15, 3, 0.6, TINT.TORCH, 0.3),
  L(21.5, 7.5, 4.5, 0.8, TINT.SEWER, 0.08), L(19.5, 3.4, 3, 0.55, TINT.SEWER, 0.15),
  L(14.6, 7.5, 3.5, 0.7, TINT.SEWER, 0.08),
  L(27.5, 7.5, 6.5, 1.35, TINT.TORCH, 0.4),
  L(3.5, 13.5, 4.5, 1.0, TINT.COLD, 0.2), L(9.5, 13.5, 4.5, 1.0, TINT.COLD, 0.2),
  L(6.5, 18.6, 4, 0.6, TINT.RUNE, 0.1), L(10.4, 17.5, 3.5, 0.7, TINT.COLD, 0.15),
  L(16.5, 18.6, 4, 0.75, TINT.NEON), L(19.5, 18.6, 4, 0.75, TINT.NEON), L(22.5, 18.6, 4, 0.75, TINT.NEON),
  L(23.4, 15.5, 2.6, 0.4, TINT.NEUTRAL),
  L(16, 12.4, 3.5, 0.6, TINT.NEUTRAL), L(19.5, 12.4, 3.5, 0.6, TINT.NEUTRAL),
];

// Decorative objects: type -> sprite chosen by main.js.
// Wall-mounted ones carry a lift (world units above the floor).
const DECOR = [
  { type: 'torch', x: 4.5, y: 2.12, lift: 0.42 }, { type: 'torch', x: 8.5, y: 2.12, lift: 0.42 },
  { type: 'torch', x: 2.12, y: 7.5, lift: 0.42 }, { type: 'torch', x: 12.5, y: 5.12, lift: 0.42 },
  { type: 'torch', x: 10.88, y: 17.5, lift: 0.42, anim: 'coldTorch' },
  { type: 'brazier', x: 27.5, y: 7.5, solid: true },
  { type: 'coldBrazier', x: 3.5, y: 13.5, solid: true }, { type: 'coldBrazier', x: 9.5, y: 13.5, solid: true },
];

// Exhibits: sprite id, where it stands, and where the player stands to look
// at it (dir: 0 east, 1 south, 2 west, 3 north).
export const EXHIBIT_SPOTS = {
  potion: { x: 4, y: 3, view: [4, 5, 3] },
  sword: { x: 6, y: 3, view: [6, 5, 3] },
  coins: { x: 8, y: 3, view: [8, 5, 3] },
  slime: { x: 19, y: 3, view: [19, 5, 3] },
  rat: { x: 16, y: 7, view: [16, 5, 1] },
  goblin: { x: 30, y: 4, view: [28, 5, 0] },
  goblinShaman: { x: 30, y: 6 },
  brazier: { decor: true, view: [25, 7, 0] },
  skeleton: { x: 6, y: 13, view: [6, 15, 3] },
  spider: { x: 9, y: 17, view: [7, 17, 0] },
  lootboxes: { x: 15, y: 13, view: [17, 16, 3] },
  portrait: { wall: [24, 15], view: [22, 15, 0] },
};

export function buildLevel() {
  const walls = new Uint8Array(W * H).fill(255);   // 255 = solid, material not yet set
  const floor = new Uint8Array(W * H), ceil = new Uint8Array(W * H);
  const owner = new Array(W * H).fill(null);

  const carve = (r, props) => {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        const i = y * W + x;
        walls[i] = 0; floor[i] = props.floor; ceil[i] = props.ceil; owner[i] = props;
      }
    }
  };
  for (const c of CORRIDORS) carve(c, CORRIDOR);
  for (const r of ROOMS) carve(r, r);

  // Each solid cell takes the wall material of the open space it borders
  // (rooms win over corridors); deep rock stays rough.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (walls[i] !== 255) continue;
      let mat = WALL_HD.ROCK, rank = -1;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const o = owner[ny * W + nx];
        if (!o) continue;
        const rk = o === CORRIDOR ? 0 : 1;
        if (rk > rank) { rank = rk; mat = o.wall; }
      }
      walls[i] = mat;
    }
  }
  for (const [x, y, m] of FEATURES) walls[y * W + x] = m;

  const map = {
    w: W, h: H, walls, floor, ceil,
    wall: (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? WALL_HD.ROCK : walls[y * W + x]),
    floorAt: (x, y) => floor[y * W + x],
    ceilAt: (x, y) => ceil[y * W + x],
  };

  const ambient = [];
  for (const c of CORRIDORS) ambient.push({ ...c, ...CORRIDOR });
  for (const r of ROOMS) ambient.push(r);

  return {
    map, rooms: ROOMS, ambient, lights: LIGHTS, decor: DECOR,
    start: { x: 3, y: 5, dir: 0 },
    roomAt(x, y) { return ROOMS.find((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) || null; },
  };
}
