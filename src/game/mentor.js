// Ozzle, the Safe Room mentor: a grumpy, octopus-like alien, once a game
// guide, drafted by Borant for another 300 seasons. An original character
// (not one from the books), painted at HUD scale (one sprite pixel = one HUD
// pixel) for the Safe Room screen. He leans on the bar counter: the bottom
// edge of the sprite is where his arms rest.
//
// Poses: 'idle0', 'idle1' (breathing, a slow blink), 'talk' (mouth open,
// one arm waving the point home).

import { C } from '../engine/palette.js';
import { Painter } from '../engine/paint.js';
import { mats } from './materials.js';

export const MENTOR_POSES = ['idle0', 'idle1', 'talk'];
export const MENTOR = { name: 'Ozzle', w: 76, h: 66 };

const SKIN = { ramp: [C.PLUM_D, C.PLUM, C.VIOLET, C.VIOLET_M, C.LILAC], spec: C.LILAC, shine: 0.1, outline: C.NIGHT };
const BELLY = { ramp: [C.PLUM, C.VIOLET_M, C.LILAC], outline: C.NIGHT, rough: 0.05 };
const EYE = { ramp: [C.FOG, C.PARCHMENT, C.BONE, C.WHITE], outline: C.NIGHT };
const SUCKER = { ramp: [C.SKIN_D, C.SKIN, C.SKIN_M], outline: C.PLUM_D };
const TIE = { ramp: [C.GORE, C.BLOOD, C.RED], outline: C.BLACK };
const MUG = { ramp: [C.FOG, C.SILVER, C.BONE], outline: C.BLACK };

// A tentacle: a chain of tapering capsules through the given points.
function tentacle(p, pts, r0, r1, skin, sucker, z = 6) {
  const n = pts.length - 1;
  for (let k = 0; k < n; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    const ra = r0 + (r1 - r0) * (k / n), rb = r0 + (r1 - r0) * ((k + 1) / n);
    p.capsule(x0, y0, ra, x1, y1, rb, skin, { z0: z, z1: z - 0.5 });
    // Suckers along the underside of the thicker part.
    if (k < n - 1) p.ellipse((x0 + x1) / 2, (y0 + y1) / 2 + ra * 0.55, ra * 0.45, ra * 0.35, sucker, { z: z + ra * 0.6, depth: 0.4 });
  }
}

export function paintOzzle(pose = 'idle0') {
  const { list } = mats(SKIN, BELLY, EYE, SUCKER, TIE, MUG);
  const id = { skin: 0, belly: 1, eye: 2, sucker: 3, tie: 4, mug: 5 };
  const breathe = pose === 'idle1' ? 1 : 0;
  const talk = pose === 'talk' ? 1 : 0;
  const { w: W, h: H } = MENTOR;
  const p = new Painter(W, H, { seed: 77 });
  const cx = 38;
  const hy = 22 + breathe; // head center

  // Arms resting on the counter, drawn first (behind the body where they cross).
  const leftArm = talk
    ? [[26, 50], [18, 46], [12, 38], [12, 30], [16, 25]]   // waving a point home
    : [[26, 50], [18, 56], [11, 60], [6, 62], [3.5, 60]];
  tentacle(p, leftArm, 4.2, 1.4, id.skin, id.sucker, 8);
  tentacle(p, [[50, 50], [58, 56], [64, 60], [70, 60], [73, 57]], 4.2, 1.4, id.skin, id.sucker, 8);
  // A third arm curls up around the coffee mug on the right.
  tentacle(p, [[47, 54], [55, 60], [60, 63]], 3.2, 2, id.skin, id.sucker, 9);

  // Body under the head: a short skirt that disappears behind the counter.
  p.ellipse(cx, 52 + breathe * 0.5, 16, 13, id.skin, { z: 4, depth: 0.8 });
  p.ellipse(cx, 55, 9, 8, id.belly, { z: 9, depth: 0.5 });

  // The mantle (head): big, bulging up and a little back, with a fold.
  p.ellipse(cx, hy, 21, 21 - breathe * 0.4, id.skin, { z: 6, depth: 0.9 });
  p.ellipse(cx + 2, hy - 9, 15, 11, id.skin, { z: 12, depth: 0.5 });

  // Eyes: wide set, with heavy, half-closed upper lids (permanently unimpressed).
  const ey = hy + 9;
  const lid = breathe ? 0.6 : 0;
  for (const [ex, inner] of [[cx - 9, 1], [cx + 9, -1]]) {
    p.ellipse(ex, ey, 6, 5.2, id.eye, { z: 20, depth: 0.5 });
    // The lid: a slab over the top half, a touch lower on the inner side.
    const top = ey - 7, mid = ey - 0.5 + lid;
    p.poly([[ex - 7, top], [ex + 7, top], [ex + 7, mid + inner * 0.8], [ex - 7, mid - inner * 0.8]], id.skin, { z: 24, normal: [0, -0.6, 1] });
    // A heavy brow ridge.
    p.capsule(ex - 6.5, ey - 6 - inner * 0.6, 1.6, ex + 6.5, ey - 6 + inner * 0.6, 1.6, id.skin, { z0: 25 });
    // Iris and a horizontal slit pupil, under the lid.
    p.decal(ex - 4, ey - 1, ex + 4, ey + 4, (x, y) => {
      const u = x + 0.5 - ex, v = y + 0.5 - (ey + 1);
      const d = Math.hypot(u / 3.2, v / 2.6);
      if (d > 1) return -1;
      if (Math.abs(v) < 0.6 && Math.abs(u) < 2.4) return C.BLACK;
      return d > 0.75 ? C.AMBER : C.GOLD;
    });
  }
  // Mouth on a lighter muzzle: a small, downturned line; open and
  // complaining when talking.
  const my = ey + 8;
  p.ellipse(cx, my + 0.5, 7.5, 3.6, id.belly, { z: 22, depth: 0.3 });
  if (talk) {
    p.decal(cx - 4, my - 2, cx + 4, my + 4, (x, y) => {
      const d = Math.hypot((x + 0.5 - cx) / 3.4, (y + 0.5 - (my + 1)) / 2.4);
      return d > 1 ? -1 : y + 0.5 > my + 2 ? C.SKIN : C.NIGHT;
    });
  } else {
    p.decal(cx - 5, my - 1, cx + 5, my + 2, (x, y) => {
      const u = x + 0.5 - cx;
      const curve = my + Math.abs(u) * 0.28;
      return Math.abs(u) < 4.5 && Math.abs(y + 0.5 - curve) < 0.6 ? C.NIGHT : -1;
    });
  }
  // Freckles on the mantle.
  for (const [x, y] of [[cx - 12, hy - 8], [cx - 7, hy - 13], [cx + 10, hy - 11], [cx + 15, hy - 3], [cx - 15, hy + 1], [cx + 4, hy - 16]]) {
    p.dot(x, y, C.PLUM_D);
  }
  // Borant uniform: a red bow tie.
  const ty = ey + 15;
  p.poly([[cx, ty], [cx - 6, ty - 3], [cx - 6, ty + 3]], id.tie, { z: 30, normal: [-0.3, 0, 1] });
  p.poly([[cx, ty], [cx + 6, ty - 3], [cx + 6, ty + 3]], id.tie, { z: 30, normal: [0.3, 0, 1] });
  p.ellipse(cx, ty, 1.6, 1.6, id.tie, { z: 31 });

  // The mug (it says nothing nice).
  p.poly([[57, 51], [65, 51], [65, 63], [57, 63]], id.mug, { z: 14, normal: [-0.2, 0, 1] });
  p.capsule(66, 54, 1.2, 66, 60, 1.2, id.mug, { z0: 14 });
  p.decal(57, 51, 65, 53, (x, y) => (x > 57 && x < 64 && y === 52 ? C.WOOD_D : -1)); // coffee
  return p.shade(list, { name: `ozzle_${pose}` });
}

export function paintOzzlePoses() {
  return Object.fromEntries(MENTOR_POSES.map((pose) => [pose, paintOzzle(pose)]));
}

// ------------------------------------------------------------ lines

// What Ozzle says. {p} points, {n} loot boxes, {k} kills, {v} viewers,
// {d} floor, {r} rerun number, {c} what killed the crawler last time,
// {t} how often that has happened. All lines are original.
export const MENTOR_LINES = {
  // First visit of a rerun (GDD 2.1): Ozzle remembers every death.
  rerunExplain: [
    'You died. Don\'t look so surprised. Borant restored your soul backup into a fresh body. Welcome to Borant Encore, the rerun channel. I remember everything. Lucky me.',
  ],
  rerunDeath: [
    'Rerun number {r}. Last time it was {c} on floor {d}. I added a mark to the wall. It\'s a big wall. Don\'t make me prove it.',
    'New body, same face. Last episode ended with {c} on floor {d}. The fans called it a cliffhanger. It was a floor.',
    'Oh, it\'s you. Again. Floor {d}, {c}, very dramatic. Rerun {r}. The wall is getting crowded.',
  ],
  rerunSame: [
    '{c} again? That\'s {t} times now. At this point it\'s a relationship.',
    '{c}. Again. {t} times. I\'m starting to think you like it.',
  ],
  rerunRecord: [
    'Floor {d} last time. Deeper than you ever got before. Then you died, but still. Progress. I\'ve heard of it.',
    'You made it to floor {d} last run. New personal best. I\'d clap, but I\'d have to put the mug down.',
  ],
  rerunWon: [
    'You survived the whole season and Borant put you right back in. That\'s what they call a reward around here.',
  ],
  firstVisit: [
    'Oh good. Another one. I\'m Ozzle, your Borant-appointed guide. Time stops in here, so take as long as you like. Please don\'t.',
  ],
  welcomeBack: [
    'Back again? The floor is still trying to kill you out there. In here it\'s just me, and I\'m only trying to ignore you.',
    'You again. Wipe your feet. Wipe everything, actually. You look like a crime scene that learned to walk.',
    'Welcome back to the only room on this floor that doesn\'t want you dead. I\'m undecided.',
  ],
  newFloor: [
    'Floor {d}. Same me, different room. Borant moves me around like a cheap lamp.',
    'Ah, floor {d}. The rats down here are bigger and the coffee is worse. One of those is my fault.',
  ],
  lowHp: [
    'You look terrible. There\'s a cot in the back. REST, before you bleed on my floor.',
    'You\'re mostly bruise at this point. Lie down. That\'s not advice, that\'s a cleaning policy.',
  ],
  points: [
    'You\'ve got {p} attribute points burning a hole in your stats. LEVEL UP. Spend them before you die with them. Everybody dies with them.',
    '{p} unspent points. I can see them from here. They\'re embarrassing both of us. LEVEL UP.',
  ],
  boxes: [
    'There are {n} loot boxes on my counter with your name on them. Literally. Borant engraves them. It\'s creepy.',
    '{n} loot boxes. Open them before they start to smell. They don\'t smell. Yet.',
  ],
  manyKills: [
    '{k} kills. The rats have started a support group. I was asked to facilitate. I said no.',
    '{k} kills so far. Violence: it\'s not the answer, but it is a very popular question down here.',
  ],
  noKills: [
    'No kills yet? Either you\'re a pacifist or a coward. The viewers can\'t tell. Neither can I.',
  ],
  bigAudience: [
    '{v} viewers out there. I had more when I was a crawler. Briefly. Then I had fewer. Then I had this job.',
    '{v} people are watching you right now. Some of them are taking notes. Some of them are taking bets.',
  ],
  smallAudience: [
    '{v} viewers. My cooking segment pulled more. I don\'t cook.',
    'Only {v} viewers. Do something stupid out there. The algorithm loves stupid.',
  ],
  rest: [
    'Lie down. Don\'t touch the stains. I\'ll wake you when the existential dread comes back. Five minutes, tops.',
    'Nap time. Borant provides one pillow per safe room. It has been used. Many times.',
  ],
  rested: [
    'You\'ve already rested. Borant allows one nap per safe room. Union rules. There is no union.',
  ],
  levelUp: [
    'Look at you, growing. Like a mold.',
    'Good. Numbers went up. That\'s all anybody down here really wants.',
  ],
  noPoints: [
    'No points to spend. Go hit something and come back. Not me. Something.',
  ],
  achievements: [
    'Your trophy shelf. Most of it is participation, but who\'s counting. Borant. Borant is counting.',
  ],
  noBoxes: [
    'No loot boxes. The System gives those for achievements, and achievements for doing things. Do things.',
  ],
  sponsor: [
    'I see {s} is sponsoring you now. Congratulations. Read the contract. Actually, don\'t. It\'ll only upset you.',
    '{s}, huh? I was sponsored once. By a mattress company. I still can\'t talk about it.',
  ],
  boxPick: [
    'Pick a box. They all contain disappointment, just in different sizes.',
    'Go on, open one. I\'ll pretend to be excited. I\'ve had practice.',
  ],
  boxOpen: [
    'Wow. Stuff. Try to contain yourself.',
    'That\'s about what I expected. I expect very little.',
    'The audience went "ooh". Then they went "oh".',
    'Another box, another pile of somebody else\'s junk. Welcome to the economy.',
  ],
  boxGreat: [
    'Huh. That\'s actually good. Don\'t tell anybody I said that.',
    'Somebody in Borant accounting just dropped their coffee. Good pull.',
  ],
  boxLearn: [
    'A book. You know what those are, right? You open them and knowledge falls out. Use it from your inventory.',
  ],
  leave: [
    'Off you go. Try not to die where I can see it. Paperwork.',
    'Go on. The clock starts the moment you step out. No pressure. All the pressure.',
  ],
};

const lineCounters = {};
export function mentorLine(topic, vars = {}) {
  const list = MENTOR_LINES[topic];
  const i = lineCounters[topic] = ((lineCounters[topic] ?? -1) + 1) % list.length;
  return list[i].replace(/\{(\w)\}/g, (_, k) => vars[k] ?? '');
}

// What Ozzle says when the crawler walks in, most urgent first.
// ctx: { visits (before this one, this run), floorVisits, depth, hpShare,
//        points, boxes, kills, viewers, newSponsor (name, or null),
//        rerun (0 for the premiere), met (has met the crawler before),
//        explained (has explained reruns), last ({ won, depth, killer, record }),
//        timesKilled (how often last.killer has done it) }
export function mentorGreeting(ctx) {
  const v = { p: ctx.points, n: ctx.boxes, k: ctx.kills, v: ctx.viewers, d: ctx.depth, s: ctx.newSponsor };
  if (!ctx.visits && ctx.rerun > 0 && ctx.met && ctx.last) return rerunGreeting(ctx);
  if (!ctx.visits) return mentorLine('firstVisit', v);
  if (ctx.hpShare <= 0.35) return mentorLine('lowHp', v);
  if (ctx.points > 0) return mentorLine('points', v);
  if (ctx.newSponsor) return mentorLine('sponsor', v);
  if (ctx.boxes > 0) return mentorLine('boxes', v);
  if (!ctx.floorVisits && ctx.depth > 1) return mentorLine('newFloor', v);
  if (ctx.kills >= 8) return mentorLine('manyKills', v);
  if (ctx.kills === 0) return mentorLine('noKills', v);
  if (ctx.viewers >= 500) return mentorLine('bigAudience', v);
  if (ctx.viewers < 60) return mentorLine('smallAudience', v);
  return mentorLine('welcomeBack', v);
}

// "How did it end": 'the floor collapse', or 'a giant rat'.
export function killerPhrase(killer) {
  if (!killer) return 'something';
  if (/^the /i.test(killer)) return killer;
  const k = killer.toLowerCase();
  return `${/^[aeiou]/.test(k) ? 'an' : 'a'} ${k}`;
}

// The first Safe Room of a rerun: Ozzle remembers how the last one ended.
function rerunGreeting(ctx) {
  const { last } = ctx;
  const v = { r: ctx.rerun, d: last.depth, c: killerPhrase(last.killer), t: ctx.timesKilled };
  if (!ctx.explained) return mentorLine('rerunExplain', v);
  if (last.won) return mentorLine('rerunWon', v);
  if (last.record) return mentorLine('rerunRecord', v);
  if (ctx.timesKilled >= 2) return capitalize(mentorLine('rerunSame', v));
  return mentorLine('rerunDeath', v);
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
