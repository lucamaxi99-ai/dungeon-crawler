// Viewers: how many people across the galaxy are watching this crawler.
// A hype model: show moments bring viewers in (kills, crits, close calls,
// achievements, new floors), long stretches where nothing happens drive
// them away. Charisma makes the gains bigger and the losses smaller.
// Pure game logic, no drawing.
//
// The game reports events with note(kind, data) (the same events the
// achievements hear) and calls tick() once per action outside combat.

export const VIEWERS = {
  start: 12,
  floor: 5,             // never fewer than this: somebody always watches
  quietActions: 30,     // actions without an event before people leave
  leavePerAction: 0.008, // share of viewers lost per quiet action after that
  // Sponsors notice a crawler at these counts (sponsors arrive in M6, step 5).
  thresholds: [100, 500, 2000, 10000, 50000],
};

// Gain per event: share of the current audience plus a flat number.
// data.closeCall: the fight was won with a quarter of the HP or less.
const HYPE = {
  // A miniboss going down is a season highlight; a leader is worth more
  // than its foot soldiers.
  kill: (d) => (d.rank === 'boss' ? [0.5, 60] : d.rank === 'miniboss' ? [0.3, 25] : d.rank === 'leader' ? [0.12, 6] : [0.08, 4]),
  stolen: [0.06, 3],  // the audience loves a good robbery
  ticketed: [0.04, 2], // and bureaucracy, apparently
  bossPhase: [0.1, 8],
  rout: [0.05, 3],
  crit: [0.04, 2],
  fightWon: (d) => (d.closeCall ? [0.18, 8] : [0.03, 1]),
  flee: [0.02, 1],
  chest: [0.02, 1],
  level: [0.05, 3],
  learn: [0.04, 2],
  floorDone: [0.25, 15],
  // Opening a loot box on camera: the bigger the tier, the bigger the crowd.
  boxOpened: (d) => [0.02 + 0.02 * (d.tier ?? 0), 2 + 2 * (d.tier ?? 0)],
  // An achievement: more for the bigger box tiers.
  achievement: (d) => [0.04 + 0.02 * (d.tier ?? 0), 3 + 3 * (d.tier ?? 0)],
};

// Charisma: +10 % gains and -5 % losses per point above 5 (and the other
// way round below), within sane limits.
export const charismaGain = (cha) => Math.max(0.3, 1 + 0.1 * (cha - 5));
export const charismaLoss = (cha) => Math.max(0.25, Math.min(1.75, 1 - 0.05 * (cha - 5)));

export class Viewers {
  constructor(cha = 5) {
    this.count = VIEWERS.start;
    this.peak = this.count;
    this.cha = cha;
    this.quiet = 0;       // actions since the last event worth watching
    this.trend = 0;       // last change: >0 up, <0 down
    this.passed = 0;      // how many thresholds have been crossed
  }

  get shown() { return Math.round(this.count); }

  // An event happened. Returns { gain, crossed: [threshold, ...] }.
  note(kind, data = {}) {
    const rule = HYPE[kind];
    if (!rule) return { gain: 0, crossed: [] };
    const [share, flat] = typeof rule === 'function' ? rule(data) : rule;
    this.quiet = 0;
    return this.add((this.count * share + flat) * charismaGain(this.cha));
  }

  // One action outside combat. Returns { lost, bored } where bored is true
  // on the action the audience starts drifting away.
  tick() {
    this.quiet++;
    if (this.quiet <= VIEWERS.quietActions) return { lost: 0, bored: false };
    const before = this.count;
    this.count = Math.max(VIEWERS.floor, this.count * (1 - VIEWERS.leavePerAction * charismaLoss(this.cha)));
    const lost = before - this.count;
    if (lost > 0) this.trend = -lost;
    return { lost, bored: this.quiet === VIEWERS.quietActions + 1 };
  }

  add(n) {
    const before = this.count;
    this.count += n;
    this.peak = Math.max(this.peak, this.count);
    this.trend = n;
    const crossed = VIEWERS.thresholds.filter((t) => before < t && this.count >= t && VIEWERS.thresholds.indexOf(t) >= this.passed);
    this.passed += crossed.length;
    return { gain: n, crossed };
  }
}

// 1234 -> "1234", 12345 -> "12.3K", 1234567 -> "1.2M": fits the status box.
export function formatViewers(n) {
  if (n < 10000) return String(Math.round(n));
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e5 ? 1 : 0)}K`;
  return `${(n / 1e6).toFixed(1)}M`;
}
