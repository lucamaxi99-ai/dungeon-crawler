// Tests for the crawler's stats, the combat rules and enemy movement.

import assert from 'node:assert/strict';
import { Inventory } from '../src/game/inventory.js';
import { Crawler, BASE, REGEN_STEPS } from '../src/game/crawler.js';
import { Enemy, ENEMY_TYPES, stepToward, lineOfSight, enemyTurns } from '../src/game/enemies.js';
import { Combat, hitChance, crawlerDamage, enemyDamage, fleeChance, RULES } from '../src/game/combat.js';
import { rng } from '../src/engine/texgen.js';

// Stats: base values plus equipped gear.
const inv = new Inventory();
const me = new Crawler(inv);
assert.equal(me.hp, BASE.hpMax);
assert.equal(me.atk, BASE.atk);
assert.equal(me.def, BASE.def);
inv.add('crowbar');
inv.add('jerkin');
inv.equipFromBag(0);
inv.equipFromBag(0);
assert.equal(me.atk, BASE.atk + 4, 'weapon adds attack');
assert.equal(me.def, BASE.def + 3, 'armor adds defense');

// Hurt and heal stay within 0..hpMax and report what really happened.
assert.equal(me.hurt(5), 5);
assert.equal(me.hp, BASE.hpMax - 5);
assert.equal(me.heal(10), 5, 'healing stops at max');
assert.equal(me.hurt(999), BASE.hpMax);
assert.equal(me.alive, false);

// Regeneration: one HP every REGEN_STEPS actions, only when hurt and alive.
const r = new Crawler(new Inventory());
r.hurt(3);
let gained = 0;
for (let i = 0; i < REGEN_STEPS * 2; i++) if (r.tick()) gained++;
assert.equal(gained, 2);
assert.equal(r.hp, BASE.hpMax - 1);

// ------------------------------------------------------------ formulas

assert.equal(hitChance(0.75, 1, 0), 0.75 + RULES.hitPerPoint);
assert.equal(hitChance(0.75, 0, 100), RULES.hitMin, 'hit chance has a floor');
assert.equal(hitChance(0.75, 100, 0), RULES.hitMax, 'hit chance has a ceiling');
const lo = () => 0, hi = () => 0.9999;
assert.equal(crawlerDamage(3, 0, lo), 1);
assert.equal(crawlerDamage(3, 0, hi), 4);
assert.equal(crawlerDamage(1, 10, hi), 1, 'at least one damage');
assert.equal(enemyDamage([1, 2], 0, hi), 2);
assert.equal(enemyDamage([1, 2], 4, hi), 1, 'DEF soaks half its value, at least 1 gets through');
const ratA = new Enemy('rat', 0, 0);
assert.ok(fleeChance(5, [ratA]) < RULES.fleeBase, 'rats are faster than a fresh crawler');

// ------------------------------------------------------------ fights

// A fight always ends, kills are counted, events make sense.
const outcomes = { won: 0, lost: 0, fled: 0 };
for (let seed = 1; seed <= 300; seed++) {
  const rnd = rng(seed);
  const hero = new Crawler(new Inventory());
  const foes = [new Enemy('rat', 1, 0), new Enemy('rat', 0, 1)];
  const fight = new Combat(hero, foes, { initiator: seed % 2 ? 'crawler' : 'enemy', rnd });
  assert.equal(fight.order.length, 3);
  let guard = 0;
  while (!fight.result) {
    assert.ok(++guard < 500, 'fight must end');
    if (fight.crawlersTurn) {
      const pick = rnd();
      const action = pick < 0.75 ? { kind: 'attack' } : pick < 0.9 ? { kind: 'defend' } : { kind: 'flee' };
      for (const ev of fight.crawlerAct(action)) {
        if (ev.kind === 'hit' || ev.kind === 'crit') assert.ok(ev.amount >= 1);
      }
    } else {
      assert.ok(fight.current.alive, 'dead enemies never act');
      fight.enemyAct();
    }
  }
  outcomes[fight.result]++;
  if (fight.result === 'won') assert.equal(hero.kills, 2);
  if (fight.result === 'lost') assert.equal(hero.hp, 0);
}
assert.ok(outcomes.won > 0 && outcomes.fled > 0, `outcomes ${JSON.stringify(outcomes)}`);

// One rat against a fresh crawler who only attacks: the crawler should
// usually win, but not without a scratch.
let wins = 0, lost = 0;
for (let seed = 1; seed <= 400; seed++) {
  const rnd = rng(seed * 13);
  const hero = new Crawler(new Inventory());
  const fight = new Combat(hero, [new Enemy('rat', 1, 0)], { rnd });
  while (!fight.result) fight.crawlersTurn ? fight.crawlerAct({ kind: 'attack' }) : fight.enemyAct();
  if (fight.result === 'won') { wins++; lost += BASE.hpMax - hero.hp; }
}
assert.ok(wins > 390, `fresh crawler should beat one rat (${wins}/400)`);
const avgLoss = lost / wins;
assert.ok(avgLoss > 1 && avgLoss < 8, `a rat should hurt a little (avg ${avgLoss.toFixed(1)} HP)`);

// Defending halves the damage until the crawler's next turn.
{
  const hero = new Crawler(new Inventory());
  const rat = new Enemy('rat', 1, 0);
  const fight = new Combat(hero, [rat], { initiator: 'crawler', rnd: () => 0 }); // crawler first, enemy always hits
  fight.crawlerAct({ kind: 'defend' });
  assert.ok(fight.defending);
  const [ev] = fight.enemyAct();
  assert.equal(ev.kind, 'blocked', 'a 1-damage bite is fully blocked while defending');
  assert.equal(fight.defending, false, 'defending ends at the crawler\'s turn');
}

// ------------------------------------------------------------ movement

const open = () => true;
assert.deepEqual(stepToward(open, 0, 0, 3, 0), [1, 0]);
const wallAt = (x, y) => x === 1 && y !== 2;
assert.deepEqual(stepToward((x, y) => !wallAt(x, y), 0, 0, 3, 0), [0, 1], 'walks around a wall');
assert.equal(lineOfSight(wallAt, 0, 0, 3, 0), false);
assert.equal(lineOfSight(() => false, 0, 0, 3, 3), true);

// Enemies notice the crawler, walk up and engage; they never share a cell.
{
  const foes = [new Enemy('rat', 5, 0), new Enemy('rat', 3, 2)]; // both within sight (5)
  const world = { isWall: () => false, blocked: () => false };
  const target = { x: 0, y: 0 };
  let engaged = false;
  for (let i = 0; i < 10 && !engaged; i++) {
    engaged = enemyTurns(foes, world, target, rng(3)).some((e) => e.kind === 'engage');
    assert.notDeepEqual([foes[0].x, foes[0].y], [foes[1].x, foes[1].y]);
  }
  assert.ok(engaged, 'rats reach the crawler');
  assert.ok(foes.every((f) => f.alerted));
}

console.log(`combat OK (300 fights: ${outcomes.won} won, ${outcomes.lost} lost, ${outcomes.fled} fled; 1 rat costs ~${avgLoss.toFixed(1)} HP)`);
