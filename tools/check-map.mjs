// Sanity checks for level data: the hand-built test floor and a few hundred
// generated floors. Every object, the stairwell, the posters and every enemy
// must be reachable from the start; rats keep their distance from the start;
// the countdown budget must leave room to reach the stairs.

import { Level, TEST_FLOOR } from '../src/game/map.js';
import { SPRITES, WALL } from '../src/game/assets.js';
import { generateFloor, FINAL_DEPTH, FLOORS, STAIRS_OPEN_AT } from '../src/game/floorgen.js';

const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Returns a list of problems (empty = fine) and some numbers.
function checkLevel(level) {
  const problems = [];
  const walkable = (x, y) => {
    if (level.wall(x, y)) return false;
    const o = level.objectAt(x, y);
    return !(o && SPRITES[o.type].solid);
  };
  const dist = new Map([[`${level.start.x},${level.start.y}`, 0]]);
  const queue = [[level.start.x, level.start.y]];
  for (let h = 0; h < queue.length; h++) {
    const [x, y] = queue[h];
    for (const [dx, dy] of D4) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!dist.has(k) && walkable(nx, ny)) { dist.set(k, dist.get(`${x},${y}`) + 1); queue.push([nx, ny]); }
    }
  }
  const nextTo = (x, y) => D4.map(([dx, dy]) => dist.get(`${x + dx},${y + dy}`)).filter((d) => d !== undefined);
  const nextToReach = (x, y) => nextTo(x, y).length > 0;

  for (const o of level.objects) {
    const reach = SPRITES[o.type].solid ? nextToReach(o.x, o.y) : dist.has(`${o.x},${o.y}`);
    if (!reach) problems.push(`unreachable ${o.type} at ${o.x},${o.y}`);
  }
  let stairs = 0, stairsDist = Infinity, open = 0;
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      const w = level.wall(x, y);
      if (!w && walkable(x, y) && !dist.has(`${x},${y}`)) problems.push(`unreachable floor at ${x},${y}`);
      if (!w) open++;
      if (w === WALL.STAIRS) { stairs++; stairsDist = Math.min(stairsDist, ...nextTo(x, y)); }
      if ((w === WALL.STAIRS || w === WALL.POSTER) && !nextToReach(x, y)) problems.push(`unreachable wall feature ${w} at ${x},${y}`);
    }
  }
  if (stairs !== 1) problems.push(`${stairs} stairwells`);
  for (const e of level.enemies) {
    const d = dist.get(`${e.x},${e.y}`);
    if (d === undefined) problems.push(`unreachable ${e.type} at ${e.x},${e.y}`);
  }
  return { problems, reachable: dist.size, open, stairsDist };
}

let ok = true;
const fail = (what, problems) => { ok = false; console.error(`${what}:\n  ${problems.slice(0, 5).join('\n  ')}`); };

const test = new Level(TEST_FLOOR);
const t = checkLevel(test);
if (t.problems.length) fail('test floor', t.problems.filter((p) => !p.startsWith('unreachable floor')));
console.log(`test floor: ${t.reachable} walkable cells, ${test.objects.length} objects, ${test.enemies.length} enemies`);

const SEEDS = 150;
for (let depth = 1; depth <= FINAL_DEPTH; depth++) {
  const sum = { turns: 0, stairs: 0, rats: 0, cells: 0, minRatGap: Infinity, minSlack: Infinity };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const def = generateFloor(depth, seed);
    // Same seed, same floor.
    if (JSON.stringify(generateFloor(depth, seed)) !== JSON.stringify(def)) fail(`floor ${depth} seed ${seed}`, ['not reproducible']);
    let level;
    try { level = new Level(def); } catch (err) { fail(`floor ${depth} seed ${seed}`, [err.message]); continue; }
    const r = checkLevel(level);
    if (r.problems.length) fail(`floor ${depth} seed ${seed}`, r.problems);
    if (level.enemies.length !== FLOORS[depth - 1].rats) fail(`floor ${depth} seed ${seed}`, [`${level.enemies.length} rats`]);
    // Rats keep away from the start.
    for (const e of level.enemies) {
      const gap = Math.abs(e.x - level.start.x) + Math.abs(e.y - level.start.y);
      sum.minRatGap = Math.min(sum.minRatGap, gap);
    }
    // After the stairs open there must be plenty of turns left to walk there.
    const slack = def.turns * (1 - STAIRS_OPEN_AT) - r.stairsDist * 2;
    sum.minSlack = Math.min(sum.minSlack, slack);
    if (slack < 50) fail(`floor ${depth} seed ${seed}`, [`only ${def.turns} turns for a stairs distance of ${r.stairsDist}`]);
    sum.turns += def.turns; sum.stairs += r.stairsDist; sum.rats += level.enemies.length; sum.cells += r.open;
  }
  const avg = (v) => (v / SEEDS).toFixed(0);
  console.log(`floor ${depth}: ${SEEDS} seeds, avg ${avg(sum.cells)} open cells, stairs ${avg(sum.stairs)} steps away, countdown ${avg(sum.turns)} turns, rats >= ${sum.minRatGap} cells from start`);
}

if (!ok) process.exit(1);
console.log('maps OK');
