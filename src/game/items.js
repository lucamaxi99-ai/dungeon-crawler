// Item catalogue: every item the dungeon can hand out, with rarity, slot,
// stats and the System AI's opinion of it. All text is original.
//
// An item *definition* lives in ITEMS. What the player carries are item
// *stacks*: { id, n }. Gear never stacks (n is always 1), consumables and
// junk with `stack: true` do.

import { C } from '../engine/palette.js';

// Rarity scale for items (separate from the loot box tiers of M6).
// weight: how often it drops relative to the others.
export const RARITY = {
  common: { name: 'Common', color: C.BONE, weight: 60 },
  uncommon: { name: 'Uncommon', color: C.LIME, weight: 25 },
  rare: { name: 'Rare', color: C.SKY, weight: 10 },
  epic: { name: 'Epic', color: C.MAGENTA, weight: 4 },
  legendary: { name: 'Legendary', color: C.GOLD, weight: 1 },
};
export const RARITY_ORDER = Object.keys(RARITY);

// Equipment slots, in the order the paper doll shows them.
// accepts: which item `slot` value fits (both ring slots take rings).
export const SLOTS = [
  { id: 'head', name: 'Head', accepts: 'head' },
  { id: 'neck', name: 'Neck', accepts: 'neck' },
  { id: 'cloak', name: 'Cloak', accepts: 'cloak' },
  { id: 'body', name: 'Body', accepts: 'body' },
  { id: 'belt', name: 'Belt', accepts: 'belt' },
  { id: 'feet', name: 'Feet', accepts: 'feet' },
  { id: 'hands', name: 'Hands', accepts: 'hands' },
  { id: 'weapon', name: 'Weapon', accepts: 'weapon' },
  { id: 'offhand', name: 'Off hand', accepts: 'offhand' },
  { id: 'ring1', name: 'Ring', accepts: 'ring' },
  { id: 'ring2', name: 'Ring', accepts: 'ring' },
];
export const SLOT_BY_ID = Object.fromEntries(SLOTS.map((s) => [s.id, s]));

// kind: 'gear' (has a slot), 'consumable' (can be used), 'junk'.
// short: name for tight spots like the combat menu (consumables).
// atk/def: added to the crawler's stats while equipped (crawler.js).
// heal: hit points restored on use. cat: kind of weapon ('blade', 'blunt'),
// for the weapon skills (skills.js).
const DEFS = [
  // ---------------------------------------------------------- weapons
  { id: 'shiv', name: 'Rusty Shiv', kind: 'gear', slot: 'weapon', rarity: 'common', atk: 2, cat: 'blade',
    desc: 'Technically a weapon. Legally a tetanus delivery system.' },
  { id: 'crowbar', name: 'Borant-Issue Crowbar', kind: 'gear', slot: 'weapon', rarity: 'uncommon', atk: 4, cat: 'blunt',
    desc: 'Opens crates, doors and arguments. Property of Borant. Do not return it.' },
  { id: 'sword', name: 'Sword of Moderate Adequacy', kind: 'gear', slot: 'weapon', rarity: 'rare', atk: 6, cat: 'blade',
    desc: 'Pointy end goes in the monster. The other end goes in you, metaphorically, via the warranty.' },
  // ---------------------------------------------------------- off hand
  { id: 'potLid', name: 'Pot Lid', kind: 'gear', slot: 'offhand', rarity: 'common', def: 1,
    desc: 'A shield if you squint. Still smells faintly of soup, which monsters find motivating.' },
  { id: 'buckler', name: 'Dented Buckler', kind: 'gear', slot: 'offhand', rarity: 'uncommon', def: 2,
    desc: 'Each dent is a story. Each story ends with the previous owner dying.' },
  // ---------------------------------------------------------- head
  { id: 'cone', name: 'Traffic Cone', kind: 'gear', slot: 'head', rarity: 'common', def: 1,
    desc: 'Salvaged from the surface. Makes you highly visible to oncoming monsters.' },
  { id: 'minerHelm', name: 'Miner\'s Helmet', kind: 'gear', slot: 'head', rarity: 'uncommon', def: 2,
    desc: 'The lamp is broken. Management considers this a difficulty setting.' },
  // ---------------------------------------------------------- neck
  { id: 'lanyard', name: 'Sponsor Lanyard', kind: 'gear', slot: 'neck', rarity: 'uncommon',
    desc: 'Grants +0 to everything and a little badge that says GUEST. The viewers love a good badge.' },
  { id: 'luckyAmulet', name: 'Amulet of Mild Luck', kind: 'gear', slot: 'neck', rarity: 'rare', def: 1,
    desc: 'Statistically you are now slightly less doomed. Results not guaranteed. Results never are.' },
  // ---------------------------------------------------------- cloak
  { id: 'mothCloak', name: 'Moth-Eaten Cloak', kind: 'gear', slot: 'cloak', rarity: 'common', def: 1,
    desc: 'The moths have filed a complaint. They were here first.' },
  // ---------------------------------------------------------- body
  { id: 'bathrobe', name: 'Hotel Bathrobe', kind: 'gear', slot: 'body', rarity: 'common', def: 1,
    desc: 'Fluffy, absorbent, flammable. The hotel would like it back. The hotel is rubble.' },
  { id: 'jerkin', name: 'Leather Jerkin', kind: 'gear', slot: 'body', rarity: 'uncommon', def: 3,
    desc: 'Honest armor for honest crawlers. Neither exists down here, but it fits.' },
  { id: 'chainmail', name: 'Chainmail of Questionable Origin', kind: 'gear', slot: 'body', rarity: 'rare', def: 5,
    desc: 'Still warm. Do not ask where it came from. The last crawler who asked is also still warm.' },
  // ---------------------------------------------------------- hands, belt, feet
  { id: 'ovenMitts', name: 'Oven Mitts', kind: 'gear', slot: 'hands', rarity: 'common', def: 1,
    desc: 'Hot things no longer hurt. Sharp things still do. Please plan accordingly.' },
  { id: 'toolBelt', name: 'Utility Belt', kind: 'gear', slot: 'belt', rarity: 'uncommon', def: 1,
    desc: 'Many pockets, all empty. Much like the promises in your contract.' },
  { id: 'shoes', name: 'Sensible Shoes', kind: 'gear', slot: 'feet', rarity: 'common', def: 1,
    desc: 'Orthopedic. Your feet thank you. Nothing else down here will.' },
  { id: 'briskBoots', name: 'Boots of Brisk Walking', kind: 'gear', slot: 'feet', rarity: 'epic', def: 2,
    desc: 'Walk away from your problems at a respectable pace. Running costs extra.' },
  // ---------------------------------------------------------- rings
  { id: 'regretRing', name: 'Ring of Minor Regret', kind: 'gear', slot: 'ring', rarity: 'uncommon', atk: 1,
    desc: 'You will regret wearing it, but only a little, and mostly on Tuesdays.' },
  { id: 'signet', name: 'Syndicate Signet (Replica)', kind: 'gear', slot: 'ring', rarity: 'epic', atk: 1, def: 1,
    desc: 'Official merchandise. Wearing it does not make you a member. Nothing makes you a member.' },
  // ---------------------------------------------------------- consumables
  { id: 'potion', name: 'Healing Potion', short: 'Potion', kind: 'consumable', rarity: 'common', heal: 10, stack: true,
    desc: 'Tastes like cherries and copper. Side effects include living a bit longer.' },
  { id: 'mushroom', name: 'Suspicious Mushroom', short: 'Mushroom', kind: 'consumable', rarity: 'uncommon', heal: 3, stack: true,
    desc: 'Probably edible. The viewers have placed bets. Most of them are on "no".' },
  { id: 'ration', name: 'Borant Ration Bar', short: 'Ration Bar', kind: 'consumable', rarity: 'common', heal: 2, stack: true,
    desc: 'All the nutrients a crawler needs, compressed into the texture of drywall.' },
  // ---------------------------------------------------------- tomes and potions
  // teach: { spell } or { skill } learned on use (a known one goes up a level
  // instead); skillPotion: a random skill from the potion pool. Not usable in
  // combat (calm: nobody reads in a fight).
  { id: 'tomeMissile', name: 'Tome of Magic Missile', short: 'Missile Tome', kind: 'consumable', rarity: 'rare', teach: { spell: 'magicMissile' },
    desc: 'Chapter one: point. Chapter two: shoot. Chapter three is a coupon for a mana potion that does not exist.' },
  { id: 'tomeHex', name: 'Tome of Mild Inconvenience', short: 'Hex Tome', kind: 'consumable', rarity: 'uncommon', teach: { spell: 'hex' },
    desc: 'A grimoire of petty curses. Several pages have been licked by something. Possibly you, later.' },
  { id: 'tomeSand', name: 'Pocket Sand for Dummies', short: 'Sand Manual', kind: 'consumable', rarity: 'rare', teach: { skill: 'pocketSand' },
    desc: 'A complete course in throwing dirt at people. Includes a free sample in the spine.' },
  { id: 'ratPamphlet', name: 'Rat Racing Pamphlet', short: 'Pamphlet', kind: 'consumable', rarity: 'uncommon', teach: { skill: 'cardio' },
    desc: 'Training tips from the fastest rats on the floor. Mostly: run. The rat who wrote it is dead, which proves something.' },
  { id: 'skillPotion', name: 'Skill Potion', short: 'Skill Potion', kind: 'consumable', rarity: 'rare', skillPotion: true, stack: true,
    desc: 'Teaches you something at random. Side effects include knowing things you did not ask to know.' },
  // ---------------------------------------------------------- junk
  { id: 'ratTail', name: 'Rat Tail', kind: 'junk', rarity: 'common', stack: true,
    desc: 'A tail. The rat is elsewhere. Possibly behind you.' },
  { id: 'trophy', name: 'Participation Trophy', kind: 'junk', rarity: 'legendary',
    desc: 'Awarded for showing up. You did not have a choice. Congratulations anyway.' },
];

export const ITEMS = Object.fromEntries(DEFS.map((d) => [d.id, { atk: 0, def: 0, heal: 0, stack: false, ...d }]));

export function item(id) {
  const def = ITEMS[id];
  if (!def) throw new Error(`Unknown item '${id}'`);
  return def;
}

// One-line summary for the detail box: "WEAPON  ATK 4" etc.
export function itemStats(def) {
  const parts = [];
  if (def.kind === 'gear') parts.push(def.slot === 'offhand' ? 'OFF HAND' : def.slot.toUpperCase());
  else parts.push(def.kind.toUpperCase());
  if (def.atk) parts.push(`ATK +${def.atk}`);
  if (def.def) parts.push(`DEF +${def.def}`);
  if (def.heal) parts.push(`HEALS ${def.heal}`);
  if (def.teach) parts.push(def.teach.spell ? 'TEACHES A SPELL' : 'TEACHES A SKILL');
  if (def.skillPotion) parts.push('RANDOM SKILL');
  return parts.join('  ');
}
