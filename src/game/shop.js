// Sal's Previously Owned (M7): prices, stock and trades. Pure game logic.
//
// Every item has a value: its rarity's base value, or its own `value`.
// Sal sells for twice the value and buys for half of it; charisma moves
// both (GDD 4.5): each point of CHA above 5 takes 5 % off what he asks and
// adds 5 % to what he pays, within limits. Stock is rolled once per floor
// from the run's seed, so the same Safe Room keeps the same shelf.

import { ITEMS, RARITY, RARITY_ORDER } from './items.js';
import { seededRandom } from './loot.js';

export const SHOP = {
  baseValue: { common: 6, uncommon: 18, rare: 45, epic: 110, legendary: 260 },
  buyMarkup: 2,        // Sal sells at twice the value
  sellShare: 0.5,      // and buys at half of it
  chaStep: 0.05,       // per point of CHA above (or below) 5
  buyLimits: [0.6, 1.3],
  sellLimits: [0.7, 1.4],
  stockItems: 4,       // plus healing potions, always
  potions: 3,
};

const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));

export function itemValue(id) {
  const d = ITEMS[id];
  return d.value ?? SHOP.baseValue[d.rarity];
}

// What CHA does to prices: factors for buying (lower is better) and selling.
export const buyFactor = (cha) => clamp(1 - SHOP.chaStep * (cha - 5), SHOP.buyLimits);
export const sellFactor = (cha) => clamp(1 + SHOP.chaStep * (cha - 5), SHOP.sellLimits);

export const buyPrice = (id, cha = 5) => Math.max(1, Math.round(itemValue(id) * SHOP.buyMarkup * buyFactor(cha)));
export const sellPrice = (id, cha = 5) => Math.max(1, Math.floor(itemValue(id) * SHOP.sellShare * sellFactor(cha)));

// The shelf for one floor: healing potions plus a few items, a little rarer
// the deeper the floor. Never junk; at most one tome or manual.
export function rollStock(seed, depth) {
  const rand = seededRandom(seed * 977 + depth * 131 + 7);
  const stock = [{ id: 'potion', n: SHOP.potions }];
  const pool = Object.values(ITEMS).filter((d) => d.kind !== 'junk' && d.id !== 'potion');
  // Rarity weights, shifted toward the rare end on deeper floors.
  const weights = RARITY_ORDER.map((r, i) => RARITY[r].weight * (1 + (depth - 1) * 0.6 * i));
  const total = weights.reduce((a, b) => a + b, 0);
  let learned = false, tries = 0;
  while (stock.length < SHOP.stockItems + 1 && tries++ < 200) {
    let x = rand() * total, k = 0;
    while (x >= weights[k] && k < weights.length - 1) x -= weights[k++];
    const options = pool.filter((d) => d.rarity === RARITY_ORDER[k] && !stock.some((s) => s.id === d.id));
    if (!options.length) continue;
    const d = options[Math.floor(rand() * options.length)];
    const teaches = !!(d.teach || d.skillPotion);
    if (teaches && learned) continue;
    learned ||= teaches;
    stock.push({ id: d.id, n: 1 });
  }
  return stock;
}

// The crawler buys stock[i]. Returns { ok, id, price } or { ok: false, why }.
export function buy(stock, i, inventory, cha) {
  const s = stock[i];
  if (!s || s.n <= 0) return { ok: false, why: 'soldOut' };
  const price = buyPrice(s.id, cha);
  if (inventory.gold < price) return { ok: false, why: 'poor', price };
  inventory.gold -= price;
  inventory.add(s.id, 1);
  if (--s.n <= 0) stock.splice(i, 1);
  return { ok: true, id: s.id, price };
}

// The crawler sells one of the bag stack at index. Returns { ok, id, price }.
export function sell(inventory, index, cha) {
  const s = inventory.bag[index];
  if (!s) return { ok: false, why: 'nothing' };
  const price = sellPrice(s.id, cha);
  inventory.take(index, 1);
  inventory.gold += price;
  return { ok: true, id: s.id, price, junk: ITEMS[s.id].kind === 'junk' };
}
