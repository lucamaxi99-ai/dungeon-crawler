// Sanity checks for level data: parses the map and verifies that every
// object and the stairwell can be reached from the start.

import { Level, TEST_FLOOR } from '../src/game/map.js';
import { SPRITES, WALL } from '../src/game/assets.js';

const level = new Level(TEST_FLOOR);
const walkable = (x, y) => {
  if (level.wall(x, y)) return false;
  const o = level.objectAt(x, y);
  return !(o && SPRITES[o.type].solid);
};

const seen = new Set([`${level.start.x},${level.start.y}`]);
const queue = [[level.start.x, level.start.y]];
while (queue.length) {
  const [x, y] = queue.shift();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
    if (!seen.has(k) && walkable(nx, ny)) { seen.add(k); queue.push([nx, ny]); }
  }
}

// A target is reachable if the player can stand next to it.
const nextToReach = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));

let ok = true;
for (const o of level.objects) {
  const reach = SPRITES[o.type].solid ? nextToReach(o.x, o.y) : seen.has(`${o.x},${o.y}`);
  if (!reach) { ok = false; console.error(`unreachable ${o.type} at ${o.x},${o.y}`); }
}
for (let y = 0; y < level.h; y++) {
  for (let x = 0; x < level.w; x++) {
    const w = level.wall(x, y);
    if ((w === WALL.STAIRS || w === WALL.POSTER) && !nextToReach(x, y)) {
      ok = false; console.error(`unreachable wall feature ${w} at ${x},${y}`);
    }
  }
}
console.log(`${seen.size} walkable cells reachable, ${level.objects.length} objects`);
if (!ok) process.exit(1);
console.log('map OK');
