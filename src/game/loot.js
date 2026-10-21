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
// learn: chance per item roll to hand out a tome or skill potion instead
// (they are also in the general pool, as rare and uncommon items).
// box_*: loot boxes per tier (lootboxes.js). Sponsored boxes and chests
// add to `learn` (see openBox and sponsoredChest).
export const LOOT_TABLES = {
  chest: { items: [2, 3], gold: [5, 25] },
  richChest: { items: [3, 4], gold: [20, 60], minRarity: 'uncommon' },
  sponsoredChest: { items: [2, 3], gold: [15, 40], minRarity: 'uncommon', learn: 0.45 },
  box_bronze: { items: [1, 2], gold: [5, 20] },
  box_silver: { items: [1, 2], gold: [15, 40], minRarity: 'uncommon' },
  box_gold: { items: [2, 3], gold: [30, 80], minRarity: 'uncommon', learn: 0.15 },
  box_platinum: { items: [2, 3], gold: [60, 150], minRarity: 'rare', learn: 0.2 },
  box_legendary: { items: [3, 3], gold: [100, 250], minRarity: 'epic', learn: 0.25 },
  box_celestial: { items: [3, 4], gold: [200, 500], minRarity: 'epic', learn: 0.3 },
};

// Tomes, manuals and skill potions.
export const LEARNING = Object.values(ITEMS).filter((d) => d.teach || d.skillPotion).map((d) => d.id);

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
// extraLearn: added to the table's chance of a learning item (sponsors).
export function rollLoot(tableName, seed, extraLearn = 0) {
  const table = LOOT_TABLES[tableName];
  if (!table) throw new Error(`Unknown loot table '${tableName}'`);
  const rand = seededRandom(seed);
  const pool = (table.pool || Object.keys(ITEMS)).map((id) => ITEMS[id]).filter((d) => d.kind !== 'key');
  const found = [];
  const rolls = between(rand, table.items);
  const learn = Math.min(0.8, (table.learn || 0) + extraLearn);
  for (let i = 0; i < rolls; i++) {
    if (learn && rand() < learn) {
      const id = LEARNING[Math.floor(rand() * LEARNING.length)];
      const same = found.find((f) => f.id === id && ITEMS[id].stack);
      if (same) same.n++; else found.push({ id, n: 1 });
      continue;
    }
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
