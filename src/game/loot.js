// Loot tables: what a container hands out when opened.
// Rolls pick a rarity first (weighted, see RARITY), then an item of that
// rarity from the table's pool. Gold is rolled separately.

import { ITEMS, RARITY, RARITY_ORDER } from './items.js';

// Small seeded RNG so a given chest always holds the same thing.
export function seededRandom(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// items: [min, max] number of item rolls. gold: [min, max].
// pool: item ids that may drop (default: everything).
// minRarity: rarities below this are re-rolled upward.
export const LOOT_TABLES = {
  chest: { items: [2, 3], gold: [5, 25] },
  richChest: { items: [3, 4], gold: [20, 60], minRarity: 'uncommon' },
};

function pickRarity(rand, minRarity) {
  const start = minRarity ? RARITY_ORDER.indexOf(minRarity) : 0;
  const tiers = RARITY_ORDER.slice(start);
  const total = tiers.reduce((s, r) => s + RARITY[r].weight, 0);
  let x = rand() * total;
  for (const r of tiers) {
    x -= RARITY[r].weight;
    if (x < 0) return r;
  }
  return tiers[tiers.length - 1];
}

const between = (rand, [a, b]) => a + Math.floor(rand() * (b - a + 1));

// Returns { gold, items: [{ id, n }] }. Stackables found twice merge.
export function rollLoot(tableName, seed) {
  const table = LOOT_TABLES[tableName];
  if (!table) throw new Error(`Unknown loot table '${tableName}'`);
  const rand = seededRandom(seed);
  const pool = (table.pool || Object.keys(ITEMS)).map((id) => ITEMS[id]);
  const found = [];
  const rolls = between(rand, table.items);
  for (let i = 0; i < rolls; i++) {
    let rarity = pickRarity(rand, table.minRarity);
    // Fall back to the next lower rarity if the pool has nothing at this one.
    let options = pool.filter((d) => d.rarity === rarity);
    while (!options.length) {
      rarity = RARITY_ORDER[Math.max(0, RARITY_ORDER.indexOf(rarity) - 1)];
      options = pool.filter((d) => d.rarity === rarity);
      if (rarity === RARITY_ORDER[0] && !options.length) break;
    }
    if (!options.length) continue;
    const def = options[Math.floor(rand() * options.length)];
    const n = def.stack ? 1 + Math.floor(rand() * 2) : 1;
    const same = def.stack && found.find((f) => f.id === def.id);
    if (same) same.n += n; else found.push({ id: def.id, n });
  }
  return { gold: between(rand, table.gold), items: found };
}
