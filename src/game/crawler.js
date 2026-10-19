// The crawler's combat stats: base values plus whatever gear is equipped.
// Pure game logic, no drawing.
//
//   hp / hpMax  hit points; 0 means dead
//   atk         attack: raises hit chance and damage
//   def         defense: lowers the enemy's hit chance and damage
//   spd         speed: initiative and the chance to flee

export const BASE = { hpMax: 20, atk: 1, def: 0, spd: 5 };

// Outside combat the crawler slowly heals: +1 HP every REGEN_STEPS actions.
export const REGEN_STEPS = 10;

export class Crawler {
  constructor(inventory) {
    this.inv = inventory;
    this.hp = BASE.hpMax;
    this.kills = 0;
    this.regen = 0;
  }

  get hpMax() { return BASE.hpMax; }
  get atk() { return BASE.atk + this.inv.totals().atk; }
  get def() { return BASE.def + this.inv.totals().def; }
  get spd() { return BASE.spd; }
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

  // One action outside combat. Returns true when a hit point came back.
  tick() {
    if (this.hp >= this.hpMax || !this.alive) { this.regen = 0; return false; }
    if (++this.regen < REGEN_STEPS) return false;
    this.regen = 0;
    this.heal(1);
    return true;
  }
}
