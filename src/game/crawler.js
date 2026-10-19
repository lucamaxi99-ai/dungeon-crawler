// The crawler's stats, as on a crawler's status screen in the books:
// five attributes, and everything else derived from them plus gear.
// Pure game logic, no drawing.
//
//   STR strength      melee attack
//   INT intelligence  mana pool (spells come later)
//   CON constitution  hit points and how fast they come back
//   DEX dexterity     aim, dodging, initiative, running away
//   CHA charisma      viewers and merchants (not used yet)
//
// TODO(M5): spells spend MP, skills, XP and level-ups that raise attributes.
// TODO(M6): CHA feeds the viewer count; TODO(M7): CHA lowers merchant prices.

export const ATTRS = ['str', 'int', 'con', 'dex', 'cha'];
export const ATTR_NAMES = { str: 'Strength', int: 'Intelligence', con: 'Constitution', dex: 'Dexterity', cha: 'Charisma' };

// Starting attributes of a fresh crawler. Level-ups raise them (M5).
export const START = { str: 5, int: 5, con: 5, dex: 5, cha: 5 };

// Derived values. With every attribute at 5 this gives HP 20, MP 10,
// ATK 1 and +1 HP every 10 actions.
export const DERIVE = {
  hpMax: (a) => 10 + 2 * a.con,
  mpMax: (a) => 2 * a.int,
  atk: (a) => 1 + Math.floor((a.str - 5) / 2),     // plus the weapon's ATK
  regenSteps: (a) => Math.max(3, 15 - a.con),      // actions per HP/MP point
};

export class Crawler {
  constructor(inventory, attrs = START) {
    this.inv = inventory;
    this.attrs = { ...attrs };
    this.hp = this.hpMax;
    this.mp = this.mpMax;
    this.kills = 0;
    this.regen = 0;
  }

  get str() { return this.attrs.str; }
  get int() { return this.attrs.int; }
  get con() { return this.attrs.con; }
  get dex() { return this.attrs.dex; }
  get cha() { return this.attrs.cha; }

  get hpMax() { return DERIVE.hpMax(this.attrs); }
  get mpMax() { return DERIVE.mpMax(this.attrs); }
  get atk() { return DERIVE.atk(this.attrs) + this.inv.totals().atk; }
  get def() { return this.inv.totals().def; }
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
