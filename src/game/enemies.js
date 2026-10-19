// Enemies: stats per type and the way they move around a floor.
// Pure game logic, no drawing. The world is turn based: every action of the
// crawler outside combat gives each enemy one turn (enemyTurns).

// hp, atk, def, spd like the crawler's stats; dmg: damage range per hit.
// sight: cells within which it notices the crawler (needs line of sight).
// drops: [item id, chance]; gold: [min, max].
export const ENEMY_TYPES = {
  rat: {
    name: 'Giant Rat', sprite: 'rat',
    hp: 4, atk: 2, def: 0, spd: 6, dmg: [1, 2],
    sight: 5, roam: 3,
    drops: [['ratTail', 0.6]], gold: [0, 2],
  },
};

export const MOVE_MS = 170; // same pace as the crawler's steps

export class Enemy {
  constructor(type, x, y) {
    const t = ENEMY_TYPES[type];
    if (!t) throw new Error(`Unknown enemy '${type}'`);
    this.type = type;
    this.stats = t;
    this.x = x; this.y = y;
    this.home = { x, y };
    this.hp = t.hp;
    this.alerted = false;
    this.lost = 0;    // turns without a path to the crawler while alerted
    this.stun = 0;    // turns to skip (after the crawler fled)
    this.face = -1;   // -1 faces left on screen, +1 right (set by the renderer)
    this.move = null; // { fx, fy, t } while walking between cells
    this.dx = -1; this.dy = 0; // last step direction
  }

  get name() { return this.stats.name; }
  get alive() { return this.hp > 0; }

  hurt(n) {
    const before = this.hp;
    this.hp = Math.max(0, this.hp - n);
    return before - this.hp;
  }

  // Smooth position for drawing (cell centers in world units).
  pos(dt = 0) {
    if (!this.move) return { x: this.x + 0.5, y: this.y + 0.5 };
    this.move.t += dt;
    const k = Math.min(1, this.move.t / MOVE_MS);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const p = { x: this.move.fx + (this.x - this.move.fx) * e + 0.5, y: this.move.fy + (this.y - this.move.fy) * e + 0.5 };
    if (k >= 1) this.move = null;
    return p;
  }
}

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const adjacent = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

// Grid line of sight between cell centers (walls block).
export function lineOfSight(isWall, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 4;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = Math.floor(x0 + 0.5 + (x1 - x0) * t);
    const y = Math.floor(y0 + 0.5 + (y1 - y0) * t);
    if ((x !== x1 || y !== y1) && isWall(x, y)) return false;
  }
  return true;
}

// First step of a shortest path from (sx, sy) to a cell next to the target,
// or null. free(x, y) says whether an enemy may stand on a cell.
export function stepToward(free, sx, sy, tx, ty, maxDepth = 16) {
  const key = (x, y) => `${x},${y}`;
  const first = new Map([[key(sx, sy), null]]);
  let frontier = [[sx, sy]];
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const next = [];
    for (const [x, y] of frontier) {
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (first.has(k)) continue;
        if (nx === tx && ny === ty) return first.get(key(x, y)) ?? null; // already next to it
        if (!free(nx, ny)) continue;
        first.set(k, first.get(key(x, y)) ?? [dx, dy]);
        if (Math.abs(nx - tx) + Math.abs(ny - ty) === 1) return first.get(k);
        next.push([nx, ny]);
      }
    }
    frontier = next;
  }
  return null;
}

// One turn for every living enemy. world: { isWall, blocked(x, y) } where
// blocked covers solid objects. target: the crawler's cell. rnd: () -> [0, 1).
// Returns events: { enemy, kind: 'notice' | 'engage' }.
export function enemyTurns(enemies, world, target, rnd) {
  const events = [];
  const occupied = (x, y) => enemies.some((e) => e.alive && e.x === x && e.y === y);
  const free = (x, y) => !world.isWall(x, y) && !world.blocked(x, y) && !occupied(x, y) && !(x === target.x && y === target.y);
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.stun > 0) { e.stun--; continue; }
    const t = e.stats;
    const dist = Math.abs(e.x - target.x) + Math.abs(e.y - target.y);
    if (!e.alerted && dist <= t.sight && lineOfSight(world.isWall, e.x, e.y, target.x, target.y)) {
      e.alerted = true;
      e.lost = 0;
      events.push({ enemy: e, kind: 'notice' });
    }
    if (e.alerted) {
      if (adjacent(e, target)) { events.push({ enemy: e, kind: 'engage' }); continue; }
      const step = stepToward(free, e.x, e.y, target.x, target.y);
      if (!step) {
        if (++e.lost > 6) e.alerted = false;
        continue;
      }
      e.lost = 0;
      walk(e, step);
      if (adjacent(e, target)) events.push({ enemy: e, kind: 'engage' });
      continue;
    }
    // Wander near home now and then.
    if (rnd() < 0.35) {
      const options = DIRS4.filter(([dx, dy]) => free(e.x + dx, e.y + dy)
        && Math.abs(e.x + dx - e.home.x) + Math.abs(e.y + dy - e.home.y) <= t.roam);
      if (options.length) walk(e, options[Math.floor(rnd() * options.length)]);
    }
  }
  return events;
}

function walk(e, [dx, dy]) {
  e.move = { fx: e.x, fy: e.y, t: 0 };
  e.x += dx; e.y += dy;
  e.dx = dx; e.dy = dy;
}
