// The crawler's stats, as on a crawler's status screen in the books:
// five attributes, and everything else derived from them plus gear.
// Pure game logic, no drawing.
//
//   STR strength      melee attack
//   INT intelligence  mana pool (spells come later)
//   CON constitution  hit points and how fast they come back
//   DEX dexterity     aim, dodging, initiative, running away
//   CHA charisma      viewers (and later merchants)
//
// Experience: kills and stairwells give XP; every level brings attribute
// points the crawler spends on the character sheet.
// CHA feeds the viewer count (viewers.js). TODO(M7): CHA lowers merchant prices.

import { ITEMS } from './items.js';
import { Mastery } from './mastery.js';
import { STARTER_SKILLS, passiveBonus } from './skills.js';
import { STARTER_SPELLS } from './spells.js';

export const ATTRS = ['str', 'int', 'con', 'dex', 'cha'];
export const ATTR_NAMES = { str: 'Strength', int: 'Intelligence', con: 'Constitution', dex: 'Dexterity', cha: 'Charisma' };

// Starting attributes of a fresh crawler. Level-ups raise them.
export const START = { str: 5, int: 5, con: 5, dex: 5, cha: 5 };

// Derived values. With every attribute at 5 this gives HP 20, MP 10,
// ATK 1 and +1 HP every 10 actions.
export const DERIVE = {
  hpMax: (a) => 10 + 2 * a.con,
  mpMax: (a) => 2 * a.int,
  atk: (a) => 1 + Math.floor((a.str - 5) / 2),     // plus the weapon's ATK
  regenSteps: (a) => Math.max(3, 15 - a.con),      // actions per HP/MP point
};

// Levels: going from level n to n+1 takes 10 * n XP, so level 2 needs 10
// XP in total, level 3 30, level 4 60, level 5 100, level 6 150. A rat is
// worth 5 XP and a stairwell 10 per floor, so a full run of three floors
// ends around level 6.
export const LEVELING = {
  pointsPerLevel: 3,
  stairsXp: (depth) => 10 * depth,
};
export const xpForLevel = (level) => 5 * level * (level - 1);

export class Crawler {
  constructor(inventory, attrs = START) {
    this.inv = inventory;
    this.attrs = { ...attrs };
    this.hp = this.hpMax;
    this.mp = this.mpMax;
    this.kills = 0;
    this.regen = 0;
    this.level = 1;
    this.xp = 0;       // total experience
    this.points = 0;   // unspent attribute points
    this.skills = new Mastery();
    this.spells = new Mastery();
    for (const id of STARTER_SKILLS) this.skills.learn(id);
    for (const id of STARTER_SPELLS) this.spells.learn(id);
  }

  // What the crawler fights with: 'unarmed' or the weapon's kind.
  get weapon() {
    const w = this.inv.equip.weapon;
    return w ? ITEMS[w.id].cat || 'blade' : 'unarmed';
  }

  // Passive skill bonuses that apply right now (skills.js).
  get bonus() { return passiveBonus(this.skills, this.weapon); }

  // XP needed for the next level, and progress toward it (0..1).
  get xpNext() { return xpForLevel(this.level + 1); }
  get xpShare() {
    const lo = xpForLevel(this.level);
    return (this.xp - lo) / (this.xpNext - lo);
  }

  // Adds experience. Returns the number of levels gained.
  gainXp(n) {
    this.xp += n;
    let ups = 0;
    while (this.xp >= this.xpNext) {
      this.level++;
      this.points += LEVELING.pointsPerLevel;
      ups++;
    }
    return ups;
  }

  // Spends one point on an attribute. More CON or INT also fills the new
  // hit points or mana right away. Returns false without points.
  raise(attr) {
    if (this.points <= 0 || !ATTRS.includes(attr)) return false;
    const hpMax = this.hpMax, mpMax = this.mpMax;
    this.attrs[attr]++;
    this.points--;
    this.hp += this.hpMax - hpMax;
    this.mp += this.mpMax - mpMax;
    return true;
  }

  get str() { return this.attrs.str; }
  get int() { return this.attrs.int; }
  get con() { return this.attrs.con; }
  get dex() { return this.attrs.dex; }
  get cha() { return this.attrs.cha; }

  get hpMax() { return DERIVE.hpMax(this.attrs); }
  get mpMax() { return DERIVE.mpMax(this.attrs); }
  get atk() { return DERIVE.atk(this.attrs) + this.inv.totals().atk; }
  get def() { return this.inv.totals().def + this.bonus.def; }
  get regenSteps() { return DERIVE.regenSteps(this.attrs); }
  get alive() { return this.hp > 0; }

  // Returns the hit points actually restored.
  heal(n) {
    const before = this.hp;
    this.hp = Math.min(this.hpMax, this.hp + n);
    return this.hp - before;
  }

  // Returns the damage actually taken.
  hurt(n) {
    const before = this.hp;
    this.hp = Math.max(0, this.hp - n);
    return before - this.hp;
  }

  // One action outside combat: every regenSteps actions one HP and one MP
  // come back. Returns true when a hit point came back.
  tick() {
    if (!this.alive || (this.hp >= this.hpMax && this.mp >= this.mpMax)) { this.regen = 0; return false; }
    if (++this.regen < this.regenSteps) return false;
    this.regen = 0;
    this.mp = Math.min(this.mpMax, this.mp + 1);
    return this.heal(1) > 0;
  }
}
