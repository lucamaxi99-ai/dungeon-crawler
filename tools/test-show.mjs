// Tests for the show: achievements, loot box tiers (and later viewers,
// sponsors and Safe Rooms).

import assert from 'node:assert/strict';
import { ACHIEVEMENTS, Achievements } from '../src/game/achievements.js';
import { BOX_TIERS, TIER } from '../src/game/lootboxes.js';
import { ITEMS } from '../src/game/items.js';
import { textWidth } from '../src/engine/font.js';
import { rewardLabel } from '../src/game/achievement-ui.js';

// ---------------------------------------------------------- catalogue

const ids = new Set();
for (const a of ACHIEVEMENTS) {
  assert.ok(!ids.has(a.id), `duplicate achievement id ${a.id}`);
  ids.add(a.id);
  assert.ok(a.name && a.text && a.hint, `${a.id}: needs name, text and hint`);
  assert.equal(typeof a.test, 'function', `${a.id}: needs a test`);
  if (a.reward) {
    assert.ok(a.reward.box || a.reward.item, `${a.id}: reward needs a box or an item`);
    if (a.reward.box) assert.ok(BOX_TIERS.includes(a.reward.box), `${a.id}: unknown box tier ${a.reward.box}`);
    if (a.reward.item) assert.ok(ITEMS[a.reward.item], `${a.id}: unknown item ${a.reward.item}`);
  }
  // The pop-up shows the name at 2x and the reward line at 1x, inside 320 px.
  assert.ok(textWidth(a.name.toUpperCase()) * 2 + 28 <= 316, `${a.id}: name too long for the pop-up`);
  assert.ok(textWidth(rewardLabel(a.reward).text) + 28 <= 316, `${a.id}: reward text too long`);
}
for (const t of BOX_TIERS) assert.ok(TIER[t] && TIER[t].name, `tier ${t} needs a name`);

// Not every achievement gives a box, and the big tiers are rare.
const boxes = ACHIEVEMENTS.filter((a) => a.reward && a.reward.box);
assert.ok(boxes.length < ACHIEVEMENTS.length, 'some achievements give nothing (as in the books)');
assert.ok(boxes.filter((a) => ['legendary', 'celestial'].includes(a.reward.box)).length <= 2, 'legendary and celestial boxes stay rare');

// ---------------------------------------------------------- tracker

const unlockedBy = (tracker, kind, data) => tracker.note(kind, data).map((a) => a.id);

{
  const t = new Achievements();
  assert.deepEqual(unlockedBy(t, 'step', { steps: 11 }), []);
  assert.deepEqual(unlockedBy(t, 'step', { steps: 12 }), ['tookAWalk']);
  assert.deepEqual(unlockedBy(t, 'step', { steps: 13 }), [], 'an achievement unlocks once');
  assert.deepEqual(unlockedBy(t, 'kill', { type: 'rat', unarmed: true }), ['firstBlood']);
  assert.deepEqual(t.boxes, [{ tier: 'bronze', sponsored: false, from: 'First Blood' }]);
  for (let i = 0; i < 8; i++) t.note('kill', { type: 'rat', unarmed: false });
  assert.deepEqual(unlockedBy(t, 'kill', { type: 'rat', unarmed: false }), ['pestControl']);
  assert.equal(t.s.unarmedKills, 1);
  assert.deepEqual(unlockedBy(t, 'nonsense'), [], 'unknown events are ignored');
}

// Floors, the season and the secret ones.
{
  const t = new Achievements();
  assert.deepEqual(unlockedBy(t, 'floorDone', { turnsShare: 0.05, allDead: true }), ['floorOne', 'fashionablyLate', 'hallMonitor']);
  t.note('kill', { type: 'rat' });
  t.note('floorDone', { turnsShare: 0.5, allDead: true });
  t.note('floorDone', { turnsShare: 0.5, allDead: true });
  const end = unlockedBy(t, 'won');
  assert.ok(end.includes('seasonSurvivor') && end.includes('exterminator') && !end.includes('objector'));
}
{
  const t = new Achievements();
  for (let i = 0; i < 3; i++) t.note('floorDone', { turnsShare: 0.5, allDead: false });
  const end = unlockedBy(t, 'won');
  assert.ok(end.includes('objector'), 'a season without kills');
  assert.ok(!end.includes('exterminator'));
}
{
  const t = new Achievements();
  assert.deepEqual(unlockedBy(t, 'fightWon', { hp: 2, foes: 1, hurt: true }), ['byAThread']);
  assert.deepEqual(unlockedBy(t, 'fightWon', { hp: 15, foes: 2, hurt: false }), ['notAScratch']);
  const equip = { head: { id: 'cone' }, body: { id: 'bathrobe' } };
  assert.deepEqual(unlockedBy(t, 'gear', { equip }), ['fashionVictim']);
  for (let i = 0; i < 9; i++) t.note('bump');
  assert.deepEqual(unlockedBy(t, 'bump'), ['wallEnthusiast']);
  t.note('wastedHeal'); t.note('wastedHeal');
  assert.deepEqual(unlockedBy(t, 'wastedHeal'), ['hypochondriac']);
}

// Every achievement can actually be earned by some sequence of events.
{
  const t = new Achievements();
  const script = [
    ['step', { steps: 50 }], ['chest'], ['crit'], ['crit'], ['crit'], ['crit'], ['crit'],
    ['flee'], ['flee'], ['flee'], ['learn'], ['level', { level: 5 }], ['skillUp', { level: 3 }],
    ['fightWon', { hp: 1, foes: 3, hurt: false }], ['bag', { tails: 10 }], ['drop'],
    ['gear', { equip: { a: { id: 'cone' }, b: { id: 'bathrobe' }, c: { id: 'x' }, d: { id: 'x' }, e: { id: 'x' }, f: { id: 'x' } } }],
    ['floorDone', { turnsShare: 0.05, allDead: true }],
  ];
  for (let i = 0; i < 10; i++) script.push(['skill', { id: 'dirtyKick' }], ['bump']);
  for (let i = 0; i < 5; i++) script.push(['wave'], ['barrel']);
  for (let i = 0; i < 3; i++) script.push(['wastedHeal'], ['lockedStairs']);
  for (let i = 0; i < 15; i++) script.push(['kill', { type: 'rat', unarmed: true }]);
  script.push(['floorDone', { turnsShare: 0.5, allDead: true }], ['floorDone', { turnsShare: 0.5, allDead: true }], ['won']);
  for (const [k, d] of script) t.note(k, d);
  // The pacifist season needs a run of its own.
  const p = new Achievements();
  for (let i = 0; i < 3; i++) p.note('floorDone', { turnsShare: 0.5, allDead: false });
  p.note('won');
  const all = new Set([...t.unlocked, ...p.unlocked]);
  const missing = ACHIEVEMENTS.filter((a) => !all.has(a.id)).map((a) => a.id);
  assert.deepEqual(missing, [], 'every achievement is reachable');
}

console.log(`show: ${ACHIEVEMENTS.length} achievements OK`);
