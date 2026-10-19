// Turn-based combat rules. Pure game logic, no drawing or timing: the
// caller asks whose turn it is, feeds in the crawler's choice or lets the
// enemy act, and turns the returned events into text and animation.
//
// Flow: initiative is rolled once when the fight starts (d6 + SPD, +2 for
// whoever started it, ties go to the crawler). Then everybody acts in that
// order, round after round, until all enemies are dead, the crawler is
// dead or the crawler got away.
//
// Event: { kind, actor, target?, amount? }
//   kind: 'hit' | 'crit' | 'miss' | 'blocked' | 'defend' | 'item' | 'flee'
//         | 'fleeFail' | 'kill' | 'death'

export const RULES = {
  hitBase: 0.75,        // crawler's base chance to hit
  enemyHitBase: 0.7,    // enemy's base chance to hit
  hitPerPoint: 0.05,    // per point of ATK above the target's DEF
  hitMin: 0.2, hitMax: 0.95,
  crit: 0.06,           // crawler only: double damage
  defendHit: -0.15,     // enemy hit chance while the crawler defends
  fleeBase: 0.5, fleePerSpd: 0.1, fleeMin: 0.2, fleeMax: 0.9,
  initiatorBonus: 2,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function hitChance(base, atk, def, bonus = 0) {
  return clamp(base + RULES.hitPerPoint * (atk - def) + bonus, RULES.hitMin, RULES.hitMax);
}

// Crawler: 1 to ATK+1 damage. Enemy: its own range. DEF soaks half its value.
export function crawlerDamage(atk, def, rnd) {
  return Math.max(1, 1 + Math.floor(rnd() * (atk + 1)) - Math.floor(def / 2));
}
export function enemyDamage([lo, hi], def, rnd) {
  return Math.max(1, lo + Math.floor(rnd() * (hi - lo + 1)) - Math.floor(def / 2));
}

export function fleeChance(spd, enemies) {
  const fastest = Math.max(...enemies.map((e) => e.stats.spd));
  return clamp(RULES.fleeBase + RULES.fleePerSpd * (spd - fastest), RULES.fleeMin, RULES.fleeMax);
}

export class Combat {
  // crawler: Crawler; enemies: Enemy[]; initiator: 'crawler' | 'enemy'.
  constructor(crawler, enemies, { initiator = 'enemy', rnd = Math.random } = {}) {
    this.crawler = crawler;
    this.enemies = enemies;
    this.rnd = rnd;
    this.round = 1;
    this.defending = false;
    this.result = null;   // null while fighting, then 'won' | 'lost' | 'fled'
    const roll = (spd, starter) => 1 + Math.floor(rnd() * 6) + spd + (starter ? RULES.initiatorBonus : 0);
    const order = [{ who: crawler, init: roll(crawler.spd, initiator === 'crawler'), first: 1 }];
    for (const e of enemies) order.push({ who: e, init: roll(e.stats.spd, initiator === 'enemy'), first: 0 });
    order.sort((a, b) => b.init - a.init || b.first - a.first);
    this.order = order.map((o) => o.who);
    this.turn = 0;
  }

  get current() { return this.order[this.turn]; }
  get crawlersTurn() { return !this.result && this.current === this.crawler; }
  get alive() { return this.enemies.filter((e) => e.alive); }

  // The crawler acts. action: { kind: 'attack', target } | { kind: 'defend' }
  // | { kind: 'item', name, healed } (the item was already used) | { kind: 'flee' }.
  crawlerAct(action) {
    if (!this.crawlersTurn) throw new Error('not the crawler\'s turn');
    const me = this.crawler, rnd = this.rnd;
    const ev = [];
    if (action.kind === 'attack') {
      const t = action.target && action.target.alive ? action.target : this.alive[0];
      if (rnd() < hitChance(RULES.hitBase, me.atk, t.stats.def)) {
        const crit = rnd() < RULES.crit;
        const dmg = crawlerDamage(me.atk, t.stats.def, rnd) * (crit ? 2 : 1);
        t.hurt(dmg);
        ev.push({ kind: crit ? 'crit' : 'hit', actor: me, target: t, amount: dmg });
        if (!t.alive) { me.kills++; ev.push({ kind: 'kill', actor: me, target: t }); }
      } else {
        ev.push({ kind: 'miss', actor: me, target: t });
      }
    } else if (action.kind === 'defend') {
      this.defending = true;
      ev.push({ kind: 'defend', actor: me });
    } else if (action.kind === 'item') {
      ev.push({ kind: 'item', actor: me, name: action.name, amount: action.healed });
    } else if (action.kind === 'flee') {
      if (rnd() < fleeChance(me.spd, this.alive)) {
        this.result = 'fled';
        ev.push({ kind: 'flee', actor: me });
      } else {
        ev.push({ kind: 'fleeFail', actor: me });
      }
    } else {
      throw new Error(`unknown action ${action.kind}`);
    }
    if (!this.alive.length) this.result = 'won';
    this.advance();
    return ev;
  }

  // The current enemy attacks the crawler.
  enemyAct() {
    const e = this.current;
    if (this.result || e === this.crawler) throw new Error('not an enemy\'s turn');
    const me = this.crawler, rnd = this.rnd;
    const ev = [];
    const bonus = this.defending ? RULES.defendHit : 0;
    if (rnd() < hitChance(RULES.enemyHitBase, e.stats.atk, me.def, bonus)) {
      let dmg = enemyDamage(e.stats.dmg, me.def, rnd);
      if (this.defending) dmg = Math.floor(dmg / 2);
      me.hurt(dmg);
      ev.push({ kind: dmg ? 'hit' : 'blocked', actor: e, target: me, amount: dmg });
      if (!me.alive) { this.result = 'lost'; ev.push({ kind: 'death', actor: e, target: me }); }
    } else {
      ev.push({ kind: 'miss', actor: e, target: me });
    }
    this.advance();
    return ev;
  }

  // Next living participant. Defending lasts until the crawler's next turn.
  advance() {
    if (this.result) return;
    for (let i = 0; i < this.order.length; i++) {
      this.turn++;
      if (this.turn >= this.order.length) { this.turn = 0; this.round++; }
      const who = this.current;
      if (who === this.crawler) { this.defending = false; return; }
      if (who.alive) return;
    }
  }
}
