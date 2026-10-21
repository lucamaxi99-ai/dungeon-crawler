// Procedural floors. generateFloor(depth, seed) returns a level definition
// in the same format as the hand-built TEST_FLOOR (map.js), so Level reads
// both. Pure and seeded: the same depth and seed always give the same floor.
//
// How a floor is built:
//   1. Rooms are scattered over solid rock, each with a theme (walls,
//      floor, ceiling, light, furniture).
//   2. Corridors connect them (a spanning tree plus a few loops), routed so
//      they cross room walls as rarely as possible: every crossing becomes
//      a doorway.
//   3. The start goes into one room, the stairwell into the room farthest
//      away from it.
//   4. Furniture, chests, bones, posters and torches go in; solid things
//      are only kept if every open cell stays reachable.
//   5. Enemies move in: squads (a pack, a goblin patrol) in rooms away
//      from the start, the floor's miniboss in the farthest room before the
//      stairs, hunters anywhere, mimics against the walls (enemies.js).
//   6. The turn budget of the floor's countdown follows from its size: a
//      tour through all rooms and to the stairs, times a margin.
//
// A floor's setting decides its room themes and the look of everything
// between the rooms: the dungeon (rock, torches) or the city of story
// floor 3 (brick facades, asphalt alleys, street lamps; GDD 2.3).

import { seededRandom } from './loot.js';
import { scaledType, fightWeight } from './enemies.js';

// Per depth (index 0 = Floor 1). size: map cells. rooms: [min, max].
// chests / rich: plain and rich chests.
// foes: who lives here. squad: enemy types placed together (one room, one
//   group: they notice you together); n: how many such squads. where:
//   'room' (default: a room of its own away from the start), 'boss' (the
//   farthest room that isn't the stairwell), 'anywhere' (hunters), 'wall'
//   (mimics, against a room's wall).
// margin: countdown turns per step of the exploration tour (turning,
// dead ends, backtracking); every enemy adds FIGHT_TURNS per fightWeight.
export const FLOORS = [
  {
    size: [30, 30], rooms: [7, 8], chests: 2, rich: 0, margin: 3.2,
    foes: [
      { squad: ['rat'], n: 3 },
      { squad: ['ratAlpha', 'rat'], n: 1 },
      { squad: ['slime'], n: 2 },
      { squad: ['slimeXL'], n: 1, where: 'boss' },
    ],
  },
  {
    size: [36, 36], rooms: [9, 10], chests: 3, rich: 1, margin: 3.0,
    foes: [
      { squad: ['rat'], n: 2 },
      { squad: ['goblinGrunt', 'goblinGrunt'], n: 1 },
      { squad: ['goblinGrunt', 'goblinSapper'], n: 1 },
      { squad: ['goblinGrunt', 'goblinShaman'], n: 1 },
      { squad: ['roboVac'], n: 1, where: 'anywhere' },
      { squad: ['goblinBoss', 'goblinGrunt'], n: 1, where: 'boss' },
    ],
  },
  {
    // Story floor 3: the city (GDD 2.3).
    size: [42, 42], rooms: [11, 12], chests: 3, rich: 1, margin: 2.8, setting: 'city', story: true,
    foes: [
      { squad: ['rat', 'rat'], n: 1 },
      { squad: ['raccoon'], n: 2 },
      { squad: ['gnome', 'gnome'], n: 1 },
      { squad: ['gnomeCaptain', 'gnome', 'gnome'], n: 1 },
      { squad: ['goblinGrunt', 'goblinShaman'], n: 1 },
      { squad: ['cartMimic'], n: 2, where: 'wall' },
      { squad: ['towBot'], n: 1, where: 'boss' }, // the story boss (GDD 2.3)
    ],
  },
];
// A season has 18 floors (GDD 2.2); the stairs of the last one win the run.
export const FINAL_DEPTH = 18;

// TODO(M10): floors 4-18 get their own settings, enemies and story floors
// (6, 9, ...). Until then every floor after story floor 3 is a dungeon floor
// with the enemies there are, a little bigger and tougher each time (enemy
// tier = depth - 3, see scaledType in enemies.js).
const FILLER_SQUADS = [
  ['rat', 'rat'], ['ratAlpha', 'rat', 'rat'], ['slime', 'slime'],
  ['goblinGrunt', 'goblinGrunt'], ['goblinGrunt', 'goblinSapper'], ['goblinGrunt', 'goblinShaman'],
  ['raccoon'], ['gnome', 'gnome'], ['gnomeCaptain', 'gnome'],
];
const FILLER_BOSSES = [['badLlama'], ['goblinBoss', 'goblinGrunt'], ['slimeXL', 'slime']];
function fillerFloor(depth) {
  const k = depth - FLOORS.length;
  const side = Math.min(54, 42 + 2 * k);
  const squads = Array.from({ length: 6 }, (_, j) => FILLER_SQUADS[(depth * 4 + j * 5) % FILLER_SQUADS.length]);
  return {
    size: [side, side], rooms: [Math.min(16, 11 + k), Math.min(17, 12 + k)], chests: 3, rich: k >= 3 ? 2 : 1, margin: 2.8,
    tier: k, filler: true,
    foes: [
      ...squads.map((squad) => ({ squad, n: 1 })),
      { squad: ['roboVac'], n: 1, where: 'anywhere' },
      { squad: ['cartMimic'], n: 1, where: 'wall' },
      { squad: FILLER_BOSSES[(depth - 4) % FILLER_BOSSES.length], n: 1, where: 'boss' },
    ],
  };
}

// The config of any floor of the season.
export function floorConfig(depth) {
  if (depth < 1 || depth > FINAL_DEPTH) return null;
  return depth <= FLOORS.length ? FLOORS[depth - 1] : fillerFloor(depth);
}

// How many enemies a floor holds.
export const foeCount = (cfg) => cfg.foes.reduce((s, f) => s + f.squad.length * f.n, 0);
const FIGHT_TURNS = 10;

// The stairs open once this share of the countdown has passed.
export const STAIRS_OPEN_AT = 1 / 3;

// Room themes. wall: map char of the room's walls. Furniture flags say what
// may stand inside. weight: [floor 1, 2, 3] chance to be picked.
const DUNGEON_THEMES = {
  cave: { wall: 'r', floor: 'GRAVEL', ceil: 'CAVE', ambient: 0.08, tint: 'torch', torches: 1, bones: 1, weight: [3, 2, 1] },
  hall: { wall: '#', floor: 'COBBLE', ceil: 'BEAMS', ambient: 0.1, tint: 'torch', torches: 2, braziers: 'brazier', weight: [3, 3, 2] },
  sewer: { wall: 'm', floor: 'WET', ceil: 'VAULT', ambient: 0.1, tint: 'sewer', torches: 1, bones: 1, weight: [3, 3, 2] },
  store: { wall: '#', floor: 'PLANKS', ceil: 'BEAMS', ambient: 0.1, tint: 'torch', torches: 1, barrels: true, weight: [2, 2, 2] },
  crypt: { wall: '#', floor: 'VAULT', ceil: 'VAULT', ambient: 0.08, tint: 'cold', braziers: 'coldBrazier', bones: 2, weight: [1, 2, 2] },
  office: { wall: '#', floor: 'CARPET', ceil: 'STEEL', ambient: 0.17, tint: 'neon', screens: true, weight: [1, 2, 2] },
  shrine: { wall: '#', floor: 'COBBLE', ceil: 'VAULT', ambient: 0.15, tint: 'rune', runes: true, weight: [0, 1, 2] },
};

// City themes (story floor 3). lamp: what hangs on the walls instead of
// torches. features: [wall char, min, max] on the room's walls. props:
// [object char, min, max, where] with where 'edge', 'corner', 'inner' or
// 'any'. posters: false keeps Borant's posters off the walls.
const CITY_THEMES = {
  plaza: {
    wall: 'r', floor: 'SIDEWALK', ceil: 'SKY', ambient: 0.13, tint: 'smog', lamp: 'streetLamp', torches: 1, bones: 1, weight: 4,
    props: [['B', 1, 2, 'corner'], ['V', 0, 1, 'edge'], ['Y', 0, 1, 'edge'], ['U', 0, 2, 'edge'], ['L', 0, 1, 'corner']],
  },
  diner: {
    wall: 'd', floor: 'CHECKER', ceil: 'DROP', ambient: 0.12, tint: 'fluor', lamp: 'fluoTube', torches: 1, weight: 3, posters: false,
    features: [['e', 1, 1]], props: [['D', 1, 3, 'inner'], ['U', 0, 1, 'corner']],
  },
  laundry: {
    wall: 'l', floor: 'LINO', ceil: 'DROP', ambient: 0.12, tint: 'fluor', lamp: 'fluoTube', torches: 1, weight: 3, posters: false,
    props: [['U', 0, 1, 'corner']],
  },
  pharmacy: {
    wall: 'p', floor: 'LINO', ceil: 'DROP', ambient: 0.12, tint: 'fluor', lamp: 'fluoTube', torches: 1, weight: 2, posters: false,
    features: [['+', 1, 1]], bones: 1,
  },
  store: { wall: 'w', floor: 'LINO', ceil: 'STEEL', ambient: 0.16, tint: 'neon', screens: true, weight: 2 },
  // The boss arena: the largest of the far rooms.
  lot: {
    wall: 'z', floor: 'PARKING', ceil: 'SKY', ambient: 0.14, tint: 'smog', weight: 0, posters: false,
    props: [['B', 2, 4, 'corner'], ['V', 1, 3, 'edge']],
  },
  // The stairs room: the way down is a subway entrance.
  subway: { wall: 'T', floor: 'LINO', ceil: 'CONCRETE', ambient: 0.1, tint: 'cold', lamp: 'fluoTube', torches: 2, bones: 1, weight: 0, posters: false },
};

// start/stairs/boss: the themes of those rooms (boss: null = no arena).
// defaults: floor, ceiling and light of everything outside the rooms.
// streetLamps: lamps along the corridors (the city's alleys).
const SETTINGS = {
  dungeon: { themes: DUNGEON_THEMES, start: 'cave', stairs: 'crypt', boss: null, defaults: { floor: 'GRAVEL', ceil: 'CAVE', ambient: 0.05, tint: 'neutral' } },
  city: { themes: CITY_THEMES, start: 'plaza', stairs: 'subway', boss: 'lot', streetLamps: true, defaults: { floor: 'ASPHALT', ceil: 'SKY', ambient: 0.08, tint: 'smog' } },
};
// Objects that block movement (map chars).
const SOLID = new Set(['C', 'K', 'b', 'f', 'F', 'B', 'V', 'Y', 'U', 'L', 'D']);

// Cell kinds while building.
const ROCK = 0, ROOM = 1, RING = 2, CORRIDOR = 3, DOOR = 4;
const DIRS4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const SIDE_NAME = ['E', 'S', 'W', 'N'];

export function generateFloor(depth, seed, opts = {}) {
  const cfg = floorConfig(depth);
  if (!cfg) throw new Error(`No floor config for depth ${depth}`);
  const setting = SETTINGS[cfg.setting || 'dungeon'];
  const THEMES = setting.themes;
  const rand = seededRandom(seed * 2654435761 + depth * 97);
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list;
  };

  const [W, H] = cfg.size;
  const kind = new Uint8Array(W * H);  // ROCK, ROOM, ...
  const chars = new Array(W * H).fill('r');
  const owner = new Int16Array(W * H).fill(-1); // room index of ROOM and RING cells
  const at = (x, y) => y * W + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  // ---------------------------------------------------------------- rooms
  const want = int(cfg.rooms[0], cfg.rooms[1]);
  const rooms = [];
  for (let tries = 0; tries < 600 && rooms.length < want; tries++) {
    const w = int(3, 7), h = int(3, 6);
    const x = int(2, W - w - 2), y = int(2, H - h - 2);
    // Interiors keep at least three cells apart: wall, rock, wall.
    const clash = rooms.some((r) => x - 3 < r.x + r.w && r.x - 3 < x + w && y - 3 < r.y + r.h && r.y - 3 < y + h);
    if (!clash) rooms.push({ x, y, w, h });
  }
  rooms.forEach((r, i) => {
    for (let y = r.y - 1; y <= r.y + r.h; y++) {
      for (let x = r.x - 1; x <= r.x + r.w; x++) {
        const interior = x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
        kind[at(x, y)] = interior ? ROOM : RING;
        owner[at(x, y)] = i;
      }
    }
  });
  const isCorner = (x, y) => {
    const r = rooms[owner[at(x, y)]];
    return (x === r.x - 1 || x === r.x + r.w) && (y === r.y - 1 || y === r.y + r.h);
  };

  // ------------------------------------------------------------ corridors
  // Cheapest path on (cell, heading) states: rock costs a little, existing
  // corridors and room floors less, room walls a lot (each crossing is a
  // door), corners and the map border are closed. Turning costs extra so
  // corridors run straight.
  function route(a, b) {
    const N = W * H * 4;
    const dist = new Float64Array(N).fill(Infinity);
    const prev = new Int32Array(N).fill(-1);
    const heap = new MinHeap();
    const s = at(a.x, a.y);
    for (let d = 0; d < 4; d++) { dist[s * 4 + d] = 0; heap.push(0, s * 4 + d); }
    const goal = at(b.x, b.y);
    let end = -1;
    while (heap.size) {
      const [cost, state] = heap.pop();
      if (cost > dist[state]) continue;
      const cell = state >> 2, dir = state & 3;
      if (cell === goal) { end = state; break; }
      const cx = cell % W, cy = (cell / W) | 0;
      for (let nd = 0; nd < 4; nd++) {
        const nx = cx + DIRS4[nd][0], ny = cy + DIRS4[nd][1];
        if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
        const n = at(nx, ny), k = kind[n];
        let step;
        if (k === RING) {
          if (isCorner(nx, ny)) continue;
          // Cross walls straight on, never along them.
          const r = rooms[owner[n]];
          const vertical = nx === r.x - 1 || nx === r.x + r.w;
          if (vertical !== (nd === 0 || nd === 2)) continue;
          step = 30;
        } else if (k === DOOR) step = 1;
        else if (k === CORRIDOR || k === ROOM) step = 1;
        else step = 2;
        if (nd !== dir) step += 1.5;
        const ns = n * 4 + nd, c = cost + step;
        if (c < dist[ns]) { dist[ns] = c; prev[ns] = state; heap.push(c, ns); }
      }
    }
    if (end < 0) return false;
    for (let st = end; st >= 0; st = prev[st]) {
      const cell = st >> 2;
      if (kind[cell] === ROCK) { kind[cell] = CORRIDOR; chars[cell] = '.'; }
      else if (kind[cell] === RING) { kind[cell] = DOOR; chars[cell] = '.'; }
    }
    return true;
  }

  const center = (r) => ({ x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) });
  const gap = (a, b) => Math.abs(center(a).x - center(b).x) + Math.abs(center(a).y - center(b).y);
  // Spanning tree (Prim), then a few extra short links for loops.
  const linked = [0];
  const edges = [];
  while (linked.length < rooms.length) {
    let best = null;
    for (const i of linked) {
      for (let j = 0; j < rooms.length; j++) {
        if (linked.includes(j)) continue;
        const d = gap(rooms[i], rooms[j]);
        if (!best || d < best.d) best = { i, j, d };
      }
    }
    linked.push(best.j);
    edges.push([best.i, best.j]);
  }
  const extra = Math.max(1, Math.round(rooms.length / 4));
  const pairs = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (!edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) pairs.push([i, j, gap(rooms[i], rooms[j])]);
    }
  }
  pairs.sort((p, q) => p[2] - q[2]);
  for (const [i, j] of shuffle(pairs.slice(0, extra * 3)).slice(0, extra)) edges.push([i, j]);

  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) chars[at(x, y)] = '.';
  }
  for (const [i, j] of edges) {
    const a = rooms[i], b = rooms[j];
    route({ x: int(a.x, a.x + a.w - 1), y: int(a.y, a.y + a.h - 1) }, { x: int(b.x, b.x + b.w - 1), y: int(b.y, b.y + b.h - 1) });
  }

  // ------------------------------------------------------- distances
  const open = (x, y) => inside(x, y) && [ROOM, CORRIDOR, DOOR].includes(kind[at(x, y)]);
  function bfs(sx, sy, passable = open) {
    const d = new Int32Array(W * H).fill(-1);
    d[at(sx, sy)] = 0;
    const q = [[sx, sy]];
    for (let h = 0; h < q.length; h++) {
      const [x, y] = q[h];
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx, ny = y + dy;
        if (!inside(nx, ny) || d[at(nx, ny)] >= 0 || !passable(nx, ny)) continue;
        d[at(nx, ny)] = d[at(x, y)] + 1;
        q.push([nx, ny]);
      }
    }
    return d;
  }

  // Start room: the one with the most links to it is too busy; take one at
  // the edge of the network (fewest links), then the stairs go farthest.
  const degree = rooms.map((_, i) => edges.filter((e) => e.includes(i)).length);
  const minDeg = Math.min(...degree);
  const area = (i) => rooms[i].w * rooms[i].h;
  const startRoom = rooms.map((_, i) => i).filter((i) => degree[i] === minDeg).sort((a, b) => area(b) - area(a))[0];
  // The crawler starts where it sees farthest, so the first look shows the room.
  const view = (x0, y0, d) => {
    let n = 0;
    for (let x = x0 + DIRS4[d][0], y = y0 + DIRS4[d][1]; open(x, y); x += DIRS4[d][0], y += DIRS4[d][1]) n++;
    return n;
  };
  let sc = null, startDir = 0, best = -1;
  for (let y = rooms[startRoom].y; y < rooms[startRoom].y + rooms[startRoom].h; y++) {
    for (let x = rooms[startRoom].x; x < rooms[startRoom].x + rooms[startRoom].w; x++) {
      if (DIRS4.some(([dx, dy]) => kind[at(x + dx, y + dy)] === DOOR)) continue;
      for (let d = 0; d < 4; d++) {
        const v = view(x, y, d) + rand() * 0.5;
        if (v > best) { best = v; sc = { x, y }; startDir = d; }
      }
    }
  }
  const fromStart = bfs(sc.x, sc.y);
  let stairsRoom = -1;
  rooms.forEach((r, i) => {
    if (i === startRoom) return;
    const c = center(r);
    if (stairsRoom < 0 || fromStart[at(c.x, c.y)] > fromStart[at(center(rooms[stairsRoom]).x, center(rooms[stairsRoom]).y)]) stairsRoom = i;
  });

  // Story floors have a boss arena: the largest room in the farther half
  // (never the start or the stairs room).
  let bossRoom = -1;
  if (setting.boss) {
    const dist = (i) => fromStart[at(center(rooms[i]).x, center(rooms[i]).y)];
    const far = rooms.map((_, i) => i).filter((i) => i !== startRoom && i !== stairsRoom).sort((a, b) => dist(b) - dist(a));
    bossRoom = far.slice(0, Math.max(3, Math.ceil(far.length / 2))).sort((a, b) => area(b) - area(a) || dist(b) - dist(a))[0];
  }

  // ------------------------------------------------------------ themes
  const themeNames = Object.keys(THEMES);
  const weightOf = (t) => (Array.isArray(t.weight) ? t.weight[Math.min(depth, 3) - 1] : t.weight);
  rooms.forEach((r, i) => {
    if (i === startRoom) r.theme = setting.start;
    else if (i === stairsRoom) r.theme = setting.stairs;
    else if (i === bossRoom) r.theme = setting.boss;
    else {
      const weights = themeNames.map((n) => weightOf(THEMES[n]));
      let x = rand() * weights.reduce((s, v) => s + v, 0);
      r.theme = themeNames.find((n, k) => (x -= weights[k]) < 0) || themeNames[0];
    }
    const t = THEMES[r.theme];
    for (let y = r.y - 1; y <= r.y + r.h; y++) {
      for (let x = r.x - 1; x <= r.x + r.w; x++) {
        if (kind[at(x, y)] === RING && owner[at(x, y)] === i) chars[at(x, y)] = t.wall;
      }
    }
  });

  // Wall cells of a room that face its floor, never next to a doorway or a
  // corridor, so a feature on them is seen from inside only.
  function wallSpots(i) {
    const r = rooms[i];
    const spots = [];
    for (let y = r.y - 1; y <= r.y + r.h; y++) {
      for (let x = r.x - 1; x <= r.x + r.w; x++) {
        if (kind[at(x, y)] !== RING || owner[at(x, y)] !== i || isCorner(x, y)) continue;
        const d = DIRS4.findIndex(([dx, dy]) => kind[at(x + dx, y + dy)] === ROOM && owner[at(x + dx, y + dy)] === i);
        if (d < 0) continue;
        const near = DIRS4.some(([dx, dy]) => [DOOR, CORRIDOR].includes(kind[at(x + dx, y + dy)]));
        const outside = { x: x - DIRS4[d][0], y: y - DIRS4[d][1] };
        if (near || !inside(outside.x, outside.y) || kind[at(outside.x, outside.y)] !== ROCK) continue;
        // in: the floor cell in front of the wall; side: where the wall is from there.
        spots.push({ x, y, in: { x: x + DIRS4[d][0], y: y + DIRS4[d][1] }, side: SIDE_NAME[(d + 2) % 4] });
      }
    }
    return spots;
  }
  const taken = new Set();
  const reserved = new Set(); // floor cells in front of stairs and wall features stay clear
  const takeSpot = (i, filter = () => true) => {
    const s = shuffle(wallSpots(i).filter((p) => !taken.has(at(p.x, p.y)) && filter(p)))[0];
    if (s) { taken.add(at(s.x, s.y)); reserved.add(at(s.in.x, s.in.y)); }
    return s;
  };

  const stairs = takeSpot(stairsRoom);
  if (!stairs) return generateFloor(depth, seed + 1000003, opts); // rare: no clean wall for the stairs
  chars[at(stairs.x, stairs.y)] = 'S';

  // Posters (Borant advertising) in a few rooms; neon screens in offices;
  // glowing runes in shrines.
  const torches = [];
  rooms.forEach((r, i) => {
    const t = THEMES[r.theme];
    if (t.screens) for (let k = int(1, 2); k > 0; k--) { const s = takeSpot(i); if (s) chars[at(s.x, s.y)] = 'n'; }
    if (t.runes) for (let k = int(2, 4); k > 0; k--) { const s = takeSpot(i); if (s) chars[at(s.x, s.y)] = 'u'; }
    for (const [ch, lo, hi] of t.features || []) for (let k = int(lo, hi); k > 0; k--) { const s = takeSpot(i); if (s) chars[at(s.x, s.y)] = ch; }
  });
  for (const i of shuffle(rooms.map((_, k) => k).filter((k) => !THEMES[rooms[k].theme].runes && THEMES[rooms[k].theme].posters !== false)).slice(0, int(1, 2))) {
    const s = takeSpot(i);
    if (s) chars[at(s.x, s.y)] = 'P';
  }
  rooms.forEach((r, i) => {
    const t = THEMES[r.theme];
    for (let k = t.torches || 0; k > 0; k--) {
      const s = takeSpot(i);
      if (s) torches.push([s.in.x, s.in.y, s.side, t.lamp || (r.theme === 'crypt' ? 'coldTorch' : 'torch')]);
    }
    // The start room always gets a second torch, so the first look is lit.
    if (i === startRoom) {
      const s = takeSpot(i);
      if (s) torches.push([s.in.x, s.in.y, s.side, t.lamp || 'torch']);
    }
  });
  // Street lamps along the alleys, one every few steps, on a facade.
  if (setting.streetLamps) {
    const lamps = [];
    const cells = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (kind[at(x, y)] === CORRIDOR) cells.push({ x, y });
    for (const c of shuffle(cells)) {
      if (lamps.some((l) => Math.abs(l.x - c.x) + Math.abs(l.y - c.y) < 7)) continue;
      const d = shuffle([0, 1, 2, 3]).find((k) => kind[at(c.x + DIRS4[k][0], c.y + DIRS4[k][1])] === ROCK);
      if (d === undefined) continue;
      lamps.push(c);
      torches.push([c.x, c.y, SIDE_NAME[d], 'streetLamp']);
    }
  }

  // ---------------------------------------------------------- objects
  const objects = new Map(); // cell -> char
  const solid = SOLID;
  const start = sc;
  const blockedCell = (x, y) => solid.has(objects.get(at(x, y)));
  // Every open cell must stay reachable and every solid object must have a
  // reachable neighbour (to open a chest or just to look at it).
  function stillConnected() {
    const reach = bfs(start.x, start.y, (x, y) => open(x, y) && !blockedCell(x, y));
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = (i / W) | 0;
      if (!open(x, y)) continue;
      if (blockedCell(x, y)) {
        if (!DIRS4.some(([dx, dy]) => inside(x + dx, y + dy) && reach[at(x + dx, y + dy)] >= 0)) return false;
      } else if (reach[i] < 0) return false;
    }
    return true;
  }
  const nextToDoor = (x, y) => DIRS4.some(([dx, dy]) => inside(x + dx, y + dy) && kind[at(x + dx, y + dy)] === DOOR);
  const free = (x, y) => kind[at(x, y)] === ROOM && !objects.has(at(x, y)) && !reserved.has(at(x, y)) && !(x === start.x && y === start.y) && !nextToDoor(x, y);
  function place(ch, x, y) {
    if (!free(x, y)) return false;
    objects.set(at(x, y), ch);
    if (solid.has(ch) && !stillConnected()) { objects.delete(at(x, y)); return false; }
    return true;
  }
  const cellsOf = (r, filter = () => true) => {
    const list = [];
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (filter(x, y)) list.push({ x, y });
    return list;
  };
  const edgeCell = (r) => (x, y) => x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
  const cornerCell = (r) => (x, y) => (x === r.x || x === r.x + r.w - 1) && (y === r.y || y === r.y + r.h - 1);

  rooms.forEach((r) => {
    const t = THEMES[r.theme];
    if (t.braziers && r.w >= 3 && r.h >= 3) {
      const n = r.w * r.h >= 20 ? 4 : 2;
      let placed = 0;
      for (const c of shuffle(cellsOf(r, cornerCell(r)))) if (placed < n && place(t.braziers === 'brazier' ? 'f' : 'F', c.x, c.y)) placed++;
    }
    if (t.barrels) {
      let placed = 0;
      const n = int(2, 4);
      for (const c of shuffle(cellsOf(r, edgeCell(r)))) if (placed < n && place('b', c.x, c.y)) placed++;
    }
    for (const [ch, lo, hi, where = 'any'] of t.props || []) {
      const fit = where === 'edge' ? edgeCell(r) : where === 'corner' ? cornerCell(r)
        : where === 'inner' ? (x, y) => !edgeCell(r)(x, y) : () => true;
      let placed = 0;
      const n = int(lo, hi);
      for (const c of shuffle(cellsOf(r, fit))) if (placed < n && place(ch, c.x, c.y)) placed++;
    }
    for (let k = int(0, t.bones || 0); k > 0; k--) {
      const c = pick(cellsOf(r, free));
      if (c) place('x', c.x, c.y);
    }
  });

  // Chests: never in the start room; rich ones in the rooms farthest away.
  const loot = {};
  const byDistance = rooms.map((r, i) => ({ i, d: fromStart[at(center(r).x, center(r).y)] }))
    .filter((e) => e.i !== startRoom)
    .sort((a, b) => b.d - a.d);
  const chestRooms = [
    ...byDistance.slice(0, cfg.rich).map((e) => ({ i: e.i, rich: true })),
    ...shuffle(byDistance.slice(cfg.rich)).slice(0, cfg.chests).map((e) => ({ i: e.i, rich: false })),
  ];
  for (const { i, rich } of chestRooms) {
    const r = rooms[i];
    for (const c of shuffle(cellsOf(r, edgeCell(r)))) {
      if (place('C', c.x, c.y)) { if (rich) loot[`${c.x},${c.y}`] = 'richChest'; break; }
    }
  }
  // opts.sponsored: the crawler's sponsors leave one more chest, in a room
  // of its own if possible (K, loot table 'sponsoredChest').
  if (opts.sponsored) {
    const taken = new Set(chestRooms.map((c) => c.i));
    const order = [...shuffle(byDistance.filter((e) => !taken.has(e.i))), ...shuffle(byDistance.filter((e) => taken.has(e.i)))];
    let done = false;
    for (const { i } of order) {
      const r = rooms[i];
      for (const c of shuffle(cellsOf(r, edgeCell(r)))) if (!done && place('K', c.x, c.y)) done = true;
      if (done) break;
    }
  }

  // ------------------------------------------------------------ enemies
  // Never closer than 8 steps to the start. Each squad gets a room of its
  // own while there are rooms left; members stand close together.
  const reach = bfs(start.x, start.y, (x, y) => open(x, y) && !blockedCell(x, y));
  const enemies = [];
  const crowded = new Set(); // rooms with enemies in them
  const awayFrom = (x, y, d = 8) => reach[at(x, y)] >= d;
  const enemyFree = (x, y) => free(x, y) && !enemies.some((e) => e.x === x && e.y === y);
  let group = 0, missing = 0;
  const putSquad = (squad, roomOrder, cellFilter = () => true) => {
    for (const i of roomOrder) {
      const r = rooms[i];
      const cells = shuffle(cellsOf(r, (x, y) => enemyFree(x, y) && awayFrom(x, y) && cellFilter(r, x, y)));
      if (cells.length < squad.length) continue;
      // The first one (the leader) anywhere, the rest as close as possible.
      const lead = cells[0];
      cells.sort((a, b) => Math.abs(a.x - lead.x) + Math.abs(a.y - lead.y) - Math.abs(b.x - lead.x) - Math.abs(b.y - lead.y));
      squad.forEach((type, k) => enemies.push({ type, x: cells[k].x, y: cells[k].y, group, ...(cfg.tier ? { tier: cfg.tier } : {}) }));
      group++;
      crowded.add(i);
      return true;
    }
    return false;
  };
  const roomsBy = (score) => rooms.map((_, i) => i).filter((i) => i !== startRoom).sort((a, b) => score(a) - score(b));
  const farthest = byDistance.filter((e) => e.i !== stairsRoom).map((e) => e.i);
  for (const f of cfg.foes) {
    for (let k = 0; k < f.n; k++) {
      let ok;
      if (f.where === 'boss') {
        ok = putSquad(f.squad, bossRoom >= 0 ? [bossRoom, ...farthest.filter((i) => i !== bossRoom), stairsRoom] : [...farthest, stairsRoom]);
      } else if (f.where === 'wall') {
        const order = shuffle(roomsBy(() => 0)).sort((a, b) => crowded.has(a) - crowded.has(b));
        ok = putSquad(f.squad, order, (r, x, y) => edgeCell(r)(x, y) && awayFrom(x, y, 6));
      } else if (f.where === 'anywhere') {
        ok = putSquad(f.squad, shuffle(roomsBy(() => 0)), (r, x, y) => awayFrom(x, y, 15));
      } else {
        // Rooms without enemies first, in random order.
        const order = shuffle(roomsBy(() => 0)).sort((a, b) => crowded.has(a) - crowded.has(b));
        ok = putSquad(f.squad, order);
      }
      if (!ok) missing++;
    }
  }
  if (missing) return generateFloor(depth, seed + 1000003, opts); // rare: too cramped
  for (const e of enemies) objects.set(at(e.x, e.y), 'E'); // keeps the Safe Room door's doorstep clear

  // ---------------------------------------------------------- countdown
  // A greedy tour from the start through every room and on to the stairs.
  let pos = start, tour = 0;
  const left = rooms.map((_, i) => i).filter((i) => i !== startRoom && i !== stairsRoom);
  const walk = (x, y) => bfs(x, y, (cx, cy) => open(cx, cy) && !blockedCell(cx, cy));
  while (left.length) {
    const d = walk(pos.x, pos.y);
    left.sort((a, b) => d[at(center(rooms[a]).x, center(rooms[a]).y)] - d[at(center(rooms[b]).x, center(rooms[b]).y)]);
    const next = center(rooms[left.shift()]);
    tour += Math.max(0, d[at(next.x, next.y)]);
    pos = next;
  }
  tour += Math.max(0, walk(pos.x, pos.y)[at(stairs.in.x, stairs.in.y)]);
  const fights = enemies.reduce((sum, e) => sum + fightWeight(scaledType(e.type, e.tier)), 0);
  const turns = Math.round((tour * cfg.margin + fights * FIGHT_TURNS) / 50) * 50;

  // ------------------------------------------------------------ output
  for (const [cell, ch] of objects) if (ch !== 'E') chars[cell] = ch;
  // The Safe Room door: one per floor, never in the start or stairs room,
  // preferably in a room halfway along the way to the stairs.
  const mid = fromStart[at(center(rooms[stairsRoom]).x, center(rooms[stairsRoom]).y)] / 2;
  const safeOrder = rooms.map((_, i) => i).filter((i) => i !== startRoom && i !== stairsRoom)
    .sort((a, b) => (a === bossRoom) - (b === bossRoom)
      || Math.abs(fromStart[at(center(rooms[a]).x, center(rooms[a]).y)] - mid) - Math.abs(fromStart[at(center(rooms[b]).x, center(rooms[b]).y)] - mid));
  let safe = null;
  for (const i of safeOrder) if (!safe) safe = takeSpot(i, (q) => !objects.has(at(q.in.x, q.in.y)));
  if (!safe) return generateFloor(depth, seed + 1000003, opts); // rare: no clean wall left
  chars[at(safe.x, safe.y)] = 'H';
  chars[at(start.x, start.y)] = '@';
  const rows = [];
  for (let y = 0; y < H; y++) rows.push(chars.slice(y * W, y * W + W).join(''));
  return {
    name: `Floor ${depth}`,
    depth,
    seed,
    setting: cfg.setting || 'dungeon',
    story: !!cfg.story,
    filler: !!cfg.filler,
    turns,
    tour,
    startDir,
    rows,
    defaults: setting.defaults,
    areas: rooms.map((r) => {
      const t = THEMES[r.theme];
      return { x: r.x, y: r.y, w: r.w, h: r.h, floor: t.floor, ceil: t.ceil, ambient: t.ambient, tint: t.tint, theme: r.theme };
    }),
    loot,
    torches,
    enemies,
  };
}

// Small binary heap of [priority, value].
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(p, v) {
    const a = this.a;
    a.push([p, v]);
    let i = a.length - 1;
    while (i > 0) {
      const j = (i - 1) >> 1;
      if (a[j][0] <= a[i][0]) break;
      [a[i], a[j]] = [a[j], a[i]];
      i = j;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}
