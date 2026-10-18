// Level data. Hand-built test floor for now; procedural floors come in M5.
//
// Legend:
//   r rough rock   # stone bricks   m mossy bricks   S stairwell   P Borant poster
//   . floor        @ player start
//   C chest        b barrel         f brazier        x bones

import { WALL } from './assets.js';

const WALL_CHARS = { r: WALL.ROCK, '#': WALL.STONE, m: WALL.MOSSY, S: WALL.STAIRS, P: WALL.POSTER };
const OBJECT_CHARS = { C: 'chest', b: 'barrel', f: 'brazier', x: 'bones' };

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
    'rrrrrrrrrrrr#f.x.f#rrrrr',
    'rrrrrrrrrrrr###S###rrrrr',
    'rrrrrrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrrrrrr',
    'rrrrrrrrrrrrrrrrrrrrrrrr',
  ],
};

export class Level {
  constructor(def) {
    this.name = def.name;
    this.h = def.rows.length;
    this.w = def.rows[0].length;
    this.walls = new Uint8Array(this.w * this.h);
    this.seen = new Uint8Array(this.w * this.h);
    this.objects = [];
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
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  // Wall texture id at a cell; outside the map counts as rock.
  wall(x, y) {
    return this.inside(x, y) ? this.walls[y * this.w + x] : WALL.ROCK;
  }

  objectAt(x, y) {
    return this.objects.find((o) => o.x === x && o.y === y) || null;
  }
}
