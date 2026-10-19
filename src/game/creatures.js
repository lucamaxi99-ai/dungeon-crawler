// Painted creature sprites (64 px per wall height). Side views facing left
// (mirror() them to face right) and front views, facing the viewer.
//
// Poses per creature: 'idle0', 'idle1' (breathing/walking cycle), 'lunge'
// (attacking), 'flinch' (just got hit). Dead bodies are the idle pose
// flipped on its back (see assets.js).

import { C } from '../engine/palette.js';
import { Painter } from '../engine/paint.js';
import { mats } from './materials.js';

export const POSES = ['idle0', 'idle1', 'lunge', 'flinch'];

// Giant rat: grey fur, pink tail and paws, glowing red eye.
export function paintRat(pose = 'idle0', scale = 1) {
  const { list, id } = mats('fur', 'pink');
  const f = pose === 'idle1' ? 1 : 0;
  const lunge = pose === 'lunge' ? 1 : 0;
  const flinch = pose === 'flinch' ? 1 : 0;
  // The canvas has room in front for the lunge and above for the flinch.
  const p = new Painter(56, 32, { seed: 5, scale });
  const ox = 6 - lunge * 5 + flinch * 2;   // body shift
  const oy = 4 - flinch * 2;
  const hx = ox - lunge * 2, hy = oy - flinch * 3 + lunge * 1; // head shift
  const sway = f ? 2 : -1;
  // Tail: chain of tapering capsules curving away behind.
  let px = ox + 35, py = oy + 18;
  for (let k = 0; k < 6; k++) {
    const nx = px + 2.2, ny = py + 0.6 + Math.sin(k * 0.9 + sway * 0.4 + flinch * 2) * 1.4 - flinch * 0.6;
    p.capsule(px, py, 1.4 - k * 0.18, nx, ny, 1.2 - k * 0.18, id.pink, { z0: 2, z1: 1 });
    px = nx; py = ny;
  }
  // Legs stay on the ground (y 26 + 4) even when the body moves.
  const gy = 30;
  p.capsule(ox + 13, oy + 21, 1.6, ox + 12 - lunge * 3, gy, 1.2, id.pink, { z0: 3 });   // far front leg
  p.capsule(ox + 30, oy + 21, 2.2, ox + 31 + lunge * 2, gy, 1.3, id.pink, { z0: 3 });   // back leg
  p.ellipse(ox + 24, oy + 17, 13, 8 + flinch, id.fur, { z: 4, depth: 0.8 });            // body
  p.ellipse(ox + 31, oy + 18, 7.5, 7, id.fur, { z: 5, depth: 0.8 });                    // haunch
  p.ellipse(hx + 10, hy + 16, 7, 5.5, id.fur, { z: 7, depth: 0.9 });                    // head
  const snout = f ? 0.5 : 0;
  p.capsule(hx + 7, hy + 17, 4, hx + 2 - snout, hy + 19, 1.6, id.fur, { z0: 9, z1: 8 });   // snout
  p.ellipse(hx + 1.6 - snout, hy + 19, 1.4, 1.2, id.pink, { z: 11 });                  // nose
  p.ellipse(hx + 12, hy + 10 - flinch, 3, 3.3, id.pink, { z: 6 });                     // ear
  p.ellipse(hx + 15, hy + 11 - flinch, 2.6, 3, id.pink, { z: 5 });                     // far ear
  p.capsule(ox + 14, oy + 22, 1.8, ox + 15 - lunge * 4, gy, 1.2, id.pink, { z0: 9 });  // near front leg
  p.dot(hx + 12, hy + 10 - flinch, C.WINE).dot(hx + 12, hy + 11 - flinch, C.WINE);
  // Glowing eye; teeth, bared when attacking.
  p.dot(hx + 7, hy + 15, C.RED).dot(hx + 8, hy + 15, C.FIRE);
  p.dot(hx + 4, hy + 21, C.BONE);
  if (lunge) p.dot(hx + 3, hy + 21, C.BONE).dot(hx + 4, hy + 22, C.BONE).dot(hx + 2, hy + 20, C.BLACK);
  // Whiskers
  for (const [dx, dy] of [[-5, -2], [-5, 1], [-4, 3]]) p.line(hx + 4, hy + 18, hx + 4 + dx, hy + 18 + dy, id.pink, { z: 12 });
  return p.shade(list, { name: `rat_${pose}`, glowColors: [C.RED, C.FIRE] });
}

// Distance from a pixel center to a segment, for thin decal lines.
function segDist(x, y, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - x0 - dx * t, y - y0 - dy * t);
}

// Giant rat seen from the front: a dark hunched back, a lighter wedge of a
// head pointing at you, beady glowing eyes, incisors, whiskers, pink paws
// and the tail curling out to one side.
export function paintRatFront(pose = 'idle0', scale = 1) {
  const darkFur = { ramp: [C.BLACK, C.SOOT, C.GRAVEL_D, C.GRAVEL], rough: 0.3, outline: C.BLACK };
  const { list, id } = mats('fur', 'pink', darkFur);
  const dark = 2;
  const breathe = pose === 'idle1' ? 1 : 0;
  const lunge = pose === 'lunge' ? 1 : 0;
  const flinch = pose === 'flinch' ? 1 : 0;
  const W = 52, G = 37;                                     // canvas width, ground line
  const p = new Painter(W, 38, { seed: 7, scale });
  const cx = W / 2;
  const k = 1 + lunge * 0.15 - flinch * 0.06;               // head size (closer when biting)
  const hy = 20 + lunge * 4 - flinch * 3 - breathe * 0.6;   // head center
  // Tail curling out from behind on the right.
  let tx = cx + 14, ty = G - 5;
  for (let i = 0; i < 7; i++) {
    const nx = tx + 2.3, ny = ty - 1.3 - Math.sin(i * 0.8 + breathe * 1.2) * 1.2;
    p.capsule(tx, ty, 1.4 - i * 0.15, nx, ny, 1.2 - i * 0.15, id.pink, { z0: 1 });
    tx = nx; ty = ny;
  }
  // Hunched back and haunches (darker, further back).
  p.ellipse(cx, 18 + lunge * 2 + breathe * 0.4, 16 + breathe * 0.6, 12 + breathe * 0.6 - lunge, dark, { z: 2, depth: 0.8 });
  p.ellipse(cx - 14, G - 8, 8, 7.5, dark, { z: 3, depth: 0.8 });
  p.ellipse(cx + 14, G - 8, 8, 7.5, dark, { z: 3, depth: 0.8 });
  // Ears, flattened back when hit.
  const ey = hy - 6 * k + flinch * 2, ex = 9 * k + flinch * 2;
  for (const s of [-1, 1]) p.ellipse(cx + s * ex, ey, 4.5 * k, (5 - flinch * 1.8) * k, id.pink, { z: 6, depth: 0.4 });
  // Forelegs and paws, spread wide when it pounces.
  for (const s of [-1, 1]) {
    const fx = cx + s * (7 + lunge * 3);
    p.capsule(cx + s * 5, hy + 6, 1.7, fx, G - 2, 1.3, id.pink, { z0: 11, z1: 13 });
    p.ellipse(fx, G - 1.2, 2.5, 1.3, id.pink, { z: 14, depth: 0.6 });
  }
  // Head: a wedge from the brow down to the snout, which points at you.
  p.ellipse(cx, hy, 8.5 * k, 7 * k, id.fur, { z: 9, depth: 0.9 });
  p.capsule(cx, hy + 3 * k, 4.8 * k, cx, hy + 9.5 * k, 2.4 * k, id.fur, { z0: 11, z1: 17 });
  const ny = hy + 10.2 * k - breathe * 0.4;
  p.ellipse(cx, ny, 1.9 * k, 1.3 * k, id.pink, { z: 21, depth: 0.6 });
  // Inner ears.
  for (const s of [-1, 1]) {
    const ix = cx + s * ex, iy = ey + 0.6;
    p.decal(ix - 4, iy - 4, ix + 4, iy + 4, (x, y) => (Math.hypot((x + 0.5 - ix) / 2.6, (y + 0.5 - iy) / (3.2 - flinch * 1.2)) < 1 ? C.WINE : -1));
  }
  // Mouth under the nose: two incisors, or wide open when it bites.
  const my = Math.round(ny + 2);
  if (lunge) {
    p.ellipse(cx, my + 1.5, 4, 3, id.fur, { z: 16, depth: 0.5 }); // jaw
    p.decal(cx - 4, my - 1, cx + 4, my + 4, (x, y) => {
      const d = Math.hypot((x + 0.5 - cx) / 3, (y + 0.5 - my - 1.5) / 2.3);
      if (d > 1) return -1;
      if (Math.abs(x + 0.5 - cx) < 1.6 && (y <= my || y >= my + 3)) return C.BONE;
      return d > 0.7 ? C.GORE : C.BLACK;
    });
  } else {
    p.decal(cx - 2, my, cx + 2, my + 2, (x, y) => (Math.abs(x + 0.5 - cx) < 1.6 ? (y === my ? C.BONE : C.PARCHMENT) : -1));
  }
  // Beady eyes with a dark rim; squeezed shut when hit.
  for (const s of [-1, 1]) {
    const ex0 = Math.round(cx + s * 4.3 * k), ey0 = Math.round(hy - 0.5 * k); // pixel corner: a 2x2 eye
    p.decal(ex0 - 3, ey0 - 3, ex0 + 3, ey0 + 3, (x, y) => {
      const dx = x + 0.5 - ex0, dy = y + 0.5 - ey0;
      if (flinch) return Math.abs(dy) < 0.6 && Math.abs(dx) < 2 ? C.BLACK : -1;
      const d = Math.hypot(dx, dy);
      if (d > 1.9) return -1;
      if (d > 1.2) return C.BLACK;
      return dx * s < 0 && dy < 0 ? C.FIRE : C.RED;
    });
  }
  // Whiskers: thin pale lines fanning out from the snout.
  const wy = hy + 8 * k;
  for (const s of [-1, 1]) {
    const segs = [-3, 0, 2.5].map((dy) => [cx + s * 3 * k, wy, cx + s * 14 * k, wy + dy]);
    const x0 = Math.min(cx, cx + s * 15), x1 = Math.max(cx, cx + s * 15);
    p.decal(x0, wy - 5, x1, wy + 5, (x, y) => (segs.some((g) => segDist(x + 0.5, y + 0.5, ...g) < 0.5) ? C.GRAVEL_L : -1));
  }
  return p.shade(list, { name: `rat_front_${pose}`, glowColors: [C.RED, C.FIRE] });
}
