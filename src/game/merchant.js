// Sal, the Safe Room merchant (M7): a human. Before the collapse he ran a
// pawnshop; on day one Borant offered him a vendor contract instead of a
// crawler badge, and he took it before they finished the sentence. Now he
// deals in the belongings of dead crawlers ("previously owned"), which makes
// Borant Encore very good for business. An original character. He rents the
// bar counter from Ozzle when the crawler wants to trade: Ozzle steps away,
// Sal leans in. Painted at HUD scale (one sprite pixel = one HUD pixel), the
// same size as Ozzle, arms resting on the counter at the bottom edge.
//
// Look: middle-aged, bald on top under a green dealer's visor, grey side
// hair and a walrus moustache, a brass jeweler's loupe on the right eye, a
// mustard cardigan over a shirt and tie.
//
// Poses: 'idle0', 'idle1' (a blink, a breath), 'talk' (mouth open under the
// moustache, one hand holding up a coin to the loupe).

import { C } from '../engine/palette.js';
import { Painter } from '../engine/paint.js';
import { mats } from './materials.js';

export const MERCHANT_POSES = ['idle0', 'idle1', 'talk'];
export const MERCHANT = { name: 'Sal', shop: 'Sal\'s Previously Owned', w: 76, h: 66 };

const SKIN = { ramp: [C.SKIN, C.SKIN_M, C.SKIN_M, C.SKIN_L, C.SKIN_L], outline: C.SKIN_D, rough: 0.04 };
const HAIR = { ramp: [C.ASH, C.FOG, C.SILVER, C.BONE], rough: 0.3, outline: C.SHADOW };
const KNIT = { ramp: [C.WOOD_D, C.RUST, C.AMBER, C.GOLD], rough: 0.28, outline: C.SOOT };
const SHIRT = { ramp: [C.GRAVEL_M, C.GRAVEL_L, C.PARCHMENT, C.BONE], outline: C.GRAVEL };
const VISOR = { ramp: [C.MOSS_D, C.MOSS, C.GREEN, C.LIME], outline: C.MOSS_D };
const BRASS = { ramp: [C.RUST, C.AMBER, C.GOLD, C.YELLOW], spec: C.HOT, shine: 0.7, outline: C.SOOT };
const TIE = { ramp: [C.GORE, C.BLOOD, C.RED], outline: C.BLACK };

export function paintMerchant(pose = 'idle0') {
  const { list } = mats(SKIN, HAIR, KNIT, SHIRT, VISOR, BRASS, TIE);
  const id = { skin: 0, hair: 1, knit: 2, shirt: 3, visor: 4, brass: 5, tie: 6 };
  const blink = pose === 'idle1';
  const talk = pose === 'talk';
  const breathe = blink ? 0.5 : 0;
  const { w: W, h: H } = MERCHANT;
  const p = new Painter(W, H, { seed: 211 });
  const cx = 38;
  const hy = 24; // head center

  // Body behind the counter: cardigan, the shirt and tie in the opening.
  p.ellipse(cx, 57 + breathe, 19, 14, id.knit, { z: 4, depth: 0.8 });
  p.poly([[cx - 6, 41], [cx + 6, 41], [cx + 1.5, 60], [cx - 1.5, 60]], id.shirt, { z: 20, normal: [0, -0.2, 1] });
  p.poly([[cx - 1.2, 43], [cx + 1.2, 43], [cx + 2, 52], [cx, 55], [cx - 2, 52]], id.tie, { z: 22 });
  // Collar points.
  p.poly([[cx - 6, 40], [cx - 1, 42], [cx - 4, 46]], id.shirt, { z: 23, normal: [-0.3, -0.3, 1] });
  p.poly([[cx + 6, 40], [cx + 1, 42], [cx + 4, 46]], id.shirt, { z: 23, normal: [0.3, -0.3, 1] });
  // Cardigan buttons down the edges of the opening.
  for (const y of [49, 54, 59]) { p.dot(cx - 4 + (y - 49) * 0.15, y, C.YELLOW); p.dot(cx + 4 - (y - 49) * 0.15, y, C.YELLOW); }

  // Neck, ears, head.
  p.capsule(cx, 36, 5, cx, 41, 6, id.skin, { z0: 6 });
  for (const s of [-1, 1]) p.ellipse(cx + s * 13, hy + 2, 2.8, 3.8, id.skin, { z: 7, depth: 0.5 });
  p.ellipse(cx, hy, 13, 14, id.skin, { z: 9, depth: 0.9 });
  // Jowls: a little wider at the jaw.
  p.ellipse(cx, hy + 7, 11.5, 7, id.skin, { z: 10, depth: 0.6 });

  // Grey hair at the sides and the back, and a hopeful comb-over on top.
  for (const s of [-1, 1]) {
    p.ellipse(cx + s * 12, hy - 1, 2.8, 5.5, id.hair, { z: 12, depth: 0.5 });
  }
  p.decal(cx - 11, hy - 15, cx + 11, hy - 8, (x, y) => {
    const u = x + 0.5 - cx, v = y + 0.5;
    const k = Math.round((v - (hy - 14) + u * 0.25) / 2);
    return Math.abs(v - (hy - 14) + u * 0.25 - k * 2) < 0.5 && Math.abs(u) < 10 && k >= 0 && k <= 2 ? C.FOG : -1;
  });

  // The green dealer's visor: a band round the head and a bill over the brow.
  p.poly([[cx - 13.5, hy - 8], [cx + 13.5, hy - 8], [cx + 13.5, hy - 6], [cx - 13.5, hy - 6]], id.visor, { z: 20, normal: [0, -0.2, 1] });
  p.poly([[cx - 15, hy - 7], [cx + 15, hy - 7], [cx + 12, hy - 3], [cx - 12, hy - 3]], id.visor, { z: 24, normal: [0, 0.7, 0.7] });
  p.decal(cx - 15, hy - 7, cx + 15, hy - 3, (x, y) => (y === hy - 3 && Math.abs(x + 0.5 - cx) < 12 ? C.MOSS_D : -1));

  // Bushy brows, eyes, the loupe on the right eye.
  const ey = hy + 2;
  for (const s of [-1, 1]) p.capsule(cx + s * 2.5, ey - 3.5, 1.3, cx + s * 8.5, ey - 4, 1.1, id.hair, { z0: 22 });
  p.decal(cx - 10, ey - 3, cx + 10, ey + 3, (x, y) => {
    for (const s of [-1, 1]) {
      const ex = cx + s * 5.5;
      const u = x + 0.5 - ex, v = y + 0.5 - ey;
      if (blink) { if (Math.abs(v) < 0.6 && Math.abs(u) < 2.5) return C.SKIN_D; continue; }
      const big = s > 0 ? 1.3 : 1; // the loupe magnifies the right eye
      if (Math.abs(u) < 2.5 * big && Math.abs(v) < 1.5 * big) {
        if (Math.abs(u) < 1.1 * big && Math.abs(v) < 1.5 * big) return u < 0 && v < 0 ? C.WHITE : C.NIGHT;
        return C.BONE;
      }
    }
    return -1;
  });
  const lx = cx + 5.5;
  p.decal(lx - 6, ey - 6, lx + 6, ey + 6, (x, y) => {
    const d = Math.hypot(x + 0.5 - lx, y + 0.5 - ey);
    if (d > 4 && d < 5.4) return y + 0.5 < ey ? C.YELLOW : C.AMBER;
    return -1;
  });
  p.capsule(lx + 5, ey + 1, 0.6, cx + 13, ey - 2, 0.6, id.brass, { z0: 26 }); // the strap

  // A proper nose, then the walrus moustache and the mouth under it.
  p.ellipse(cx, hy + 6, 3, 3.6, id.skin, { z: 22, depth: 0.7 });
  p.dot(cx - 1, hy + 8, C.SKIN_D).dot(cx + 1, hy + 8, C.SKIN_D);
  const my = hy + 11;
  if (talk) {
    p.decal(cx - 3, my, cx + 3, my + 3, (x, y) => (Math.hypot((x + 0.5 - cx) / 2.6, (y + 0.5 - my - 1.2) / 1.6) < 1 ? C.NIGHT : -1));
  } else {
    p.decal(cx - 3, my + 1, cx + 3, my + 2, (x, y) => (y === my + 1 && Math.abs(x + 0.5 - cx) < 2.5 ? C.WOOD_D : -1));
  }
  for (const s of [-1, 1]) {
    p.ellipse(cx + s * 3.5, my - 1.2, 4.5, 2, id.hair, { z: 25, depth: 0.4 });
    p.capsule(cx + s * 6.5, my - 0.5, 1.3, cx + s * 7.5, my + 2.5, 0.9, id.hair, { z0: 24 });
  }

  // Arms in knitted sleeves on the counter, with hands. Talking, the left
  // hand holds up a coin to the loupe.
  const arm = (pts) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const r = 3.6 - k * 0.5;
      p.capsule(pts[k][0], pts[k][1], r, pts[k + 1][0], pts[k + 1][1], r - 0.5, id.knit, { z0: 14, z1: 15 });
    }
    const [hx, hyy] = pts[pts.length - 1];
    p.ellipse(hx, hyy, 3, 2.3, id.skin, { z: 17, depth: 0.6 });
  };
  arm([[cx + 12, 47], [cx + 20, 56], [cx + 27, 63]]);
  if (talk) {
    arm([[cx - 12, 47], [cx - 21, 44], [cx - 20, 34]]);
    p.ellipse(cx - 19, 30, 3, 3, id.brass, { z: 20, depth: 0.3 });
  } else {
    arm([[cx - 12, 47], [cx - 20, 56], [cx - 27, 63]]);
  }
  return p.shade(list, { name: `merchant_${pose}` });
}

export function paintMerchantPoses() {
  return Object.fromEntries(MERCHANT_POSES.map((pose) => [pose, paintMerchant(pose)]));
}

// ------------------------------------------------------------ lines

// What Sal says. {i} item, {g} gold. All lines are original.
export const MERCHANT_LINES = {
  hello: [
    'Sal\'s Previously Owned. Thirty years in pawn, kid. Everything here belonged to somebody who doesn\'t need it anymore.',
    'A customer with a pulse! Borant offered me a crawler badge or a shop. I took the shop. Look at me now.',
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
    '{g} gold. It\'s fair. Fair-ish. Fair for the end of the world.',
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
  keyItem: [
    'Ozzle\'s paperwork? Not touching it. He\'d stop renting me the counter. Keep it, give it to him.',
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
