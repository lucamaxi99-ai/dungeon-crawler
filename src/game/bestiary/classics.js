// Front views of the classic dungeon fauna, each carrying something from the
// world above: a slime full of lost property, a spider wrapped in holiday
// lights, a skeleton on road duty.

import { C } from '../../engine/palette.js';
import { Painter } from '../../engine/paint.js';
import { mats } from '../materials.js';
import { poseFlags, spot, strokes } from './common.js';

// ------------------------------------------------------------ slime

// Less glossy than the showroom slime, so the eyes stay readable.
const JELLY = { ramp: [C.TEAL_D, C.TEAL, C.TEAL_M, C.MINT], spec: C.WHITE, shine: 0.25, outline: C.NIGHT };
const PUDDLE = { ramp: [C.TEAL_D, C.TEAL, C.TEAL_M], outline: C.NIGHT };

export function paintSlimeFront(pose = 'idle0', scale = 1) {
  const { list, id } = mats(JELLY, PUDDLE);
  id.slime = 0; id.puddle = 1;
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 46, G = 35;
  const p = new Painter(W, 36, { seed: 3, scale });
  const cx = W / 2;
  // Squash and stretch: breathing wobbles, lunge rears up, flinch flattens.
  const rx = 18 + b * 1.4 - lunge * 2 + flinch * 3;
  const ry = 13 - b * 1.2 + lunge * 3 - flinch * 3.5;
  const cy = G - ry;
  p.ellipse(cx, cy, rx, ry, id.slime, { depth: 0.9 });
  p.ellipse(cx, G - 1.5, rx + 2.5, 2.5, id.puddle, { z: -2, depth: 0.4 });  // puddle foot

  // Lost property floating inside (drawn darker: seen through the jelly).
  const sink = b * 0.6 + flinch * 1.5;
  // A sneaker, sole up, laces trailing.
  const sx = cx - 9, sy = cy + 3 + sink;
  p.decal(sx - 5, sy - 3, sx + 6, sy + 3, (x, y) => {
    const u = x + 0.5 - sx, v = y + 0.5 - sy;
    if (Math.hypot(u / 5.5, v / 2.4) > 1) return -1;
    if (v > 1.2) return C.STEEL_M;                            // sole
    if (Math.abs(u - 0.5 + v * 0.8) < 0.8 && v < 1) return C.BLOOD; // swoosh-ish stripe
    return v < -1.2 && u > 1 ? C.TEAL : C.PARCHMENT;
  });
  // A phone with its screen still on (glows).
  const px = cx + 7, py = cy - 2 - sink * 0.5 - lunge;
  p.decal(px - 3, py - 4, px + 3, py + 4, (x, y) => {
    const u = x + 0.5 - px, v = y + 0.5 - py;
    if (Math.abs(u) > 2.6 || Math.abs(v) > 4) return -1;
    if (Math.abs(u) > 1.6 || Math.abs(v) > 3) return C.NIGHT;
    return (y + (b ? 1 : 0)) % 3 === 0 ? C.ICE : C.SKY;
  });
  // Car keys on a ring.
  const kx = cx + 1, ky = cy + 7 + sink;
  strokes(p, [[kx - 1.5, ky, kx + 1.5, ky], [kx + 1.5, ky, kx + 3.5, ky + 2], [kx - 1.5, ky, kx - 3, ky + 2.5]], C.GOLD, 0.6);
  p.dot(kx - 2, ky - 1, C.AMBER).dot(kx - 1, ky - 2, C.AMBER).dot(kx, ky - 1, C.AMBER);

  // Bubbles.
  for (const [bx, by, br] of [[cx - 2, cy - 4, 1.4], [cx + 12, cy + 5, 1.1], [cx - 13, cy - 2, 1]]) {
    spot(p, bx, by - b, br, br, C.TEAL);
    p.dot(bx - 0.5, by - b - 0.5, C.MINT);
  }
  // Eyes: wide when it lunges, squeezed when hit.
  const ey = cy - ry * 0.45;
  for (const s of [-1, 1]) {
    const ex = cx + s * (6 + flinch);
    if (flinch) { strokes(p, [[ex - 2.5, ey - 1 * s * 0 - 1, ex + 2.5, ey + 1]], C.BLACK, 0.6); strokes(p, [[ex - 2.5, ey + 1, ex + 2.5, ey - 1]], C.BLACK, 0.6); continue; }
    const r = 3 + lunge * 0.6;
    p.decal(ex - 4, ey - 4, ex + 4, ey + 4, (x, y) => {
      const d = Math.hypot((x + 0.5 - ex) / (r * 0.85), (y + 0.5 - ey) / r);
      if (d > 1) return -1;
      const pd = Math.hypot(x + 0.5 - ex - 0.4 * s * -1, y + 0.5 - ey - 0.8);
      return pd < 1.3 + lunge * 0.3 ? C.BLACK : C.WHITE;
    });
  }
  // Mouth: a gaping hole when it lunges.
  if (lunge) spot(p, cx, ey + 6, 4.5, 2.6, C.TEAL_D), spot(p, cx, ey + 6.5, 3, 1.6, C.NIGHT);
  return p.shade(list, { name: `slime_front_${pose}`, glowColors: [C.SKY, C.ICE] });
}

// ------------------------------------------------------------ spider

const BULBS = [C.RED, C.GOLD, C.SKY, C.LIME, C.NEON];

export function paintSpiderFront(pose = 'idle0', scale = 1) {
  const { list, id } = mats('chitin');
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 62, G = 37;
  const p = new Painter(W, 38, { seed: 9, scale });
  const cx = W / 2;
  const tuck = flinch * 3;                 // legs pulled in when hit
  const rise = lunge * 4;                  // front legs lifted when it strikes
  // Legs: four per side, knee up, foot down. Back legs first (further away).
  for (let i = 3; i >= 0; i--) {
    for (const side of [-1, 1]) {
      const lift = (b + i) % 2 ? 1.2 : 0;
      const front = i === 0;
      const hipX = cx + side * (4 + i), hipY = 22 + i * 0.5;
      const kneeX = cx + side * (12 + i * 4.5 - tuck), kneeY = 7 + i * 2.5 - lift - (front ? rise : 0) + flinch;
      const footX = cx + side * (15 + i * 4.2 - tuck * 1.5 - (front ? lunge * 6 : 0)), footY = front && lunge ? G - 8 : G;
      const z = 8 - i * 2 + (front ? lunge * 10 : 0);
      p.capsule(hipX, hipY, 1.9, kneeX, kneeY, 1.4, id.chitin, { z0: z, z1: z - 1 });
      p.capsule(kneeX, kneeY, 1.4, footX, footY, 0.8, id.chitin, { z0: z - 1, z1: z - 2 });
    }
  }
  const hy = 24 + lunge * 3 - flinch * 2;
  p.ellipse(cx, 14 - flinch, 13, 10, id.chitin, { z: 0, depth: 0.9 });       // abdomen (behind)
  p.ellipse(cx, hy, 8 + lunge, 6 + lunge * 0.5, id.chitin, { z: 10, depth: 0.8 }); // head
  const fang = lunge ? 2.5 : 0;
  for (const s of [-1, 1]) p.capsule(cx + s * 2.5, hy + 4, 1.6, cx + s * (2 + fang), hy + 9 + fang, 0.8, id.chitin, { z0: 14 + lunge * 4 });
  // Hourglass mark on the abdomen.
  p.decal(cx - 4, 6, cx + 4, 15, (x, y) => (Math.abs(x + 0.5 - cx) < Math.abs(y + 0.5 - 10.5 + flinch) * 0.7 + 0.6 ? C.WINE : -1));
  // Eight eyes; shut tight when hit.
  for (const [ex, ey, big] of [[-3, -2, 1], [3, -2, 1], [-1.5, -3, 0], [1.5, -3, 0], [-5, -1, 0], [5, -1, 0], [-2, 0.5, 0], [2, 0.5, 0]]) {
    if (flinch) { if (big) p.dot(cx + ex - 0.5, hy + ey, C.BLACK).dot(cx + ex + 0.5, hy + ey, C.BLACK); continue; }
    p.dot(cx + ex - 0.5, hy + ey, big ? C.RED : C.BLOOD);
    if (big) p.dot(cx + ex + 0.5, hy + ey, C.FIRE);
  }
  // A string of holiday lights draped over the legs and the back:
  // sagging wire with bulbs that change colour every idle frame.
  const wire = [];
  const pts = [[cx - 27, 22], [cx - 15, 14], [cx - 4, 9], [cx + 6, 11], [cx + 17, 13], [cx + 27, 23]];
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
    const mx = (ax + bx) / 2, my = (ay + by) / 2 + 3 - flinch;
    wire.push([ax, ay - flinch, mx, my], [mx, my, bx, by - flinch]);
  }
  strokes(p, wire, C.MOSS_D, 0.5);
  let n = 0;
  for (const [ax, ay, bx, by] of wire) {
    const x = Math.round(bx), y = Math.round(by) + 1;
    const c = BULBS[(n + b * 2 + lunge * 3) % BULBS.length];
    p.dot(x, y, c).dot(x, y + 1, c);
    n++;
  }
  return p.shade(list, { name: `spider_front_${pose}`, glowColors: [C.FIRE, C.BLOOD, ...BULBS] });
}

// ------------------------------------------------------------ skeleton

// Road crew skeleton: hard hat, safety vest with reflective stripes, a
// galvanised trash-can lid for a shield and a length of rebar.
export function paintSkeletonFront(pose = 'idle0', scale = 1) {
  const { list, id } = mats('bone', 'safety', 'hardhat', 'steel', 'rust');
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 50, G = 61;
  const p = new Painter(W, 62, { seed: 13, scale });
  const cx = 24 - flinch * 1.5;
  const tilt = b * 0.8 + flinch * 1.5;
  // Legs
  for (const s of [-1, 1]) {
    p.capsule(cx + s * 4, 41, 1.9, cx + s * 5, 51, 1.5, id.bone, { z0: 4 });
    p.capsule(cx + s * 5, 51, 1.6, cx + s * 5, G - 1, 1.2, id.bone, { z0: 4 });
    p.ellipse(cx + s * 5, 51, 2, 1.6, id.bone, { z: 6 });
    p.capsule(cx + s * 5, G - 0.5, 1.3, cx + s * 7.5, G, 1, id.bone, { z0: 6 });
  }
  p.ellipse(cx, 39, 8, 4, id.bone, { z: 6, depth: 0.5 });                    // pelvis
  for (let k = 0; k < 8; k++) p.ellipse(cx, 18 + k * 2.6, 1.7, 1.3, id.bone, { z: 3 }); // spine
  // Ribs
  for (let k = 0; k < 5; k++) {
    const y = 21 + k * 3.2, len = 8 - k * 0.7;
    for (const s of [-1, 1]) {
      p.capsule(cx, y, 1, cx + s * len * 0.7, y - 0.5, 1, id.bone, { z0: 8, z1: 7 });
      p.capsule(cx + s * len * 0.7, y - 0.5, 1, cx + s * len, y + 3, 0.8, id.bone, { z0: 7, z1: 5 });
    }
  }
  p.capsule(cx, 20, 1.2, cx, 32, 1, id.bone, { z0: 9 });                    // sternum
  // Safety vest: two open panels over the ribs, so the ribcage still shows.
  for (const s of [-1, 1]) {
    const x0 = cx + s * 4, x1 = cx + s * 10.5;
    p.poly([[x0, 18], [x1 - s * 1, 17], [x1, 35], [x0 + s * 1.5, 36]], id.safety, { z: 11, normal: [s * 0.4, -0.2, 1] });
  }
  // Reflective stripes (bright, not glowing).
  for (const s of [-1, 1]) {
    for (const y of [25, 30]) strokes(p, [[cx + s * 4.6, y, cx + s * 10.2, y]], C.STEEL_L, 0.6);
  }
  p.capsule(cx - 9, 17.5, 1.3, cx + 9, 17.5, 1.3, id.safety, { z0: 12 });   // shoulders of the vest

  // Right arm (viewer's right) with rebar: raised to strike when lunging.
  const hx = cx + 13 + lunge * 2, hy = lunge ? 9 : 38;
  p.capsule(cx + 9, 19, 1.8, cx + 12 + lunge * 2, lunge ? 13 : 29, 1.4, id.bone, { z0: 9 });
  p.capsule(cx + 12 + lunge * 2, lunge ? 13 : 29, 1.4, hx, hy, 1.1, id.bone, { z0: 11, z1: 13 });
  if (lunge) {
    // Rebar swung overhead toward the viewer.
    p.capsule(hx, hy, 1.5, cx - 2, 3, 1.4, id.rust, { z0: 16, z1: 20 });
  } else {
    p.capsule(hx, hy - 1, 1.5, hx + 1, G - 1, 1.4, id.rust, { z0: 12 });
  }
  // Ridges on the rebar.
  const r0 = lunge ? [hx, hy, cx - 2, 3] : [hx, hy - 1, hx + 1, G - 1];
  for (let t = 0.1; t < 1; t += 0.12) p.dot(r0[0] + (r0[2] - r0[0]) * t, r0[1] + (r0[3] - r0[1]) * t, C.SOOT);
  p.ellipse(hx, hy, 2, 1.8, id.bone, { z: 15 });                            // fist

  // Left arm with the trash-can lid, raised to cover the skull when hit.
  const lx = cx - 13 + flinch * 3, ly = 33 - flinch * 12;
  p.capsule(cx - 9, 19, 1.8, cx - 12, 29 - flinch * 6, 1.4, id.bone, { z0: 7 });
  p.ellipse(lx, ly, 9, 9, id.steel, { z: 14, depth: 0.22 });
  // Concentric ridges and the handle.
  p.decal(lx - 10, ly - 10, lx + 10, ly + 10, (x, y) => {
    const d = Math.hypot(x + 0.5 - lx, y + 0.5 - ly);
    if (d > 9) return -1;
    if (Math.abs(d - 6.5) < 0.5) return C.STEEL_D;
    if (Math.abs(d - 3.5) < 0.5) return C.STEEL;
    return -1;
  });
  p.capsule(lx - 2.5, ly, 1, lx + 2.5, ly, 1, id.steel, { z0: 17 });

  // Skull, jaw and hard hat.
  const sx = cx + tilt, sy = 9 + flinch * 1.5;
  p.ellipse(sx, sy, 6.5, 7, id.bone, { z: 9, depth: 0.9 });
  const jaw = 15.5 + tilt * 0.5 + (lunge || flinch ? 1.5 : 0);
  p.capsule(sx - 3, jaw, 2, sx + 3, jaw, 2, id.bone, { z0: 11 });
  p.ellipse(sx, sy - 4, 8, 4.5, id.hardhat, { z: 13, depth: 0.7 });
  p.capsule(sx - 9.5, sy - 2, 0.9, sx + 9.5, sy - 2, 0.9, id.hardhat, { z0: 14 }); // brim
  for (const s of [-1, 1]) {
    const ex = sx + s * 2.6;
    p.decal(ex - 2, sy - 1, ex + 2, sy + 4, (x, y) => (Math.hypot((x + 0.5 - ex) / 1.9, (y + 0.5 - sy - 1.6) / 2.1) < 1 ? C.SOOT : -1));
    if (!flinch) p.dot(ex, sy + 1.6, C.ICE);
  }
  p.dot(sx, sy + 4, C.SOOT).dot(sx - 1, sy + 4, C.SOOT);
  for (let k = -2; k <= 2; k++) p.dot(sx + k, jaw - 1.5, k % 2 ? C.PARCHMENT : C.GRAVEL_D);
  return p.shade(list, { name: `skeleton_front_${pose}`, glowColors: [C.ICE] });
}
