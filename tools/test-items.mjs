// Tests for items, loot tables and the inventory logic.

import assert from 'node:assert/strict';
import { ITEMS, RARITY, SLOTS } from '../src/game/items.js';
import { LOOT_TABLES, rollLoot } from '../src/game/loot.js';
import { Inventory } from '../src/game/inventory.js';

// Catalogue sanity: valid rarity, gear fits a slot, text present.
const slotKinds = new Set(SLOTS.map((s) => s.accepts));
for (const def of Object.values(ITEMS)) {
  assert.ok(RARITY[def.rarity], `${def.id}: unknown rarity ${def.rarity}`);
  assert.ok(['gear', 'consumable', 'junk'].includes(def.kind), `${def.id}: unknown kind`);
  if (def.kind === 'gear') {
    assert.ok(slotKinds.has(def.slot), `${def.id}: no equipment slot takes '${def.slot}'`);
    assert.ok(!def.stack, `${def.id}: gear must not stack`);
  }
  assert.ok(def.name && def.desc, `${def.id}: needs a name and a description`);
}
// Every slot has at least one item that fits.
for (const s of SLOTS) assert.ok(Object.values(ITEMS).some((d) => d.slot === s.accepts), `nothing fits slot ${s.id}`);

// Loot: deterministic per seed, within the table's limits.
for (const name of Object.keys(LOOT_TABLES)) {
  const t = LOOT_TABLES[name];
  for (let seed = 1; seed < 200; seed++) {
    const a = rollLoot(name, seed), b = rollLoot(name, seed);
    assert.deepEqual(a, b, `${name}: same seed must give the same loot`);
    assert.ok(a.gold >= t.gold[0] && a.gold <= t.gold[1], `${name}: gold out of range`);
    assert.ok(a.items.length >= 1 && a.items.length <= t.items[1], `${name}: item count out of range`);
    for (const { id } of a.items) assert.ok(ITEMS[id], `${name}: unknown item ${id}`);
  }
}
const rich = rollLoot('richChest', 5);
assert.ok(rich.items.every(({ id }) => ITEMS[id].rarity !== 'common'), 'richChest: no commons');

// Inventory: stacking, equipping with swap, rings, unequip, use.
const inv = new Inventory();
inv.add('potion', 2);
inv.add('potion');
assert.equal(inv.size, 1, 'potions stack');
assert.equal(inv.count('potion'), 3);
inv.add('shiv');
inv.add('crowbar');
assert.equal(inv.size, 3);

let r = inv.equipFromBag(inv.bag.findIndex((s) => s.id === 'shiv'));
assert.equal(r.slot, 'weapon');
assert.equal(inv.equip.weapon.id, 'shiv');
r = inv.equipFromBag(inv.bag.findIndex((s) => s.id === 'crowbar'));
assert.equal(r.swapped, 'shiv', 'equipping a second weapon swaps the first back');
assert.equal(inv.equip.weapon.id, 'crowbar');
assert.equal(inv.count('shiv'), 1);
assert.equal(inv.totals().atk, ITEMS.crowbar.atk);

inv.add('regretRing');
inv.add('signet');
inv.equipFromBag(inv.bag.findIndex((s) => s.id === 'regretRing'));
inv.equipFromBag(inv.bag.findIndex((s) => s.id === 'signet'));
assert.equal(inv.equip.ring1.id, 'regretRing');
assert.equal(inv.equip.ring2.id, 'signet', 'second ring goes into the free ring slot');

assert.equal(inv.unequip('weapon'), 'crowbar');
assert.equal(inv.equip.weapon, null);
assert.equal(inv.unequip('weapon'), null);

assert.equal(inv.use(inv.bag.findIndex((s) => s.id === 'potion')), 'potion');
assert.equal(inv.count('potion'), 2);
assert.equal(inv.use(inv.bag.findIndex((s) => s.id === 'shiv')), null, 'gear cannot be used');
assert.equal(inv.equipFromBag(inv.bag.findIndex((s) => s.id === 'potion')), null, 'potions cannot be equipped');

const taken = inv.take(inv.bag.findIndex((s) => s.id === 'potion'));
assert.deepEqual(taken, { id: 'potion', n: 2 });
assert.equal(inv.count('potion'), 0);

console.log(`items OK (${Object.keys(ITEMS).length} items, ${Object.keys(LOOT_TABLES).length} loot tables)`);
