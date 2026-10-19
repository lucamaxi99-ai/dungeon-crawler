// What the crawler did before the collapse (GDD 4.9). Every rerun gets a
// fresh body, and the intake form asks for a name and a former job. The job
// gives +2 to one attribute and a few lines from the System. Some jobs have
// to be unlocked first; what is unlocked lives in the profile, so it stays
// unlocked across reruns. Races and classes come later the same way.

export const JOB_BONUS = 2;

// unlock: null (open from the start) or { hint, test(profile) }.
export const JOBS = [
  {
    id: 'barista', name: 'Barista', attr: 'cha',
    blurb: 'Years of smiling at people who did not deserve it. The audience will feel right at home.',
    intro: 'A former barista. Our viewers expect latte art. Disappoint them gently.',
    unlock: null,
  },
  {
    id: 'mallCop', name: 'Mall Cop', attr: 'con',
    blurb: 'Trained to stand for eight hours and run for none. Durable. Underpaid. Perfect.',
    intro: 'A former mall cop. Finally, a jurisdiction with real criminals. They are rats.',
    unlock: null,
  },
  {
    id: 'courier', name: 'Delivery Driver', attr: 'dex',
    blurb: 'Dodged traffic, dogs and customers for a living. The rats are an upgrade.',
    intro: 'A former delivery driver. Please leave the dungeon at the door and ring twice.',
    unlock: null,
  },
  {
    id: 'accountant', name: 'Tax Accountant', attr: 'int',
    blurb: 'Reads fine print for fun. Borant hates that. Clause 18 hates that even more.',
    intro: 'A former tax accountant. The System has hidden its receipts. Just in case.',
    unlock: { hint: 'REACH FLOOR 2 IN ANY RUN', test: (p) => p.deepest >= 2 },
  },
  {
    id: 'gymTeacher', name: 'Gym Teacher', attr: 'str',
    blurb: 'Loud, sweaty and comfortable with failure. Mostly other people\'s. Now, mostly yours.',
    intro: 'A former gym teacher. Give the dungeon twenty, Crawler. Twenty what? It will tell you.',
    unlock: { hint: 'DIE THREE TIMES', test: (p) => p.deaths >= 3 },
  },
];
export const JOB = Object.fromEntries(JOBS.map((j) => [j.id, j]));

export const jobKey = (id) => `job:${id}`;
export const jobOpen = (job, profile) => !job.unlock || profile.isUnlocked(jobKey(job.id));

// Unlocks every job whose condition the profile now meets. Returns the
// newly unlocked jobs.
export function checkUnlocks(profile) {
  const fresh = [];
  for (const j of JOBS) {
    if (j.unlock && !profile.isUnlocked(jobKey(j.id)) && j.unlock.test(profile)) {
      profile.unlock(jobKey(j.id));
      fresh.push(j);
    }
  }
  return fresh;
}

// The starting attributes with the job's bonus.
export function startAttrs(base, job) {
  return { ...base, [job.attr]: base[job.attr] + JOB_BONUS };
}

// Names the intake clerk suggests. Short enough for the HUD.
export const NAMES = [
  'DONNA', 'MARCUS', 'PRIYA', 'KEVIN', 'GRETA', 'TOMASZ', 'AMARA', 'LUIS', 'HIRO', 'BRENDA',
  'OLU', 'SVEN', 'FATIMA', 'DALE', 'INGRID', 'RAJ', 'MAGDA', 'NOEL', 'YUKI', 'BORIS',
];
export const NAME_MAX = 12;

// Keeps what the 3x5 font can draw: letters, digits, space, - ' .
export function cleanName(s) {
  return String(s).toUpperCase().replace(/[^A-Z0-9 '.-]/g, '').replace(/\s+/g, ' ').trimStart().slice(0, NAME_MAX);
}
