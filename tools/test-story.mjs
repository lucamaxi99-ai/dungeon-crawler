// Tests for the story layer (M7): the profile that survives a death
// (reruns on Borant Encore), Ozzle's rerun greetings and the tally.

import assert from 'node:assert/strict';
import { Profile, PROFILE_KEY } from '../src/game/profile.js';
import { mentorGreeting, killerPhrase } from '../src/game/mentor.js';
import { LINES } from '../src/game/system-ai.js';
import { TALLY, drawTally } from '../src/game/safe-ui.js';

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

console.log('story: profile, reruns, Ozzle greetings and tally OK');
