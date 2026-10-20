// Quill Dobrane, junior producer of Borant Encore (GDD 2.1): a small alien
// with big eyes, a headset and a clipboard, seen as a video call on the
// Safe Room terminal. An original character, painted at HUD scale like
// Ozzle (one sprite pixel = one HUD pixel).
//
// Poses: 'idle0', 'idle1' (blink), 'talk' (mouth open, clipboard up).

import { C } from '../engine/palette.js';
import { Painter } from '../engine/paint.js';
import { mats } from './materials.js';

export const PRODUCER = { name: 'Quill Dobrane', title: 'JR. PRODUCER', w: 60, h: 54 };
export const PRODUCER_POSES = ['idle0', 'idle1', 'talk'];

const SKIN = { ramp: [C.TEAL_D, C.TEAL, C.TEAL_M, C.MINT], spec: C.WHITE, shine: 0.15, outline: C.NIGHT };
const EYE = { ramp: [C.BLACK, C.NIGHT, C.NAVY], spec: C.WHITE, shine: 0.9, outline: C.BLACK };
const SHIRT = { ramp: [C.NAVY, C.BLUE_D, C.BLUE, C.SKY], outline: C.BLACK };
const BOARD = { ramp: [C.WOOD_D, C.WOOD, C.WOOD_L], outline: C.BLACK };
const SHEET = { ramp: [C.FOG, C.BONE, C.WHITE], outline: C.ASH };
const HEADSET = { ramp: [C.BLACK, C.SOOT, C.SHADOW, C.DUSK], spec: C.STEEL_L, shine: 0.5, outline: C.BLACK };

export function paintProducer(pose = 'idle0') {
  const { list } = mats(SKIN, EYE, SHIRT, BOARD, SHEET, HEADSET);
  const id = { skin: 0, eye: 1, shirt: 2, board: 3, sheet: 4, headset: 5 };
  const blink = pose === 'idle1', talk = pose === 'talk';
  const { w: W, h: H } = PRODUCER;
  const p = new Painter(W, H, { seed: 131 });
  const cx = 30, hy = 20;
  // Shoulders in a Borant polo, a lanyard.
  p.ellipse(cx, H + 2, 20, 14, id.shirt, { z: 2, depth: 0.6 });
  p.decal(cx - 6, H - 14, cx + 6, H, (x, y) => (Math.abs(Math.abs(x + 0.5 - cx) - (y - (H - 14)) * 0.35) < 0.7 ? C.MAGENTA : -1));
  // Neck and the big round head, a little wider at the top.
  p.capsule(cx, hy + 12, 4, cx, H - 10, 5, id.skin, { z0: 4 });
  p.ellipse(cx, hy, 16, 15, id.skin, { z: 6, depth: 0.9 });
  p.ellipse(cx, hy - 5, 14, 9, id.skin, { z: 7, depth: 0.8 });
  // Two huge glossy eyes, slanted.
  for (const s of [-1, 1]) {
    const ex = cx + s * 7, ey = hy - 1;
    if (blink) {
      p.decal(ex - 5, ey - 1, ex + 5, ey + 1, (x, y) => (Math.abs(y + 0.5 - ey) < 0.6 && Math.abs(x + 0.5 - ex) < 4.5 ? C.NIGHT : -1));
    } else {
      p.ellipse(ex, ey, 5.2, 6.4, id.eye, { z: 21, depth: 0.5 });
      p.dot(ex - s * 1 - 1, ey - 3, C.WHITE).dot(ex - s * 1, ey - 3, C.WHITE).dot(ex - s * 1 - 1, ey - 2, C.WHITE);
    }
  }
  // A small mouth: a line, or an anxious little "o" while talking.
  if (talk) p.decal(cx - 2, hy + 7, cx + 2, hy + 11, (x, y) => (Math.hypot(x + 0.5 - cx, y + 0.5 - (hy + 9)) < 1.6 ? C.NIGHT : -1));
  else p.decal(cx - 3, hy + 8, cx + 3, hy + 9, (x, y) => (Math.abs(x + 0.5 - cx) < 2.5 && y === Math.round(hy + 8) ? C.TEAL_D : -1));
  // Headset: band over the head, one ear cup, the mic in front of the mouth.
  p.capsule(cx - 15, hy - 2, 1.2, cx - 6, hy - 15, 1.2, id.headset, { z0: 15 });
  p.capsule(cx - 6, hy - 15, 1.2, cx + 8, hy - 15, 1.2, id.headset, { z0: 16 });
  p.capsule(cx + 8, hy - 15, 1.2, cx + 15, hy - 2, 1.2, id.headset, { z0: 15 });
  p.ellipse(cx + 15, hy + 1, 3, 4, id.headset, { z: 22, depth: 0.6 });
  p.capsule(cx + 14, hy + 4, 0.8, cx + 5, hy + 9, 0.8, id.headset, { z0: 24 });
  p.ellipse(cx + 4, hy + 9, 1.6, 1.4, id.headset, { z: 25 });
  // Clipboard held up on the left, higher when he makes a point.
  const by = talk ? H - 26 : H - 18;
  p.poly([[3, by], [19, by - 2], [20, by + 18], [4, by + 20]], id.board, { z: 20, normal: [0.2, -0.1, 1] });
  p.poly([[5, by + 2], [18, by + 1], [18.5, by + 17], [5.5, by + 18]], id.sheet, { z: 21, normal: [0.2, -0.1, 1] });
  p.decal(5, by + 3, 18, by + 17, (x, y) => ((y - by) % 3 === 0 && x > 6 && x < 17 - ((y * 7) % 5) ? C.ASH : -1));
  p.poly([[9, by - 2], [14, by - 2.5], [14, by + 1], [9, by + 1.5]], id.headset, { z: 22 }); // clip
  p.capsule(18, by + 14, 2.2, 22, by + 18, 2.4, id.skin, { z0: 23 });                  // fingers
  return p.shade(list, { name: `producer_${pose}` });
}

export function paintProducerPoses() {
  return Object.fromEntries(PRODUCER_POSES.map((pose) => [pose, paintProducer(pose)]));
}
