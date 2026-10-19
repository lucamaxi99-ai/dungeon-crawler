// Painted creature sprites (64 px per wall height). Side views facing left;
// mirror() them to face right.
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
