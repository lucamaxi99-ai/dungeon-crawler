// Turn-based combat rules. Pure game logic, no drawing or timing: the
// caller asks whose turn it is, feeds in the crawler's choice or lets the
// enemy act, and turns the returned events into text and animation.
//
// Flow: initiative is rolled once when the fight starts (d6 + DEX, +2 for
// whoever started it, ties go to the crawler). Then everybody acts in that
// order, round after round, until all enemies are dead, the crawler is
// dead or the crawler got away.
//
// Skills and spells (skills.js, spells.js) go through one resolver: damage,
// healing and status effects on enemies (daze: skips turns, blind and hex:
// worse aim). Every use trains them; passive skills train on hits, wounds
// and escape attempts and add their bonuses to the numbers below.
//
// Enemies bring their traits (enemies.js): leaders make their family hit
// harder (aura) and when they fall the rest runs (morale); shamans heal and
// hex, sappers throw bombs and blow up when they die, llamas spit acid,
// raccoons steal gold and run, ceramic gnomes crack under blunt weapons.
// Enemies that ran away are out of the fight but still alive on the floor.
// The crawler can be hexed or blinded too (worse aim for a few actions).
//
// Event: { kind, actor, target?, amount?, id?, name?, status?, turns?, level? }
//   kind: 'hit' | 'crit' | 'miss' | 'blocked' | 'defend' | 'item' | 'flee'
//         | 'fleeFail' | 'kill' | 'death' | 'skill' | 'cast' | 'heal'
//         | 'status' (daze/blind/hex put on target) | 'dazed' (enemy skips)
//         | 'skillUp' (a skill or spell reached `level`; spell: true)
//         | 'throw' (enemy special: what = 'bomb' | 'spit'; the hit or miss
//           that follows has special set) | 'blast' (a sapper blew up)
//         | 'mend' (enemy healed an ally) | 'curse' (enemy put status on
//           the crawler) | 'steal' (gold taken) | 'escape' (a thief ran)
//         | 'rout' (lost its leader and ran)
//         | boss specials: 'ticket' (a fine, amount = gold), 'windup' (the
//           tow hook goes up; the hit that follows has special: 'tow'),
//           'summon' (target = the new helper), 'phase' (second phase)
//   hit events from a blast carry blast: true, on brittle enemies crack: true.
//   The crawler can be booted (curse status 'boot'): no running, worse aim.

import { SKILLS, trainedBy } from './skills.js';
import { SPELLS } from './spells.js';

export const RULES = {
  hitBase: 0.75,        // crawler's base chance to hit
  enemyHitBase: 0.7,    // enemy's base chance to hit
  hitPerPoint: 0.05,    // per point of ATK above the target's DEF
  dexHit: 0.02,         // per point of the crawler's DEX above 5: aim and dodging
  hitMin: 0.2, hitMax: 0.95,
  crit: 0.06,           // crawler only: double damage
  defendHit: -0.15,     // enemy hit chance while the crawler defends
  fleeBase: 0.5, fleePerDex: 0.1, fleeMin: 0.2, fleeMax: 0.9,
  initiatorBonus: 2,
  blindHit: -0.4,       // enemy hit chance while blinded (Pocket Sand)
  hexHit: -0.25,        // enemy hit chance while hexed
  selfBlind: -0.3,      // crawler's hit chance while blinded (llama spit)
  selfHex: -0.2,        // crawler's hit chance while hexed (shaman)
  selfBoot: -0.15,      // crawler's hit chance with a wheel clamp on its foot
};

const roll = ([lo, hi], rnd) => lo + Math.floor(rnd() * (hi - lo + 1));

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

export function fleeChance(dex, enemies) {
  const fastest = Math.max(...enemies.map((e) => e.stats.dex));
  return clamp(RULES.fleeBase + RULES.fleePerDex * (dex - fastest), RULES.fleeMin, RULES.fleeMax);
}

// Aim (crawler attacking) or dodging (enemy attacking) from DEX.
const dexBonus = (dex) => RULES.dexHit * (dex - 5);

export class Combat {
  // crawler: Crawler; enemies: Enemy[]; initiator: 'crawler' | 'enemy'.
  // purse: () -> the crawler's gold (for thieves and fines).
  // summon: (type, caller) -> a new Enemy that joins the fight, or null
  // (bosses calling for backup; the caller puts it on the map).
  constructor(crawler, enemies, { initiator = 'enemy', rnd = Math.random, purse = () => 0, summon = null } = {}) {
    this.crawler = crawler;
    this.enemies = enemies;
    this.rnd = rnd;
    this.purse = purse;
    this.summon = summon;
    this.out = new Set();   // enemies that ran away (routed, thieves)
    this.self = { blind: 0, hex: 0, boot: 0 }; // the crawler's own afflictions
    this.round = 1;
    this.defending = false;
    this.result = null;   // null while fighting, then 'won' | 'lost' | 'fled'
    this.status = new Map(enemies.map((e) => [e, { daze: 0, blind: 0, hex: 0, cd: 0 }]));
    this.cooldowns = {};  // skill id -> own turns until it can be used again
    const roll = (dex, starter) => 1 + Math.floor(rnd() * 6) + dex + (starter ? RULES.initiatorBonus : 0);
    const order = [{ who: crawler, init: roll(crawler.dex, initiator === 'crawler'), first: 1 }];
    for (const e of enemies) order.push({ who: e, init: roll(e.stats.dex, initiator === 'enemy'), first: 0 });
    order.sort((a, b) => b.init - a.init || b.first - a.first);
    this.order = order.map((o) => o.who);
    this.turn = 0;
  }

  get current() { return this.order[this.turn]; }
  get crawlersTurn() { return !this.result && this.current === this.crawler; }
  get alive() { return this.enemies.filter((e) => e.alive && !this.out.has(e)); }

  // Aim penalty from the crawler's own afflictions.
  get selfAim() {
    return (this.self.blind ? RULES.selfBlind : 0) + (this.self.hex ? RULES.selfHex : 0) + (this.self.boot ? RULES.selfBoot : 0);
  }

  // Booted crawlers can't run.
  get canFlee() { return !this.self.boot; }

  // Bonus an enemy gets from leaders of its family in this fight (and from
  // its own second phase).
  aura(e) {
    const ph = e.enraged && e.stats.traits.phase;
    const b = { atk: ph ? ph.atk : 0, dmg: ph ? ph.dmg : 0 };
    for (const o of this.alive) {
      const a = o.stats.traits.aura;
      if (o === e || !a || o.stats.family !== e.stats.family) continue;
      b.atk += a.atk || 0; b.dmg += a.dmg || 0;
    }
    return b;
  }

  // Own turns until a skill is ready again (0 = ready, Infinity = used up).
  cooldown(id) { return this.cooldowns[id] || 0; }

  // Can the crawler use this skill or spell right now?
  canSkill(id) {
    const def = SKILLS[id];
    return !!def && def.active && this.crawler.skills.has(id) && this.cooldown(id) === 0;
  }
  canCast(id) {
    const def = SPELLS[id];
    return !!def && this.crawler.spells.has(id) && this.crawler.mp >= def.mp;
  }

  // The crawler acts. action: { kind: 'attack', target } | { kind: 'defend' }
  // | { kind: 'skill', id, target } | { kind: 'spell', id, target }
  // | { kind: 'item', name, healed } (the item was already used) | { kind: 'flee' }.
  crawlerAct(action) {
    if (!this.crawlersTurn) throw new Error('not the crawler\'s turn');
    const me = this.crawler, rnd = this.rnd;
    const ev = [];
    const bonus = me.bonus;
    if (action.kind === 'attack') {
      const t = this.pick(action.target);
      if (rnd() < hitChance(RULES.hitBase, me.atk, t.stats.def, dexBonus(me.dex) + bonus.hit + this.selfAim)) {
        const crit = rnd() < RULES.crit + bonus.crit;
        const crack = me.weapon === 'blunt' && t.stats.traits.brittle ? t.stats.traits.brittle : 0;
        const dmg = (crawlerDamage(me.atk, t.stats.def, rnd) + bonus.dmg + crack) * (crit ? 2 : 1);
        this.damage(t, dmg, crit ? 'crit' : 'hit', ev, { crack: !!crack });
        this.trainPassive('hit', ev);
      } else {
        ev.push({ kind: 'miss', actor: me, target: t });
      }
    } else if (action.kind === 'skill') {
      if (!this.canSkill(action.id)) throw new Error(`cannot use skill ${action.id}`);
      const def = SKILLS[action.id];
      ev.push({ kind: 'skill', actor: me, id: action.id, name: def.name });
      this.resolve(def.act(me.skills.level(action.id), me), action.target, ev);
      this.cooldowns[action.id] = def.cooldown;
      this.train(me.skills, action.id, def.name, false, ev);
    } else if (action.kind === 'spell') {
      if (!this.canCast(action.id)) throw new Error(`cannot cast ${action.id}`);
      const def = SPELLS[action.id];
      me.mp -= def.mp;
      ev.push({ kind: 'cast', actor: me, id: action.id, name: def.name, amount: def.mp });
      const p = def.act(me.spells.level(action.id), me);
      if (def.damage && p.dmg) p.dmg = p.dmg.map((d) => d + bonus.spell);
      const landed = this.resolve(p, action.target, ev);
      this.train(me.spells, action.id, def.name, true, ev);
      if (def.damage && landed) this.trainPassive('spellHit', ev);
    } else if (action.kind === 'defend') {
      this.defending = true;
      ev.push({ kind: 'defend', actor: me });
    } else if (action.kind === 'item') {
      ev.push({ kind: 'item', actor: me, name: action.name, amount: action.healed });
    } else if (action.kind === 'flee' && !this.canFlee) {
      ev.push({ kind: 'fleeFail', actor: me, booted: true });
    } else if (action.kind === 'flee') {
      const chance = clamp(fleeChance(me.dex, this.alive) + bonus.flee, RULES.fleeMin, RULES.fleeMax);
      this.trainPassive('flee', ev);
      if (rnd() < chance) {
        this.result = 'fled';
        ev.push({ kind: 'flee', actor: me });
      } else {
        ev.push({ kind: 'fleeFail', actor: me });
      }
    } else {
      throw new Error(`unknown action ${action.kind}`);
    }
    for (const k of ['blind', 'hex', 'boot']) if (this.self[k] > 0) this.self[k]--;
    if (!this.alive.length && !this.result) this.result = 'won';
    this.advance();
    return ev;
  }

  // A story boss's turn (GDD 2.3): the tow hook comes down if it was wound
  // up, otherwise one special that is ready (helpers, the hook, the clamp, a
  // ticket), then a plain attack before the next one. Returns false if it
  // just attacks this turn.
  bossAct(e, st, ev) {
    const tr = e.stats.traits, me = this.crawler, rnd = this.rnd;
    if (st.charged) {
      st.charged = false;
      let dmg = roll(tr.tow.dmg, rnd) + this.aura(e).dmg;
      if (this.defending) dmg = Math.floor(dmg / 2);
      this.wound(e, dmg, ev, { special: 'tow' });
      st.rest = e.enraged ? 0 : 1;
      return true;
    }
    st.cds ??= { ticket: 0, backup: 2, tow: 3, boot: 4 }; // ticket first, then backup, hook, clamp
    for (const k of Object.keys(st.cds)) if (st.cds[k] > 0) st.cds[k]--;
    if (st.rest > 0) { st.rest--; return false; }
    const cd = (k) => tr[k].cooldown - (e.enraged ? 1 : 0);
    const helpers = this.alive.filter((o) => o !== e && o.type === tr.backup?.type).length;
    let did = null;
    if (tr.backup && !st.cds.backup && helpers < tr.backup.max && this.summon) {
      const d = this.summon(tr.backup.type, e);
      if (d) {
        this.enemies.push(d);
        this.status.set(d, { daze: 0, blind: 0, hex: 0, cd: 0 });
        this.order.splice(this.turn + 1, 0, d);
        ev.push({ kind: 'summon', actor: e, target: d });
        did = 'backup';
      }
    }
    if (!did && tr.tow && !st.cds.tow) {
      st.charged = true;
      ev.push({ kind: 'windup', actor: e });
      did = 'tow';
    }
    if (!did && tr.boot && !st.cds.boot && !this.self.boot) {
      this.self.boot = tr.boot.turns;
      ev.push({ kind: 'curse', actor: e, target: me, status: 'boot', turns: tr.boot.turns });
      did = 'boot';
    }
    if (!did && tr.ticket && !st.cds.ticket && this.purse() > 0) {
      const gold = this.purse();
      const fine = Math.min(gold, Math.min(tr.ticket.max, Math.max(tr.ticket.min, Math.round(gold * tr.ticket.share))));
      e.loot = (e.loot || 0) + fine;
      ev.push({ kind: 'ticket', actor: e, target: me, amount: fine });
      did = 'ticket';
    }
    if (!did) return false;
    st.cds[did] = cd(did);
    if (did !== 'tow') st.rest = e.enraged ? 0 : 1;
    return true;
  }

  // The current enemy acts: a special move if it has one ready, otherwise
  // it attacks the crawler.
  enemyAct() {
    const e = this.current;
    if (this.result || e === this.crawler) throw new Error('not an enemy\'s turn');
    const me = this.crawler, rnd = this.rnd;
    const ev = [];
    const st = this.status.get(e);
    if (st.daze > 0) {
      st.daze--;
      ev.push({ kind: 'dazed', actor: e });
      this.advance();
      return ev;
    }
    const tr = e.stats.traits;
    if (e.stats.rank === 'boss' && this.bossAct(e, st, ev)) {
      if (!this.alive.length && !this.result) this.result = 'won';
      this.advance();
      return ev;
    }
    let bonus = (this.defending ? RULES.defendHit : 0) - dexBonus(me.dex);
    if (st.blind > 0) { bonus += RULES.blindHit; st.blind--; }
    if (st.hex > 0) { bonus += RULES.hexHit; st.hex--; }
    const ready = st.cd <= 0;
    if (st.cd > 0) st.cd--;
    const aura = this.aura(e);
    const allies = this.alive.filter((o) => o !== e);
    const wounded = tr.heal && allies.filter((o) => o.hp <= o.stats.hp * tr.heal.below).sort((a, b) => a.hp / a.stats.hp - b.hp / b.stats.hp)[0];
    if (tr.steal && e.loot) {
      // Got what it came for.
      this.out.add(e);
      ev.push({ kind: 'escape', actor: e, amount: e.loot });
    } else if (ready && wounded) {
      ev.push({ kind: 'mend', actor: e, target: wounded, amount: wounded.heal(roll(tr.heal.amount, rnd)) });
      st.cd = tr.heal.cooldown;
    } else if (ready && (tr.bomb || tr.spit)) {
      const sp = tr.bomb ? 'bomb' : 'spit';
      const def = tr[sp];
      ev.push({ kind: 'throw', actor: e, what: sp });
      st.cd = def.cooldown;
      if (rnd() < hitChance(RULES.enemyHitBase, e.stats.atk + aura.atk, me.def, bonus)) {
        // Explosions and acid don't care about armour.
        let dmg = roll(def.dmg, rnd);
        if (this.defending) dmg = Math.floor(dmg / 2);
        this.wound(e, dmg, ev, { special: sp });
        if (def.blind && me.alive) {
          this.self.blind = Math.max(this.self.blind, def.blind);
          ev.push({ kind: 'curse', actor: e, target: me, status: 'blind', turns: def.blind });
        }
      } else {
        ev.push({ kind: 'miss', actor: e, target: me, special: sp });
      }
    } else if (ready && tr.hex && !this.self.hex) {
      this.self.hex = tr.hex.turns;
      ev.push({ kind: 'curse', actor: e, target: me, status: 'hex', turns: tr.hex.turns });
      st.cd = tr.hex.cooldown;
    } else if (rnd() < hitChance(RULES.enemyHitBase, e.stats.atk + aura.atk, me.def, bonus)) {
      let dmg = enemyDamage(e.stats.dmg, me.def, rnd) + aura.dmg;
      if (this.defending) dmg = Math.floor(dmg / 2);
      this.wound(e, dmg, ev);
      if (tr.steal && me.alive && !e.loot) {
        const gold = this.purse();
        const take = Math.min(gold, Math.min(tr.steal.max, Math.max(tr.steal.min, Math.round(gold * tr.steal.share))));
        if (take > 0) { e.loot = take; ev.push({ kind: 'steal', actor: e, target: me, amount: take }); }
      }
    } else {
      ev.push({ kind: 'miss', actor: e, target: me });
    }
    if (!this.alive.length && !this.result) this.result = 'won';
    this.advance();
    return ev;
  }

  // Damage from an enemy (or a blast) to the crawler.
  wound(actor, dmg, ev, extra = {}) {
    const me = this.crawler;
    me.hurt(dmg);
    ev.push({ kind: dmg ? 'hit' : 'blocked', actor, target: me, amount: dmg, ...extra });
    if (dmg) this.trainPassive('hurt', ev);
    if (!me.alive && !this.result) { this.result = 'lost'; ev.push({ kind: 'death', actor, target: me }); }
  }

  // The chosen target if it still lives, otherwise the first living enemy.
  pick(target) {
    return target && target.alive ? target : this.alive[0];
  }

  damage(t, dmg, kind, ev, extra = {}) {
    t.hurt(dmg);
    ev.push({ kind, actor: this.crawler, target: t, amount: dmg, ...extra });
    const ph = t.stats.traits.phase;
    if (ph && t.alive && !t.enraged && t.hp <= t.stats.hp * ph.at) {
      t.enraged = true;
      ev.push({ kind: 'phase', actor: t });
    }
    if (t.alive) return;
    this.crawler.kills++;
    ev.push({ kind: 'kill', actor: this.crawler, target: t, ...extra });
    const tr = t.stats.traits;
    // A leader falls: the rest of the family loses its nerve.
    if (tr.morale) {
      for (const o of this.alive) {
        if (o.stats.family !== t.stats.family) continue;
        this.out.add(o);
        ev.push({ kind: 'rout', actor: o, leader: t });
      }
    }
    // A sapper goes up with everything it carried. Everybody gets some.
    if (tr.bomb) {
      ev.push({ kind: 'blast', actor: t });
      for (const o of this.alive) this.damage(o, roll(tr.bomb.blast, this.rnd), 'hit', ev, { blast: true });
      if (this.crawler.alive && !this.result) {
        let dmg = roll(tr.bomb.blast, this.rnd);
        if (this.defending) dmg = Math.floor(dmg / 2);
        this.wound(t, dmg, ev, { blast: true });
      }
    }
  }

  // What a skill or spell does (p from act(), see skills.js). Returns true
  // if anything was hit.
  resolve(p, target, ev) {
    const me = this.crawler, rnd = this.rnd;
    if (p.heal) ev.push({ kind: 'heal', actor: me, amount: me.heal(p.heal) });
    const targets = p.target === 'all' ? this.alive : p.target === 'one' ? [this.pick(target)] : [];
    let landed = false;
    for (const t of targets) {
      if (!t) continue;
      if (!p.sure && rnd() >= hitChance(RULES.hitBase, me.atk, t.stats.def, dexBonus(me.dex) + (p.hit || 0) + this.selfAim)) {
        ev.push({ kind: 'miss', actor: me, target: t });
        continue;
      }
      landed = true;
      if (p.dmg) {
        const [lo, hi] = p.dmg;
        const roll = lo + Math.floor(rnd() * (hi - lo + 1));
        this.damage(t, Math.max(1, roll - (p.pierce ? 0 : Math.floor(t.stats.def / 2))), 'hit', ev);
      }
      if (!t.alive) continue;
      const st = this.status.get(t);
      for (const s of ['daze', 'blind', 'hex']) {
        if (!p[s]) continue;
        st[s] = Math.max(st[s], p[s]);
        ev.push({ kind: 'status', actor: me, target: t, status: s, turns: p[s] });
      }
    }
    return landed;
  }

  train(mastery, id, name, spell, ev) {
    const level = mastery.train(id);
    if (level) ev.push({ kind: 'skillUp', actor: this.crawler, id, name, level, spell });
  }

  trainPassive(what, ev) {
    const me = this.crawler;
    for (const id of trainedBy(me.skills, what, me.weapon)) this.train(me.skills, id, SKILLS[id].name, false, ev);
  }

  // Next living participant. Defending lasts until the crawler's next turn,
  // skill cooldowns tick down at the start of it.
  advance() {
    if (this.result) return;
    for (let i = 0; i < this.order.length; i++) {
      this.turn++;
      if (this.turn >= this.order.length) { this.turn = 0; this.round++; }
      const who = this.current;
      if (who === this.crawler) {
        this.defending = false;
        for (const id of Object.keys(this.cooldowns)) if (this.cooldowns[id] > 0 && this.cooldowns[id] < Infinity) this.cooldowns[id]--;
        return;
      }
      if (who.alive && !this.out.has(who)) return;
    }
  }
}
