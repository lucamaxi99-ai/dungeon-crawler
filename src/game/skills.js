// Skills: active ones are used in combat instead of an attack (they cost the
// turn and then need a few turns to cool down), passive ones always work.
// Both level up by use (mastery.js). Pure game logic, no drawing.
//
// Active skill: act(level, crawler) describes what one use does:
//   target 'one' | 'all' | 'self'
//   dmg [lo, hi]   damage roll (DEF soaks half unless pierce)
//   hit            bonus to the hit chance; sure: never misses
//   daze n         the target skips its next n turns
//   blind n        the target's next n attacks are much less likely to hit
//   heal n         hit points back
// cooldown: own turns to wait before the next use (Infinity: once a fight).
//
// Passive skill: passive(level) gives bonuses that add up:
//   def, hit (chance), dmg, crit (chance), flee (chance), spell (damage).
// weapon: only counts with that kind of weapon in hand ('unarmed' for fists).
// train: what makes it grow: 'hit' (landing an attack), 'hurt' (taking a
// hit), 'flee' (trying to run), 'spellHit' (a damage spell landing).

export const SKILLS = {
  // ---------------------------------------------------------- active
  dirtyKick: {
    name: 'Dirty Kick', active: true, cooldown: 4,
    desc: 'A kick where it hurts. Not sporting. Extremely effective.',
    act: (L) => ({ target: 'one', hit: 0.1, dmg: [1, 1 + Math.ceil(L / 2)], daze: 1 + Math.floor(L / 5) }),
    info: (L) => { const a = SKILLS.dirtyKick.act(L); return `${a.dmg[0]}-${a.dmg[1]} DMG, DAZES ${a.daze}`; },
  },
  roundhouse: {
    name: 'Roundhouse', active: true, cooldown: 5,
    desc: 'Your kicking has evolved. Everyone in reach gets a foot. The viewers get a replay.',
    act: (L) => ({ target: 'all', dmg: [1, 1 + Math.floor(L / 2)] }),
    info: (L) => `${1}-${1 + Math.floor(L / 2)} DMG TO ALL`,
  },
  pocketSand: {
    name: 'Pocket Sand', active: true, cooldown: 5,
    desc: 'You always carry some. Nobody knows where it comes from. Nobody asks.',
    act: (L) => ({ target: 'one', sure: true, blind: 2 + Math.floor(L / 4) }),
    info: (L) => `BLINDS ${2 + Math.floor(L / 4)} TURNS`,
  },
  secondWind: {
    name: 'Second Wind', active: true, cooldown: Infinity,
    desc: 'Once per fight you remember you do not want to die. Surprisingly motivating.',
    act: (L) => ({ target: 'self', heal: 3 + L }),
    info: (L) => `HEALS ${3 + L}, ONCE A FIGHT`,
  },
  // ---------------------------------------------------------- passive
  thickSkin: {
    name: 'Thick Skin', train: 'hurt',
    desc: 'Getting hit a lot has made you better at getting hit.',
    passive: (L) => ({ def: 1 + Math.floor((L - 1) / 3) }),
    info: (L) => `DEF +${1 + Math.floor((L - 1) / 3)}`,
  },
  luckyBastard: {
    name: 'Lucky Bastard', train: 'hit',
    desc: 'The dice like you. The System is looking into it.',
    passive: (L) => ({ crit: 0.02 * L }),
    info: (L) => `CRIT +${2 * L}%`,
  },
  cardio: {
    name: 'Cardio', train: 'flee',
    desc: 'Rule number one. You have been practicing.',
    passive: (L) => ({ flee: 0.04 * L }),
    info: (L) => `FLEE +${4 * L}%`,
  },
  bareKnuckles: {
    name: 'Bare Knuckles', train: 'hit', weapon: 'unarmed',
    desc: 'No weapon, no problem. Mostly a problem for your knuckles.',
    passive: (L) => ({ hit: 0.02 * L, dmg: Math.floor(L / 3) }),
    info: (L) => `UNARMED: HIT +${2 * L}%, DMG +${Math.floor(L / 3)}`,
  },
  blades: {
    name: 'Blades', train: 'hit', weapon: 'blade',
    desc: 'You have learned which end goes into the monster.',
    passive: (L) => ({ hit: 0.02 * L, dmg: Math.floor(L / 3) }),
    info: (L) => `BLADES: HIT +${2 * L}%, DMG +${Math.floor(L / 3)}`,
  },
  blunt: {
    name: 'Blunt Instruments', train: 'hit', weapon: 'blunt',
    desc: 'Hit it until it stops moving. A classic for a reason.',
    passive: (L) => ({ hit: 0.02 * L, dmg: Math.floor(L / 3) }),
    info: (L) => `BLUNT: HIT +${2 * L}%, DMG +${Math.floor(L / 3)}`,
  },
  spellFocus: {
    name: 'Spell Focus', train: 'spellHit',
    desc: 'You squint harder when you cast. It helps. Science cannot explain why.',
    passive: (L) => ({ spell: 1 + Math.floor((L - 1) / 3) }),
    info: (L) => `SPELL DMG +${1 + Math.floor((L - 1) / 3)}`,
  },
};

// What every crawler starts with.
export const STARTER_SKILLS = ['dirtyKick'];

// What a skill potion can teach (a random one the crawler does not know).
export const POTION_POOL = ['pocketSand', 'secondWind', 'thickSkin', 'luckyBastard', 'cardio'];

const NONE = { def: 0, hit: 0, dmg: 0, crit: 0, flee: 0, spell: 0 };

// Sum of all passive bonuses that apply right now. weapon: what the crawler
// holds ('unarmed', 'blade', 'blunt', ...).
export function passiveBonus(mastery, weapon) {
  const sum = { ...NONE };
  for (const id of mastery.list()) {
    const def = SKILLS[id];
    if (!def || !def.passive || (def.weapon && def.weapon !== weapon)) continue;
    const b = def.passive(mastery.level(id));
    for (const k of Object.keys(b)) sum[k] += b[k];
  }
  return sum;
}

// Passive skills that grow from this kind of thing happening.
export function trainedBy(mastery, what, weapon) {
  return mastery.list().filter((id) => {
    const def = SKILLS[id];
    return def && def.train === what && (!def.weapon || def.weapon === weapon);
  });
}
