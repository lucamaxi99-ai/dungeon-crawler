// Painted objects of the city on story floor 3 (GDD 2.3): what is left on
// the streets. 64 px per wall height, like objects.js.

import { C } from '../engine/palette.js';
import { Painter } from '../engine/paint.js';
import { M, frames, flame, fireMats } from './materials.js';

const FLAME_MATS = [3, 4, 5, 6, 7];

// Oil drum with a fire in it: the street's campfire. 4 frames.
export function paintBurnBarrel() {
  return frames(4, (f) => {
    const W = 28, H = 52;
    const p = new Painter(W, H, { seed: 61 });
    const cx = W / 2, R = 11, TOP = 24;
    for (let y = TOP; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (x + 0.5 - cx) / R;
        if (Math.abs(dx) > 1) continue;
        const k = 1 - dx * dx;
        if (y > H - 1.5 + 1.5 * k) continue;
        const rib = y === 30 || y === 31 || y === 42 || y === 43;
        p.put(x, y, Math.sqrt(k) * R + (rib ? 0.7 : 0), dx, 0, Math.sqrt(k), rib ? 1 : 0);
      }
    }
    p.ellipse(cx, TOP, R, 2.4, 1, { z: 12, depth: 0.3 });       // rim
    p.ellipse(cx, TOP - 0.3, R - 1.5, 1.6, 2, { z: 13, depth: 0.2 }); // embers
    // Rust holes glowing from the fire inside.
    p.decal(4, 32, 24, 50, (x, y) => (((x * 5 + y * 3) % 23 === 0 && y > 34) ? C.FIRE : ((x * 7 + y) % 19 === 0 ? C.SOOT : -1)));
    flame(p, cx, TOP, 9, 24, f * 1.57, FLAME_MATS);
    flame(p, cx - 5, TOP, 4, 11, f * 1.57 + 2, FLAME_MATS);
    flame(p, cx + 5, TOP, 4, 13, f * 1.57 + 4, FLAME_MATS);
    return p.shade([
      { ramp: [C.SOOT, C.WOOD_D, C.RUST, C.STEEL_M], rough: 0.4, outline: C.BLACK },
      { ramp: [C.BLACK, C.SOOT, C.RUST, C.STEEL], rough: 0.2, outline: C.BLACK },
      M.coal, ...fireMats(),
    ], { name: `burnBarrel_${f}` });
  });
}

// A burned-out car, seen from the side: the street's furniture.
export function paintCarWreck() {
  const W = 62, H = 32;
  const p = new Painter(W, H, { seed: 63 });
  const id = { body: 0, rust: 1, tire: 2, glass: 3, chrome: 4 };
  // Lower body and the cabin.
  p.poly([[2, 14], [12, 13], [20, 6], [40, 5], [48, 13], [60, 14], [61, 24], [1, 24]], id.body, { z: 6, normal: [0, -0.15, 1] });
  p.poly([[2, 14], [60, 14], [61, 17], [1, 17]], id.body, { z: 7, normal: [0, -0.7, 0.7] });
  // Window holes (glass is long gone) and a bent door seam.
  p.poly([[21, 8], [29, 7], [29, 13], [16, 13]], id.glass, { z: 7 });
  p.poly([[31, 7], [39, 7], [45, 13], [31, 13]], id.glass, { z: 7 });
  p.line(30, 14, 31, 23, id.rust, { z: 7.5 });
  // Rust patches.
  p.decal(1, 5, 61, 24, (x, y) => ((Math.sin(x * 0.45) + Math.cos(y * 0.9 + x * 0.2) > 1.3) ? C.RUST : ((x * 3 + y * 7) % 29 === 0 ? C.SOOT : -1)));
  // Bumpers.
  p.capsule(0.5, 20, 1.3, 4, 20, 1.3, id.chrome, { z0: 8 });
  p.capsule(58, 20, 1.3, 61.5, 20, 1.3, id.chrome, { z0: 8 });
  // Flat tires on bare rims.
  for (const x of [13, 49]) {
    p.ellipse(x, 25, 6.4, 5.4, id.tire, { z: 9, depth: 0.5 });
    p.ellipse(x, 25, 2.8, 2.6, id.chrome, { z: 11, depth: 0.4 });
  }
  p.erase((x, y) => y > 30);
  // The parking ticket on the windshield (somebody is still writing them).
  p.decal(37, 9, 40, 11, () => C.YELLOW);
  return p.shade([
    { ramp: [C.SOOT, C.NIGHT, C.SHADOW, C.DUSK, C.ASH], rough: 0.35, outline: C.BLACK },
    { ramp: [C.SOOT, C.RUST], outline: C.BLACK },
    M.rubber,
    { ramp: [C.BLACK, C.SOOT], flat: true, noOutline: true },
    { ...M.rust, ramp: [C.SOOT, C.STEEL_D, C.STEEL, C.STEEL_M] },
  ], { name: 'carWreck' });
}

// Fire hydrant, red paint flaking off.
export function paintHydrant() {
  const W = 18, H = 26;
  const p = new Painter(W, H, { seed: 65 });
  p.capsule(9, 9, 4.6, 9, 22, 5, 0, { z0: 4 });          // barrel
  p.ellipse(9, 7, 4.6, 3.6, 0, { z: 6, depth: 0.9 });     // bonnet
  p.capsule(9, 2.5, 1.4, 9, 4.5, 1.6, 1, { z0: 8 });       // nut on top
  p.capsule(2, 13, 2.2, 16, 13, 2.2, 0, { z0: 7 });        // side outlets
  p.ellipse(9, 14, 2.4, 2.4, 1, { z: 12, depth: 0.5 });    // front cap
  p.poly([[2, 22], [16, 22], [17, 25], [1, 25]], 1, { z: 6 }); // flange
  p.decal(4, 4, 15, 22, (x, y) => ((x * 5 + y * 3) % 17 === 0 ? C.RUST : -1));
  return p.shade([M.enamel, M.iron], { name: 'hydrant' });
}

// Dented metal trash can with the lid on crooked.
export function paintTrashCan() {
  const W = 24, H = 32;
  const p = new Painter(W, H, { seed: 67 });
  const cx = 12, R = 9;
  for (let y = 9; y < H; y++) {
    const r = R - (y - 9) * 0.06;
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - cx) / r;
      if (Math.abs(dx) > 1) continue;
      const k = Math.sqrt(1 - dx * dx);
      const groove = (y - 9) % 7 === 3;
      p.put(x, y, k * r - (groove ? 0.6 : 0), dx, groove ? -0.4 : 0, k, 0);
    }
  }
  p.ellipse(cx - 1, 7.5, R + 1.5, 3, 0, { z: 10, depth: 0.25 });   // lid, tipped
  p.capsule(cx - 3, 4, 1, cx + 1, 3.5, 1, 0, { z0: 12 });          // handle
  p.decal(3, 20, 7, 26, (x, y) => (Math.hypot(x - 5, y - 23) < 2 ? C.STEEL_D : -1)); // dent
  // Garbage sticking out.
  p.ellipse(18, 8, 3, 2.2, 1, { z: 9, depth: 0.6 });
  return p.shade([
    { ramp: [C.STEEL_D, C.STEEL, C.STEEL_M, C.STEEL_L], rough: 0.15, outline: C.BLACK },
    M.bag,
  ], { name: 'trashCan' });
}

// Traffic light on a pole, blinking amber forever. 2 frames (on, off).
export function paintTrafficLight() {
  return frames(2, (f) => {
    const W = 16, H = 64;
    const p = new Painter(W, H, { seed: 69 });
    p.capsule(8, 22, 1.6, 8, 62, 1.8, 1, { z0: 3 });             // pole
    p.ellipse(8, 62, 4, 1.4, 1, { z: 4, depth: 0.3 });             // base
    p.poly([[2, 1], [14, 1], [14, 25], [2, 25]], 0, { z: 6 });     // housing
    [6, 14, 22].forEach((y, k) => {
      p.ellipse(8, y, 3.6, 3.6, k === 1 && f === 0 ? 3 : 2, { z: 8, depth: 0.6 });
      p.poly([[3.5, y - 4.5], [12.5, y - 4.5], [11, y - 2.5], [5, y - 2.5]], 0, { z: 10, normal: [0, -0.8, 0.6] }); // visor
    });
    return p.shade([
      { ramp: [C.BLACK, C.SOOT, C.SHADOW, C.DUSK], outline: C.BLACK },
      { ...M.iron, ramp: [C.BLACK, C.STEEL_D, C.STEEL, C.STEEL_M] },
      { ramp: [C.BLACK, C.NIGHT, C.SHADOW], outline: C.BLACK },
      { ramp: [C.AMBER, C.YELLOW, C.HOT], glow: true },
    ], { name: `trafficLight_${f}` });
  });
}

// Chrome diner table with two red stools.
export function paintDinerTable() {
  const W = 50, H = 30;
  const p = new Painter(W, H, { seed: 71 });
  for (const x of [6, 44]) {
    p.capsule(x, 18, 1.2, x, 29, 1.2, 1, { z0: 2 });
    p.ellipse(x, 17, 5, 2.4, 2, { z: 4, depth: 0.5 });              // seat
  }
  p.capsule(25, 10, 1.6, 25, 28, 1.8, 1, { z0: 5 });                // pedestal
  p.ellipse(25, 28.5, 6, 1.4, 1, { z: 6, depth: 0.3 });
  p.ellipse(25, 9, 15, 3.2, 0, { z: 8, depth: 0.35 });              // table top
  p.ellipse(25, 10.6, 15, 1.4, 1, { z: 7, depth: 0.2 });            // chrome edge
  // A ketchup bottle and a mug nobody finished.
  p.capsule(20, 4, 1.4, 20, 7.5, 1.6, 2, { z0: 12 });
  p.capsule(30, 5.5, 1.6, 30, 7.5, 1.6, 3, { z0: 12 });
  return p.shade([
    { ramp: [C.TEAL_D, C.TEAL, C.TEAL_M, C.MINT], spec: C.WHITE, shine: 0.5, outline: C.BLACK },
    M.chrome, M.ruby,
    { ramp: [C.FOG, C.SILVER, C.BONE, C.WHITE], outline: C.ASH },
  ], { name: 'dinerTable' });
}

// Street lamp on a wall bracket (place it with a lift, like a torch).
export function paintStreetLamp() {
  const W = 22, H = 18;
  const p = new Painter(W, H, { seed: 73 });
  p.capsule(19, 3, 1, 8, 4, 1, 0, { z0: 3 });                      // bracket
  p.capsule(19, 3, 1, 19, 12, 1, 0, { z0: 3 });
  p.ellipse(8, 6, 7, 3, 0, { z: 5, depth: 0.4 });                   // hood
  p.ellipse(8, 8.5, 5, 2, 1, { z: 6, depth: 0.5 });                 // bulb
  p.erase((x, y) => y < 3.5 && x < 15);
  return p.shade([M.iron, { ramp: [C.AMBER, C.YELLOW, C.HOT], glow: true }], { name: 'streetLamp' });
}

// Fluorescent tube on the wall, humming.
export function paintFluoTube() {
  const W = 30, H = 6;
  const p = new Painter(W, H, { seed: 75 });
  p.capsule(2, 3, 2, 28, 3, 2, 0, { z0: 2 });
  p.capsule(4, 3, 1.1, 26, 3, 1.1, 1, { z0: 5 });
  return p.shade([M.iron, { ramp: [C.ICE, C.WHITE], glow: true }], { name: 'fluoTube' });
}
