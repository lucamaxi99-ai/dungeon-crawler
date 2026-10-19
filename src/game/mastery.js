// Mastery: skills and spells get better the more they are used, like the
// skill levels in the books. Every use counts; going from level n to n+1
// takes 5 * n uses, up to level 10. Pure game logic.

export const MASTERY = {
  max: 10,
  usesToNext: (level) => 5 * level,
};

export class Mastery {
  constructor() {
    this.known = {}; // id -> { level, uses } (uses toward the next level)
    this.order = []; // ids in the order they were learned
  }

  has(id) { return !!this.known[id]; }
  level(id) { return this.known[id] ? this.known[id].level : 0; }
  list() { return this.order.slice(); }

  // Learns something new at level 1. Returns false if it was known already.
  learn(id) {
    if (this.known[id]) return false;
    this.known[id] = { level: 1, uses: 0 };
    this.order.push(id);
    return true;
  }

  // One level up right away (a skill potion on a skill already known).
  // Returns the new level, or 0 at the cap.
  boost(id) {
    const k = this.known[id];
    if (!k || k.level >= MASTERY.max) return 0;
    k.level++;
    k.uses = 0;
    return k.level;
  }

  // Counts uses. Returns the new level if it went up, otherwise 0.
  train(id, n = 1) {
    const k = this.known[id];
    if (!k || k.level >= MASTERY.max) return 0;
    k.uses += n;
    let up = 0;
    while (k.level < MASTERY.max && k.uses >= MASTERY.usesToNext(k.level)) {
      k.uses -= MASTERY.usesToNext(k.level);
      k.level++;
      up = k.level;
    }
    if (k.level >= MASTERY.max) k.uses = 0;
    return up;
  }

  // Progress toward the next level, 0..1 (1 at the cap).
  progress(id) {
    const k = this.known[id];
    if (!k) return 0;
    return k.level >= MASTERY.max ? 1 : k.uses / MASTERY.usesToNext(k.level);
  }
}
