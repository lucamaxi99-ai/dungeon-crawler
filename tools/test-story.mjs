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
import { SHOP, itemValue, buyPrice, sellPrice, rollStock, buy, sell } from '../src/game/shop.js';
import { MERCHANT, MERCHANT_POSES, MERCHANT_LINES, paintMerchant } from '../src/game/merchant.js';
import { MENTOR_LINES } from '../src/game/mentor.js';
import { Inventory } from '../src/game/inventory.js';
import { ITEMS } from '../src/game/items.js';
import { SAVE_KEY, saveRun, loadRun, clearRun, packSeen, unpackSeen, crawlerState, restoreCrawler } from '../src/game/save.js';
import { Crawler } from '../src/game/crawler.js';

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
  for (const l of [...(cast.open || []), ...(cast.close || [])]) assert.ok(l.length < 190, `${who}: open/close line too long`);
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

// The producer's first call: the cancellation, the guest star, and he hangs up.
{
  const p = new Profile(null);
  const ctx = { profile: p, rerun: 0, deaths: 0, page: false, vars: { t: 0, r: 0 } };
  const intro = CAST.quill.topics.find((t) => t.id === 'intro');
  const c = new Conversation('quill', intro, ctx);
  assert.match(c.text, /Quill Dobrane/);
  let n = 0;
  while (c.choose(0) && n++ < 10);
  assert.ok(p.flag('heardCancel') && p.flag('quillMet'), 'the call tells of the cancellation and ends');
  assert.ok(p.hasSeen('quill:q1'), 'the profile remembers the call (later reruns get a shorter one)');
  const win = new Conversation('quill', CAST.quill.topics.find((t) => t.id === 'win'), ctx);
  assert.equal(win.replies.length, 1, 'no yellow paper to mention without the contract page');
  const win2 = new Conversation('quill', CAST.quill.topics.find((t) => t.id === 'win'), { ...ctx, page: true });
  assert.equal(win2.replies.length, 2);
}

// Page 1 of Ozzle's contract (GDD 2.3): handed over in the Safe Room, or
// sent to him by the lost and found if the crawler died with it.
{
  const p = new Profile(null);
  const bag = new Inventory();
  const ctx = () => ({
    profile: p, rerun: 0, deaths: 0, vars: {}, page: true, hasPage: bag.count('contractPage1') > 0,
    give: (id) => bag.take(bag.bag.findIndex((s) => s.id === id), 1),
  });
  const ids = () => topicsFor('ozzle', ctx()).map((t) => t.id);
  assert.ok(!ids().some((t) => /page|pinned/i.test(t)), 'no page topics before the page');
  bag.add('contractPage1');
  p.setFlag('contractPage1');
  assert.ok(ids().includes('page') && !ids().includes('pageLost'), 'carrying the page opens the topic');
  assert.equal(mentorGreeting({ visits: 2, floorVisits: 1, depth: 3, hpShare: 1, points: 0, boxes: 0, kills: 3, viewers: 80, hasPage: true }), MENTOR_LINES.hasPage[0], 'Ozzle spots the page first');
  const c = new Conversation('ozzle', topicsFor('ozzle', ctx()).find((t) => t.id === 'page'), ctx());
  let n = 0;
  while (c.choose(0) && n++ < 10);
  assert.equal(bag.count('contractPage1'), 0, 'the page goes to Ozzle');
  assert.ok(p.flag('page1Given'));
  assert.deepEqual(ids().filter((t) => /page|pinned/i.test(t)), ['pinned'], 'then it hangs on the wall');
  // Died with it: the next rerun, Ozzle got it by mail.
  const q = new Profile(null);
  q.setFlag('contractPage1');
  const lost = topicsFor('ozzle', { profile: q, rerun: 1, deaths: 1, vars: {}, hasPage: false });
  assert.ok(lost.some((t) => t.id === 'pageLost') && !lost.some((t) => t.id === 'pinned'));
  // Key items are not merchandise.
  const b2 = new Inventory();
  b2.add('contractPage1');
  assert.equal(sell(b2, 0, 5).why, 'keyItem', 'Sal does not buy the page');
  assert.equal(b2.count('contractPage1'), 1);
  assert.ok(!rollStock(7, 3).some((s) => ITEMS[s.id].kind === 'key'), 'never on the shelf');
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

// ---------------------------------------------------------- merchant

for (const pose of MERCHANT_POSES) {
  const img = paintMerchant(pose);
  assert.equal(img.w, MERCHANT.w, `merchant ${pose}: width`);
  assert.equal(img.h, MERCHANT.h, `merchant ${pose}: height`);
  const opaque = (x, y) => img.data[y * img.w + x] !== 255;
  for (let y = 0; y < img.h; y++) assert.ok(!opaque(0, y) && !opaque(img.w - 1, y), `merchant ${pose}: cut off at the side (row ${y})`);
  for (let x = 0; x < img.w; x++) assert.ok(!opaque(x, 0), `merchant ${pose}: cut off at the top`);
}
for (const [topic, lines] of Object.entries(MERCHANT_LINES)) assert.ok(lines.length && lines.every((l) => l.length < 190), `merchant ${topic}: lines fit the bubble`);
assert.ok(MENTOR_LINES.afterShop.every((l) => l.length < 190));

{
  // Prices: twice the value to buy, half to sell; CHA helps both ways.
  for (const id of Object.keys(ITEMS)) {
    assert.ok(itemValue(id) > 0, `${id}: has a value`);
    assert.ok(sellPrice(id, 10) < buyPrice(id, 10), `${id}: no profit from buying and selling back, even at CHA 10`);
  }
  assert.equal(buyPrice('potion'), 12);
  assert.equal(sellPrice('potion'), 3);
  assert.ok(buyPrice('sword', 9) < buyPrice('sword', 5) && buyPrice('sword', 5) < buyPrice('sword', 3), 'CHA lowers prices');
  assert.ok(sellPrice('sword', 9) > sellPrice('sword', 5), 'CHA raises what he pays');
  assert.equal(sellPrice('trophy'), 1, 'a participation trophy is worth what it is worth');
  assert.ok(buyPrice('sword', 50) >= Math.round(itemValue('sword') * SHOP.buyMarkup * SHOP.buyLimits[0]), 'charisma has limits');

  // Stock: the same per seed and floor, potions first, no junk, at most one book.
  const a = rollStock(42, 1), b = rollStock(42, 1);
  assert.deepEqual(a, b, 'the same shelf for the same floor');
  assert.notDeepEqual(rollStock(42, 1), rollStock(42, 2), 'a new floor, a new shelf');
  for (let seed = 1; seed < 200; seed++) {
    for (const depth of [1, 2, 3]) {
      const st = rollStock(seed, depth);
      assert.equal(st[0].id, 'potion');
      assert.equal(st.length, SHOP.stockItems + 1, `seed ${seed}: full shelf`);
      assert.equal(new Set(st.map((x) => x.id)).size, st.length, 'no duplicates');
      assert.ok(st.every((x) => ITEMS[x.id].kind !== 'junk'), 'no junk for sale');
      assert.ok(st.filter((x) => ITEMS[x.id].teach || ITEMS[x.id].skillPotion).length <= 1, 'at most one book');
    }
  }
  const rarer = (d) => { let n = 0; for (let s = 1; s < 300; s++) n += rollStock(s, d).filter((x) => ['rare', 'epic', 'legendary'].includes(ITEMS[x.id].rarity)).length; return n; };
  assert.ok(rarer(3) > rarer(1), 'deeper floors stock rarer things');

  // Trades.
  const inv = new Inventory();
  const stock = [{ id: 'potion', n: 2 }, { id: 'sword', n: 1 }];
  assert.deepEqual(buy(stock, 0, inv, 5), { ok: false, why: 'poor', price: 12 });
  inv.gold = 100;
  assert.ok(buy(stock, 0, inv, 5).ok);
  assert.equal(inv.gold, 88);
  assert.equal(inv.count('potion'), 1);
  assert.equal(stock[0].n, 1);
  buy(stock, 0, inv, 5);
  assert.equal(stock.length, 1, 'sold out lines leave the shelf');
  inv.add('ratTail', 3);
  const tail = inv.bag.findIndex((x) => x.id === 'ratTail');
  const r = sell(inv, tail, 5);
  assert.ok(r.ok && r.junk && r.price === 1);
  assert.equal(inv.count('ratTail'), 2, 'one at a time');
  assert.equal(inv.gold, 88 - 12 + 1);
  assert.equal(sell(inv, 99, 5).ok, false);
}

// ---------------------------------------------------------- save and quit

{
  const seen = new Uint8Array(42 * 42);
  for (let i = 0; i < seen.length; i++) seen[i] = (i * 7) % 5 === 0 ? 1 : 0;
  const packed = packSeen(seen);
  assert.ok(packed.length <= Math.ceil(seen.length / 6));
  assert.deepEqual(unpackSeen(packed, new Uint8Array(seen.length)), seen, 'the explored map survives packing');
  assert.ok(!/["\\]/.test(packed), 'packed map is JSON-friendly');

  const inv = new Inventory();
  const c = new Crawler(inv);
  c.name = 'GRETA'; c.job = 'mallCop'; c.attrs.con = 9; c.hp = 7; c.xp = 33; c.level = 3; c.points = 2;
  c.skills.learn('pocketSand');
  const back = restoreCrawler(new Crawler(new Inventory()), JSON.parse(JSON.stringify(crawlerState(c))));
  assert.equal(back.name, 'GRETA');
  assert.equal(back.hpMax, c.hpMax);
  assert.equal(back.hp, 7);
  assert.deepEqual(back.skills.list(), c.skills.list(), 'skills come back');
  c.attrs.con = 1;
  assert.equal(back.attrs.con, 9, 'restored state is a copy');

  const store = memoryStorage();
  assert.equal(loadRun(store), null);
  assert.ok(saveRun(store, { run: { depth: 2 } }));
  assert.equal(loadRun(store).run.depth, 2);
  store.setItem(SAVE_KEY, JSON.stringify({ v: 999, run: {} }));
  assert.equal(loadRun(store), null, 'saves from another version are ignored');
  store.setItem(SAVE_KEY, '{oops');
  assert.equal(loadRun(store), null, 'a broken save is no save');
  saveRun(store, { run: {} });
  clearRun(store);
  assert.equal(loadRun(store), null);
  assert.equal(saveRun(null, {}), false, 'without storage there is no save');
}

console.log('story: profile, reruns, Ozzle greetings and tally OK');
