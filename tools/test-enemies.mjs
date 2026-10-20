// Tests for the enemies of M8: every type is drawable (side, front, corpse),
// fits the combat stage, its traits work as described, and every squad on
// every floor is beatable by a typical crawler of that depth.

import assert from 'node:assert/strict';
import { TRANSPARENT } from '../src/engine/framebuffer.js';
import { rng } from '../src/engine/texgen.js';
import { Inventory } from '../src/game/inventory.js';
import { Crawler, START } from '../src/game/crawler.js';
import { Enemy, ENEMY_TYPES, enemyTurns } from '../src/game/enemies.js';
import { Combat } from '../src/game/combat.js';
import { CREATURES, SPRITES } from '../src/game/assets.js';
import { stageZoom } from '../src/game/combat-ui.js';
import { FLOORS } from '../src/game/floorgen.js';
import { SKILLS } from '../src/game/skills.js';
import { ITEMS } from '../src/game/items.js';
import { LOOT_TABLES } from '../src/game/loot.js';

const TOP = 12, FEET = 128;
const slots = (n) => (n <= 1 ? [160] : Array.from({ length: n }, (_, i) => Math.round(160 + (i - (n - 1) / 2) * (n === 2 ? 110 : 96))));

// ------------------------------------------------------------ sprites
for (const [id, t] of Object.entries(ENEMY_TYPES)) {
  assert.ok(t.name && t.verb && t.family && ['grunt', 'leader', 'miniboss', 'boss'].includes(t.rank), `${id}: name, verb, family, rank`);
  const c = CREATURES[t.sprite];
  assert.ok(c, `${id}: creature '${t.sprite}' is registered`);
  assert.ok(SPRITES[`${t.sprite}Corpse`], `${id}: has a corpse`);
  for (const [view, set] of [['side', c.L], ['front', c.F]]) {
    const [a, b] = set.idle.frames;
    for (const [pose, img] of [['idle1', b], ['lunge', set.lunge], ['flinch', set.flinch]]) {
      assert.equal(img.w, a.w, `${id} ${view} ${pose}: same width as idle0`);
      assert.equal(img.h, a.h, `${id} ${view} ${pose}: same height as idle0`);
    }
    for (const img of [a, b, set.lunge, set.flinch]) {
      assert.ok(img.data.subarray(0, img.w).every((v) => v === TRANSPARENT), `${id} ${view} ${img.name}: nothing cut off at the top`);
      assert.ok(img.data.some((v) => v !== TRANSPARENT), `${id} ${view}: not empty`);
    }
    // Leaders and minibosses may be bigger than a wall is high, nobody else.
    const tall = (a.h * 64) / (a.unit || 64);
    assert.ok(tall <= (t.rank === 'grunt' ? 64 : 90), `${id} ${view}: ${tall} px tall`);
  }
  for (const [k, v] of t.drops) assert.ok(ITEMS[k] && v > 0 && v <= 1, `${id}: drop ${k}`);
  if (t.loot) assert.ok(LOOT_TABLES[t.loot], `${id}: loot table ${t.loot}`);
}

// The stage zooms out until name and hit points fit above every head.
const fits = (list) => {
  const z = stageZoom(list, slots(list.length));
  const tall = Math.max(...list.map((e) => CREATURES[e.stats.sprite].F.idle.frames[0].h));
  return FEET - tall * z - 4 - 13 >= TOP + 1;
};
for (const id of Object.keys(ENEMY_TYPES)) assert.ok(fits([new Enemy(id, 0, 0)]), `${id} fits the combat stage`);
const zooms = new Set();
for (const f of FLOORS) {
  for (const { squad } of f.foes) {
    const list = squad.slice(0, 3).map((t) => new Enemy(t, 0, 0));
    assert.ok(fits(list), `squad ${squad.join('+')} fits the combat stage`);
    zooms.add(`${squad.join('+')} ${stageZoom(list, slots(list.length))}x`);
  }
}

// ------------------------------------------------------------ traits
const fresh = (attrs = {}) => new Crawler(new Inventory(), { ...START, ...attrs });
const always = () => 0;    // every roll succeeds (hits land, lowest damage)
const never = () => 0.999; // every roll fails
function enemyTurn(fight, e) {
  // Skip ahead to the given enemy's turn.
  fight.turn = fight.order.indexOf(e);
  return fight.enemyAct();
}

// Aura: a leader makes its family hit harder; morale: they run when it dies.
if (ENEMY_TYPES.ratAlpha) {
  const me = fresh();
  const alpha = new Enemy('ratAlpha', 1, 0), rat = new Enemy('rat', 0, 1);
  const fight = new Combat(me, [alpha, rat], { rnd: always });
  assert.ok(fight.aura(rat).atk > 0, 'the alpha buffs its rat');
  assert.deepEqual(fight.aura(alpha), { atk: 0, dmg: 0 }, 'but not itself');
  alpha.hp = 1;
  fight.turn = fight.order.indexOf(me);
  const ev = fight.crawlerAct({ kind: 'attack', target: alpha });
  assert.ok(ev.some((e) => e.kind === 'rout' && e.actor === rat), 'the pack scatters');
  assert.equal(fight.result, 'won', 'a routed pack ends the fight');
  assert.ok(rat.alive, 'the routed rat lives on');
}

// Slow enemies move every other turn; packs notice together.
if (ENEMY_TYPES.slime) {
  const world = { isWall: () => false, blocked: () => false };
  const slime = new Enemy('slime', 0, 0);
  slime.alerted = true;
  const xs = [];
  for (let i = 0; i < 4; i++) { enemyTurns([slime], world, { x: 4, y: 0 }, rng(i)); xs.push(slime.x); }
  assert.ok(xs[3] <= 2, `a slime crawls (${xs})`);
  const a = new Enemy('rat', 0, 0, 7), b = new Enemy('rat', 0, 3, 7);
  const blind = { isWall: (x, y) => y === 2, blocked: () => false };
  enemyTurns([a, b], blind, { x: 2, y: 0 }, rng(1));
  assert.ok(a.alerted && b.alerted, 'the pack mate is alerted too');
}

// Shaman: patches up wounded friends, otherwise hexes the crawler.
if (ENEMY_TYPES.goblinShaman) {
  const me = fresh();
  const sh = new Enemy('goblinShaman', 1, 0), grunt = new Enemy('goblinGrunt', 0, 1);
  const fight = new Combat(me, [sh, grunt], { rnd: always });
  grunt.hp = 1;
  const ev = enemyTurn(fight, sh);
  assert.ok(ev.some((e) => e.kind === 'mend' && e.target === grunt && e.amount > 0), 'heals the wounded grunt');
  grunt.hp = grunt.stats.hp;
  fight.status.get(sh).cd = 0;
  const ev2 = enemyTurn(fight, sh);
  assert.ok(ev2.some((e) => e.kind === 'curse' && e.status === 'hex') && fight.self.hex > 0, 'hexes the crawler');
  assert.ok(fight.selfAim < 0, 'a hexed crawler aims worse');
}

// Sapper: throws bombs past armour; blows up when it dies, hurting everyone.
if (ENEMY_TYPES.goblinSapper) {
  const me = fresh(), inv = me.inv;
  inv.add('chainmail'); inv.equipFromBag(0);
  const sap = new Enemy('goblinSapper', 1, 0), grunt = new Enemy('goblinGrunt', 0, 1);
  const fight = new Combat(me, [sap, grunt], { rnd: always });
  const hp = me.hp;
  const ev = enemyTurn(fight, sap);
  assert.ok(ev.some((e) => e.kind === 'throw' && e.what === 'bomb'));
  assert.equal(hp - me.hp, sap.stats.traits.bomb.dmg[0], 'bombs ignore armour');
  sap.hp = 1;
  fight.turn = fight.order.indexOf(me);
  const gHp = grunt.hp, mHp = me.hp;
  const ev2 = fight.crawlerAct({ kind: 'attack', target: sap });
  assert.ok(ev2.some((e) => e.kind === 'blast'), 'goes up with a bang');
  assert.ok(grunt.hp < gHp && me.hp < mHp, 'the blast hits both sides');
}

// Llama: spits acid (ignores armour) and blinds; holds a grudge.
if (ENEMY_TYPES.badLlama) {
  const me = fresh();
  const llama = new Enemy('badLlama', 1, 0);
  const fight = new Combat(me, [llama], { rnd: always });
  const ev = enemyTurn(fight, llama);
  assert.ok(ev.some((e) => e.special === 'spit') && fight.self.blind > 0, 'spit blinds');
  assert.ok(llama.stats.traits.grudge, 'llamas hold grudges');
  llama.hunts = true;
  assert.ok(llama.hunter, 'a grudge makes it a hunter');
}

// Raccoon: lifts gold on a hit, then runs off with it.
if (ENEMY_TYPES.raccoon) {
  const me = fresh();
  let gold = 100;
  const rac = new Enemy('raccoon', 1, 0);
  const fight = new Combat(me, [rac], { rnd: always, purse: () => gold });
  const ev = enemyTurn(fight, rac);
  const steal = ev.find((e) => e.kind === 'steal');
  assert.ok(steal && steal.amount > 0 && rac.loot === steal.amount, 'steals gold');
  gold -= steal.amount;
  const ev2 = enemyTurn(fight, rac);
  assert.ok(ev2.some((e) => e.kind === 'escape') && fight.result === 'won' && fight.out.has(rac), 'escapes with it');
  const broke = new Enemy('raccoon', 1, 0);
  const f2 = new Combat(fresh(), [broke], { rnd: always, purse: () => 0 });
  assert.ok(!enemyTurn(f2, broke).some((e) => e.kind === 'steal'), 'nothing to steal from the broke');
}

// Gnomes are ceramic: blunt weapons crack them.
if (ENEMY_TYPES.gnome) {
  const hit = (weapon) => {
    const me = fresh();
    if (weapon) { me.inv.add(weapon); me.inv.equipFromBag(0); }
    const g = new Enemy('gnome', 1, 0);
    g.hp = 99;
    const fight = new Combat(me, [g], { rnd: always, initiator: 'crawler' });
    fight.turn = fight.order.indexOf(me);
    return fight.crawlerAct({ kind: 'attack', target: g }).find((e) => e.kind === 'hit' || e.kind === 'crit');
  };
  const blade = hit('shiv'), blunt = hit('crowbar');
  assert.ok(blunt.crack && !blade.crack, 'blunt weapons crack ceramic');
}

// Mimics sit still until the crawler stands next to them, then ambush.
if (ENEMY_TYPES.cartMimic) {
  const world = { isWall: () => false, blocked: () => false };
  const cart = new Enemy('cartMimic', 0, 0);
  assert.ok(cart.disguised);
  for (let i = 0; i < 5; i++) assert.equal(enemyTurns([cart], world, { x: 3, y: 0 }, rng(i)).length, 0, 'waits quietly');
  assert.ok(cart.x === 0 && cart.y === 0, 'does not move while disguised');
  const ev = enemyTurns([cart], world, { x: 1, y: 0 }, rng(9));
  assert.ok(ev.some((e) => e.kind === 'ambush') && !cart.disguised, 'ambushes');
  assert.ok(CREATURES.cartMimic.disguise, 'has a disguise to show');
}

// Hunters: no territory, they settle where they lose the trail.
if (ENEMY_TYPES.roboVac) {
  const vac = new Enemy('roboVac', 0, 0);
  assert.ok(vac.hunter, 'the robo-vac is a hunter');
  const world = { isWall: () => false, blocked: () => false };
  enemyTurns([vac], world, { x: 3, y: 0 }, rng(1));
  for (let i = 0; i < 25; i++) enemyTurns([vac], world, { x: 4 + i, y: 0 }, rng(i));
  assert.ok(vac.x > 15, `it follows far (${vac.x})`);
}

// Running away: a scared enemy moves away from the crawler, then calms down.
{
  const world = { isWall: () => false, blocked: () => false };
  const r = new Enemy('rat', 5, 5);
  r.fear = 3;
  const evs = [];
  for (let i = 0; i < 3; i++) evs.push(...enemyTurns([r], world, { x: 4, y: 5 }, rng(i)));
  assert.ok(Math.abs(r.x - 4) + Math.abs(r.y - 5) >= 3, 'runs away');
  assert.ok(evs.some((e) => e.kind === 'calm') && r.fear === 0, 'calms down');
}

// Story boss (Officer Tow-Matic): tickets, the boot, the telegraphed tow
// hook, backup drones and a second phase.
if (ENEMY_TYPES.towBot) {
  let gold = 100;
  const me = fresh();
  const boss = new Enemy('towBot', 1, 0);
  const called = [];
  const fight = new Combat(me, [boss], { rnd: always, purse: () => gold, summon: (type) => { const d = new Enemy(type, 0, 1); called.push(d); return d; } });
  const st = fight.status.get(boss);
  const t1 = enemyTurn(fight, boss);
  const fine = t1.find((e) => e.kind === 'ticket');
  assert.ok(fine && fine.amount > 0 && boss.loot === fine.amount, 'first it writes a ticket (and keeps the gold until it falls)');
  gold -= fine.amount;
  assert.ok(enemyTurn(fight, boss).some((e) => e.kind === 'hit' && !e.special), 'then a plain attack');
  const t3 = enemyTurn(fight, boss);
  assert.ok(t3.some((e) => e.kind === 'summon') && called.length === 1 && fight.enemies.includes(called[0]) && fight.order.includes(called[0]), 'calls in a drone that joins the fight');
  enemyTurn(fight, boss);
  const t5 = enemyTurn(fight, boss);
  assert.ok(t5.some((e) => e.kind === 'windup') && st.charged, 'winds up the tow hook');
  fight.turn = fight.order.indexOf(me);
  fight.crawlerAct({ kind: 'defend' });
  const hp = me.hp;
  const t6 = enemyTurn(fight, boss);
  const hook = t6.find((e) => e.special === 'tow');
  assert.ok(hook && hp - me.hp === Math.floor(boss.stats.traits.tow.dmg[0] / 2), 'the hook comes down, halved by defending');
  enemyTurn(fight, boss);
  const t8 = enemyTurn(fight, boss);
  assert.ok(t8.some((e) => e.kind === 'curse' && e.status === 'boot') && !fight.canFlee, 'clamps the crawler');
  fight.turn = fight.order.indexOf(me);
  const run = fight.crawlerAct({ kind: 'flee' });
  assert.ok(run.some((e) => e.kind === 'fleeFail' && e.booted) && !fight.result, 'no running with a boot on');
  boss.hp = Math.ceil(boss.stats.hp / 2) + 1;
  fight.turn = fight.order.indexOf(me);
  const hit = fight.crawlerAct({ kind: 'attack', target: boss });
  assert.ok(hit.some((e) => e.kind === 'phase') && boss.enraged && boss.sprite === 'towBotTowing', 'towing mode below half health');
  assert.ok(fight.aura(boss).atk > 0, 'and hits harder');
  boss.hp = 1;
  fight.turn = fight.order.indexOf(me);
  const end = fight.crawlerAct({ kind: 'attack', target: boss });
  assert.ok(end.some((e) => e.kind === 'rout' && e.actor === called[0]) && fight.result === 'won', 'its drones give up when it falls');
}

// ------------------------------------------------------------ balancing
// A typical crawler at each depth (level, points and gear it usually has
// by then) fights every squad of that floor from full health. It goes for
// leaders first (their crew runs when they fall), then healers, then the
// weakest, and kicks whenever Dirty Kick is ready.
const TYPICAL = [
  { attrs: {}, gear: [] },
  { attrs: { str: 7, con: 7, dex: 7 }, gear: ['shiv', 'potLid'] },
  { attrs: { str: 9, con: 9, dex: 9 }, gear: ['crowbar', 'jerkin'] },
];
// Minibosses are optional: they get fought by a crawler that has looked
// around the floor first (a level up, a weapon from a chest).
const READY = [
  { attrs: { str: 6, con: 6, dex: 6 }, gear: ['shiv'] },
  { attrs: { str: 8, con: 8, dex: 8 }, gear: ['shiv', 'potLid', 'jerkin'] },
  { attrs: { str: 10, con: 10, dex: 10 }, gear: ['crowbar', 'jerkin', 'buckler'] },
];
function battle(depth, squad, seed, boss) {
  const t = (boss ? READY : TYPICAL)[depth - 1];
  const me = fresh(t.attrs);
  me.hp = me.hpMax;
  for (const g of t.gear) { me.inv.add(g); me.inv.equipFromBag(0); }
  let gold = 50;
  const foes = squad.slice(0, 3).map((k, i) => new Enemy(k, i, 1));
  const summon = (type) => new Enemy(type, 0, 2);
  const fight = new Combat(me, foes, { rnd: rng(seed), purse: () => gold, summon });
  for (let n = 0; !fight.result && n < 200; n++) {
    if (!fight.crawlersTurn) { fight.enemyAct(); continue; }
    const prio = (e) => (e.stats.traits.morale ? 0 : e.stats.traits.heal ? 1 : 2);
    const target = fight.alive.slice().sort((a, b) => prio(a) - prio(b) || a.hp - b.hp)[0];
    // A boss winding up its hook: brace for it.
    if (fight.alive.some((e) => fight.status.get(e).charged)) fight.crawlerAct({ kind: 'defend' });
    else if (fight.canSkill('dirtyKick')) fight.crawlerAct({ kind: 'skill', id: 'dirtyKick', target });
    else fight.crawlerAct({ kind: 'attack', target });
  }
  return { result: fight.result, lost: me.hpMax - me.hp, hpMax: me.hpMax };
}
const report = [];
FLOORS.forEach((f, i) => {
  const depth = i + 1;
  for (const { squad, where } of f.foes) {
    let won = 0, lost = 0;
    const N = 300;
    for (let s = 1; s <= N; s++) {
      const r = battle(depth, squad, s * 7919 + depth, where === 'boss');
      if (r.result === 'won') { won++; lost += r.lost; }
    }
    const rate = won / N, avg = won ? lost / won : 0;
    report.push(`F${depth} ${squad.join('+').padEnd(36)} win ${(rate * 100).toFixed(0).padStart(3)}%  -${avg.toFixed(1)} HP`);
    const boss = where === 'boss';
    if (!process.env.LOOSE) assert.ok(rate >= (boss ? 0.55 : 0.85), `floor ${depth}: ${squad.join('+')} should be beatable (${(rate * 100).toFixed(0)}%)`);
    if (!boss && !process.env.LOOSE) assert.ok(avg >= 0.2, `floor ${depth}: ${squad.join('+')} should hurt a bit`);
  }
});
assert.ok(SKILLS.dirtyKick);

console.log(`enemies OK (${Object.keys(ENEMY_TYPES).length} types; stage zoom: ${[...zooms].join(', ')})`);
for (const line of report) console.log(`  ${line}`);
