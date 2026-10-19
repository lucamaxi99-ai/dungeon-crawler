// Tests for the crawler's stats (and, later, the combat rules).

import assert from 'node:assert/strict';
import { Inventory } from '../src/game/inventory.js';
import { Crawler, BASE, REGEN_STEPS } from '../src/game/crawler.js';

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

console.log('combat OK (crawler stats)');
