// The floor countdown, counted in turns: every crawler action outside combat
// (step, sidestep, turn) and every combat move costs one. Bumping into
// walls, opening chests and the inventory are free.
// The stairs open once a share of the turns has passed (STAIRS_OPEN_AT);
// at zero the floor collapses and takes the crawler with it.

import { STAIRS_OPEN_AT } from './floorgen.js';

// Warnings at these shares of turns left (besides the stairs opening).
const WARN_AT = [0.5, 0.25, 0.1];

export class Countdown {
  constructor(total, openAt = STAIRS_OPEN_AT) {
    this.total = total;
    this.left = total;
    this.openAfter = Math.round(total * openAt);
    this.warned = 0;
  }

  get used() { return this.total - this.left; }
  get stairsOpen() { return this.used >= this.openAfter; }
  // Turns until the stairs open (0 once they are open).
  get stairsIn() { return Math.max(0, this.openAfter - this.used); }
  get collapsed() { return this.left <= 0; }

  // Spends n turns. Returns what happened, in order:
  //   { kind: 'stairsOpen' } | { kind: 'warn', share, left } | { kind: 'collapse' }
  tick(n = 1) {
    if (this.collapsed) return [];
    const events = [];
    const wasOpen = this.stairsOpen;
    this.left = Math.max(0, this.left - n);
    if (!wasOpen && this.stairsOpen) events.push({ kind: 'stairsOpen' });
    while (this.warned < WARN_AT.length && this.left <= this.total * WARN_AT[this.warned]) {
      events.push({ kind: 'warn', share: WARN_AT[this.warned], left: this.left });
      this.warned++;
    }
    if (this.collapsed) events.push({ kind: 'collapse' });
    return events;
  }
}
