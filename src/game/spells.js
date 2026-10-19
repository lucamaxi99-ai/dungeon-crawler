// Spells: cost mana, scale with INT and level up by use (mastery.js), like
// skills. Every crawler knows Mend; everything else comes from spell tomes
// (chests, rare drops). Pure game logic, no drawing.
//
// act(level, crawler) works like an active skill (see skills.js):
//   target, dmg, sure, pierce (ignores DEF), heal, hex n (the target's next
//   n attacks are less likely to hit).
// damage: true for spells that hurt (they train Spell Focus and get its bonus).

export const SPELLS = {
  mend: {
    name: 'Mend', mp: 4,
    desc: 'Knits flesh back together. Leaves a faint smell of burnt toast.',
    act: (L, me) => ({ target: 'self', heal: me.int + (L - 1) }),
    info: (L, me) => `HEALS ${me.int + (L - 1)} (INT)`,
  },
  magicMissile: {
    name: 'Magic Missile', short: 'Missile', mp: 3, damage: true,
    desc: 'A bolt of pure arcane spite. Never misses, ignores armor, always gets a laugh.',
    act: (L, me) => ({ target: 'one', sure: true, pierce: true, dmg: missile(L, me) }),
    info: (L, me) => { const d = missile(L, me); return `${d[0]}-${d[1]} DMG (INT), NEVER MISSES`; },
  },
  hex: {
    name: 'Hex of Mild Inconvenience', short: 'Hex', mp: 2,
    desc: 'Curses the target with itchy socks and poor aim. Mostly the aim.',
    act: (L) => ({ target: 'one', sure: true, hex: 3 + Math.floor(L / 3) }),
    info: (L) => `AIM -25% FOR ${3 + Math.floor(L / 3)} TURNS`,
  },
};

// 1 to 1 + INT/2, plus one more for every two levels of mastery.
function missile(L, me) {
  const plus = Math.floor((L - 1) / 2);
  return [1 + plus, 1 + Math.ceil(me.int / 2) + plus];
}

export const STARTER_SPELLS = ['mend'];
