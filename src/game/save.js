// A suspended run (GDD 4.9): the crawler can save and quit in a Safe Room.
// Starting the game again resumes it there, and resuming uses the save up,
// so runs stay permadeath: there is never a save to go back to after a bad
// fight. Dying deletes it too.
//
// The snapshot is plain JSON: the floor itself is rebuilt from the run's
// seed, and only what changed on it is stored (objects, enemies, the
// explored map, the Safe Room's shelf).

export const SAVE_KEY = 'borant-encore-run';
export const SAVE_VERSION = 1;

export function saveRun(storage, snap) {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, at: Date.now(), ...snap }));
    return true;
  } catch {
    return false;
  }
}

export function loadRun(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    return snap && snap.v === SAVE_VERSION ? snap : null;
  } catch {
    return null;
  }
}

export function clearRun(storage) {
  if (!storage) return;
  try { storage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

// The explored map (one byte per cell, 0 or 1) as a short string and back.
export function packSeen(seen) {
  let s = '';
  for (let i = 0; i < seen.length; i += 6) {
    let v = 0;
    for (let k = 0; k < 6; k++) if (seen[i + k]) v |= 1 << k;
    s += String.fromCharCode(48 + v);
  }
  return s;
}

export function unpackSeen(s, seen) {
  for (let i = 0; i < s.length; i++) {
    const v = s.charCodeAt(i) - 48;
    for (let k = 0; k < 6 && i * 6 + k < seen.length; k++) seen[i * 6 + k] = (v >> k) & 1;
  }
  return seen;
}

// Plain copies of the parts of a run, and back onto fresh objects.
const ENEMY_FIELDS = ['type', 'x', 'y', 'home', 'hp', 'group', 'alerted', 'lost', 'returning', 'stun', 'fear', 'loot', 'tick', 'hunts', 'disguised', 'face', 'dx', 'dy', 'enraged'];
export const enemyState = (e) => Object.fromEntries(ENEMY_FIELDS.map((k) => [k, e[k]]));

const CRAWLER_FIELDS = ['attrs', 'hp', 'mp', 'kills', 'regen', 'level', 'xp', 'points', 'name', 'job'];
export function crawlerState(c) {
  return {
    ...Object.fromEntries(CRAWLER_FIELDS.map((k) => [k, c[k]])),
    skills: { known: c.skills.known, order: c.skills.order },
    spells: { known: c.spells.known, order: c.spells.order },
  };
}
export function restoreCrawler(c, s) {
  for (const k of CRAWLER_FIELDS) if (s[k] !== undefined) c[k] = structuredClone(s[k]);
  Object.assign(c.skills, structuredClone(s.skills));
  Object.assign(c.spells, structuredClone(s.spells));
  return c;
}
