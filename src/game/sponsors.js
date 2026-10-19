// Sponsors: galactic brands that notice a crawler once enough viewers are
// watching (VIEWERS.thresholds in viewers.js). Each one sends a sponsored
// loot box with better odds for tomes and skill potions; the bigger the
// audience, the bigger the box. Once a crawler is popular enough, sponsors
// also leave a chest on every new floor. All brands are invented.

export const SPONSORS = [
  {
    name: 'Gristle & Sons Meat Paste', short: 'GRISTLE & SONS',
    msg: 'Gristle & Sons Meat Paste: now with up to 12% meat! Enjoy this gift, Crawler, and remember: you are what you spread.',
  },
  {
    name: 'Krell Orbital Timeshares', short: 'KRELL TIMESHARES',
    msg: 'Krell Orbital Timeshares believes in you, Crawler! Ask about our zero-gravity condos. Do not ask about the previous owners.',
  },
  {
    name: 'Mother Mag\'s Discount Necromancy', short: 'MOTHER MAG\'S',
    msg: 'Mother Mag\'s Discount Necromancy is proud to sponsor a crawler who is still mostly alive. When that changes, call Mag.',
  },
  {
    name: 'Spleenco Organ Futures', short: 'SPLEENCO',
    msg: 'Spleenco Organ Futures has taken a small position in your spleen, Crawler. Please keep it in good condition. Enjoy this box.',
  },
  {
    name: 'The Shiny Hat Consortium', short: 'SHINY HAT CO.',
    msg: 'The Shiny Hat Consortium sees great hat potential in you. Here is a box. It is not a hat. Hats are for winners.',
  },
  {
    name: 'Glorp Energy Drink', short: 'GLORP ENERGY',
    msg: 'GLORP! The only energy drink that drinks you back. Glorp is proud to be your official beverage, whether you like it or not.',
  },
];

// Box tier per viewer threshold (first threshold: bronze, ...).
export const SPONSOR_TIERS = ['bronze', 'silver', 'gold', 'platinum', 'legendary'];

// Viewers needed when a floor is entered for a sponsored chest on it.
export const SPONSOR_CHEST_AT = 200;

// The sponsor answering threshold number `index` in a run: a different
// brand each time, in a run-dependent order.
export function sponsorFor(index, seed) {
  const start = Math.abs(seed | 0) % SPONSORS.length;
  return SPONSORS[(start + index) % SPONSORS.length];
}
