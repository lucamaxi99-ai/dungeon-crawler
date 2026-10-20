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
import { Countdown } from './game/countdown.js';
import { Player } from './game/player.js';
import {
  MENU_BOX, MessageLog, drawPanel, drawOverlay, drawBanner,
  HUD_W, OVERLAY_H, PANEL_H, SCREEN_W, SCREEN_H, VIEW_H,
} from './game/hud.js';
import { bindInput } from './game/input.js';
import { line, LINES } from './game/system-ai.js';
import { Inventory } from './game/inventory.js';
import { ITEMS, RARITY_ORDER } from './game/items.js';
import { rollLoot } from './game/loot.js';
import { InventoryScreen } from './game/inventory-ui.js';
import { CharacterScreen } from './game/character-ui.js';
import { Crawler, ATTR_NAMES, LEVELING } from './game/crawler.js';
import { enemyTurns, adjacent, lineOfSight } from './game/enemies.js';
import { Combat } from './game/combat.js';
import { SPELLS } from './game/spells.js';
import { learnFromItem } from './game/learning.js';
import { CombatScreen } from './game/combat-ui.js';
import { drawGameOver, gameOverReady } from './game/gameover-ui.js';
import { drawFloorCard, cardDone, cardSkippable, CARD_MS } from './game/floor-ui.js';
import { rng } from './engine/texgen.js';
import { Achievements } from './game/achievements.js';
import { AchievementPopups } from './game/achievement-ui.js';
import { boxName, BOX_TIERS, openBox } from './game/lootboxes.js';
import { Viewers, VIEWERS, formatViewers } from './game/viewers.js';
import { SafeRoomScreen } from './game/safe-ui.js';
import { mentorGreeting, mentorLine, killerPhrase } from './game/mentor.js';
import { Profile, browserStorage } from './game/profile.js';
import { CAST, Conversation, topicsFor } from './game/dialogue.js';
import { JOB, jobOpen, checkUnlocks, cleanName, NAME_MAX } from './game/jobs.js';
import { CreationScreen } from './game/creation-ui.js';
import { rollStock, buy, sell } from './game/shop.js';
import { merchantLine, MERCHANT } from './game/merchant.js';
import { saveRun, loadRun, clearRun, packSeen, unpackSeen, enemyState, crawlerState, restoreCrawler } from './game/save.js';
import { Enemy } from './game/enemies.js';
import { ACHIEVEMENTS } from './game/achievements.js';
import { sponsorFor, SPONSOR_TIERS, SPONSOR_CHEST_AT } from './game/sponsors.js';

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
// Runs are permadeath: dying (or winning) starts a new run with a new seed,
// a fresh crawler and new floors. In the story every new run is a rerun on
// Borant Encore (GDD 2.1); the profile is what survives (profile.js).
// URL parameters for testing: ?seed=123 fixes the run, ?floor=test plays
// the hand-built test floor, ?fresh=1 forgets the profile.
const params = new URLSearchParams(location.search);
const storage = browserStorage();
const profile = new Profile(storage);
if (params.get('fresh') === '1') { profile.reset(); clearRun(storage); }
let run, level, player, inventory, crawler, invScreen, state, light, decor, enemyRnd, countdown;
let dead = null; // { at, won, killer, depth, level, steps, kills, gold, comment } when the run is over
let card = null; // title card between floors (floor-ui.js)
let banner = null; // big LEVEL UP text; starts once nothing else is on screen
let ach;          // the run's achievements and unopened loot boxes
let viewers;      // the audience (hype model, viewers.js)
const popups = new AchievementPopups();
const safe = new SafeRoomScreen();
const intake = new CreationScreen();
let freshJobs = new Set(); // jobs unlocked at the end of the last run
let nameField = null;      // hidden text field for the crawler's name (intake form)
let hinted = false;        // the controls hint, once per page

function newRun() {
  const fixedSeed = Number(params.get('seed'));
  run = { seed: fixedSeed > 0 ? fixedSeed : 1 + Math.floor(Math.random() * 1e9), depth: 0, safeVisits: 0, boxesOpened: 0, sponsors: [], sponsorsTold: 0 };
  run.number = profile.startRun();
  run.rerun = profile.rerun;
  run.last = profile.last; // how the previous run ended (null for the premiere)
  inventory = new Inventory();
  crawler = new Crawler(inventory);
  invScreen = new InventoryScreen(inventory, crawler);
  ach = new Achievements();
  viewers = new Viewers(crawler.cha);
  popups.clear();
  safe.close();
  dead = null;
  card = null;
  banner = null;
  enterFloor(1);
  // The intake form comes first; ?intake=skip goes straight in (tests).
  intake.show({ name: profile.d.name, rerun: run.rerun, isOpen: (j) => jobOpen(j, profile), fresh: freshJobs, job: profile.d.job });
  if (params.get('intake') === 'skip') beginRun();
}

// The intake form is done: the new body gets its name and job.
function beginRun() {
  stopNaming();
  const job = JOB[intake.job];
  const name = cleanName(intake.name).trim() || 'CRAWLER';
  intake.close();
  crawler.name = name;
  crawler.job = job.id;
  crawler.attrs[job.attr] += 2;
  crawler.hp = crawler.hpMax;
  crawler.mp = crawler.mpMax;
  viewers.cha = crawler.cha;
  profile.d.name = name;
  profile.d.job = job.id;
  profile.save();
  freshJobs = new Set();
  introduce();
  log.push(`Crawler ${name} has entered the dungeon. ${job.intro}`, 'info');
  if (!hinted) log.push(LINES.welcome[1], 'info');
  hinted = true;
  announceGuests();
}

// Builds floor `depth` of the current run and puts the crawler at its start.
// opts.sponsored overrides the sponsored chest (resuming a saved run).
function enterFloor(depth, opts = {}) {
  run.depth = depth;
  profile.reached(depth);
  // Popular crawlers find a sponsored chest on every new floor.
  const sponsored = opts.sponsored ?? (depth > 1 && viewers.count >= SPONSOR_CHEST_AT);
  run.floorSponsored = sponsored;
  const def = params.get('floor') === 'test' ? TEST_FLOOR : generateFloor(depth, run.seed + depth * 7919, { sponsored });
  level = new Level(def);
  const steps = player ? player.steps : 0;
  player = new Player(level.start);
  player.steps = depth === 1 ? 0 : steps;
  state = { showMap: false, bumps: 0, notice: null, noticeUntil: 0 };
  light = new LightMap(level.w, level.h, isWall, TINTS.length);
  for (const a of level.ambient) light.setAmbient(a.x, a.y, a.x + a.w - 1, a.y + a.h - 1, a.ambient, a.tint);
  for (const l of level.lights) light.addLight(l);
  decor = level.decor.map((d, i) => ({ ...d, phase: i * 3 + 1 }));
  enemyRnd = rng(level.seed * 31 + 7);
  countdown = new Countdown(level.turns);
  level.safeRoom = { visits: 0, rested: false };
  level.stairsOpen = countdown.stairsOpen;
}

// One turn off the floor's countdown, with the System's warnings. Returns
// false if the floor collapsed (the run is over).
function spendTurn() {
  for (const ev of countdown.tick()) {
    if (ev.kind === 'stairsOpen') log.push(line('stairsOpen'), 'warn');
    if (ev.kind === 'warn') log.push(line(ev.share <= 0.1 ? 'collapseSoon' : 'countdownWarn').replace('{n}', ev.left), 'warn');
    if (ev.kind === 'collapse') {
      combat = null;
      endRun({ killer: 'the floor collapse', comment: line('collapse') });
      return false;
    }
  }
  level.stairsOpen = countdown.stairsOpen;
  return true;
}
// A run saved in a Safe Room comes back there (and the save is used up).
const savedRun = params.get('fresh') === '1' ? null : loadRun(storage);
if (savedRun) resumeRun(savedRun); else newRun();

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
    } else {
      if (state.bumps % 4 === 1) log.push(line('bumpWall'));
      note('bump');
    }
  },
  onEnter(x, y) {
    const o = level.objectAt(x, y);
    if (o && o.type === 'bones' && !o.flags.seen) {
      o.flags.seen = true;
      log.push(line('bones'), 'info');
    }
    if (level.bagAt(x, y)) log.push(line('bagHere'), 'info');
    note('step', { steps: player.steps });
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
  if (w === WALL.SAFE) return enterSafeRoom();
  const o = level.objectAt(f.x, f.y);
  if (o && SPRITES[o.type].chest) return openChest(o);
  if (o) {
    if (o.type === 'barrel') note('barrel');
    return log.push(LINES[o.type] ? line(o.type) : o.type.endsWith('Corpse') ? line('corpse') : line('bumpObject'));
  }
  const ownBag = level.bagAt(player.x, player.y);
  if (ownBag) return pickUp(ownBag);
  if (!w) {
    log.push(line('nothing'), 'info');
    note('wave');
  }
}

// The first SPACE at the stairwell asks, the second one descends (so a
// stray key never skips a floor). After the last floor the run is won.
function useStairs(cell) {
  if (!countdown.stairsOpen) {
    note('lockedStairs');
    return log.push(line('stairsLocked').replace('{n}', countdown.stairsIn), 'warn');
  }
  const key = `${cell.x},${cell.y},${player.x},${player.y}`;
  if (state.stairsAsked !== key) {
    state.stairsAsked = key;
    return log.push(line(run.depth >= FINAL_DEPTH ? 'finalStairs' : 'stairs'), 'warn');
  }
  gainXp(LEVELING.stairsXp(run.depth), 'stairs');
  note('floorDone', { turnsShare: countdown.left / countdown.total, allDead: level.enemies.every((e) => !e.alive), safeVisited: level.safeRoom.visits > 0 });
  if (run.depth >= FINAL_DEPTH) {
    note('won');
    return endRun({ won: true });
  }
  log.push(line('descend'));
  descend();
}

function descend() {
  const depth = run.depth + 1;
  enterFloor(depth);
  const comment = line(depth >= FINAL_DEPTH ? 'finalFloor' : 'floorArrive').replace('{n}', depth);
  card = { at: performance.now(), title: level.name.toUpperCase(), sub: depth >= FINAL_DEPTH ? 'SEASON FINALE' : '', comment };
  log.push(comment);
  if (level.objects.some((o) => o.type === 'sponsoredChest')) log.push(line('sponsorChest'), 'warn');
  announceGuests();
}

// The System plugs the floor's miniboss like a game-show guest.
function announceGuests() {
  const boss = level.enemies.find((e) => e.alive && e.stats.rank === 'miniboss');
  if (boss) log.push(line('minibossFloor').replace('{name}', boss.name).replace(/\ba ([AEIOU])/g, 'an $1'), 'warn');
}

// The run is over: died in combat (killer), or survived the last floor (won).
function endRun({ won = false, killer = '', comment = line(won ? 'victory' : 'death') }) {
  player.queued = null;
  state.showMap = false;
  if (invScreen.open) invScreen.toggle();
  if (charScreen.open) charScreen.toggle();
  clearRun(storage);
  const { record } = profile.endRun({ won, depth: run.depth, killer, level: crawler.level, kills: crawler.kills });
  const unlocked = checkUnlocks(profile);
  freshJobs = new Set(unlocked.map((j) => j.id));
  dead = {
    unlocked: unlocked.map((j) => j.name),
    at: performance.now(), won, killer, depth: run.depth, level: crawler.level, steps: player.steps, kills: crawler.kills,
    gold: inventory.gold, comment, viewers: formatViewers(viewers.peak), achievements: ach.unlocked.length,
    record, nextRerun: profile.runs,
  };
  log.push(comment);
}

// ------------------------------------------------------------ experience

// Experience from a kill or a stairwell. A level-up shows a banner (after
// the fight, if there is one) and points the crawler to the stats sheet.
function gainXp(n, why) {
  const ups = crawler.gainXp(n);
  log.push(`+${n} XP${why === 'stairs' ? ' for surviving the floor' : ''}.`, 'info');
  if (!ups) return;
  note('level', { level: crawler.level });
  log.push(line('levelUp').replace('{n}', crawler.level).replace('{p}', crawler.points));
  if (combat) {
    combat.ui.float('LEVEL UP!', C.YELLOW, 160, 30, performance.now());
    state.levelUpAfterFight = true;
  } else {
    showLevelBanner();
  }
}

function showLevelBanner() {
  banner = { text: 'LEVEL UP', sub: `LEVEL ${crawler.level}  -  SPEND POINTS IN A SAFE ROOM`, at: null };
  if (!state.saidSafeHint && !run.safeVisits) { state.saidSafeHint = true; log.push(line('safeHint'), 'info'); }
}

// Casts a spell outside combat (from the skills tab). Only spells that work
// on the crawler itself (Mend); costs mana and one turn, and it trains.
function castOutside(id) {
  const def = SPELLS[id];
  if (!def) return;
  const p = def.act(crawler.spells.level(id), crawler);
  if (p.target !== 'self') return log.push(`${def.name} needs a target. Save it for a fight.`, 'info');
  if (p.heal && crawler.hp >= crawler.hpMax) { note('wastedHeal'); return log.push(line('healFull'), 'info'); }
  if (crawler.mp < def.mp) return log.push(line('noMana'), 'info');
  crawler.mp -= def.mp;
  const n = crawler.heal(p.heal || 0);
  log.push(`You cast ${def.name}. -${def.mp} MP, +${n} HP.`, 'info');
  log.push(line('castOutside'));
  const up = crawler.spells.train(id);
  if (up) skillUp(def.name, up);
  if (!safe.open) afterTurn(); // time stands still in a Safe Room
}

// Spends one attribute point on the stats sheet.
function raiseAttr(attr) {
  if (!crawler.raise(attr)) return;
  log.push(`${ATTR_NAMES[attr]} +1 (now ${crawler[attr]}).`, 'info');
  viewers.cha = crawler.cha;
  if (!crawler.points) log.push(line('pointsSpent'));
}

// A skill or spell went up a level.
function skillUp(name, n) {
  log.push(line('skillUp').replace('{name}', name).replace(/\ba ([AEIOU])/g, 'an $1').replace('{n}', n));
  note('skillUp', { level: n });
}

// ------------------------------------------------------------ the show

// Something worth noticing happened. The achievements hear about it; an
// unlock shows a pop-up, the System's verdict in the log, and the reward:
// a loot box for later (Safe Room) or an item right away.
function note(kind, data) {
  hype(kind, data);
  for (const a of ach.note(kind, data)) {
    hype('achievement', { tier: a.reward && a.reward.box ? BOX_TIERS.indexOf(a.reward.box) : 0 });
    popups.push(a);
    log.push(`Achievement unlocked: ${a.name}!`, 'warn');
    log.push(a.text);
    if (a.reward && a.reward.box) log.push(`Reward: ${boxName(a.reward.box)}. Loot boxes are opened in a Safe Room.`, 'info');
    if (a.reward && a.reward.item) {
      inventory.add(a.reward.item);
      log.push(`Reward: ${ITEMS[a.reward.item].name}. It is in your inventory.`, 'info');
    }
  }
}

// The audience reacts to an event; crossing a big round number is news.
function hype(kind, data) {
  const r = viewers.note(kind, data);
  if (r.gain > 0) state.viewersAt = performance.now();
  for (const n of r.crossed) {
    log.push(line('viewersMilestone').replace('{n}', n.toLocaleString('en-US')), 'warn');
    newSponsor(VIEWERS.thresholds.indexOf(n));
  }
  if (r.gain > 0) note('viewers', { count: viewers.count });
}

// A sponsor answers a viewer threshold with a sponsored loot box (better
// odds for tomes and skill potions; bigger audience, bigger box).
function newSponsor(index) {
  const sponsor = sponsorFor(index, run.seed);
  const tier = SPONSOR_TIERS[Math.min(index, SPONSOR_TIERS.length - 1)];
  ach.boxes.push({ tier, sponsored: true, from: sponsor.name });
  run.sponsors.push(sponsor.name);
  popups.push({ head: 'NEW SPONSOR!', name: sponsor.short, reward: { box: tier, sponsored: true } });
  log.push(line('sponsorNew').replace('{name}', sponsor.name).replace(/\ba ([AEIOU])/g, 'an $1').replace('{tier}', boxName(tier).replace(' Box', '')), 'warn');
  log.push(`${sponsor.name}: "${sponsor.msg}"`, 'info');
  note('sponsor');
}

// The inventory changed in a way achievements care about.
function noteBag() {
  note('bag', { tails: inventory.count('ratTail') });
}

const itemLabel = ({ id, n }) => (n > 1 ? `${n}x ${ITEMS[id].name}` : ITEMS[id].name);

// ------------------------------------------------------------ safe room

// Time stops in here: no turns pass, no enemy moves. The crawler spends
// points, opens loot boxes, looks at achievements and rests once.
function enterSafeRoom() {
  player.queued = null;
  state.showMap = false;
  if (invScreen.open) invScreen.toggle();
  if (charScreen.open) charScreen.toggle();
  const greeting = mentorGreeting({
    visits: run.safeVisits, floorVisits: level.safeRoom.visits, depth: run.depth,
    hpShare: crawler.hp / crawler.hpMax, points: crawler.points, boxes: ach.boxes.length,
    kills: crawler.kills, viewers: viewers.shown,
    newSponsor: run.sponsors.length > run.sponsorsTold ? run.sponsors[run.sponsors.length - 1] : null,
    rerun: run.rerun, last: run.last, met: profile.hasSeen('ozzleMet'), explained: profile.hasSeen('rerunExplained'),
    timesKilled: run.last ? profile.timesKilledBy(run.last.killer) : 0,
  });
  if (!run.safeVisits && run.rerun > 0 && run.last && profile.hasSeen('ozzleMet')) profile.see('rerunExplained');
  profile.see('ozzleMet');
  run.sponsorsTold = run.sponsors.length;
  run.safeVisits++;
  level.safeRoom.visits++;
  safe.enter(greeting, performance.now());
  log.push(line('safeEnter'));
  note('safeRoom');
}

function leaveSafeRoom() {
  const bye = mentorLine('leave');
  safe.close();
  log.push(`Ozzle: "${bye}"`, 'info');
  log.push(line('safeLeave'));
}

// What conversations know about the crawler (dialogue.js).
function talkContext() {
  return { profile, rerun: run.rerun, deaths: profile.deaths, vars: { t: profile.deaths } };
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Back to the topic list, with Ozzle's remark.
function showTopics(say) {
  safe.page = 'topics';
  safe.convo = null;
  safe.topics = topicsFor('ozzle', talkContext());
  safe.topicCursor = Math.min(safe.topicCursor, safe.topics.length);
  safe.talk(say, performance.now());
}

// Keys while talking: pick a topic, then replies.
function onTalkAction(action, dir) {
  const now = performance.now();
  if (safe.page === 'topics') {
    if (dir) return safe.move(dir);
    if (action === 'close') { safe.page = 'menu'; return; }
    if (action !== 'interact') return;
    const topic = safe.topics[safe.topicCursor];
    if (!topic) { safe.page = 'menu'; return; }
    safe.convo = new Conversation('ozzle', topic, talkContext());
    safe.replyCursor = 0;
    safe.page = 'talk';
    note('talk', { topic: topic.id });
    return safe.talk(safe.convo.text, now);
  }
  if (action === 'close') return showTopics(pick(CAST.ozzle.close));
  if (action === 'interact' && safe.typing(now)) return safe.skipTyping();
  if (safe.typing(now)) return;
  if (dir) return safe.move(dir);
  if (action !== 'interact') return;
  if (safe.convo.choose(safe.replyCursor)) {
    safe.replyCursor = 0;
    return safe.talk(safe.convo.text, now);
  }
  showTopics(pick(CAST.ozzle.close));
}

// ------------------------------------------------------------ trading

// Sal takes over the counter. The shelf is rolled once per floor.
function openShop() {
  if (!level.safeRoom.stock) level.safeRoom.stock = rollStock(run.seed, run.depth);
  safe.page = 'shop';
  safe.shopTab = 'buy';
  safe.shopCursor = 0;
  const met = profile.hasSeen('merchantMet');
  const topic = !met ? 'hello' : !run.shopVisits && run.rerun ? 'helloRerun' : 'helloAgain';
  profile.see('merchantMet');
  run.shopVisits = (run.shopVisits || 0) + 1;
  safe.talk(merchantLine(topic), performance.now());
  log.push(line('shopOpen'), 'info');
}

function closeShop() {
  log.push(`${MERCHANT.name}: "${merchantLine('bye')}"`, 'info');
  safe.page = 'menu';
  safe.talk(mentorLine('afterShop'), performance.now());
}

const shopList = () => (safe.shopTab === 'buy' ? level.safeRoom.stock : inventory.bag);

// SPACE on the selected line: buy it, or sell one of it.
function trade() {
  const now = performance.now();
  const i = safe.shopCursor;
  if (safe.shopTab === 'buy') {
    const r = buy(level.safeRoom.stock, i, inventory, crawler.cha);
    if (!r.ok) return safe.talk(merchantLine(r.why, { g: r.price }), now);
    log.push(`Bought ${ITEMS[r.id].name} for ${r.price} gold.`, 'loot');
    note('buy', { id: r.id, price: r.price });
    return safe.talk(merchantLine('buy'), now);
  }
  if (!inventory.bag.length) return safe.talk(merchantLine('nothing'), now);
  const r = sell(inventory, i, crawler.cha);
  if (!r.ok) return;
  log.push(`Sold ${ITEMS[r.id].name} for ${r.price} gold.`, 'loot');
  note('sell', { id: r.id, price: r.price, junk: r.junk });
  safe.talk(merchantLine(r.junk ? 'sellJunk' : 'sell', { g: r.price, i: ITEMS[r.id].name }), now);
}

function onShopAction(action, dir) {
  if (dir === 'left' || dir === 'right') return safe.move(dir);
  if (dir) return safe.move(dir, 0, shopList().length);
  if (action === 'interact') return trade();
  if (action === 'close') return closeShop();
}

// ------------------------------------------------------------ save and quit

// Everything about the run that the floor's seed can not rebuild.
function snapshot() {
  return {
    run,
    level: {
      objects: level.objects.map((o) => ({ ...o, flags: { ...o.flags, openedAt: o.flags.openedAt == null ? undefined : -1e9 } })),
      enemies: level.enemies.map(enemyState),
      seen: packSeen(level.seen),
      safeRoom: level.safeRoom,
    },
    player: { x: player.x, y: player.y, dir: player.dir, steps: player.steps },
    countdown: { total: countdown.total, left: countdown.left, openAfter: countdown.openAfter, warned: countdown.warned },
    inventory: { bag: inventory.bag, equip: inventory.equip, gold: inventory.gold },
    crawler: crawlerState(crawler),
    ach: { s: ach.s, unlocked: ach.unlocked, boxes: ach.boxes },
    viewers: { count: viewers.count, peak: viewers.peak, quiet: viewers.quiet, trend: 0, passed: viewers.passed },
  };
}

function suspendRun() {
  if (!saveRun(storage, snapshot())) return safe.talk(mentorLine('saveFailed'), performance.now());
  safe.page = 'saved';
  safe.talk(mentorLine('suspend'), performance.now());
  log.push(line('suspend'), 'info');
}

// Back from the break: the save is used up, the run goes on.
function unsuspend() {
  clearRun(storage);
  safe.page = 'menu';
  safe.talk(mentorLine('unsuspend'), performance.now());
}

// Rebuilds a saved run and puts the crawler back in the Safe Room.
function resumeRun(snap) {
  clearRun(storage);
  run = snap.run;
  inventory = new Inventory();
  Object.assign(inventory, structuredClone(snap.inventory));
  crawler = restoreCrawler(new Crawler(inventory), snap.crawler);
  invScreen = new InventoryScreen(inventory, crawler);
  ach = new Achievements();
  Object.assign(ach, structuredClone(snap.ach));
  viewers = new Viewers(crawler.cha);
  Object.assign(viewers, snap.viewers);
  popups.clear();
  safe.close();
  dead = null;
  card = null;
  banner = null;
  enterFloor(run.depth, { sponsored: run.floorSponsored });
  level.objects = snap.level.objects;
  level.enemies = snap.level.enemies.map((e) => Object.assign(new Enemy(e.type, e.home.x, e.home.y), e));
  unpackSeen(snap.level.seen, level.seen);
  level.safeRoom = snap.level.safeRoom;
  Object.assign(countdown, snap.countdown);
  level.stairsOpen = countdown.stairsOpen;
  Object.assign(player, snap.player);
  hinted = true;
  safe.enter(mentorLine('resume'), performance.now());
  log.push(line('resume').replace('{name}', crawler.name || 'Crawler'));
}

// A choice on the Safe Room terminal.
function safeCommand(id) {
  const now = performance.now();
  if (id === 'leave') return leaveSafeRoom();
  if (id === 'save') return suspendRun();
  if (id === 'shop') return openShop();
  if (id === 'talk') {
    safe.topicCursor = 0;
    return showTopics(pick(CAST.ozzle.open));
  }
  if (id === 'levelup') {
    if (!crawler.points) return safe.talk(mentorLine('noPoints'), now);
    charScreen.canSpend = true;
    state.levelAtSpend = crawler.points;
    return charScreen.toggle('stats');
  }
  if (id === 'achievements') {
    safe.page = 'achievements';
    return safe.talk(mentorLine('achievements'), now);
  }
  if (id === 'boxes') {
    if (!ach.boxes.length) return safe.talk(mentorLine('noBoxes'), now);
    safe.page = 'boxes';
    safe.boxCursor = 0;
    return safe.talk(mentorLine('boxPick'), now);
  }
  if (id === 'rest') {
    if (level.safeRoom.rested) return safe.talk(mentorLine('rested'), now);
    level.safeRoom.rested = true;
    const hp = crawler.hpMax - crawler.hp, mp = crawler.mpMax - crawler.mp;
    crawler.hp = crawler.hpMax;
    crawler.mp = crawler.mpMax;
    log.push(`You rest. +${hp} HP, +${mp} MP.`, 'info');
    note('rest');
    return safe.talk(mentorLine('rest'), now);
  }
}

// Opens the selected loot box: the loot goes straight into the inventory,
// the screen plays the opening and shows what was inside.
function openSelectedBox() {
  const now = performance.now();
  const [box] = ach.boxes.splice(safe.boxCursor, 1);
  if (!box) return;
  run.boxesOpened++;
  const loot = openBox(box, run.seed * 31 + run.boxesOpened * 7919);
  inventory.gold += loot.gold;
  for (const { id, n } of loot.items) inventory.add(id, n);
  safe.opening = { box, loot, at: now };
  log.push(`Opened: ${boxName(box.tier, box.sponsored)}. Inside: ${[...loot.items.map(itemLabel), `${loot.gold} gold`].join(', ')}.`, 'info');
  const best = Math.max(0, ...loot.items.map(({ id }) => RARITY_ORDER.indexOf(ITEMS[id].rarity)));
  const learned = loot.items.some(({ id }) => ITEMS[id].teach || ITEMS[id].skillPotion);
  safe.talk(mentorLine(best >= 3 ? 'boxGreat' : learned ? 'boxLearn' : 'boxOpen'), now, 1750);
  note('boxOpened', { tier: BOX_TIERS.indexOf(box.tier) });
  noteBag();
}

// Keys while in the Safe Room (the character sheet and the inventory can
// be opened on top of it).
function onSafeAction(action) {
  if (charScreen.open) return onCharacterAction(action);
  if (action === 'inventory' || invScreen.open) {
    if (!invScreen.open) return invScreen.toggle();
    return onInventoryAction(action);
  }
  const dir = { forward: 'up', back: 'down', turnLeft: 'left', turnRight: 'right', left: 'left', right: 'right' }[action];
  if (safe.page === 'topics' || safe.page === 'talk') return onTalkAction(action, dir === 'up' || dir === 'down' ? dir : null);
  if (safe.page === 'shop') return onShopAction(action, dir);
  if (safe.page === 'saved') { if (action === 'interact' || action === 'close') unsuspend(); return; }
  if (safe.page === 'achievements') {
    if (dir) return safe.move(dir, ACHIEVEMENTS.length);
    if (['close', 'interact', 'character'].includes(action)) safe.page = 'menu';
    return;
  }
  if (safe.page === 'boxes') {
    if (safe.opening) {
      if (safe.openingBusy(performance.now()) || !['interact', 'close'].includes(action)) return;
      safe.opening = null;
      if (!ach.boxes.length) safe.page = 'menu';
      return;
    }
    if (dir) return safe.move(dir, ACHIEVEMENTS.length, ach.boxes.length);
    if (action === 'interact') return openSelectedBox();
    if (action === 'close') safe.page = 'menu';
    return;
  }
  if (dir) return safe.move(dir);
  if (action === 'interact') return safeCommand(safe.selected());
  if (action === 'character') return safeCommand('levelup');
  if (action === 'close') return leaveSafeRoom();
}

// The character sheet's keys. Points can only be spent while it was
// opened from a Safe Room (canSpend).
function onCharacterAction(action) {
  const dir = { forward: 'up', back: 'down', left: 'left', turnLeft: 'left', right: 'right', turnRight: 'right' }[action];
  if (dir) return charScreen.move(dir, crawler.spells.list().length);
  if (action === 'interact' && charScreen.tab === 'skills') return castOutside(crawler.spells.list()[charScreen.spellCursor]);
  if (action === 'interact' && crawler.points > 0 && charScreen.canSpend) return raiseAttr(charScreen.selected());
  if (['character', 'close', 'interact', 'inventory'].includes(action)) closeCharacter();
}

function closeCharacter() {
  if (charScreen.open) charScreen.toggle();
  if (charScreen.canSpend && safe.open && state.levelAtSpend > crawler.points) safe.talk(mentorLine('levelUp'), performance.now());
  charScreen.canSpend = false;
}

// ------------------------------------------------------------ inventory

function pickUp(bag) {
  for (const { id, n } of bag.items) inventory.add(id, n);
  level.removeObject(bag);
  log.push(`Picked up: ${bag.items.map(itemLabel).join(', ')}.`, 'info');
  log.push(line('pickup'));
  noteBag();
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
  note('drop');
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
    log.push(line('equip'));
    return note('gear', { equip: inventory.equip });
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
  if (def.teach || def.skillPotion) return study(index, def);
  if (def.heal && crawler.hp >= crawler.hpMax) {
    log.push(line('healFull'), 'info');
    note('wastedHeal');
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

// Reads a tome or drinks a skill potion: a new skill or spell, or one
// level more of one the crawler knows. Kept if there is nothing to learn.
function study(index, def) {
  const r = learnFromItem(crawler, def);
  if (r.kind === 'none') { log.push(line('nothingToLearn'), 'info'); return false; }
  inventory.use(index);
  log.push(`Used: ${def.name}.`, 'info');
  announceLearned(r);
  note('learn');
  return true;
}

// Log lines (and a banner) for a skill or spell learned or improved.
function announceLearned(r, how = '') {
  if (r.kind === 'learn') {
    log.push(`New ${r.what}: ${r.name}!`, 'info');
    log.push(line(how || (r.what === 'spell' ? 'learnSpell' : 'learnSkill')).replace('{name}', r.name).replace(/\ba ([AEIOU])/g, 'an $1'));
    banner = { text: r.what === 'spell' ? 'NEW SPELL' : 'NEW SKILL', sub: `${r.name.toUpperCase()}  -  SEE C, SKILLS`, at: null };
  } else if (r.kind === 'boost') {
    skillUp(r.name, r.level);
  }
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
  note('chest');
  noteBag();
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
  if (intake.open) return onIntakeAction(action);
  if (card) {
    if ((action === 'interact' || action === 'close') && cardSkippable(card, performance.now())) card.at = Math.min(card.at, performance.now() - CARD_MS);
    return;
  }
  if (combat) return onCombatAction(action);
  if (safe.open) return onSafeAction(action);
  if (charScreen.open) return onCharacterAction(action);
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
  if (!spendTurn()) return;
  if (crawler.tick() && crawler.hp === crawler.hpMax) log.push(line('regenFull'), 'info');
  if (viewers.tick().bored) log.push(line('viewersBored'), 'warn');
  const blocked = (x, y) => { const o = level.objectAt(x, y); return !!(o && SPRITES[o.type].solid); };
  const events = enemyTurns(level.enemies, { isWall, blocked }, player, enemyRnd);
  for (const ev of events) {
    if (ev.kind === 'notice') log.push(line(ev.enemy.hunter ? 'hunterNotice' : 'enemyNotice').replace('{name}', ev.enemy.name).replace(/\ba ([AEIOU])/g, 'an $1'), 'warn');
    if (ev.kind === 'giveUp') log.push(line(ev.reason === 'territory' ? 'enemyGiveUp' : 'enemyLostTrail').replace('{name}', ev.enemy.name).replace(/\ba ([AEIOU])/g, 'an $1'), 'info');
    if (ev.kind === 'ambush') log.push(line('ambush').replace('{name}', ev.enemy.name).replace(/\ba ([AEIOU])/g, 'an $1'), 'warn');
  }
  const foe = events.find((ev) => ev.kind === 'ambush') || events.find((ev) => ev.kind === 'engage');
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
  const foes = [foe, ...level.enemies.filter((e) => e !== foe && e.alive && e.alerted && !e.fear && adjacent(e, player))].slice(0, 3);
  if (foe.disguised) log.push(line('ambush').replace('{name}', foe.name), 'warn');
  for (const e of foes) { e.alerted = true; e.disguised = false; e.move = null; }
  const fight = new Combat(crawler, foes, { initiator, purse: () => inventory.gold });
  const now = performance.now();
  combat = { fight, ui: new CombatScreen({ fight, scene: stageFor(foe), tables, inventory, now }), nextAt: now + PACE.start, endAt: 0 };
  const same = foes.every((e) => e.type === foe.type);
  const kin = foes.every((e) => e.stats.family === foe.stats.family);
  const name = foes.length === 1 ? foe.name : same ? `pack of ${foes.length} ${foe.name}s` : kin ? `squad of ${foes.length} ${foe.stats.family}s` : `mob of ${foes.length}`;
  log.push(line(initiator === 'crawler' ? 'combatStartCrawler' : 'combatStartEnemy').replace('{name}', name).replace(/\ba ([AEIOU])/g, 'an $1'), 'warn');
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
    if (def.heal && crawler.hp >= crawler.hpMax) { note('wastedHeal'); return log.push(line('healFull'), 'info'); }
    inventory.use(choice.index);
    events = fight.crawlerAct({ kind: 'item', name: def.name, healed: crawler.heal(def.heal) });
  } else {
    events = fight.crawlerAct(choice);
  }
  report(events);
  ui.onEvents(events, now);
  combat.nextAt = now + PACE.afterCrawler;
  spendTurn();
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
        if (!mine) {
          combat.hurt = true;
          if (!combat.warnedLow && crawler.alive && crawler.hp <= crawler.hpMax / 4) {
            combat.warnedLow = true;
            log.push(line('lowHp'), 'warn');
          }
        }
        if (ev.blast) log.push(mine ? `The blast hits the ${foe.name} for ${ev.amount}.` : `The blast hits you for ${ev.amount}.`, mine ? 'info' : 'warn');
        else if (ev.special === 'bomb') log.push(`The bomb goes off in your face. ${ev.amount} damage.`, 'warn');
        else if (ev.special === 'spit') log.push(`Acid! It burns for ${ev.amount}.`, 'warn');
        else log.push(mine ? `You hit the ${foe.name} for ${ev.amount}.` : `The ${foe.name} ${foe.stats.verb} you for ${ev.amount}.`, mine ? 'info' : 'warn');
        if (ev.crack) log.push(line('crack'));
        break;
      case 'crit':
        log.push(`You hit the ${foe.name} for ${ev.amount}.`, 'info');
        if (ev.crack) log.push(line('crack'));
        log.push(line('crit'));
        note('crit');
        break;
      case 'miss':
        log.push(mine ? `You miss the ${foe.name}.` : ev.special === 'spit' ? `The ${foe.name} spits and misses.` : ev.special === 'bomb' ? 'The bomb lands behind you. Lucky.' : `The ${foe.name} misses.`, 'info');
        break;
      case 'throw':
        log.push(ev.what === 'bomb' ? `The ${foe.name} lights a fuse and throws.` : `The ${foe.name} hawks up something green.`, 'warn');
        break;
      case 'blast':
        log.push(`The ${ev.actor.name} explodes!`, 'warn');
        log.push(line('blast'));
        break;
      case 'mend':
        log.push(`The ${ev.actor.name} patches up the ${ev.target.name}. +${ev.amount} HP.`, 'warn');
        break;
      case 'curse':
        log.push(ev.status === 'hex' ? `The ${ev.actor.name} hexes you. Your aim goes wobbly.` : 'You can barely see.', 'warn');
        break;
      case 'steal':
        inventory.gold -= ev.amount;
        log.push(`The ${ev.actor.name} lifts ${ev.amount} gold from your pockets.`, 'warn');
        log.push(line('steal'));
        break;
      case 'escape':
        log.push(`The ${ev.actor.name} makes a run for it with your gold.`, 'warn');
        break;
      case 'rout':
        if (!ev.leader.routSaid) {
          ev.leader.routSaid = true;
          log.push(line('rout').replace('{name}', ev.leader.name).replace(/\ba ([AEIOU])/g, 'an $1'), 'warn');
        }
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
        log.push(line(foe.stats.rank === 'miniboss' ? 'minibossDown' : 'kill').replace('{name}', foe.name).replace(/\ba ([AEIOU])/g, 'an $1'));
        if (foe.loot) {
          inventory.gold += foe.loot;
          log.push(`You get your ${foe.loot} gold back.`, 'info');
          foe.loot = 0;
        }
        note('kill', { type: foe.type, rank: foe.stats.rank, family: foe.stats.family, unarmed: crawler.weapon === 'unarmed', blast: !!ev.blast });
        gainXp(foe.stats.xp || 0);
        break;
      case 'flee':
        log.push(line('fled'));
        note('flee');
        break;
      case 'fleeFail':
        log.push(line('fleeFail').replace('{name}', combat.fight.alive[0].name).replace(/\ba ([AEIOU])/g, 'an $1'), 'warn');
        break;
      case 'death':
        log.push('You die.', 'warn');
        break;
      case 'skill':
        log.push(`You use ${ev.name}.`, 'info');
        note('skill', { id: ev.id });
        break;
      case 'cast':
        log.push(`You cast ${ev.name}. -${ev.amount} MP.`, 'info');
        break;
      case 'heal':
        log.push(ev.amount ? `+${ev.amount} HP.` : 'You are already in one piece.', 'info');
        break;
      case 'status':
        log.push(`The ${foe.name} is ${{ daze: 'dazed', blind: 'blinded', hex: 'hexed' }[ev.status]}.`, 'info');
        if (ev.status === 'daze' || ev.status === 'blind') log.push(line(ev.status === 'daze' ? 'dazeDone' : 'blindDone'));
        break;
      case 'dazed':
        log.push(`The ${ev.actor.name} is still seeing stars.`, 'info');
        break;
      case 'skillUp':
        skillUp(ev.name, ev.level);
        break;
      default:
    }
  }
}

function endCombat() {
  const { fight, hurt } = combat;
  combat = null;
  if (state.levelUpAfterFight && fight.result !== 'lost') showLevelBanner();
  state.levelUpAfterFight = false;
  // Whoever ran away (lost its leader, or off with your gold) keeps running
  // on the map for a while. The rest of a routed squad joins them.
  const ranOff = fight.enemies.filter((e) => e.alive && fight.out.has(e));
  for (const e of ranOff) scatter(e, e.loot ? 40 : 25);
  for (const e of ranOff.filter((r) => !r.loot && r.group !== null)) {
    for (const m of level.enemies) if (m.alive && m.group === e.group && !fight.enemies.includes(m)) scatter(m, 25);
  }
  if (fight.result === 'won') {
    const got = {};
    let gold = 0;
    for (const e of fight.enemies) {
      if (e.alive) continue;
      level.objects.push({ type: `${e.stats.sprite}Corpse`, x: e.x, y: e.y, flags: {} });
      for (const [id, chance] of e.stats.drops) if (Math.random() < chance) { inventory.add(id); got[id] = (got[id] || 0) + 1; }
      const [g0, g1] = e.stats.gold;
      gold += g0 + Math.floor(Math.random() * (g1 - g0 + 1));
      if (e.stats.loot) {
        const extra = rollLoot(e.stats.loot, Math.floor(Math.random() * 1e9));
        gold += extra.gold;
        for (const { id, n } of extra.items) { inventory.add(id, n); got[id] = (got[id] || 0) + n; }
      }
    }
    inventory.gold += gold;
    const loot = Object.entries(got).map(([id, n]) => itemLabel({ id, n }));
    if (gold) loot.push(`${gold} gold`);
    log.push(`Loot: ${loot.length ? loot.join(', ') : 'nothing'}.`, 'info');
    log.push(line('combatWon'));
    const closeCall = crawler.hp <= crawler.hpMax / 4;
    if (closeCall) log.push(line('closeCall'));
    note('fightWon', { hp: crawler.hp, foes: fight.enemies.length, hurt: !!hurt, closeCall });
    noteBag();
  } else if (fight.result === 'lost') {
    const killer = fight.enemies.find((e) => e.alive) || fight.enemies[0];
    endRun({ killer: killer.name });
  } else if (fight.result === 'fled') {
    // Stumble one cell away; the enemies need two turns to react. Whether
    // they follow depends on their territory (leash) and tracking. Some
    // hold a grudge and follow anywhere from now on.
    for (const e of fight.alive) {
      e.stun = 2;
      if (e.stats.traits.grudge && !e.hunts) { e.hunts = true; log.push(line('grudge').replace('{name}', e.name).replace(/\ba ([AEIOU])/g, 'an $1'), 'warn'); }
    }
    const options = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => ({ x: player.x + dx, y: player.y + dy }))
      .filter((c) => world.canEnter(c.x, c.y))
      .map((c) => ({ ...c, d: Math.min(...fight.alive.map((e) => Math.abs(e.x - c.x) + Math.abs(e.y - c.y))) }))
      .sort((a, b) => b.d - a.d);
    if (options.length) player.shove(options[0].x, options[0].y);
  }
}

// An enemy runs off (fear: turns it keeps running away from the crawler).
function scatter(e, fear) {
  e.fear = fear;
  e.alerted = false;
  e.returning = false;
  e.move = null;
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
  if (intake.open) {
    const p = hudPoint(e);
    if (p.y >= OVERLAY_H) return;
    if (intake.editing) { stopNaming(); return; }
    const what = intake.hit(p.x, p.y);
    if (what === 'edit') startNaming();
    if (what === 'start') beginRun();
    return;
  }
  if (dead || card) { e.preventDefault(); return onAction('interact'); }
  if (charScreen.open) {
    e.preventDefault();
    const p = hudPoint(e);
    const t = charScreen.hit(p.x, p.y);
    if (t.kind === 'tab') return;
    if (t.kind === 'cast') return castOutside(crawler.spells.list()[t.index]);
    if (t.kind === 'raise') { if (crawler.points > 0 && charScreen.canSpend) raiseAttr(t.attr); return; }
    if (t.kind === 'button' || !crawler.points || !charScreen.canSpend) closeCharacter();
    return;
  }
  if (safe.open && !invScreen.open) {
    e.preventDefault();
    const p = hudPoint(e);
    if (p.y >= OVERLAY_H) return;
    const t = safe.hit(p.x, p.y);
    if (!t) return;
    if (t.kind === 'back') { if (safe.page === 'talk' || safe.page === 'shop') onSafeAction('close'); else safe.page = 'menu'; }
    else if (t.kind === 'ware') {
      const i = (safe.shopTop || 0) + t.row;
      if (i >= shopList().length) return;
      if (i === safe.shopCursor) trade(); else safe.shopCursor = i;
    }
    else if (t.kind === 'menu') safeCommand(t.id);
    else if (t.kind === 'topic' || t.kind === 'reply') onSafeAction('interact');
    else if (t.kind === 'continue') onSafeAction('interact');
    else if (t.kind === 'box') {
      const top = Math.max(0, Math.min(safe.boxCursor - 7, ach.boxes.length - 8));
      const i = top + t.row;
      if (i >= ach.boxes.length) return;
      if (i === safe.boxCursor) openSelectedBox(); else safe.boxCursor = i;
    }
    return;
  }
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
// Phones only raise the keyboard for a focus inside a click.
canvas.addEventListener('click', () => {
  if (intake.open && intake.editing && nameField && document.activeElement !== nameField) nameField.focus();
});
canvas.addEventListener('wheel', (e) => {
  if (!invScreen.open) return;
  e.preventDefault();
  invScreen.select({ kind: 'scroll', delta: Math.sign(e.deltaY) });
}, { passive: false });
// The System's opening words: a welcome for the premiere, a "previously
// on" for every rerun.
function introduce() {
  if (!run.rerun) return log.push(LINES.welcome[0]);
  log.push(line('rerun').replace('{n}', run.rerun));
  const last = run.last;
  if (last) log.push(last.won ? line('previouslyWon') : line('previously').replace('{k}', killerPhrase(last.killer)).replace('{d}', last.depth), 'info');
}
function restart() {
  newRun();
}

// ------------------------------------------------------------ intake form

// The crawler's name is typed into a hidden text field, so phones show
// their keyboard; the intake form only draws what is in it.
function makeNameField() {
  const f = Object.assign(document.createElement('input'), {
    type: 'text', maxLength: NAME_MAX, autocomplete: 'off', spellcheck: false, autocapitalize: 'characters',
  });
  f.setAttribute('aria-label', 'Crawler name');
  Object.assign(f.style, { position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', opacity: '0', fontSize: '16px', border: '0', padding: '0' });
  document.body.appendChild(f);
  f.addEventListener('input', () => {
    intake.name = cleanName(f.value);
    f.value = intake.name;
  });
  f.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); stopNaming(); }
  });
  f.addEventListener('blur', () => { intake.editing = false; });
  return f;
}

function startNaming() {
  if (!nameField) nameField = makeNameField();
  intake.editing = true;
  intake.cursor = 0;
  nameField.value = intake.name;
  nameField.focus();
  nameField.setSelectionRange(0, nameField.value.length);
}

function stopNaming() {
  intake.editing = false;
  if (nameField && document.activeElement === nameField) nameField.blur();
  if (!intake.name.trim()) intake.name = intake.randomName();
}

function onIntakeAction(action) {
  if (intake.editing) { if (action === 'interact' || action === 'close') stopNaming(); return; }
  const dir = { forward: 'up', back: 'down', turnLeft: 'left', turnRight: 'right', left: 'left', right: 'right' }[action];
  if (dir) return intake.move(dir);
  if (action !== 'interact') return;
  const what = intake.act();
  if (what === 'edit') startNaming();
  if (what === 'start') beginRun();
}

// ------------------------------------------------------------ loop

const status = {};
function updateStatus(now) {
  status.viewers = formatViewers(viewers.count);
  status.viewersFlash = now - (state.viewersAt || -1e9) < 400;
  status.viewersDir = now - (state.viewersAt || -1e9) < 1800 ? 1 : viewers.quiet > VIEWERS.quietActions ? -1 : 0;
  status.turnsLeft = countdown.total ? countdown.left : null;
  status.turnsShare = countdown.total ? countdown.left / countdown.total : 1;
  status.stairsOpen = countdown.stairsOpen;
  status.hp = crawler.hp;
  status.hpMax = crawler.hpMax;
  status.mp = crawler.mp;
  status.mpMax = crawler.mpMax;
  status.level = crawler.level;
  status.xpShare = crawler.xpShare;
  status.points = crawler.points;
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
    const p = e.pos(dt);
    // A mimic in disguise is just furniture.
    if (e.disguised && views.disguise) return list.push({ x: p.x, y: p.y, img: views.disguise });
    const set = dx * fx + dy * fy < -0.5 ? views.F : views[e.face > 0 ? 'R' : 'L'];
    list.push({ x: p.x, y: p.y, img: frameAt(set.idle, time, i * 2) });
  });
  return list;
}

// Enemies the crawler can see show up on the map as red dots.
function enemyMarks() {
  return level.enemies
    .filter((e) => e.alive && !e.disguised && Math.abs(e.x - player.x) + Math.abs(e.y - player.y) <= 8
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
  safe.draw(overlayFb, now, {
    points: crawler.points, boxes: ach.boxes, unlocked: ach.unlocked, total: ACHIEVEMENTS.length,
    rested: level.safeRoom.rested, hp: crawler.hp, hpMax: crawler.hpMax, mp: crawler.mp, mpMax: crawler.mpMax,
    viewers: formatViewers(viewers.count), deaths: profile.deaths,
    newTopics: safe.open && topicsFor('ozzle', talkContext()).some((t) => t.fresh),
    shop: { stock: level.safeRoom.stock || [], bag: inventory.bag, cha: crawler.cha, gold: inventory.gold },
  });
  invScreen.draw(overlayFb, now);
  charScreen.draw(overlayFb, crawler, { steps: player.steps, gold: inventory.gold, name: crawler.name, job: crawler.job && JOB[crawler.job].name }, now);
  if (combat) combat.ui.draw(overlayFb, now);
  popups.draw(overlayFb, now, !!(intake.open || combat || dead || card || safe.open || charScreen.open || invScreen.open || (banner && banner.at !== null)));
  if (banner && !popups.busy && !combat && !dead && !card && !safe.open && !charScreen.open && !invScreen.open) {
    if (banner.at === null) banner.at = now;
    if (!drawBanner(overlayFb, banner, now)) banner = null;
  }
  if (card) { drawFloorCard(overlayFb, card, now); if (cardDone(card, now)) card = null; }
  if (dead) drawGameOver(overlayFb, dead, now);
  intake.draw(overlayFb, now);
  updateStatus(now);
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
  get countdown() { return countdown; },
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
  get ach() { return ach; },
  get viewers() { return viewers; },
  profile, intake, beginRun,
  safe, enterSafeRoom, safeCommand, openSelectedBox,
  popups, note,
  descend,
  log, onAction, stats, engage, restart, gainXp, endRun,
  get resolution() { return { mode: res.mode, ...res.step }; },
  setResolution: (mode) => setResolution(res.setMode(mode)),
};
