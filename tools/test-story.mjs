// Tests for the story layer (M7): the profile that survives a death
// (reruns on Borant Encore), Ozzle's rerun greetings and the tally.

import assert from 'node:assert/strict';
import { Profile, PROFILE_KEY } from '../src/game/profile.js';
import { mentorGreeting, killerPhrase } from '../src/game/mentor.js';
import { LINES } from '../src/game/system-ai.js';
import { TALLY, drawTally, REPLY_BOX } from '../src/game/safe-ui.js';
import { CAST, Conversation, topicsFor, reachable, sayText } from '../src/game/dialogue.js';
import { textWidth, wrapText } from '../src/engine/font.js';
import { JOBS, JOB, checkUnlocks, jobOpen, startAttrs, cleanName, NAMES, NAME_MAX } from '../src/game/jobs.js';
import { CreationScreen } from '../src/game/creation-ui.js';
import { START, ATTRS } from '../src/game/crawler.js';

// A localStorage stand-in.
function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    m,
  };
}

// ---------------------------------------------------------- profile

{
  const store = memoryStorage();
  const p = new Profile(store);
  assert.equal(p.runs, 0);
  assert.equal(p.startRun(), 1, 'the first run is number 1');
  assert.equal(p.rerun, 0, 'the premiere is not a rerun');
  p.reached(2);
  assert.deepEqual(p.endRun({ depth: 2, killer: 'Giant Rat', level: 3, kills: 5 }), { record: false }, 'the premiere sets no record to beat');
  assert.equal(p.deaths, 1);
  assert.equal(p.deepest, 2);

  // A second instance reads the same soul back.
  const q = new Profile(store);
  assert.equal(q.runs, 1);
  assert.equal(q.last.killer, 'Giant Rat');
  assert.equal(q.startRun(), 2);
  assert.equal(q.rerun, 1);
  q.reached(3);
  assert.equal(q.endRun({ depth: 3, killer: 'Giant Rat' }).record, true, 'deeper than ever before is a record');
  assert.equal(q.timesKilledBy('Giant Rat'), 2);
  q.startRun();
  assert.equal(q.endRun({ depth: 1, killer: 'the floor collapse' }).record, false, 'shallower is no record');
  q.startRun();
  q.endRun({ won: true, depth: 3 });
  assert.equal(q.wins, 1);
  assert.equal(q.deaths, 3, 'a win is not a death');

  // Conversations and unlocks persist too.
  q.see('ozzleMet');
  assert.ok(q.unlock('job:accountant'));
  assert.ok(!q.unlock('job:accountant'), 'unlocks happen once');
  const r = new Profile(store);
  assert.ok(r.hasSeen('ozzleMet') && r.isUnlocked('job:accountant'));

  r.reset();
  assert.equal(r.runs, 0);
  assert.ok(!store.m.has(PROFILE_KEY), 'reset forgets the saved soul');
}

// A broken save or no storage at all is a fresh soul, not a crash.
{
  const store = memoryStorage();
  store.setItem(PROFILE_KEY, '{not json');
  assert.equal(new Profile(store).runs, 0);
  const p = new Profile(null);
  p.startRun();
  assert.equal(p.runs, 1, 'without storage the profile lives as long as the page');
  const failing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); }, removeItem() {} };
  const f = new Profile(failing);
  f.startRun();
  assert.equal(f.runs, 1, 'storage errors are swallowed');
}

// ---------------------------------------------------------- Ozzle

assert.equal(killerPhrase('Giant Rat'), 'a giant rat');
assert.equal(killerPhrase('Ant Swarm'), 'an ant swarm');
assert.equal(killerPhrase('the floor collapse'), 'the floor collapse');

{
  const base = {
    visits: 0, floorVisits: 0, depth: 1, hpShare: 1, points: 0, boxes: 0, kills: 0, viewers: 12,
    newSponsor: null, rerun: 0, met: false, explained: false, last: null, timesKilled: 0,
  };
  const says = (ctx) => mentorGreeting({ ...base, ...ctx });
  const last = { won: false, depth: 2, killer: 'Giant Rat', record: false };
  assert.match(says({}), /Ozzle/, 'the premiere: he introduces himself');
  assert.match(says({ rerun: 1, last }), /Ozzle/, 'a rerun before ever meeting him: still the introduction');
  assert.match(says({ rerun: 1, met: true, last }), /soul backup/, 'the first rerun after meeting: he explains Borant Encore');
  assert.match(says({ rerun: 2, met: true, explained: true, last, timesKilled: 1 }), /a giant rat on floor 2/, 'then: how it ended last time');
  assert.match(says({ rerun: 3, met: true, explained: true, last, timesKilled: 3 }), /^A giant rat again\? That's 3 times/, 'the same killer again');
  assert.match(says({ rerun: 3, met: true, explained: true, last: { ...last, record: true }, timesKilled: 1 }), /floor 2/i, 'a new record');
  assert.match(says({ rerun: 3, met: true, explained: true, last: { ...last, won: true } }), /survived the whole season/);
  assert.match(says({ rerun: 2, met: true, explained: true, last, visits: 1, points: 3 }), /3/, 'later visits of a rerun: the usual');
}

for (const t of ['rerun', 'previously', 'previouslyWon']) assert.ok(LINES[t] && LINES[t].length, `System AI needs ${t} lines`);

// ---------------------------------------------------------- tally

{
  // A bare framebuffer (the real one needs a browser for ImageData).
  const fb = {
    width: 320, height: 140, pixels: new Uint8Array(320 * 140),
    set(x, y, c) { if (x >= 0 && y >= 0 && x < 320 && y < 140) this.pixels[y * 320 + x] = c; },
    rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); },
  };
  const lit = () => { let n = 0; for (const c of fb.pixels) if (c) n++; return n; };
  drawTally(fb, 0);
  assert.equal(lit(), 0, 'no deaths, no marks');
  drawTally(fb, 7);
  const seven = lit();
  assert.ok(seven > 0);
  // Stays in its strip of wall between the poster and Ozzle.
  for (let y = 0; y < 140; y++) for (let x = 0; x < 320; x++) {
    if (!fb.pixels[y * 320 + x]) continue;
    assert.ok(x >= TALLY.x - 1 && x < 71 && y >= TALLY.y && y < 88, `tally mark at ${x},${y} leaves its wall strip`);
  }
  fb.pixels.fill(0);
  drawTally(fb, 500);
  for (let y = 0; y < 140; y++) for (let x = 0; x < 320; x++) {
    if (fb.pixels[y * 320 + x]) assert.ok(x < 71 && y < 99, `a full wall stays in place (${x},${y})`);
  }
}

// ---------------------------------------------------------- dialogue

for (const [who, cast] of Object.entries(CAST)) {
  const used = new Set();
  for (const t of cast.topics) {
    assert.ok(cast.nodes[t.start], `${who}/${t.id}: start node ${t.start} missing`);
    // Topic labels fit the terminal next to the cursor and the NEW mark.
    assert.ok(textWidth(t.label) <= 78, `${who}/${t.id}: label too wide for the terminal`);
    for (const id of reachable(who, t.start)) used.add(id);
  }
  for (const [id, node] of Object.entries(cast.nodes)) {
    assert.ok(used.has(id), `${who}/${id}: no topic leads here`);
    const says = Array.isArray(node.say) ? node.say : [node.say];
    for (const l of says) assert.ok(l.length < 190, `${who}/${id}: line too long for the bubble`);
    assert.ok(node.replies.length >= 1 && node.replies.length <= 3, `${who}/${id}: 1 to 3 replies`);
    assert.ok(node.replies.some((r) => !r.if), `${who}/${id}: at least one reply is always on offer`);
    for (const r of node.replies) {
      if (r.to) assert.ok(cast.nodes[r.to], `${who}/${id}: reply leads to missing node ${r.to}`);
      assert.ok(textWidth(r.text) + 13 <= REPLY_BOX.w - 4, `${who}/${id}: reply "${r.text}" too wide for the box`);
    }
  }
  for (const l of [...cast.open, ...cast.close]) assert.ok(l.length < 190, `${who}: open/close line too long`);
}

{
  const p = new Profile(null);
  const ctx = (rerun = 0, deaths = 0) => ({ profile: p, rerun, deaths, vars: { t: deaths } });
  const ids = (c) => topicsFor('ozzle', c).map((t) => t.id);
  assert.deepEqual(ids(ctx()), ['who', 'place', 'advice'], 'the premiere: the basics');
  assert.deepEqual(ids(ctx(1, 1)), ['who', 'place', 'encore', 'tally', 'advice'], 'after a death: reruns and the tally');
  assert.ok(topicsFor('ozzle', ctx()).find((t) => t.id === 'who').fresh, 'unheard topics are new');

  // Walk the Borant Encore topic down to the cancellation.
  const encore = topicsFor('ozzle', ctx(1, 1)).find((t) => t.id === 'encore');
  const c = new Conversation('ozzle', encore, ctx(1, 1));
  assert.match(c.text, /rerun channel/);
  assert.ok(c.choose(0));
  assert.match(c.text, /shelf/);
  assert.ok(c.choose(0));
  assert.match(c.text, /deleted/);
  assert.ok(!c.choose(0), 'the last reply ends the topic');
  assert.ok(p.flag('heardCancel'), 'replies raise story flags');
  assert.ok(!topicsFor('ozzle', ctx(1, 1)).find((t) => t.id === 'encore').fresh, 'heard topics are no longer new');
  assert.ok(ids(ctx(1, 1)).includes('contract'), 'hearing about the cancellation opens the contract topic');

  // Conditional replies and placeholders.
  const who = new Conversation('ozzle', { start: 'who1' }, ctx(0, 0));
  who.choose(2);
  assert.equal(who.replies.length, 1, 'no "you have met me" in the premiere');
  const who2 = new Conversation('ozzle', { start: 'who1' }, ctx(2, 2));
  who2.choose(2);
  assert.equal(who2.replies.length, 2);
  assert.match(new Conversation('ozzle', { start: 'tally1' }, ctx(1, 7)).text, /^7\./, 'the tally names the count');
  const advice = CAST.ozzle.nodes.advice;
  assert.notEqual(sayText(advice, {}, 'x'), sayText(advice, {}, 'x'), 'advice rotates');
}

// ---------------------------------------------------------- jobs and intake

{
  for (const j of JOBS) {
    assert.ok(ATTRS.includes(j.attr), `${j.id}: unknown attribute`);
    assert.ok(j.name && j.blurb && j.intro, `${j.id}: needs name, blurb and intro`);
    assert.ok(wrapText(j.blurb, 146).length <= 6, `${j.id}: blurb too long for the details pane`);
    assert.ok(textWidth(j.name.toUpperCase()) <= 80, `${j.id}: name too wide for the list`);
    if (j.unlock) assert.ok(wrapText(`Unlock: ${j.unlock.hint}.`, 146).length <= 3, `${j.id}: unlock hint too long`);
  }
  assert.equal(JOBS.filter((j) => !j.unlock).length, 3, 'three jobs to start with');
  assert.equal(new Set(JOBS.map((j) => j.attr)).size, ATTRS.length, 'every attribute has a job');
  assert.deepEqual(startAttrs(START, JOB.barista), { ...START, cha: 7 });

  const p = new Profile(null);
  assert.ok(!jobOpen(JOB.accountant, p));
  assert.deepEqual(checkUnlocks(p), []);
  p.startRun(); p.reached(2); p.endRun({ depth: 2, killer: 'Giant Rat' });
  assert.deepEqual(checkUnlocks(p).map((j) => j.id), ['accountant'], 'floor 2 unlocks the accountant');
  assert.deepEqual(checkUnlocks(p), [], 'once');
  for (let i = 0; i < 2; i++) { p.startRun(); p.endRun({ depth: 1, killer: 'Giant Rat' }); }
  assert.deepEqual(checkUnlocks(p).map((j) => j.id), ['gymTeacher'], 'three deaths unlock the gym teacher');

  assert.equal(cleanName('  donna!? the 3rd~'), 'DONNA THE 3R', 'upper case, font-safe, at most 12 characters');
  assert.equal(cleanName('ab   cd'), 'AB CD');
  assert.ok(cleanName('x'.repeat(40)).length <= NAME_MAX);
  for (const n of NAMES) assert.equal(cleanName(n), n, `suggested name ${n} is clean`);

  // The form: rows NAME, jobs, START; locked jobs can't be chosen.
  const f = new CreationScreen();
  const q = new Profile(null);
  f.show({ name: 'GRETA', isOpen: (j) => jobOpen(j, q) });
  assert.equal(f.act(), 'edit', 'SPACE on the name edits it');
  f.move('down'); f.move('down');
  assert.equal(f.job, 'barista', 'moving the cursor does not choose');
  f.act();
  assert.equal(f.job, 'mallCop', 'SPACE chooses');
  f.move('down'); f.move('down');
  assert.equal(f.rowJob(f.cursor).id, 'accountant');
  f.act();
  assert.equal(f.job, 'mallCop', 'a locked job can not be chosen');
  f.move('up'); f.move('up'); f.move('up'); f.move('up');
  f.move('right');
  assert.notEqual(f.name, 'GRETA', 'LEFT/RIGHT on the name suggests another');
  f.move('up');
  assert.equal(f.act(), 'start', 'SPACE on START starts');
  f.name = ' ';
  assert.equal(f.act(), 'edit', 'no start without a name');
}

console.log('story: profile, reruns, Ozzle greetings and tally OK');
