// Thrum, the Safe Room merchant (M7): a moth-like alien who deals in the
// belongings of dead crawlers ("previously owned"), which makes Borant
// Encore very good for business. An original character. He rents the bar
// counter from Ozzle when the crawler wants to trade: Ozzle steps away,
// Thrum leans in. Painted at HUD scale (one sprite pixel = one HUD pixel),
// the same size as Ozzle, arms resting on the counter at the bottom edge.
//
// Poses: 'idle0', 'idle1' (wings settle, antennae twitch), 'talk' (mouth
// open, one hand holding up a coin to the loupe).

import { C } from '../engine/palette.js';
import { Painter } from '../engine/paint.js';
import { mats } from './materials.js';

export const MERCHANT_POSES = ['idle0', 'idle1', 'talk'];
export const MERCHANT = { name: 'Thrum', w: 76, h: 66 };

const WING = { ramp: [C.WOOD_D, C.GRAVEL, C.GRAVEL_M, C.TAN, C.PARCHMENT], rough: 0.22, outline: C.SOOT };
const FUZZ = { ramp: [C.GRAVEL, C.GRAVEL_M, C.GRAVEL_L, C.PARCHMENT, C.BONE], rough: 0.3, outline: C.WOOD_D };
const EYE = { ramp: [C.BLACK, C.NIGHT, C.SHADOW, C.DUSK], spec: C.WHITE, shine: 0.9, outline: C.BLACK };
const KNIT = { ramp: [C.WOOD_D, C.RUST, C.AMBER, C.GOLD], rough: 0.28, outline: C.SOOT };
const BRASS = { ramp: [C.RUST, C.AMBER, C.GOLD, C.YELLOW], spec: C.HOT, shine: 0.7, outline: C.SOOT };
const ANT = { ramp: [C.SOOT, C.WOOD_D, C.WOOD, C.LEATHER], outline: C.SOOT };

export function paintThrum(pose = 'idle0') {
  const { list } = mats(WING, FUZZ, EYE, KNIT, BRASS, ANT);
  const id = { wing: 0, fuzz: 1, eye: 2, knit: 3, brass: 4, ant: 5 };
  const settle = pose === 'idle1' ? 1 : 0;
  const talk = pose === 'talk' ? 1 : 0;
  const { w: W, h: H } = MERCHANT;
  const p = new Painter(W, H, { seed: 131 });
  const cx = 38;
  const hy = 25; // head center

  // Wings first, behind everything: two big upper wings with eye spots,
  // two smaller lower ones.
  const wy = 30 + settle;
  for (const s of [-1, 1]) {
    p.ellipse(cx + s * 21, wy, 16, 12.5, id.wing, { z: 1, depth: 0.25 });
    p.ellipse(cx + s * 17, wy + 17, 10, 8, id.wing, { z: 0.5, depth: 0.25 });
  }
  // Veins and eye spots on the wings.
  p.decal(0, 10, W, 60, (x, y) => {
    const u = x + 0.5, v = y + 0.5;
    for (const s of [-1, 1]) {
      const ex = cx + s * 23, ey = wy - 1;
      const d = Math.hypot(u - ex, v - ey);
      if (d < 1.4) return C.BONE;
      if (d < 2.6) return C.BLACK;
      if (d < 4) return C.AMBER;
      if (d < 4.9) return C.SOOT;
      // A few veins fanning out from the shoulder.
      const ox = cx + s * 6, oy = wy + 3;
      for (const [tx, ty] of [[cx + s * 34, wy - 9], [cx + s * 37, wy + 3], [cx + s * 30, wy + 11]]) {
        const dx = tx - ox, dy = ty - oy, t = Math.max(0, Math.min(1, ((u - ox) * dx + (v - oy) * dy) / (dx * dx + dy * dy)));
        if (t > 0.35 && Math.hypot(u - ox - dx * t, v - oy - dy * t) < 0.5) return C.WOOD;
      }
    }
    return -1;
  });

  // Antennae: feathery, curling out; the tips twitch.
  for (const s of [-1, 1]) {
    const tip = [cx + s * (15 + settle), 3 + settle * s * 0.5];
    const mid = [cx + s * 9, 8];
    p.capsule(cx + s * 4, hy - 9, 1.1, mid[0], mid[1], 0.9, id.ant, { z0: 14 });
    p.capsule(mid[0], mid[1], 0.9, tip[0], tip[1], 0.6, id.ant, { z0: 14 });
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const bx = mid[0] + (tip[0] - mid[0]) * t, by = mid[1] + (tip[1] - mid[1]) * t;
      p.line(bx, by, bx + s * 1.5, by + 2, id.ant, { z: 14 });
      p.line(bx, by, bx - s * 1.2, by - 1.2, id.ant, { z: 14 });
    }
  }

  // Cardigan body behind the counter, a fluffy collar, the head.
  p.ellipse(cx, 55 + settle * 0.5, 15, 13, id.knit, { z: 4, depth: 0.8 });
  p.ellipse(cx, 40, 12, 6.5, id.fuzz, { z: 8, depth: 0.7 });
  p.ellipse(cx, hy, 12.5, 11.5, id.fuzz, { z: 6, depth: 0.9 });
  // Cardigan buttons and the opening.
  p.decal(cx - 1, 46, cx + 1, 66, (x, y) => (x === cx ? (y % 5 === 0 ? C.YELLOW : C.WOOD_D) : -1));

  // Big glossy compound eyes; the right one wears a brass jeweler's loupe.
  const ey = hy + 1;
  for (const s of [-1, 1]) {
    p.ellipse(cx + s * 6.5, ey, 5.2, 6.2, id.eye, { z: 18, depth: 0.6 });
  }
  p.decal(cx - 12, ey - 7, cx + 12, ey + 7, (x, y) => {
    // Facets: a faint grid of lighter dots on the eyes.
    for (const s of [-1, 1]) {
      const u = x + 0.5 - (cx + s * 6.5), v = y + 0.5 - ey;
      if ((u / 5.2) ** 2 + (v / 6.2) ** 2 < 0.7 && (x + y) % 3 === 0 && (x * 2 + y) % 4 === 0) return C.SHADOW;
    }
    return -1;
  });
  const lx = cx + 6.5;
  p.decal(lx - 8, ey - 8, lx + 8, ey + 8, (x, y) => {
    const d = Math.hypot(x + 0.5 - lx, y + 0.5 - ey);
    if (d > 5.8 && d < 7.4) return y + 0.5 < ey ? C.YELLOW : C.AMBER;
    return -1;
  });
  p.capsule(lx + 7, ey, 0.7, cx + 12, ey - 6, 0.6, id.brass, { z0: 20 }); // the strap

  // A small mouth under the eyes.
  const my = hy + 9;
  if (talk) {
    p.decal(cx - 3, my - 1, cx + 3, my + 3, (x, y) => (Math.hypot((x + 0.5 - cx) / 2.4, (y + 0.5 - my - 1) / 1.8) < 1 ? C.NIGHT : -1));
  } else {
    p.decal(cx - 3, my, cx + 3, my + 1, (x, y) => (y === my && Math.abs(x + 0.5 - cx) < 2.2 ? C.WOOD_D : -1));
  }

  // Arms in knitted sleeves: two resting on the counter. When talking, the
  // left one holds up a coin to the loupe.
  const arm = (pts, r0, r1) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const ra = r0 + (r1 - r0) * (k / (pts.length - 1)), rb = r0 + (r1 - r0) * ((k + 1) / (pts.length - 1));
      p.capsule(pts[k][0], pts[k][1], ra, pts[k + 1][0], pts[k + 1][1], rb, id.knit, { z0: 10, z1: 11 });
    }
    const [hx, hyy] = pts[pts.length - 1];
    p.ellipse(hx, hyy, 2.2, 1.8, id.fuzz, { z: 12 });
  };
  arm([[cx + 11, 50], [cx + 19, 58], [cx + 25, 63]], 3, 2);
  if (talk) {
    arm([[cx - 11, 50], [cx - 18, 46], [cx - 14, 36]], 3, 2);
    p.ellipse(cx - 13, 33, 3.2, 3.2, id.brass, { z: 16, depth: 0.3 });
  } else {
    arm([[cx - 11, 50], [cx - 19, 58], [cx - 25, 63]], 3, 2);
  }
  return p.shade(list, { name: `thrum_${pose}` });
}

export function paintThrumPoses() {
  return Object.fromEntries(MERCHANT_POSES.map((pose) => [pose, paintThrum(pose)]));
}

// ------------------------------------------------------------ lines

// What Thrum says. {i} item, {g} gold. All lines are original.
export const MERCHANT_LINES = {
  hello: [
    'Thrum\'s Previously Owned. Everything here belonged to somebody. Somebody who doesn\'t need it anymore.',
    'Ah, a customer with a pulse. My favorite kind. Briefly.',
    'Welcome, welcome. Mind the dust. Some of the dust used to be crawlers.',
  ],
  helloAgain: [
    'Back again? Good. Bad for you, good for business.',
    'You look alive. That\'s nice. Things sell better when the buyer is alive.',
  ],
  helloRerun: [
    'Oh, I remember you. I sold your boots last season. To you. Lovely boots.',
    'New body? Same wallet, I hope. Welcome back to Previously Owned.',
  ],
  buy: [
    'Sold. It suits you. It suited the last one too.',
    'A fine choice. No refunds. No questions. No previous owner, officially.',
    'Wrap it? No? Good, I don\'t have paper.',
  ],
  sell: [
    'I\'ll give you {g} gold. Don\'t argue. Arguing is how the last seller ended up on my shelf.',
    '{g} gold. It\'s fair. Fair-ish. Fair for a moth.',
    'Ah, {i}. I know a collector. He collects everything. He\'s not well.',
  ],
  sellJunk: [
    'Junk is my favorite. Junk never complains about the price.',
    'Rat parts. The Syndicate pays good money for rat parts. Don\'t ask what for.',
  ],
  poor: [
    'That costs {g}. You have less. I can wait. You can\'t. Time\'s funny like that.',
    'Not enough gold. Come back when you\'ve looted somebody richer.',
  ],
  nothing: [
    'Nothing to sell? Everybody has something to sell. Sometimes it\'s just a kidney.',
  ],
  soldOut: [
    'Sold out. Come back next floor. People keep dying, so stock keeps coming.',
  ],
  bye: [
    'Come back soon. Or don\'t. Either way, I\'ll end up with your stuff.',
    'Pleasure doing business. Ozzle will be back in a moment. Try to look less tempted.',
  ],
};

const counters = {};
export function merchantLine(topic, vars = {}) {
  const list = MERCHANT_LINES[topic];
  const i = counters[topic] = ((counters[topic] ?? -1) + 1) % list.length;
  return list[i].replace(/\{(\w)\}/g, (_, k) => vars[k] ?? '');
}
