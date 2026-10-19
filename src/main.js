// Entry point: wires engine, level, player, HUD and input together.
//
// Screen layout (960 x 600, square pixels):
//   3D view   960 x 420, rendered at 960x420, 640x280 or 320x140 and scaled
//             up; the resolution follows the frame rate (AutoResolution).
//   overlay   320 x 140 HUD pixels, scaled 3x over the view.
//   panel     320 x 60 HUD pixels, scaled 3x under the view.

import { FrameBuffer } from './engine/framebuffer.js';
import { C } from './engine/palette.js';
import { LitRaycaster } from './engine/raycaster-lit.js';
import { buildLitTables, LightMap } from './engine/lighting.js';
import { AutoResolution } from './engine/resolution.js';
import { frameAt } from './engine/sprite.js';
import { buildTextures, SPRITES, CREATURES, WALL } from './game/assets.js';
import { TINTS, LANTERN } from './game/lights.js';
import { Level, TEST_FLOOR } from './game/map.js';
import { generateFloor, FINAL_DEPTH } from './game/floorgen.js';
import { Player } from './game/player.js';
import {
  MENU_BOX, MessageLog, drawPanel, drawOverlay,
  HUD_W, OVERLAY_H, PANEL_H, SCREEN_W, SCREEN_H, VIEW_H,
} from './game/hud.js';
import { bindInput } from './game/input.js';
import { line } from './game/system-ai.js';
import { Inventory } from './game/inventory.js';
import { ITEMS, RARITY_ORDER } from './game/items.js';
import { rollLoot } from './game/loot.js';
import { InventoryScreen } from './game/inventory-ui.js';
import { CharacterScreen } from './game/character-ui.js';
import { Crawler } from './game/crawler.js';
import { enemyTurns, adjacent, lineOfSight } from './game/enemies.js';
import { Combat } from './game/combat.js';
import { CombatScreen } from './game/combat-ui.js';
import { drawGameOver, gameOverReady } from './game/gameover-ui.js';
import { drawFloorCard, cardDone, cardSkippable, CARD_MS } from './game/floor-ui.js';
import { rng } from './engine/texgen.js';

const canvas = document.getElementById('screen');
canvas.width = SCREEN_W;
canvas.height = SCREEN_H;
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

// ------------------------------------------------------------ world

const textures = buildTextures();
const log = new MessageLog();
const charScreen = new CharacterScreen();
const isWall = (x, y) => level.wall(x, y) !== 0;

// Everything that belongs to one run: the crawler and its pockets survive
// from floor to floor; level, light and enemies are rebuilt on every floor.
// URL parameters for testing: ?seed=123 fixes the run, ?floor=test plays
// the hand-built test floor.
// TODO(M5): permadeath and saving are decided with the floor generator.
const params = new URLSearchParams(location.search);
let run, level, player, inventory, crawler, invScreen, state, light, decor, enemyRnd;
let dead = null; // { at, won, killer, depth, steps, kills, gold, comment } when the run is over
let card = null; // title card between floors (floor-ui.js)

function newRun() {
  const fixedSeed = Number(params.get('seed'));
  run = { seed: fixedSeed > 0 ? fixedSeed : 1 + Math.floor(Math.random() * 1e9), depth: 0 };
  inventory = new Inventory();
  crawler = new Crawler(inventory);
  invScreen = new InventoryScreen(inventory, crawler);
  dead = null;
  card = null;
  enterFloor(1);
}

// Builds floor `depth` of the current run and puts the crawler at its start.
function enterFloor(depth) {
  run.depth = depth;
  const def = params.get('floor') === 'test' ? TEST_FLOOR : generateFloor(depth, run.seed + depth * 7919);
  level = new Level(def);
  const steps = player ? player.steps : 0;
  player = new Player(level.start);
  player.steps = depth === 1 ? 0 : steps;
  state = { showMap: false, bumps: 0, saidFirstSteps: depth > 1, notice: null, noticeUntil: 0 };
  light = new LightMap(level.w, level.h, isWall, TINTS.length);
  for (const a of level.ambient) light.setAmbient(a.x, a.y, a.x + a.w - 1, a.y + a.h - 1, a.ambient, a.tint);
  for (const l of level.lights) light.addLight(l);
  decor = level.decor.map((d, i) => ({ ...d, phase: i * 3 + 1 }));
  enemyRnd = rng(level.seed * 31 + 7);
}
newRun();

const enemyAt = (x, y) => level.enemies.find((e) => e.alive && e.x === x && e.y === y) || null;

// ------------------------------------------------------------ renderer

const tables = buildLitTables({ tints: TINTS, levels: 32, maxBright: 1.5 });
const STEPS = [{ w: 960, h: 420 }, { w: 640, h: 280 }, { w: 320, h: 140 }];
const res = new AutoResolution(STEPS);
let viewFb, caster;

function setResolution(index) {
  const { w, h } = STEPS[index];
  viewFb = new FrameBuffer(w, h);
  caster = new LitRaycaster({ w, h, fov: 66, tables, lighting: true, dither: true, ao: true, fogFar: 16 });
}
setResolution(res.index);

const overlayFb = new FrameBuffer(HUD_W, OVERLAY_H);
const panelFb = new FrameBuffer(HUD_W, PANEL_H);

// Fixed resolution from the URL for testing: ?res=640
const fixed = STEPS.findIndex((s) => String(s.w) === new URLSearchParams(location.search).get('res'));
if (fixed >= 0) setResolution(res.setMode(fixed));

// ------------------------------------------------------------ rules

const world = {
  canEnter(x, y) {
    if (level.wall(x, y) || enemyAt(x, y)) return false;
    const o = level.objectAt(x, y);
    return !(o && SPRITES[o.type].solid);
  },
  onBlocked(x, y) {
    const foe = enemyAt(x, y);
    if (foe) return engage(foe, 'crawler');
    // Only comment on every few bumps so the log doesn't drown in sarcasm.
    state.bumps++;
    if (level.objectAt(x, y)) {
      if (state.bumps % 3 === 1) log.push(line('bumpObject'));
    } else if (state.bumps % 4 === 1) {
      log.push(line('bumpWall'));
    }
  },
  onEnter(x, y) {
    const o = level.objectAt(x, y);
    if (o && o.type === 'bones' && !o.flags.seen) {
      o.flags.seen = true;
      log.push(line('bones'), 'info');
    }
    if (level.bagAt(x, y)) log.push(line('bagHere'), 'info');
    if (!state.saidFirstSteps && player.steps >= 12) {
      state.saidFirstSteps = true;
      log.push(line('firstSteps'));
    }
  },
};

function interact() {
  const f = player.front();
  const foe = enemyAt(f.x, f.y);
  if (foe) return engage(foe, 'crawler');
  const frontBag = level.bagAt(f.x, f.y);
  if (frontBag) return pickUp(frontBag);
  const w = level.wall(f.x, f.y);
  if (w === WALL.STAIRS) return useStairs(f);
  if (w === WALL.POSTER) return log.push(line('poster'), 'info');
  const o = level.objectAt(f.x, f.y);
  if (o && o.type === 'chest') return openChest(o);
  if (o) return log.push(line(o.type));
  const ownBag = level.bagAt(player.x, player.y);
  if (ownBag) return pickUp(ownBag);
  if (!w) log.push(line('nothing'), 'info');
}

// The first SPACE at the stairwell asks, the second one descends (so a
// stray key never skips a floor). After the last floor the run is won.
function useStairs(cell) {
  const key = `${cell.x},${cell.y},${player.x},${player.y}`;
  if (state.stairsAsked !== key) {
    state.stairsAsked = key;
    return log.push(line(run.depth >= FINAL_DEPTH ? 'finalStairs' : 'stairs'), 'warn');
  }
  if (run.depth >= FINAL_DEPTH) return endRun({ won: true });
  log.push(line('descend'));
  descend();
}

function descend() {
  const depth = run.depth + 1;
  enterFloor(depth);
  const comment = line(depth >= FINAL_DEPTH ? 'finalFloor' : 'floorArrive').replace('{n}', depth);
  card = { at: performance.now(), title: level.name.toUpperCase(), sub: depth >= FINAL_DEPTH ? 'SEASON FINALE' : '', comment };
  log.push(comment);
}

// The run is over: died in combat (killer), or survived the last floor (won).
function endRun({ won = false, killer = '', comment = line(won ? 'victory' : 'death') }) {
  player.queued = null;
  state.showMap = false;
  if (invScreen.open) invScreen.toggle();
  if (charScreen.open) charScreen.toggle();
  dead = { at: performance.now(), won, killer, depth: run.depth, steps: player.steps, kills: crawler.kills, gold: inventory.gold, comment };
  log.push(comment);
}

const itemLabel = ({ id, n }) => (n > 1 ? `${n}x ${ITEMS[id].name}` : ITEMS[id].name);

// ------------------------------------------------------------ inventory

function pickUp(bag) {
  for (const { id, n } of bag.items) inventory.add(id, n);
  level.removeObject(bag);
  log.push(`Picked up: ${bag.items.map(itemLabel).join(', ')}.`, 'info');
  log.push(line('pickup'));
}

// Drops a stack into a bag on the floor: in front of the player if there is
// room, otherwise on the player's own cell. Items join a bag already there.
function dropStack(stack) {
  const f = player.front();
  const free = (x, y) => level.inside(x, y) && !level.wall(x, y) && !(level.objectAt(x, y) && SPRITES[level.objectAt(x, y).type].solid);
  const cell = free(f.x, f.y) ? f : { x: player.x, y: player.y };
  let bag = level.bagAt(cell.x, cell.y);
  if (!bag) {
    bag = { type: 'bag', x: cell.x, y: cell.y, flags: {}, items: [] };
    level.objects.push(bag);
  }
  const same = ITEMS[stack.id].stack && bag.items.find((s) => s.id === stack.id);
  if (same) same.n += stack.n; else bag.items.push({ ...stack });
  log.push(`Dropped: ${itemLabel(stack)}.`, 'info');
  log.push(line('drop'));
}

// SPACE / X inside the inventory screen.
function inventoryCommand(cmd) {
  const sel = invScreen.selection();
  if (!sel.stack) return;
  const def = ITEMS[sel.stack.id];
  if (cmd === 'drop') {
    const stack = sel.where === 'slot' ? inventory.takeEquipped(sel.slot) : inventory.take(sel.index);
    return dropStack(stack);
  }
  if (sel.where === 'slot') {
    inventory.unequip(sel.slot);
    log.push(`Unequipped: ${def.name}.`, 'info');
    return log.push(line('unequip'));
  }
  if (def.kind === 'gear') {
    const r = inventory.equipFromBag(sel.index);
    log.push(`Equipped: ${def.name}${r.swapped ? ` (instead of ${ITEMS[r.swapped].name})` : ''}.`, 'info');
    return log.push(line('equip'));
  }
  if (def.kind === 'consumable') {
    return useConsumable(sel.index);
  }
  log.push(line('look'));
}

// Uses the consumable at a bag index. Healing items stay in the bag when
// the crawler is already at full health. Returns true if it was used.
function useConsumable(index) {
  const def = ITEMS[inventory.bag[index].id];
  if (def.heal && crawler.hp >= crawler.hpMax) {
    log.push(line('healFull'), 'info');
    return false;
  }
  inventory.use(index);
  log.push(`Used: ${def.name}.`, 'info');
  if (def.heal) {
    const n = crawler.heal(def.heal);
    log.push(`+${n} HP.`, 'info');
    log.push(line(crawler.hp >= crawler.hpMax ? 'healedFull' : 'healed'));
  } else {
    log.push(line('use'));
  }
  return true;
}

function onInventoryAction(action) {
  const dir = { forward: 'up', back: 'down', left: 'left', turnLeft: 'left', right: 'right', turnRight: 'right' }[action];
  if (dir) return invScreen.move(dir);
  if (action === 'interact') return inventoryCommand('interact');
  if (action === 'drop') return inventoryCommand('drop');
  if (action === 'inventory' || action === 'close') return invScreen.toggle();
}

// Opens a chest: plays the lid animation and moves the loot straight into
// the inventory. Loot is seeded per chest, so a floor always holds the same.
function openChest(o) {
  if (o.flags.openedAt != null) return log.push(line('chestEmpty'), 'info');
  o.flags.openedAt = performance.now();
  const loot = rollLoot(o.loot || 'chest', level.seed * 7919 + o.y * level.w + o.x);
  inventory.gold += loot.gold;
  for (const { id, n } of loot.items) inventory.add(id, n);
  log.push(line('chestOpen'));
  const names = loot.items.map(({ id, n }) => (n > 1 ? `${n}x ${ITEMS[id].name}` : ITEMS[id].name));
  log.push(`Loot: ${[...names, `${loot.gold} gold`].join(', ')}.`, 'info');
  const best = Math.max(0, ...loot.items.map(({ id }) => RARITY_ORDER.indexOf(ITEMS[id].rarity)));
  const verdict = ['lootCommon', 'lootGood', 'lootGood', 'lootGreat', 'lootLegendary'][best];
  log.push(line(verdict));
  if (!state.saidInventoryHint) { state.saidInventoryHint = true; log.push(line('inventoryHint'), 'info'); }
}

// Cycles AUTO -> 960 -> 640 -> 320 -> AUTO.
function cycleQuality() {
  const order = ['auto', 0, 1, 2];
  const next = order[(order.indexOf(res.mode) + 1) % order.length];
  setResolution(res.setMode(next));
  showNotice();
}

function showNotice() {
  const { w, h } = res.step;
  state.notice = `${res.mode === 'auto' ? 'AUTO ' : ''}${w}X${h}`;
  state.noticeUntil = performance.now() + 2500;
}

function onAction(action) {
  if (action === 'quality') return cycleQuality();
  if (dead) {
    if ((action === 'interact' || action === 'close') && gameOverReady(dead, performance.now())) restart();
    return;
  }
  if (card) {
    if ((action === 'interact' || action === 'close') && cardSkippable(card, performance.now())) card.at = Math.min(card.at, performance.now() - CARD_MS);
    return;
  }
  if (combat) return onCombatAction(action);
  if (charScreen.open) {
    if (['character', 'close', 'interact', 'inventory'].includes(action)) charScreen.toggle();
    return;
  }
  if (action === 'character') {
    state.showMap = false;
    player.queued = null;
    if (invScreen.open) invScreen.toggle();
    return charScreen.toggle();
  }
  if (action === 'inventory' && !invScreen.open) {
    state.showMap = false;
    player.queued = null;
    return invScreen.toggle();
  }
  if (invScreen.open) return onInventoryAction(action);
  if (action === 'close') { state.showMap = false; return; }
  if (action === 'drop') return;
  if (action === 'map') { state.showMap = !state.showMap; return; }
  if (state.showMap) return;
  if (action === 'interact') return interact();
  if (player.act(action, world)) afterTurn();
}

// Everything that happens once per crawler action outside combat: slow
// healing, then every enemy takes its turn.
function afterTurn() {
  state.stairsAsked = null;
  if (crawler.tick() && crawler.hp === crawler.hpMax) log.push(line('regenFull'), 'info');
  const blocked = (x, y) => { const o = level.objectAt(x, y); return !!(o && SPRITES[o.type].solid); };
  const events = enemyTurns(level.enemies, { isWall, blocked }, player, enemyRnd);
  for (const ev of events) {
    if (ev.kind === 'notice') log.push(line('enemyNotice').replace('{name}', ev.enemy.name), 'warn');
    if (ev.kind === 'giveUp') log.push(line(ev.reason === 'territory' ? 'enemyGiveUp' : 'enemyLostTrail').replace('{name}', ev.enemy.name), 'info');
  }
  const foe = events.find((ev) => ev.kind === 'engage');
  if (foe) engage(foe.enemy, 'enemy');
}

// ------------------------------------------------------------ combat

// The running fight: { fight: Combat, ui: CombatScreen, nextAt, endAt }.
let combat = null;
// Pauses in ms so every blow can be read before the next one lands.
const PACE = { start: 500, afterCrawler: 650, afterEnemy: 800, end: 1300 };

// Combat starts. initiator: 'crawler' (attacked) or 'enemy' (came close).
// Every alerted enemy standing next to the crawler joins (at most three).
function engage(foe, initiator) {
  if (combat) return;
  player.queued = null;
  state.showMap = false;
  if (invScreen.open) invScreen.toggle();
  if (charScreen.open) charScreen.toggle();
  const foes = [foe, ...level.enemies.filter((e) => e !== foe && e.alive && e.alerted && adjacent(e, player))].slice(0, 3);
  for (const e of foes) { e.alerted = true; e.move = null; }
  const fight = new Combat(crawler, foes, { initiator });
  const now = performance.now();
  combat = { fight, ui: new CombatScreen({ fight, scene: stageFor(foe), tables, inventory, now }), nextAt: now + PACE.start, endAt: 0 };
  const name = foes.length > 1 ? `pack of ${foes.length} ${foe.name}s` : foe.name;
  log.push(line(initiator === 'crawler' ? 'combatStartCrawler' : 'combatStartEnemy').replace('{name}', name), 'warn');
  log.push(fight.crawlersTurn ? 'You are faster. Your move.' : `The ${foe.name} is faster.`, 'info');
}

// What the combat stage looks like: the wall behind the enemy (seen from
// the crawler), the floor and ceiling under it and its light.
function stageFor(foe) {
  const dx = Math.sign(foe.x - player.x), dy = Math.sign(foe.y - player.y);
  let wall = WALL.STONE;
  for (let k = 1; k < 8; k++) {
    const w = level.wall(foe.x + dx * k, foe.y + dy * k);
    if (w) { wall = w; break; }
  }
  if (wall === WALL.STAIRS || wall === WALL.POSTER) wall = WALL.STONE; // a doorway as a backdrop looks odd
  const i = foe.y * level.w + foe.x;
  return {
    wall: textures.walls[wall],
    floor: textures.flats[level.floorAt(foe.x, foe.y)],
    ceil: textures.flats[level.ceilAt(foe.x, foe.y)],
    tint: light.tint[i],
    light: Math.min(1.2, light.level[i]),
  };
}

function onCombatAction(action) {
  const { ui, fight } = combat;
  if (fight.result) return;
  const dir = { forward: 'up', back: 'down', left: 'left', turnLeft: 'left', right: 'right', turnRight: 'right' }[action];
  if (dir) return ui.move(dir);
  if (action === 'close') return ui.back();
  if (action === 'interact') {
    if (performance.now() < combat.nextAt) return; // still showing the last blow
    const choice = ui.confirm();
    if (choice) crawlerTurn(choice);
  }
}

function crawlerTurn(choice) {
  const { fight, ui } = combat;
  const now = performance.now();
  let events;
  if (choice.kind === 'useItem') {
    const def = ITEMS[inventory.bag[choice.index].id];
    if (def.heal && crawler.hp >= crawler.hpMax) return log.push(line('healFull'), 'info');
    inventory.use(choice.index);
    events = fight.crawlerAct({ kind: 'item', name: def.name, healed: crawler.heal(def.heal) });
  } else {
    events = fight.crawlerAct(choice);
  }
  report(events);
  ui.onEvents(events, now);
  combat.nextAt = now + PACE.afterCrawler;
}

// Called every frame: enemies act after a pause, the fight ends after the
// last blow has been shown.
function combatTick(now) {
  if (!combat) return;
  const { fight, ui } = combat;
  if (fight.result) {
    if (!combat.endAt) combat.endAt = now + PACE.end;
    if (now >= combat.endAt) endCombat();
    return;
  }
  if (fight.crawlersTurn || now < combat.nextAt) return;
  const events = fight.enemyAct();
  report(events);
  ui.onEvents(events, now);
  combat.nextAt = now + PACE.afterEnemy;
}

// Combat events as log lines: short facts in grey, the System's opinion in gold.
function report(events) {
  for (const ev of events) {
    const mine = ev.actor === crawler;
    const foe = mine ? ev.target : ev.actor;
    switch (ev.kind) {
      case 'hit':
        log.push(mine ? `You hit the ${foe.name} for ${ev.amount}.` : `The ${foe.name} bites you for ${ev.amount}.`, mine ? 'info' : 'warn');
        break;
      case 'crit':
        log.push(`You hit the ${foe.name} for ${ev.amount}.`, 'info');
        log.push(line('crit'));
        break;
      case 'miss':
        log.push(mine ? `You miss the ${foe.name}.` : `The ${foe.name} misses.`, 'info');
        break;
      case 'blocked':
        log.push(`You block the ${foe.name}.`, 'info');
        break;
      case 'defend':
        log.push(line('defend'), 'info');
        break;
      case 'item':
        log.push(`Used: ${ev.name}.${ev.amount ? ` +${ev.amount} HP.` : ''}`, 'info');
        break;
      case 'kill':
        log.push(`The ${foe.name} dies.`, 'info');
        log.push(line('kill'));
        break;
      case 'flee':
        log.push(line('fled'));
        break;
      case 'fleeFail':
        log.push(line('fleeFail').replace('{name}', combat.fight.alive[0].name), 'warn');
        break;
      case 'death':
        log.push('You die.', 'warn');
        break;
      default:
    }
  }
}

function endCombat() {
  const { fight } = combat;
  combat = null;
  if (fight.result === 'won') {
    const got = {};
    let gold = 0;
    for (const e of fight.enemies) {
      level.objects.push({ type: `${e.type}Corpse`, x: e.x, y: e.y, flags: {} });
      for (const [id, chance] of e.stats.drops) if (Math.random() < chance) { inventory.add(id); got[id] = (got[id] || 0) + 1; }
      const [g0, g1] = e.stats.gold;
      gold += g0 + Math.floor(Math.random() * (g1 - g0 + 1));
    }
    inventory.gold += gold;
    const loot = Object.entries(got).map(([id, n]) => itemLabel({ id, n }));
    if (gold) loot.push(`${gold} gold`);
    log.push(`Loot: ${loot.length ? loot.join(', ') : 'nothing'}.`, 'info');
    log.push(line('combatWon'));
  } else if (fight.result === 'lost') {
    const killer = fight.enemies.find((e) => e.alive) || fight.enemies[0];
    endRun({ killer: killer.name });
  } else if (fight.result === 'fled') {
    // Stumble one cell away; the enemies need two turns to react. Whether
    // they follow depends on their territory (leash) and tracking.
    for (const e of fight.alive) e.stun = 2;
    const options = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => ({ x: player.x + dx, y: player.y + dy }))
      .filter((c) => world.canEnter(c.x, c.y))
      .map((c) => ({ ...c, d: Math.min(...fight.alive.map((e) => Math.abs(e.x - c.x) + Math.abs(e.y - c.y))) }))
      .sort((a, b) => b.d - a.d);
    if (options.length) player.shove(options[0].x, options[0].y);
  }
}

bindInput(onAction);

// Mouse and touch on the inventory screen: tap selects, a second tap on the
// same thing uses it, the buttons do what their keys do, the wheel scrolls.
function hudPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: Math.floor(((e.clientX - r.left) / r.width) * HUD_W),
    y: Math.floor(((e.clientY - r.top) / r.height) * (OVERLAY_H + PANEL_H)),
  };
}
canvas.addEventListener('pointerdown', (e) => {
  if (dead || card) { e.preventDefault(); return onAction('interact'); }
  if (charScreen.open) { e.preventDefault(); return onAction('close'); }
  if (combat) {
    e.preventDefault();
    const p = hudPoint(e);
    if (p.y < OVERLAY_H) return combat.ui.hitStage(p.x, p.y);
    if (combat.ui.hitMenu(p.x, p.y - OVERLAY_H, MENU_BOX)) onCombatAction('interact');
    return;
  }
  if (!invScreen.open) return;
  e.preventDefault();
  const p = hudPoint(e);
  if (p.y >= OVERLAY_H) return;
  const target = invScreen.hit(p.x, p.y);
  if (!target) return;
  if (target.kind === 'button') return onAction(target.id);
  if (target.kind === 'outside') return;
  if (invScreen.select(target)) inventoryCommand('interact');
});
canvas.addEventListener('wheel', (e) => {
  if (!invScreen.open) return;
  e.preventDefault();
  invScreen.select({ kind: 'scroll', delta: Math.sign(e.deltaY) });
}, { passive: false });
log.push(line('welcome'));          // greeting
log.push(line('welcome'), 'info');  // controls hint

function restart() {
  newRun();
  log.push(line('restart'));
}

// ------------------------------------------------------------ loop

// Nothing is built yet for these; the panel shows them empty.
const status = {
  timeLeft: null,          // TODO(M5)
  viewers: null,           // TODO(M6)
};
function updateStatus() {
  status.hp = crawler.hp;
  status.hpMax = crawler.hpMax;
  status.mp = crawler.mp;
  status.mpMax = crawler.mpMax;
}

function spriteList(time, dt) {
  const list = level.objects.map((o) => {
    const spr = SPRITES[o.type];
    const opened = spr.open && o.flags.openedAt != null;
    return {
      x: o.x + 0.5, y: o.y + 0.5,
      img: opened ? frameAt(spr.open, time - o.flags.openedAt) : frameAt(spr.anim, time, o.x * 3 + o.y),
    };
  });
  for (const d of decor) list.push({ x: d.x, y: d.y, lift: d.lift, img: frameAt(SPRITES[d.type].anim, time, d.phase) });
  // Enemies face the way they walk, or the crawler when next to it. Coming
  // toward the camera they show their front view; otherwise the side view,
  // looking left or right on screen.
  const a = player.camera().angle;
  const fx = Math.cos(a), fy = Math.sin(a), rx = -fy, ry = fx;
  level.enemies.forEach((e, i) => {
    if (!e.alive) return;
    const near = adjacent(e, player);
    const dx = near ? player.x - e.x : e.dx, dy = near ? player.y - e.y : e.dy;
    const side = dx * rx + dy * ry;
    if (Math.abs(side) > 0.2) e.face = side > 0 ? 1 : -1;
    const views = CREATURES[e.stats.sprite];
    const set = dx * fx + dy * fy < -0.5 ? views.F : views[e.face > 0 ? 'R' : 'L'];
    const p = e.pos(dt);
    list.push({ x: p.x, y: p.y, img: frameAt(set.idle, time, i * 2) });
  });
  return list;
}

// Enemies the crawler can see show up on the map as red dots.
function enemyMarks() {
  return level.enemies
    .filter((e) => e.alive && Math.abs(e.x - player.x) + Math.abs(e.y - player.y) <= 8
      && lineOfSight(isWall, player.x, player.y, e.x, e.y))
    .map((e) => ({ x: e.x, y: e.y, color: C.RED }));
}

const stats = { fps: 0, renderMs: 0 };
let last = performance.now();
let statFrames = 0, statTime = 0, statRender = 0;

function loop(now) {
  const frameMs = now - last;
  const dt = Math.min(100, frameMs);
  last = now;

  const queued = player.update(dt);
  if (queued) onAction(queued);
  combatTick(now);

  const cam = player.camera();
  const t0 = performance.now();
  light.update(now, [{ ...LANTERN, x: cam.x, y: cam.y }]);
  caster.render(viewFb, {
    map: level,
    walls: textures.walls,
    flats: textures.flats,
    sprites: spriteList(now, dt),
    light,
    seen: level.seen,
  }, cam, now);
  const renderMs = performance.now() - t0;

  const next = res.sample(renderMs, frameMs, now);
  if (next >= 0) { setResolution(next); showNotice(); }
  if (state.notice && now > state.noticeUntil) state.notice = null;

  const marks = enemyMarks();
  drawOverlay(overlayFb, { level, player, showMap: state.showMap && !invScreen.open, notice: state.notice, marks });
  invScreen.draw(overlayFb, now);
  charScreen.draw(overlayFb, crawler, { steps: player.steps, gold: inventory.gold });
  if (combat) combat.ui.draw(overlayFb, now);
  if (card) { drawFloorCard(overlayFb, card, now); if (cardDone(card, now)) card = null; }
  if (dead) drawGameOver(overlayFb, dead, now);
  updateStatus();
  const menu = combat ? (fb, box) => combat.ui.drawMenu(fb, box, now) : null;
  drawPanel(panelFb, { log, level, player, status, marks, menu });
  viewFb.presentScaled(ctx, 0, 0, SCREEN_W, VIEW_H);
  overlayFb.presentScaled(ctx, 0, 0, SCREEN_W, VIEW_H);
  panelFb.presentScaled(ctx, 0, VIEW_H, SCREEN_W, SCREEN_H - VIEW_H);

  statFrames++; statTime += frameMs; statRender += renderMs;
  if (statTime > 1000) {
    stats.fps = Math.round((statFrames * 1000) / statTime);
    stats.renderMs = +(statRender / statFrames).toFixed(1);
    statFrames = 0; statTime = 0; statRender = 0;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Debug handle for the browser console and automated tests.
window.game = {
  get level() { return level; },
  get run() { return run; },
  enterFloor: (depth) => enterFloor(depth),
  get player() { return player; },
  get state() { return state; },
  get light() { return light; },
  get inventory() { return inventory; },
  get invScreen() { return invScreen; },
  get crawler() { return crawler; },
  get combat() { return combat; },
  get dead() { return dead; },
  get card() { return card; },
  descend,
  log, onAction, stats, engage, restart,
  get resolution() { return { mode: res.mode, ...res.step }; },
  setResolution: (mode) => setResolution(res.setMode(mode)),
};
