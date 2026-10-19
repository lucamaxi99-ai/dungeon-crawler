// How the crawler learns new skills and spells: from tomes and skill potions
// (items), and from the way it plays (deeds). Pure game logic.

import { SKILLS, POTION_POOL } from './skills.js';
import { SPELLS } from './spells.js';
import { MASTERY } from './mastery.js';

// Uses a tome or skill potion (item definition). Returns what happened:
//   { kind: 'learn' | 'boost', what: 'skill' | 'spell', id, name, level }
//   { kind: 'none' } if there was nothing left to learn (the item is kept).
export function learnFromItem(crawler, def, rnd = Math.random) {
  if (def.teach) {
    const what = def.teach.spell ? 'spell' : 'skill';
    const id = def.teach.spell || def.teach.skill;
    return gain(crawler, what, id);
  }
  if (def.skillPotion) {
    const fresh = POTION_POOL.filter((id) => !crawler.skills.has(id));
    if (fresh.length) return gain(crawler, 'skill', fresh[Math.floor(rnd() * fresh.length)]);
    const known = crawler.skills.list().filter((id) => crawler.skills.level(id) < MASTERY.max);
    if (known.length) return gain(crawler, 'skill', known[Math.floor(rnd() * known.length)]);
  }
  return { kind: 'none' };
}

// Learns a skill or spell, or raises it one level if it is known already.
export function gain(crawler, what, id) {
  const m = what === 'spell' ? crawler.spells : crawler.skills;
  const name = (what === 'spell' ? SPELLS : SKILLS)[id].name;
  if (m.learn(id)) return { kind: 'learn', what, id, name, level: 1 };
  const level = m.boost(id);
  return level ? { kind: 'boost', what, id, name, level } : { kind: 'none' };
}
