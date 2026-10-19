// The crawler's soul, as far as Borant is concerned: what survives a death.
// Every run is a rerun on Borant Encore (GDD 2.1): a fresh body, the same
// soul backup. The profile counts the reruns and remembers the deepest
// floor, how the crawler died, which conversations it has had and what it
// has unlocked. It lives in the browser (localStorage), apart from the run.
//
// The storage is injected so the tests run without a browser:
//   new Profile(storage)  storage: { getItem, setItem, removeItem } or null

export const PROFILE_KEY = 'borant-encore-profile';
const VERSION = 1;

function blank() {
  return {
    v: VERSION,
    runs: 0,        // runs started (the first is the premiere, the rest reruns)
    deaths: 0,
    wins: 0,
    deepest: 0,     // deepest floor reached
    deepestBefore: 0, // the deepest floor when the current run started
    last: null,     // the last finished run: { won, depth, killer, level, kills, record }
    causes: {},     // killer -> how often
    seen: {},       // dialogue nodes and topics already heard (dialogue.js)
    unlocked: {},   // jobs and later races and classes, id -> true
    flags: {},      // story progress
  };
}

// The browser's localStorage, or null where there is none (or it throws,
// e.g. with blocked site data). Without storage the profile only lasts as
// long as the page.
export function browserStorage() {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const probe = '__borant_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export class Profile {
  constructor(storage = null) {
    this.storage = storage;
    this.d = blank();
    this.load();
  }

  load() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(PROFILE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && d.v === VERSION) this.d = { ...blank(), ...d };
    } catch {
      // A broken save is a fresh soul. Borant regrets nothing.
    }
  }

  save() {
    if (!this.storage) return;
    try { this.storage.setItem(PROFILE_KEY, JSON.stringify(this.d)); } catch { /* storage full or blocked */ }
  }

  reset() {
    this.d = blank();
    if (this.storage) try { this.storage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
  }

  get runs() { return this.d.runs; }
  get deaths() { return this.d.deaths; }
  get wins() { return this.d.wins; }
  get deepest() { return this.d.deepest; }
  get last() { return this.d.last; }
  // The current run's number on Borant Encore: 0 for the premiere.
  get rerun() { return Math.max(0, this.d.runs - 1); }

  // A run starts. Returns its number (1 = the premiere).
  startRun() {
    this.d.runs++;
    this.d.deepestBefore = this.d.deepest; // to tell a new record at the end
    this.save();
    return this.d.runs;
  }

  // The crawler reached floor `depth`.
  reached(depth) {
    if (depth <= this.d.deepest) return false;
    this.d.deepest = depth;
    this.save();
    return true;
  }

  // The run is over. Returns what is new about it: { record } where record
  // is true if the crawler got deeper than ever before.
  endRun({ won = false, depth = 1, killer = '', level = 1, kills = 0 }) {
    const before = this.d.deepestBefore ?? 0;
    const record = depth > before && this.d.runs > 1;
    if (won) this.d.wins++;
    else {
      this.d.deaths++;
      if (killer) this.d.causes[killer] = (this.d.causes[killer] || 0) + 1;
    }
    this.reached(depth);
    this.d.last = { won, depth, killer, level, kills, record };
    this.save();
    return { record };
  }

  // How often `killer` has done the job before (this death included).
  timesKilledBy(killer) { return this.d.causes[killer] || 0; }

  // Conversations and story flags.
  hasSeen(id) { return !!this.d.seen[id]; }
  see(id) {
    if (this.d.seen[id]) return;
    this.d.seen[id] = true;
    this.save();
  }
  flag(id) { return this.d.flags[id]; }
  setFlag(id, value = true) {
    this.d.flags[id] = value;
    this.save();
  }

  // Unlocks (jobs, later races and classes).
  isUnlocked(id) { return !!this.d.unlocked[id]; }
  unlock(id) {
    if (this.d.unlocked[id]) return false;
    this.d.unlocked[id] = true;
    this.save();
    return true;
  }
}
