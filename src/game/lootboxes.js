// Loot boxes, as in the books: rewards for achievements and gifts from
// sponsors, in six tiers. They pile up and are opened in a Safe Room.
// Pure game logic, no drawing.

import { C } from '../engine/palette.js';
import { rollLoot } from './loot.js';

export const BOX_TIERS = ['bronze', 'silver', 'gold', 'platinum', 'legendary', 'celestial'];

// name: shown in the HUD; color: text and glow in the HUD.
export const TIER = {
  bronze: { name: 'Bronze', color: C.AMBER },
  silver: { name: 'Silver', color: C.STEEL_L },
  gold: { name: 'Gold', color: C.YELLOW },
  platinum: { name: 'Platinum', color: C.ICE },
  legendary: { name: 'Legendary', color: C.NEON },
  celestial: { name: 'Celestial', color: C.MINT },
};

export const boxName = (tier, sponsored = false) => `${sponsored ? 'Sponsored ' : ''}${TIER[tier].name} Box`;

// Sponsored boxes lean toward tomes and skill potions.
export const SPONSOR_LEARN = 0.45;

// What is inside a box. box: { tier, sponsored }. Returns { gold, items }.
export function openBox(box, seed) {
  return rollLoot(`box_${box.tier}`, seed, box.sponsored ? SPONSOR_LEARN : 0);
}
