// Painted 64 px object sprites (64 px = one wall high). Built with the
// Painter from 3D-ish primitives, then lit and mapped onto palette ramps.
// scale: 1 = 64 px per wall (the game), smaller values for the prototype.

import { C } from '../engine/palette.js';
import { Painter } from '../engine/paint.js';
import { M, frames, flame, fireMats } from './materials.js';

const FLAME_MATS = [2, 3, 4, 5, 6];

// Iron tripod with a bowl of coals and a three-tongued flame. 4 frames.
export function paintBrazier(scale = 1) {
  return frames(4, (f) => {
    const p = new Painter(40, 50, { seed: 23, scale });
    const base = { iron: 0, coal: 1 };
    // Tripod legs
    p.capsule(12, 30, 1.6, 6, 49, 1.3, base.iron, { z0: 2 });
    p.capsule(28, 30, 1.6, 34, 49, 1.3, base.iron, { z0: 2 });
    p.capsule(20, 31, 1.8, 20, 49, 1.4, base.iron, { z0: 6 });
    p.capsule(9, 42, 1, 31, 42, 1, base.iron, { z0: 5 });
    // Bowl and rim
    p.ellipse(20, 27, 15, 7, base.iron, { z: 4, depth: 0.7 });
    p.erase((x, y) => y < 25);
    p.ellipse(20, 25, 15, 2.6, base.iron, { z: 8, depth: 0.3 });
    p.ellipse(20, 24.8, 12.5, 1.8, base.coal, { z: 9, depth: 0.3 });
    flame(p, 20, 24, 11, 22, f * 1.57, FLAME_MATS);
    flame(p, 13, 24, 4, 10, f * 1.57 + 2, FLAME_MATS);
    flame(p, 27, 24, 4.5, 12, f * 1.57 + 4, FLAME_MATS);
    return p.shade([M.iron, M.coal, ...fireMats()], { name: `brazier_${f}` });
  });
}

// Torch in an iron bracket, hung on a wall (place it with a lift). 4 frames.
export function paintWallTorch(scale = 1) {
  return frames(4, (f) => {
    const p = new Painter(16, 30, { seed: 29, scale });
    p.capsule(8, 29, 1.6, 8, 15, 2, 0, { z0: 3 });            // handle
    p.capsule(4, 22, 1, 12, 22, 1, 1, { z0: 6 });              // bracket
    p.ellipse(8, 14, 3.4, 1.8, 1, { z: 6 });
    flame(p, 8, 13, 4.5, 13, f * 1.57, FLAME_MATS);
    return p.shade([M.wood, M.iron, ...fireMats()], { name: `torch_${f}` });
  });
}

// Fills a rectangle with a fixed normal, or with fn(x, y) -> [nx, ny, nz, z].
function slab(p, x0, y0, x1, y1, mat, fn) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const [nx, ny, nz, z] = fn(x + 0.5, y + 0.5);
      p.put(x, y, z, nx, ny, nz, mat);
    }
  }
}

// Wooden chest with a rounded lid, iron straps and a brass lock.
// stage: 'closed', 'ajar' (lid lifted, loot glowing in the gap), 'full'
// (lid up, coins inside) or 'empty' (lid up, nothing left). All stages share
// one canvas size so the opening animation doesn't jump; the room above the
// closed lid is for the opened one.
export const CHEST_STAGES = ['closed', 'ajar', 'full', 'empty'];

export function paintChest(stage = 'closed') {
  const W = 46, OY = 14, H = 36 + OY;
  const p = new Painter(W, H, { seed: 41 });
  const id = { wood: 0, iron: 1, brass: 2, dark: 3, glint: 4, inner: 5 };
  const X0 = 3, X1 = 43, LID1 = 16 + OY;
  const open = stage === 'full' || stage === 'empty';
  const lift = stage === 'ajar' ? 4 : 0;
  const LID0 = 3 + OY - lift, LIDB = LID1 - lift;
  // Lid: a half cylinder along x, seen from the front.
  const lid = (x, y) => {
    const t = Math.min(1, Math.max(0, (y - LID0) / (LIDB - LID0)));
    const a = t * Math.PI * 0.5;
    const ends = Math.min(x - X0, X1 - x) < 1.5 ? (x < W / 2 ? -0.35 : 0.35) : 0;
    return [ends, -Math.cos(a), Math.sin(a) + 0.15, 6 + Math.sin(a) * 4];
  };
  const body = (x) => [Math.min(x - X0, X1 - x) < 1.5 ? (x < W / 2 ? -0.4 : 0.4) : 0, 0.05, 1, 10];
  const straps = [8, 35];

  if (!open) {
    slab(p, X0, LID0, X1, LIDB, id.wood, lid);
    // Round off the lid's upper corners.
    p.erase((x, y) => y < LID0 + 4 && y < LIDB && Math.hypot(Math.max(0, X0 + 4 - x, x - (X1 - 5)), LID0 + 4 - y) > 4.2);
    slab(p, X0, LIDB - 1, X1, LIDB + 1, id.iron, () => [0, -0.35, 1, 12]);
    for (const sx of straps) {
      slab(p, sx, LID0, sx + 3, LIDB, id.iron, (x, y) => { const n = lid(x, y); return [n[0] + (x - sx - 1.5) * 0.25, n[1], n[2], n[3] + 1.2]; });
    }
    if (lift) {
      // The gap under the lifted lid: loot light spilling out.
      slab(p, X0 + 1, LIDB + 1, X1 - 1, LID1, id.glint, () => [0, 0, 1, 8]);
    }
  } else {
    // Lid swung back: we see its inside standing up behind the body.
    const T = LID1 - 25;
    slab(p, X0 + 1, T, X1 - 1, LID1 - 6, id.inner, (x, y) => [0, (y - (T + 9)) * 0.06, 1, 2]);
    p.erase((x, y) => y < T + 3 && Math.hypot(Math.max(0, X0 + 4 - x, x - (X1 - 5)), T + 3 - y) > 3.2);
    for (const sx of straps) slab(p, sx, T, sx + 3, LID1 - 6, id.iron, (x) => [(x - sx - 1.5) * 0.3, 0, 1, 3]);
    // Back rim, the inner back wall and the dark inside of the box.
    slab(p, X0 + 1, LID1 - 7, X1 - 1, LID1 - 6, id.iron, () => [0, -0.6, 0.8, 4]);
    slab(p, X0 + 1, LID1 - 6, X1 - 1, LID1 - 4, id.inner, () => [0, 0.5, 0.7, 4.5]);
    slab(p, X0 + 1, LID1 - 4, X1 - 1, LID1, id.dark, () => [0, 0, 1, 5]);
    if (stage === 'full') {
      for (let k = 0; k < 10; k++) {
        const cx = 7 + k * 3.5 + (k % 2) * 0.8, cy = LID1 - 2.5 + (k % 3 === 0 ? -1 : 0.4);
        p.ellipse(cx, cy, 2.4, 1.3, id.glint, { z: 6 + k * 0.1, depth: 0.8 });
      }
      p.ellipse(18, LID1 - 4.2, 2, 1.7, id.glint, { z: 7 });
      p.ellipse(29, LID1 - 3.8, 1.6, 1.6, id.glint, { z: 7 });
    }
    // Front rim band.
    slab(p, X0, LID1 - 1, X1, LID1 + 2, id.iron, () => [0, -0.35, 1, 12]);
  }

  slab(p, X0, LID1 + (open ? 2 : 1), X1, H, id.wood, body);
  for (const sx of straps) slab(p, sx, LID1 + (open ? 2 : 1), sx + 3, H, id.iron, (x) => [(x - sx - 1.5) * 0.3, 0, 1, 11.5]);
  // Corner caps
  for (const [cx, cy] of [[X0 + 1.5, H - 2], [X1 - 1.5, H - 2]]) p.ellipse(cx, cy, 2.2, 2.2, id.iron, { z: 12 });
  // Lock plate and hasp (the hasp hangs open once the lid is up).
  slab(p, 20, LID1 - 3 + (open ? 5 : 0), 27, LID1 + 7, id.brass, (x, y) => [(x - 23.5) * 0.12, (y - LID1 - 2) * 0.08, 1, 13]);
  if (!open) {
    p.decal(22, LID1, 25, LID1 + 5, (x, y) => {
      const dx = x - 23, dy = y - LID1 - 1.5;
      if (Math.hypot(dx, dy) < 1.1) return C.BLACK;
      return Math.abs(dx) < 0.6 && dy > 0 && dy < 3.2 ? C.BLACK : -1;
    });
  }
  // Plank seams and nail heads
  p.decal(X0, 0, X1, H, (x, y) => {
    if ((y === LID1 + 7 || y === LID1 + 14) && x > X0 + 1 && x < X1 - 2) return C.SOOT;
    if (!open && y === LID0 + 6 && x > X0 + 1 && x < X1 - 2 && (x < 8 || x > 10) && (x < 35 || x > 37)) return C.WOOD_D;
    return -1;
  });
  for (const sx of [9, 36]) for (const ny of [LID1 + 4, LID1 + 11, LID1 + 17]) p.dot(sx, ny, C.STEEL_L);
  return p.shade([
    { ramp: [C.SOOT, C.WOOD_D, C.WOOD, C.WOOD_L, C.LEATHER], rough: 0.22, outline: C.BLACK },
    M.iron,
    { ramp: [C.RUST, C.AMBER, C.GOLD, C.YELLOW], spec: C.HOT, shine: 0.7, outline: C.SOOT },
    { ramp: [C.BLACK, C.SOOT], flat: true },
    { ramp: [C.AMBER, C.YELLOW, C.HOT], glow: true, spec: C.WHITE, shine: 0.6 },
    { ramp: [C.BLACK, C.SOOT, C.WOOD_D, C.WOOD], rough: 0.25, outline: C.BLACK },
  ], { name: `chest_${stage}` });
}

// Wooden barrel: bulging staves, four iron hoops. Seen from slightly below
// the rim, so top and bottom edges curve outward.
export function paintBarrel() {
  const W = 30, H = 42;
  const p = new Painter(W, H, { seed: 43 });
  const cx = W / 2, R = 13.5, END = 11.5;
  const hoops = [[5, 8], [12, 14], [28, 30], [35, 38]];
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    const r = END + (R - END) * Math.sin(v * Math.PI);
    const slope = (R - END) * Math.cos(v * Math.PI) * (Math.PI / H); // dr/dy
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - cx) / r;
      if (Math.abs(dx) > 1) continue;
      const k = 1 - dx * dx;
      if (y < 3 - 2.5 * k || y > H - 1 - 2.5 * k + 2.5) continue;
      const nz = Math.sqrt(k);
      const hoop = hoops.some(([a, b]) => y >= a && y < b);
      p.put(x, y, nz * r + (hoop ? 0.8 : 0), dx, -slope * 2, nz, hoop ? 1 : 0);
    }
  }
  // Stave seams: equal angles around the cylinder.
  p.decal(0, 0, W, H, (x, y) => {
    const v = (y + 0.5) / H;
    const r = END + (R - END) * Math.sin(v * Math.PI);
    const dx = (x + 0.5 - cx) / r;
    if (Math.abs(dx) >= 0.97 || hoops.some(([a, b]) => y >= a && y < b)) return -1;
    const ang = Math.asin(dx) / (Math.PI / 9);
    return Math.abs(ang - Math.round(ang)) < 0.09 ? C.WOOD_D : -1;
  });
  // Bung hole
  p.decal(18, 20, 21, 23, (x, y) => (Math.hypot(x - 19.5, y - 21.5) < 1.3 ? C.SOOT : -1));
  return p.shade([
    { ramp: [C.SOOT, C.WOOD_D, C.WOOD, C.WOOD_L, C.LEATHER], rough: 0.18, outline: C.BLACK },
    { ramp: [C.BLACK, C.STEEL_D, C.STEEL, C.STEEL_M], spec: C.STEEL_L, shine: 0.35, rough: 0.08, outline: C.BLACK },
  ], { name: 'barrel' });
}

// A previous contestant: skull, two long bones, a rib and some bits.
export function paintBones() {
  const W = 44, H = 18;
  const p = new Painter(W, H, { seed: 47 });
  const b = 0;
  // Long bones with knobbly ends
  const longBone = (x0, y0, x1, y1, z) => {
    p.capsule(x0, y0, 1.3, x1, y1, 1.2, b, { z0: z });
    for (const [ex, ey] of [[x0, y0], [x1, y1]]) {
      const nx = (y1 - y0), ny = -(x1 - x0), l = Math.hypot(nx, ny);
      p.ellipse(ex + (nx / l) * 1.1, ey + (ny / l) * 1.1, 1.7, 1.7, b, { z: z + 0.5 });
      p.ellipse(ex - (nx / l) * 1.1, ey - (ny / l) * 1.1, 1.7, 1.7, b, { z: z + 0.5 });
    }
  };
  longBone(3, 15, 22, 11, 2);
  longBone(25, 16, 41, 14, 4);
  // Rib: a curved row of capsules
  for (let k = 0; k < 5; k++) {
    const a0 = Math.PI * (0.12 + k * 0.15), a1 = a0 + Math.PI * 0.15;
    p.capsule(32 + Math.cos(a0) * 8, 14 - Math.sin(a0) * 6, 1.4, 32 + Math.cos(a1) * 8, 14 - Math.sin(a1) * 6, 1.4, b, { z0: 1 });
  }
  // Small bits
  p.ellipse(8, 16, 1.6, 1.1, b, { z: 1 });
  p.ellipse(28, 12, 1.4, 1.2, b, { z: 1 });
  // Skull: cranium, cheek, jaw
  p.ellipse(16, 8, 6.5, 5.6, b, { z: 6, depth: 0.9 });
  p.ellipse(16, 12.5, 4.3, 2.6, b, { z: 9, depth: 0.6 });
  p.ellipse(16, 15.4, 3.2, 1.5, b, { z: 8, depth: 0.5 });
  // Sockets, nose and teeth
  for (const ex of [13.6, 18.4]) {
    p.decal(ex - 2, 8, ex + 2, 12, (x, y) => {
      const d = Math.hypot((x - ex) / 1.6, (y - 10) / 1.4);
      return d < 1 ? (d < 0.55 ? C.BLACK : C.SOOT) : -1;
    });
  }
  p.dot(16, 12, C.SOOT).dot(16, 13, C.BLACK);
  for (let x = 14; x <= 18; x++) p.dot(x, 14, x % 2 ? C.SOOT : C.BONE);
  return p.shade([{ ...M.bone, ramp: [C.GRAVEL_M, C.GRAVEL_L, C.PARCHMENT, C.BONE], outline: C.GRAVEL_D }], { name: 'bones', dither: 0.4 });
}
