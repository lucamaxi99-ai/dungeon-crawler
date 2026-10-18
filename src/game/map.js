// Level data. Hand-built test floor for now; procedural floors come in M5.
//
// Legend:
//   r rough rock   # stone blocks   m mossy blocks   S stairwell   P Borant poster
//   . floor        @ player start
//   C chest        b barrel         f brazier        F cold brazier   x bones
//
// Materials and light are set per rectangle ("areas", later ones win):
//   floor/ceil: FLAT names, ambient: base brightness, tint: light color name.
// Wall decorations ("torches"): [x, y, side, type?] hangs a torch on the
// wall at the given side (N/E/S/W) of the open cell x, y.

import { WALL, FLAT } from './textures.js';
import { TINT_BY_NAME } from './lights.js';
import { SPRITES } from './assets.js';

const WALL_CHARS = { r: WALL.ROCK, '#': WALL.STONE, m: WALL.MOSSY, S: WALL.STAIRS, P: WALL.POSTER };
const OBJECT_CHARS = { C: 'chest', b: 'barrel', f: 'brazier', F: 'coldBrazier', x: 'bones' };
const SIDES = { E: [1, 0], S: [0, 1], W: [-1, 0], N: [0, -1] };

export const TEST_FLOOR = {
  name: 'Floor 1',
  startDir: 1, // 0 east, 1 south, 2 west, 3 north
  rows: [
    'rrrrrrrrrrrrrrrrrrrrrrrr',
    'r....rrrrr####P#####rrrr',
    'r.@..rrrrr#f.......f#rrr',
    'r....rrrrr#.........#rrr',
    'r....rrrrr#....C....#rrr',
    'rr.rrrrrrr#.........#rrr',
    'rr.rrrrrrr#f.......f#rrr',
    'rr.......x####.######rrr',
    'rrrrrrrrr.rrrr.rrrrrrrrr',
    'rrrrrrrrr.rrrr.rrrrrrrrr',
    'rmmmmmmmm.mmmm.......rrr',
    'rm.b....m.....mmmmmm.rrr',
    'rm......mmmmm.m....m.rrr',
    'rm..x.........m..C.m.rrr',
    'rm......P...m.mm.mmm.rrr',
    'rm.b...bm.f.m........rrr',
    'rmmmmmmmmmmmm.mmmmmmmrrr',
    'rrrrrrrrrrrr#.#####rrrrr',
    'rrrrrrrrrrrr#.....#rrrrr',
    'rrrrrrrrrrrr#F.x.F#rrrrr',
    'rrrrrrrrrrrr###S###rrrrr',
    'rrrrrrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrrrrrr',
  ],
  defaults: { floor: 'COBBLE', ceil: 'VAULT', ambient: 0.06, tint: 'neutral' },
  areas: [
    { x: 1, y: 1, w: 4, h: 6, floor: 'GRAVEL', ceil: 'CAVE', ambient: 0.08, tint: 'torch' },     // start cave
    { x: 11, y: 2, w: 9, h: 5, floor: 'COBBLE', ceil: 'BEAMS', ambient: 0.1, tint: 'torch' },    // brazier hall
    { x: 9, y: 10, w: 12, h: 6, floor: 'WET', ceil: 'VAULT', ambient: 0.1, tint: 'sewer' },      // sewer
    { x: 2, y: 11, w: 6, h: 5, floor: 'PLANKS', ceil: 'BEAMS', ambient: 0.1, tint: 'torch' },    // storeroom
    { x: 13, y: 17, w: 5, h: 3, floor: 'VAULT', ceil: 'VAULT', ambient: 0.08, tint: 'cold' },    // stairwell crypt
  ],
  torches: [
    [3, 1, 'N'],
    [5, 11, 'N'],
    [16, 10, 'N'],
    [20, 13, 'E', 'coldTorch'],
  ],
};

const flatId = (name) => {
  if (!(name in FLAT)) throw new Error(`Unknown floor/ceiling '${name}'`);
  return FLAT[name];
};
const tintId = (name) => {
  if (!(name in TINT_BY_NAME)) throw new Error(`Unknown light tint '${name}'`);
  return TINT_BY_NAME[name];
};

export class Level {
  constructor(def) {
    this.name = def.name;
    this.h = def.rows.length;
    this.w = def.rows[0].length;
    const n = this.w * this.h;
    this.walls = new Uint8Array(n);
    this.floor = new Uint8Array(n);
    this.ceil = new Uint8Array(n);
    this.seen = new Uint8Array(n);
    this.objects = [];   // interactive things standing on a cell
    this.decor = [];     // wall decorations: { type, x, y, lift } in world units
    this.lights = [];    // static light sources for the light map
    this.ambient = [];   // { x, y, w, h, ambient, tint } rectangles, later wins
    this.start = { x: 1, y: 1, dir: def.startDir ?? 0 };

    def.rows.forEach((row, y) => {
      if (row.length !== this.w) throw new Error(`Map row ${y} has length ${row.length}, expected ${this.w}`);
      [...row].forEach((ch, x) => {
        if (ch in WALL_CHARS) this.walls[y * this.w + x] = WALL_CHARS[ch];
        else if (ch in OBJECT_CHARS) this.objects.push({ type: OBJECT_CHARS[ch], x, y, flags: {} });
        else if (ch === '@') this.start = { x, y, dir: def.startDir ?? 0 };
        else if (ch !== '.') throw new Error(`Unknown map char '${ch}' at ${x},${y}`);
      });
    });

    // Materials and ambient light per area.
    const base = def.defaults || { floor: 'COBBLE', ceil: 'VAULT', ambient: 0.08, tint: 'neutral' };
    for (const a of [{ x: 0, y: 0, w: this.w, h: this.h, ...base }, ...(def.areas || [])]) {
      const f = flatId(a.floor ?? base.floor), c = flatId(a.ceil ?? base.ceil);
      for (let y = a.y; y < a.y + a.h; y++) {
        for (let x = a.x; x < a.x + a.w; x++) {
          if (!this.inside(x, y)) continue;
          this.floor[y * this.w + x] = f;
          this.ceil[y * this.w + x] = c;
        }
      }
      this.ambient.push({ x: a.x, y: a.y, w: a.w, h: a.h, ambient: a.ambient ?? base.ambient, tint: tintId(a.tint ?? base.tint) });
    }

    // Light-emitting objects.
    for (const o of this.objects) {
      const l = SPRITES[o.type].light;
      if (l) this.lights.push({ ...l, x: o.x + 0.5, y: o.y + 0.5 });
    }

    // Torches: sprite close to the wall, light a bit further into the cell.
    for (const [x, y, side, type = 'torch'] of def.torches || []) {
      const [dx, dy] = SIDES[side] || [];
      if (dx === undefined) throw new Error(`Torch at ${x},${y}: unknown side '${side}'`);
      if (this.wall(x, y) || !this.wall(x + dx, y + dy)) throw new Error(`Torch at ${x},${y} needs an open cell with a wall to the ${side}`);
      this.decor.push({ type, x: x + 0.5 + dx * 0.38, y: y + 0.5 + dy * 0.38, lift: 0.42 });
      this.lights.push({ ...SPRITES[type].light, x: x + 0.5 + dx * 0.25, y: y + 0.5 + dy * 0.25 });
    }
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  // Wall texture id at a cell; outside the map counts as rock.
  wall(x, y) {
    return this.inside(x, y) ? this.walls[y * this.w + x] : WALL.ROCK;
  }

  floorAt(x, y) {
    return this.floor[y * this.w + x];
  }

  ceilAt(x, y) {
    return this.ceil[y * this.w + x];
  }

  objectAt(x, y) {
    return this.objects.find((o) => o.x === x && o.y === y) || null;
  }
}
