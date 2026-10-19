// Tests for the show: achievements, loot box tiers (and later viewers,
// sponsors and Safe Rooms).

import assert from 'node:assert/strict';
import { ACHIEVEMENTS, Achievements } from '../src/game/achievements.js';
import { BOX_TIERS, TIER } from '../src/game/lootboxes.js';
import { ITEMS } from '../src/game/items.js';
import { textWidth } from '../src/engine/font.js';
import { rewardLabel } from '../src/game/achievement-ui.js';
import { Viewers, VIEWERS, formatViewers, charismaGain, charismaLoss } from '../src/game/viewers.js';
import { MENTOR, MENTOR_POSES, MENTOR_LINES, paintOzzle, mentorGreeting } from '../src/game/mentor.js';

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
  script.push(['viewers', { count: 12000 }]);
  script.push(['safeRoom'], ['rest'], ['rest'], ['rest'], ['floorDone', { turnsShare: 0.5, allDead: false, safeVisited: false }]);
  for (const [k, d] of script) t.note(k, d);
  // The pacifist season needs a run of its own.
  const p = new Achievements();
  for (let i = 0; i < 3; i++) p.note('floorDone', { turnsShare: 0.5, allDead: false });
  p.note('won');
  const all = new Set([...t.unlocked, ...p.unlocked]);
  const missing = ACHIEVEMENTS.filter((a) => !all.has(a.id)).map((a) => a.id);
  assert.deepEqual(missing, [], 'every achievement is reachable');
}

// ---------------------------------------------------------- viewers

{
  const v = new Viewers(5);
  assert.equal(v.shown, VIEWERS.start);
  assert.equal(v.note('nonsense').gain, 0, 'unknown events bring nobody');
  const r = v.note('kill');
  assert.ok(r.gain > 0 && v.count > VIEWERS.start);
  // Quiet stretches: nothing for a while, then people drift away, never below the floor.
  const before = v.count;
  let bored = 0;
  for (let i = 0; i < VIEWERS.quietActions; i++) bored += v.tick().bored;
  assert.equal(v.count, before, 'no losses during the grace period');
  for (let i = 0; i < 2000; i++) bored += v.tick().bored;
  assert.equal(bored, 1, 'the System complains once per quiet stretch');
  assert.equal(v.count, VIEWERS.floor);
  v.note('chest');
  assert.equal(v.quiet, 0, 'an event resets the boredom');
}
// Charisma: more gain, less loss.
assert.ok(charismaGain(8) > charismaGain(5) && charismaGain(5) > charismaGain(3));
assert.ok(charismaLoss(8) < charismaLoss(5) && charismaLoss(5) < charismaLoss(3));
{
  const a = new Viewers(5), b = new Viewers(9);
  a.note('floorDone'); b.note('floorDone');
  assert.ok(b.count > a.count, 'charisma makes gains bigger');
}
// Thresholds are reported once each, even in one big jump.
{
  const v = new Viewers(5);
  assert.deepEqual(v.add(95).crossed, [100]);
  assert.deepEqual(v.add(10).crossed, []);
  assert.deepEqual(v.add(3000).crossed, [500, 2000]);
  v.count = 50;
  assert.deepEqual(v.add(100).crossed, [], 'falling back and rising again does not repeat a threshold');
}
assert.equal(formatViewers(12), '12');
assert.equal(formatViewers(9999), '9999');
assert.equal(formatViewers(12345), '12.3K');
assert.equal(formatViewers(234567), '235K');
assert.equal(formatViewers(1234567), '1.2M');

// A plausible run (events spread over the floors' actions) ends with a few
// hundred to a few thousand viewers at CHA 5, more with charisma.
function simulate(seed, cha) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const v = new Viewers(cha);
  for (const [rats, chests, actions] of [[4, 2, 300], [6, 4, 420], [8, 4, 550]]) {
    const events = [['level']];
    for (let i = 0; i < rats; i++) events.push(['kill'], ['fightWon', { closeCall: rnd() < 0.15 }]);
    for (let i = 0; i < chests; i++) events.push(['chest']);
    for (let i = 0; i < 3; i++) events.push(['achievement', { tier: Math.floor(rnd() * 2) }]);
    const at = events.map(() => Math.floor(rnd() * actions));
    for (let a = 0; a < actions; a++) {
      v.tick();
      events.forEach((e, i) => { if (at[i] === a) v.note(...e); });
    }
    v.note('floorDone');
  }
  return v.count;
}
const plain = [1, 2, 3, 4, 5].map((k) => simulate(k * 7919, 5));
const charming = [1, 2, 3, 4, 5].map((k) => simulate(k * 7919, 9));
const mid = (xs) => xs.slice().sort((a, b) => a - b)[2];
assert.ok(mid(plain) > 300 && mid(plain) < 5000, `typical run at CHA 5: ${Math.round(mid(plain))} viewers`);
assert.ok(mid(charming) > mid(plain) * 2, 'charisma pays off over a run');

// ---------------------------------------------------------- safe room

// Ozzle: every pose the same size, nothing cut off at the sides or the top.
for (const pose of MENTOR_POSES) {
  const img = paintOzzle(pose);
  assert.equal(img.w, MENTOR.w, `ozzle ${pose}: width`);
  assert.equal(img.h, MENTOR.h, `ozzle ${pose}: height`);
  const opaque = (x, y) => img.data[y * img.w + x] !== 255;
  for (let y = 0; y < img.h; y++) assert.ok(!opaque(0, y) && !opaque(img.w - 1, y), `ozzle ${pose}: cut off at the side (row ${y})`);
  for (let x = 0; x < img.w; x++) assert.ok(!opaque(x, 0), `ozzle ${pose}: cut off at the top`);
}
for (const [topic, lines] of Object.entries(MENTOR_LINES)) assert.ok(lines.length && lines.every((l) => l.length < 190), `mentor ${topic}: lines fit the bubble`);
{
  const base = { visits: 3, floorVisits: 1, depth: 2, hpShare: 1, points: 0, boxes: 0, kills: 4, viewers: 100 };
  const says = (ctx) => mentorGreeting({ ...base, ...ctx });
  assert.match(says({ visits: 0, points: 3 }), /Ozzle/, 'introduces himself on the first visit');
  assert.match(says({ hpShare: 0.2, points: 3 }), /REST/, 'low health comes first');
  assert.match(says({ points: 3 }), /3/, 'then unspent points');
  assert.match(says({ boxes: 2 }), /2 loot boxes/, 'then loot boxes');
}

console.log(`show: ${ACHIEVEMENTS.length} achievements, viewers OK (typical run: ${Math.round(mid(plain))} at CHA 5, ${Math.round(mid(charming))} at CHA 9)`);
