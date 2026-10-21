// Enemies: stats per type and the way they move around a floor.
// Pure game logic, no drawing. The world is turn based: every action of the
// crawler outside combat gives each enemy one turn (enemyTurns).

// hp, atk, def, dex like the crawler's values; dmg: damage range per hit.
// sight: cells within which it notices the crawler (needs line of sight).
// roam: how far it wanders from its home cell when idle.
// leash: its territory, the distance from home it will chase you (Infinity
//   for hunters that follow you anywhere). Leave it and it gives up.
// track: turns it keeps hunting without seeing you before it gives up.
// drops: [item id, chance]; gold: [min, max]; xp: experience for the kill.
// loot: a loot table (loot.js) rolled on top of the drops (minibosses).
// Rare drops of tomes fit the creature (rats know all about running away).
//
// family: enemies of one family share a society (GDD 4.6): foot soldiers,
//   specialists and leaders. rank: 'grunt' | 'leader' | 'miniboss' | 'boss'
//   (story bosses: mandatory, the stairs stay shut while they live).
// phaseSprite: what it looks like once its second phase starts.
// verb: what its attack is called in the log.
// slow: moves only every other turn.
// traits (combat.js, enemyTurns below):
//   aura: { atk, dmg } - its family in the same fight hits harder
//   morale: when it falls, the rest of its family in the fight runs away
//   heal: { amount, below, cooldown } - patches up a wounded ally
//   hex: { turns, cooldown } - curses the crawler (worse aim)
//   bomb: { dmg, cooldown, blast } - throws bombs, blows up when it dies
//   spit: { dmg, blind, cooldown } - acid in the face: ignores armour, blinds
//   steal: { share, min, max } - a hit lifts gold, then it makes a run for it
//   brittle: extra damage from blunt weapons
//   disguise: stands still looking like furniture until you come close
//   grudge: if you run from it, it hunts you for the rest of the floor
// Story boss traits (a boss uses one special per turn, each on its own
// cooldown, then attacks normally once before the next):
//   ticket: { share, min, max, cooldown } - fines the crawler gold (paid back
//     when it falls)
//   boot: { turns, cooldown } - wheel clamp: no running, worse aim
//   tow: { dmg, cooldown } - winds up one turn, hits the next (ignores
//     armour; defending halves it)
//   backup: { type, max, cooldown } - calls in helpers (Combat's summon)
//   phase: { at, atk, dmg } - below this share of its HP it gets angrier:
//     hits harder, no rest between specials, cooldowns one shorter
export const ENEMY_TYPES = {
  rat: {
    name: 'Giant Rat', sprite: 'rat', family: 'rat', rank: 'grunt', verb: 'bites',
    hp: 4, atk: 2, def: 0, dex: 6, dmg: [1, 2],
    sight: 5, roam: 3, leash: 6, track: 4,   // territorial: guards its nest
    drops: [['ratTail', 0.6], ['ratPamphlet', 0.03]], gold: [0, 2], xp: 5,
  },
  // Leads a rat pack: the others bite harder while it lives, and scatter
  // when it dies.
  ratAlpha: {
    name: 'Rat Pack Alpha', sprite: 'ratAlpha', family: 'rat', rank: 'leader', verb: 'mauls',
    hp: 6, atk: 3, def: 0, dex: 6, dmg: [1, 2],
    sight: 6, roam: 2, leash: 7, track: 5,
    traits: { aura: { atk: 1, dmg: 0 }, morale: true },
    drops: [['ratTail', 1], ['ratPamphlet', 0.08]], gold: [1, 4], xp: 14,
  },
  // Slow and easy to run from, but it soaks up punishment.
  slime: {
    name: 'Lost & Found Slime', sprite: 'slime', family: 'slime', verb: 'engulfs',
    hp: 6, atk: 2, def: 0, dex: 2, dmg: [1, 2], slow: true,
    sight: 4, roam: 2, leash: 5, track: 3,
    drops: [['shoes', 0.08], ['potion', 0.12]], gold: [1, 6], xp: 7,
  },
  // Goblins (floor 2): a society of foot soldiers, specialists and a
  // warboss. Patrols travel in squads.
  goblinGrunt: {
    name: 'Goblin Pot-Head', sprite: 'goblinGrunt', family: 'goblin', verb: 'cleaves',
    hp: 6, atk: 3, def: 1, dex: 5, dmg: [1, 3],
    sight: 5, roam: 2, leash: 7, track: 5,
    drops: [['potLid', 0.12], ['ration', 0.15]], gold: [1, 4], xp: 9,
  },
  goblinSapper: {
    name: 'Goblin Sapper', sprite: 'goblinSapper', family: 'goblin', verb: 'stabs',
    hp: 5, atk: 2, def: 0, dex: 6, dmg: [1, 2],
    sight: 5, roam: 2, leash: 7, track: 5,
    traits: { bomb: { dmg: [2, 4], cooldown: 3, blast: [2, 3] } },
    drops: [['ration', 0.1]], gold: [2, 6], xp: 10,
  },
  goblinShaman: {
    name: 'Goblin Hedge-Shaman', sprite: 'goblinShaman', family: 'goblin', verb: 'bonks',
    hp: 6, atk: 1, def: 0, dex: 5, dmg: [1, 2],
    sight: 5, roam: 2, leash: 7, track: 5,
    traits: { heal: { amount: [3, 5], below: 0.6, cooldown: 2 }, hex: { turns: 2, cooldown: 4 } },
    drops: [['tomeHex', 0.06], ['mushroom', 0.2]], gold: [1, 5], xp: 11,
  },
  // Floor 2 miniboss: crowned itself with a traffic cone.
  goblinBoss: {
    name: 'Goblin Warboss', sprite: 'goblinBoss', family: 'goblin', rank: 'miniboss', verb: 'clubs',
    hp: 20, atk: 4, def: 2, dex: 4, dmg: [2, 4],
    sight: 6, roam: 1, leash: 6, track: 6,
    traits: { aura: { atk: 1, dmg: 1 }, morale: true },
    drops: [['cone', 0.6]], gold: [10, 30], loot: 'richChest', xp: 45,
  },
  // The first hunter: no territory, it mapped the whole floor already.
  roboVac: {
    name: 'Feral Robo-Vac', sprite: 'roboVac', family: 'appliance', verb: 'stabs',
    hp: 5, atk: 3, def: 2, dex: 8, dmg: [1, 3],
    sight: 6, roam: 6, leash: Infinity, track: 10,
    gold: [2, 8], xp: 10,
  },
  // Floor 3 (a taste of the city above, before it becomes the first story
  // floor in M9).
  raccoon: {
    name: 'Trash Panda Bandit', sprite: 'raccoon', family: 'raccoon', verb: 'claws',
    hp: 9, atk: 4, def: 1, dex: 9, dmg: [2, 3],
    sight: 6, roam: 3, leash: 8, track: 6,
    traits: { steal: { share: 0.2, min: 5, max: 40 } },
    drops: [['ration', 0.3], ['shoes', 0.05]], gold: [2, 8], xp: 14,
  },
  // Ceramic: blunt weapons crack them. They never come alone.
  gnome: {
    name: 'Lawn Gnome Militia', sprite: 'gnome', family: 'gnome', verb: 'pickaxes',
    hp: 8, atk: 4, def: 4, dex: 3, dmg: [2, 3],
    sight: 5, roam: 2, leash: 6, track: 5,
    traits: { brittle: 3 },
    drops: [['mushroom', 0.25]], gold: [1, 5], xp: 11,
  },
  gnomeCaptain: {
    name: 'Gnome Captain', sprite: 'gnomeCaptain', family: 'gnome', rank: 'leader', verb: 'pickaxes',
    hp: 13, atk: 5, def: 4, dex: 4, dmg: [2, 4],
    sight: 6, roam: 1, leash: 6, track: 6,
    traits: { brittle: 3, aura: { atk: 1, dmg: 1 }, morale: true },
    drops: [['mushroom', 0.5], ['luckyAmulet', 0.05]], gold: [4, 12], xp: 22,
  },
  // Looks like a shopping cart until you stand right next to it.
  cartMimic: {
    name: 'Cart Mimic', sprite: 'cartMimic', family: 'mimic', verb: 'chomps',
    hp: 14, atk: 5, def: 3, dex: 4, dmg: [2, 5],
    sight: 1, roam: 0, leash: 4, track: 3,
    traits: { disguise: true },
    gold: [5, 15], loot: 'chest', xp: 20,
  },
  // Story boss of floor 3 (GDD 2.3): a parking enforcement unit with a tow
  // crane. Ozzle's contract page is stuck under its wiper.
  towBot: {
    name: 'Officer Tow-Matic', sprite: 'towBot', phaseSprite: 'towBotTowing', family: 'parking', rank: 'boss', verb: 'rams',
    hp: 48, atk: 6, def: 3, dex: 4, dmg: [3, 5],
    sight: 6, roam: 1, leash: 5, track: 8,
    traits: {
      ticket: { share: 0.2, min: 5, max: 30, cooldown: 5 },
      boot: { turns: 3, cooldown: 6 },
      tow: { dmg: [7, 10], cooldown: 4 },
      backup: { type: 'coneDrone', max: 2, cooldown: 6 },
      phase: { at: 0.5, atk: 1, dmg: 1 },
      morale: true,
    },
    gold: [20, 40], loot: 'richChest', page: 'contractPage1', xp: 80,
  },
  // Its backup: traffic cones that learned to fly.
  coneDrone: {
    name: 'Cone Drone', sprite: 'coneDrone', family: 'parking', verb: 'bonks',
    hp: 5, atk: 3, def: 1, dex: 7, dmg: [1, 2],
    sight: 6, roam: 2, leash: 6, track: 5,
    gold: [0, 2], xp: 6,
  },
  // Used to be floor 3's miniboss; waits for a floor of its own (M10).
  badLlama: {
    name: 'Bad Llama', sprite: 'badLlama', family: 'llama', rank: 'miniboss', verb: 'kicks',
    hp: 40, atk: 6, def: 4, dex: 6, dmg: [3, 6],
    sight: 6, roam: 2, leash: 6, track: 6,
    traits: { spit: { dmg: [4, 6], blind: 2, cooldown: 3 }, grudge: true },
    drops: [['briskBoots', 0.08]], gold: [15, 35], loot: 'richChest', xp: 55,
  },
  // Floor 1 miniboss: everything the dungeon ever lost ended up in here.
  slimeXL: {
    name: 'Unclaimed Baggage', sprite: 'slimeXL', family: 'slime', rank: 'miniboss', verb: 'engulfs',
    hp: 22, atk: 3, def: 1, dex: 2, dmg: [2, 3], slow: true,
    sight: 5, roam: 1, leash: 4, track: 3,
    drops: [['shoes', 0.3]], gold: [10, 25], loot: 'richChest', xp: 40,
  },
};

// Every type gets defaults for the optional fields.
for (const t of Object.values(ENEMY_TYPES)) normalizeType(t);
export function normalizeType(t) {
  t.family ??= t.sprite;
  t.rank ??= 'grunt';
  t.verb ??= 'hits';
  t.traits ??= {};
  t.drops ??= [];
  t.gold ??= [0, 0];
  t.xp ??= 0;
  return t;
}

// Countdown turns a fight with this enemy is worth (floorgen.js).
export const fightWeight = (t) => Math.max(1, Math.round(t.hp / 5));

// Tougher copies for the placeholder floors after story floor 3 (GDD 2.2,
// TODO(M10): real floors 4-18 with their own enemies and settings).
// tier k: +15 % HP, +20 % XP and +25 % gold per tier; +1 ATK and damage
// every three tiers, +1 DEF and DEX every four.
const tiered = {};
export function scaledType(type, tier = 0) {
  const t = ENEMY_TYPES[type];
  if (!t) throw new Error(`Unknown enemy '${type}'`);
  if (!tier) return t;
  const key = `${type}@${tier}`;
  if (tiered[key]) return tiered[key];
  const up = (k) => Math.floor(tier / k);
  tiered[key] = {
    ...t,
    hp: Math.round(t.hp * (1 + 0.15 * tier)),
    atk: t.atk + up(3),
    def: t.def + up(4),
    dex: t.dex + up(4),
    dmg: [t.dmg[0] + up(3), t.dmg[1] + up(3)],
    xp: Math.round(t.xp * (1 + 0.2 * tier)),
    gold: [Math.round(t.gold[0] * (1 + 0.25 * tier)), Math.round(t.gold[1] * (1 + 0.25 * tier))],
    tier,
  };
  return tiered[key];
}

export const MOVE_MS = 170; // same pace as the crawler's steps

export class Enemy {
  // group: enemies placed together (a pack, a squad) share an id and are
  // alerted together.
  // tier: tougher copy on the placeholder floors (scaledType).
  constructor(type, x, y, group = null, tier = 0) {
    const t = scaledType(type, tier);
    this.type = type;
    this.tier = tier;
    this.stats = t;
    this.x = x; this.y = y;
    this.home = { x, y };
    this.hp = t.hp;
    this.group = group;
    this.alerted = false;
    this.lost = 0;    // turns without seeing the crawler while alerted
    this.returning = false; // gave up, walking back home
    this.stun = 0;    // turns to skip (after the crawler fled)
    this.fear = 0;    // turns running away (routed, or off with stolen gold)
    this.loot = 0;    // gold it stole from the crawler
    this.tick = 0;    // turns taken (slow enemies move every other one)
    this.hunts = false; // holds a grudge: follows you anywhere now
    this.disguised = !!t.traits.disguise;
    this.enraged = false; // a boss in its second phase
    this.face = -1;   // -1 faces left on screen, +1 right (set by the renderer)
    this.move = null; // { fx, fy, t } while walking between cells
    this.dx = -1; this.dy = 0; // last step direction
  }

  get name() { return this.stats.name; }
  // Which creature sprites to draw (bosses change in their second phase).
  get sprite() { return (this.enraged && this.stats.phaseSprite) || this.stats.sprite; }
  get alive() { return this.hp > 0; }
  get leash() { return this.hunts ? Infinity : this.stats.leash; }
  get hunter() { return this.leash === Infinity; }

  hurt(n) {
    const before = this.hp;
    this.hp = Math.max(0, this.hp - n);
    return before - this.hp;
  }

  heal(n) {
    const before = this.hp;
    this.hp = Math.min(this.stats.hp, this.hp + n);
    return this.hp - before;
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

// First step of a shortest path from (sx, sy) to a cell next to the target
// (or onto it with onto=true), or null. free(x, y) says whether an enemy may
// stand on a cell.
export function stepToward(free, sx, sy, tx, ty, maxDepth = 16, onto = false) {
  const key = (x, y) => `${x},${y}`;
  const first = new Map([[key(sx, sy), null]]);
  let frontier = [[sx, sy]];
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const next = [];
    for (const [x, y] of frontier) {
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (first.has(k)) continue;
        if (!onto && nx === tx && ny === ty) return first.get(key(x, y)) ?? null; // already next to it
        if (!free(nx, ny)) continue;
        first.set(k, first.get(key(x, y)) ?? [dx, dy]);
        if (onto ? nx === tx && ny === ty : Math.abs(nx - tx) + Math.abs(ny - ty) === 1) return first.get(k);
        next.push([nx, ny]);
      }
    }
    frontier = next;
  }
  return null;
}

const homeDist = (e, x, y) => Math.abs(x - e.home.x) + Math.abs(y - e.home.y);
export const inTerritory = (e, x, y) => homeDist(e, x, y) <= e.leash;

// One turn for every living enemy. world: { isWall, blocked(x, y) } where
// blocked covers solid objects. target: the crawler's cell. rnd: () -> [0, 1).
// Returns events: { enemy, kind: 'notice' | 'engage' | 'giveUp' | 'ambush'
// | 'calm', reason? } (reason of giveUp: 'territory' or 'trail'; calm: a
// routed or thieving enemy stopped running).
//
// Packs and squads (same group) notice the crawler together. Hunters have no
// territory: when they lose the trail they don't go home, they settle where
// they are and keep prowling from there.
export function enemyTurns(enemies, world, target, rnd) {
  const events = [];
  const occupied = (x, y) => enemies.some((e) => e.alive && e.x === x && e.y === y);
  const free = (x, y) => !world.isWall(x, y) && !world.blocked(x, y) && !occupied(x, y) && !(x === target.x && y === target.y);
  const giveUp = (e, reason) => {
    e.alerted = false;
    if (e.hunter) e.home = { x: e.x, y: e.y };
    else e.returning = true;
    events.push({ enemy: e, kind: 'giveUp', reason });
  };
  const alert = (e) => {
    e.alerted = true;
    e.returning = false;
    e.lost = 0;
  };
  for (const e of enemies) {
    if (!e.alive) continue;
    const t = e.stats;
    // A disguised mimic waits until the crawler stands right next to it.
    if (e.disguised) {
      if (adjacent(e, target)) {
        e.disguised = false;
        alert(e);
        events.push({ enemy: e, kind: 'ambush' });
      }
      continue;
    }
    if (e.stun > 0) { e.stun--; continue; }
    e.tick++;
    const dist = Math.abs(e.x - target.x) + Math.abs(e.y - target.y);
    // Running away: from the crawler, as far as it can.
    if (e.fear > 0) {
      e.fear--;
      const away = DIRS4.filter(([dx, dy]) => free(e.x + dx, e.y + dy))
        .map((d) => ({ d, far: Math.abs(e.x + d[0] - target.x) + Math.abs(e.y + d[1] - target.y) }))
        .filter((o) => o.far >= dist)
        .sort((a, b) => b.far - a.far);
      if (away.length && !(t.slow && e.tick % 2)) walk(e, away[0].d);
      if (!e.fear) {
        e.home = { x: e.x, y: e.y };
        events.push({ enemy: e, kind: 'calm' });
      }
      continue;
    }
    const sees = dist <= t.sight && lineOfSight(world.isWall, e.x, e.y, target.x, target.y);
    const intruder = inTerritory(e, target.x, target.y);
    if (!e.alerted && sees && intruder) {
      alert(e);
      events.push({ enemy: e, kind: 'notice' });
      // The rest of the pack comes along.
      if (e.group !== null) {
        for (const m of enemies) {
          if (m !== e && m.alive && m.group === e.group && !m.alerted && !m.disguised && !m.fear) alert(m);
        }
      }
    }
    const slowNow = t.slow && e.tick % 2 === 1; // slow ones skip every other step
    if (e.alerted) {
      if (!intruder) { giveUp(e, 'territory'); continue; }          // you left its territory
      e.lost = sees ? 0 : e.lost + 1;
      if (e.lost > t.track) { giveUp(e, 'trail'); continue; }   // lost your trail
      if (adjacent(e, target)) { events.push({ enemy: e, kind: 'engage' }); continue; }
      if (slowNow) continue;
      const step = stepToward((x, y) => free(x, y) && inTerritory(e, x, y), e.x, e.y, target.x, target.y, e.hunter ? 24 : 16);
      if (!step) continue;
      walk(e, step);
      if (adjacent(e, target)) events.push({ enemy: e, kind: 'engage' });
      continue;
    }
    if (slowNow) continue;
    if (e.returning) {
      if (e.x === e.home.x && e.y === e.home.y) { e.returning = false; continue; }
      const step = stepToward(free, e.x, e.y, e.home.x, e.home.y, 24, true);
      if (step) walk(e, step); else e.returning = false; // home is blocked; stay here
      continue;
    }
    // Wander near home now and then. Hunters prowl: busier, and their home
    // drifts with them.
    if (rnd() < (e.hunter ? 0.7 : 0.35)) {
      const options = DIRS4.filter(([dx, dy]) => free(e.x + dx, e.y + dy) && homeDist(e, e.x + dx, e.y + dy) <= t.roam);
      if (options.length) walk(e, options[Math.floor(rnd() * options.length)]);
      if (e.hunter && rnd() < 0.15) e.home = { x: e.x, y: e.y };
    }
  }
  return events;
}

function walk(e, [dx, dy]) {
  e.move = { fx: e.x, fy: e.y, t: 0 };
  e.x += dx; e.y += dy;
  e.dx = dx; e.dy = dy;
}
