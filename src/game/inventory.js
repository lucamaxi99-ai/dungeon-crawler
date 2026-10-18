// The crawler's inventory: an unlimited bag (the System stores your stuff
// "somewhere", as in the books), eleven equipment slots and a gold counter.
// Pure game logic, no drawing. Every action returns a short result the caller
// can turn into a System AI line.

import { ITEMS, SLOTS, item } from './items.js';

export class Inventory {
  constructor() {
    this.bag = [];                                              // [{ id, n }]
    this.equip = Object.fromEntries(SLOTS.map((s) => [s.id, null])); // slot -> { id, n: 1 }
    this.gold = 0;
  }

  // Adds n of an item. Stackable items join an existing stack.
  add(id, n = 1) {
    const def = item(id);
    if (def.stack) {
      const s = this.bag.find((b) => b.id === id);
      if (s) { s.n += n; return s; }
      const stack = { id, n };
      this.bag.push(stack);
      return stack;
    }
    let last = null;
    for (let i = 0; i < n; i++) { last = { id, n: 1 }; this.bag.push(last); }
    return last;
  }

  // Removes n from the bag stack at index; returns { id, n } that was taken.
  take(index, n = Infinity) {
    const s = this.bag[index];
    if (!s) return null;
    const k = Math.min(n, s.n);
    s.n -= k;
    if (s.n <= 0) this.bag.splice(index, 1);
    return { id: s.id, n: k };
  }

  count(id) {
    return this.bag.reduce((sum, s) => sum + (s.id === id ? s.n : 0), 0);
  }

  // Which slot an item would go into: the first empty one that accepts it,
  // otherwise the first one that accepts it (swap).
  slotFor(id) {
    const def = ITEMS[id];
    if (!def || def.kind !== 'gear') return null;
    const fits = SLOTS.filter((s) => s.accepts === def.slot);
    return (fits.find((s) => !this.equip[s.id]) || fits[0]).id;
  }

  // Equips the bag item at index. Whatever was in the slot goes back to
  // the bag. Returns { slot, item, swapped } or null.
  equipFromBag(index) {
    const s = this.bag[index];
    if (!s) return null;
    const slot = this.slotFor(s.id);
    if (!slot) return null;
    this.take(index, 1);
    const swapped = this.equip[slot];
    this.equip[slot] = { id: s.id, n: 1 };
    if (swapped) this.bag.splice(index, 0, swapped);
    return { slot, item: s.id, swapped: swapped?.id ?? null };
  }

  // Moves an equipped item back into the bag (at the end).
  unequip(slot) {
    const e = this.equip[slot];
    if (!e) return null;
    this.equip[slot] = null;
    this.bag.push(e);
    return e.id;
  }

  // Uses a consumable from the bag. Returns the item id or null.
  // TODO(M4): healing does nothing until hit points exist.
  use(index) {
    const s = this.bag[index];
    if (!s || ITEMS[s.id].kind !== 'consumable') return null;
    this.take(index, 1);
    return s.id;
  }

  // Sum of attack and defense from equipped gear.
  // TODO(M4): fed into combat once it exists.
  totals() {
    let atk = 0, def = 0;
    for (const slot of Object.keys(this.equip)) {
      const e = this.equip[slot];
      if (!e) continue;
      atk += ITEMS[e.id].atk;
      def += ITEMS[e.id].def;
    }
    return { atk, def };
  }

  get size() {
    return this.bag.length;
  }
}

