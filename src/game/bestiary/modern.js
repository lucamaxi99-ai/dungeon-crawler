// Non-classic dungeon mobs, front view. The Bad Llama is a nod to the books;
// the rest is everyday stuff from the world above that the dungeon chewed up
// and spat back out with teeth.

import { C } from '../../engine/palette.js';
import { Painter } from '../../engine/paint.js';
import { mats } from '../materials.js';
import { poseFlags, spot, strokes, text } from './common.js';

// ------------------------------------------------------------ bad llama

export function paintLlamaFront(pose = 'idle0', scale = 1) {
  const { list, id } = mats('wool', 'hide', 'rubber');
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 48, G = 61;
  const p = new Painter(W, 62, { seed: 41, scale });
  const cx = W / 2 + flinch;
  const hy = 20 + lunge * 9 - flinch * 2 + b * 0.5;   // head centre
  const hx = cx + flinch * 1.5;
  const k = 1 + lunge * 0.15;                          // head comes closer when spitting

  // Legs: back pair behind, front pair in front; dark hooves.
  for (const s of [-1, 1]) {
    p.capsule(cx + s * 8, 47, 2, cx + s * 8.5, G - 1, 1.4, id.wool, { z0: 0 });
    p.ellipse(cx + s * 8.5, G - 0.5, 1.8, 1, id.rubber, { z: 1 });
  }
  p.ellipse(cx, 44, 12.5, 9 + b * 0.3, id.wool, { z: 4, depth: 0.8 });     // body
  for (const s of [-1, 1]) {
    p.capsule(cx + s * 4.5, 49, 2.3, cx + s * 4.5, G - 1, 1.6, id.wool, { z0: 9 });
    p.ellipse(cx + s * 4.5, G - 0.5, 2, 1.1, id.rubber, { z: 10 });
  }
  // A woven blanket over the back: bright stripes, like the tassels on the ears.
  const BLANKET = [C.MAGENTA, C.GOLD, C.TEAL, C.GOLD, C.MAGENTA];
  p.decal(cx - 13, 36, cx + 13, 47, (x, y) => {
    const u = (x + 0.5 - cx) / 12.5, v = (y + 0.5 - 44) / 9;
    if (u * u + v * v > 0.95 || y > 46 - Math.abs(u) * 4) return -1;
    return BLANKET[Math.floor((y - 36) / 2) % BLANKET.length];
  });

  // Neck up to the head.
  p.capsule(cx, 40, 5.5, hx, hy + 6, 4.3, id.wool, { z0: 8, z1: 11 + lunge * 6 });

  // Banana ears, flat back when it spits or gets hit.
  const back = lunge || flinch ? 1 : 0;
  for (const s of [-1, 1]) {
    const ex = hx + s * 3.5, ey = hy - 4;
    const tip = back ? [hx + s * 11, hy - 6] : [hx + s * 4, hy - 16];
    const mid = back ? [hx + s * 8, hy - 7] : [hx + s * 6, hy - 11];
    p.capsule(ex, ey, 1.8, ...mid, 1.6, id.hide, { z0: 10 });
    p.capsule(...mid, 1.6, ...tip, 1.1, id.hide, { z0: 10 });
    // Tassels hanging from the ear tips.
    const tc = s < 0 ? [C.MAGENTA, C.GOLD] : [C.TEAL, C.MAGENTA];
    p.capsule(tip[0], tip[1] + 1, 0.7, tip[0] + s * 0.5, tip[1] + 4 - b * 0.5, 0.7, id.wool, { z0: 11 });
    spot(p, tip[0] + s * 0.5, tip[1] + 4 - b * 0.5, 1.4, 1.4, tc[0]);
    if (s > 0) {
      // Petting-zoo ear tag.
      p.ellipse(mid[0] + 1, mid[1] + 2, 1.6, 1.4, id.wool, { z: 12 });
      spot(p, mid[0] + 1, mid[1] + 2, 1.5, 1.3, C.YELLOW);
    }
  }
  // Head, fluffy top-knot, long muzzle.
  p.ellipse(hx, hy, 5.5 * k, 6.5 * k, id.hide, { z: 12 + lunge * 6, depth: 0.8 });
  p.ellipse(hx, hy - 6 * k, 4.5 * k, 2.8 * k, id.wool, { z: 14 + lunge * 6, depth: 0.7 });
  p.ellipse(hx, hy + 5 * k, 4 * k, 3.4 * k, id.hide, { z: 16 + lunge * 6, depth: 0.8 });

  // Half-lidded, deeply unimpressed eyes on the sides of the head.
  for (const s of [-1, 1]) {
    const ex = hx + s * 4 * k, ey = hy - 0.5;
    if (flinch) { strokes(p, [[ex - 1.5, ey, ex + 1.5, ey]], C.BLACK, 0.55); continue; }
    spot(p, ex, ey, 1.6, 1.6, C.BLACK);
    p.dot(ex - s * 0.5, ey - 0.5, C.STEEL_L);
    strokes(p, [[ex - 2, ey - 1.3 + (lunge ? s * -0.6 : 0), ex + 2, ey - 1.3 - (lunge ? s * -0.6 : 0)]], C.WOOD_D, 0.5); // heavy lid
  }
  // Nostrils, split lip, underbite.
  const my = hy + 7 * k;
  p.dot(hx - 1.5, hy + 4 * k, C.SOOT).dot(hx + 1.5, hy + 4 * k, C.SOOT);
  if (lunge) {
    spot(p, hx, my, 2.6, 1.8, C.SOOT);
    p.dot(hx - 1, my - 1, C.PARCHMENT).dot(hx + 1, my - 1, C.PARCHMENT);
  } else {
    strokes(p, [[hx - 2.5, my - b * 0.3, hx + 2.5, my + b * 0.3]], C.SOOT, 0.5);
    p.dot(hx - 1, my + 1, C.PARCHMENT).dot(hx, my + 1, C.PARCHMENT);
  }
  // Acid spit flying at you.
  if (lunge) {
    for (const [x, y, r] of [[hx - 2, my + 6, 2.4], [hx + 3, my + 9, 1.8], [hx - 5, my + 11, 1.4], [hx + 1, my + 13, 1.2]]) {
      p.ellipse(x, y, r, r, id.wool, { z: 40 });
      spot(p, x, y, r, r, C.LIME);
      p.dot(x - 0.5, y - 0.5, C.MINT);
    }
  }
  return p.shade(list, { name: `llama_front_${pose}`, glowColors: [C.LIME, C.MINT] });
}

// Side view, facing left: long neck, banana ears, a blanket over the back
// and an expression of total contempt.
export function paintLlamaSide(pose = 'idle0', scale = 1) {
  const { list, id } = mats('wool', 'hide', 'rubber');
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 56, G = 61;
  const p = new Painter(W, 62, { seed: 43, scale });
  const bx = W / 2 + 6 + flinch * 2, by = 40;       // body centre
  // Head position: up high, thrust forward and down to spit, back when hit.
  const hx = bx - 17 - lunge * 6 + flinch * 3, hy = 17 + lunge * 7 + b * 0.5;

  // Far legs (darker by being behind), body, near legs.
  const leg = (x, z, swing) => {
    p.capsule(x, by + 5, 2.2, x + swing, G - 1, 1.4, id.wool, { z0: z });
    p.ellipse(x + swing - 0.5, G - 0.5, 2, 1, id.rubber, { z: z + 1 });
  };
  leg(bx - 8, 0, b ? 1 : -1); leg(bx + 9, 0, b ? -1 : 1);
  p.ellipse(bx + 14, by - 4 + b * 0.5, 3, 4, id.wool, { z: 1, depth: 0.7 });   // fluffy tail
  p.ellipse(bx, by, 14, 8.5 + b * 0.3, id.wool, { z: 4, depth: 0.8 });
  leg(bx - 10, 7, lunge ? -2 : 0); leg(bx + 7, 7, flinch ? 2 : 0);
  // Blanket draped over the back.
  const BLANKET = [C.MAGENTA, C.GOLD, C.TEAL, C.GOLD, C.MAGENTA];
  p.decal(bx - 9, by - 9, bx + 9, by + 4, (x, y) => {
    const u = (x + 0.5 - bx) / 14, v = (y + 0.5 - by) / 8.5;
    if (u * u + v * v > 0.97 || Math.abs(x + 0.5 - bx) > 8 || y > by + 3) return -1;
    return BLANKET[Math.floor((x - bx + 9) / 3) % BLANKET.length];
  });
  // Neck from the shoulders up to the head.
  p.capsule(bx - 10, by - 3, 5, hx + 2, hy + 6, 3.6, id.wool, { z0: 8, z1: 10 });
  // Ears: up like bananas, flat back when it spits or gets hit.
  const back = lunge || flinch ? 1 : 0;
  for (const [dx, z] of [[2.5, 9], [0.5, 14]]) {
    const ex = hx + dx, ey = hy - 4;
    const tip = back ? [ex + 9, ey - 2] : [ex + 2, ey - 11];
    p.capsule(ex, ey, 1.6, tip[0], tip[1], 1, id.hide, { z0: z });
    spot(p, tip[0] + 0.5, tip[1] + 3, 1.3, 1.3, dx > 1 ? C.TEAL : C.MAGENTA);   // tassel
  }
  // Head, top-knot, long muzzle pointing left.
  p.ellipse(hx, hy, 5, 5.5, id.hide, { z: 12, depth: 0.8 });
  p.ellipse(hx + 1, hy - 5, 4, 2.5, id.wool, { z: 13, depth: 0.7 });
  p.capsule(hx - 2, hy + 2, 3.6, hx - 8, hy + 4 + lunge, 2.6, id.hide, { z0: 14 });
  // Eye: half lidded, unimpressed.
  const ex = hx - 1, ey = hy - 1;
  if (flinch) strokes(p, [[ex - 1.5, ey, ex + 1.5, ey]], C.BLACK, 0.55);
  else {
    spot(p, ex, ey, 1.5, 1.5, C.BLACK);
    p.dot(ex - 0.5, ey - 0.5, C.STEEL_L);
    strokes(p, [[ex - 2, ey - 1.2, ex + 2, ey - 1.4]], C.WOOD_D, 0.5);
  }
  p.dot(hx - 9.5, hy + 3 + lunge, C.SOOT);                               // nostril
  const my = hy + 6 + lunge;
  if (lunge) {
    spot(p, hx - 8, my, 2, 1.4, C.SOOT);
    for (const [x, y, r] of [[hx - 13, my + 1, 2.2], [hx - 17, my + 3, 1.6], [hx - 20, my + 6, 1.2]]) {
      p.ellipse(x, y, r, r, id.wool, { z: 40 });
      spot(p, x, y, r, r, C.LIME);
      p.dot(x - 0.5, y - 0.5, C.MINT);
    }
  } else {
    strokes(p, [[hx - 10, my - 1, hx - 5, my - b * 0.3]], C.SOOT, 0.5);
    p.dot(hx - 9, my, C.PARCHMENT);
  }
  return p.shade(list, { name: `llama_${pose}`, glowColors: [C.LIME, C.MINT] });
}

// ------------------------------------------------------------ vendetta machine

const CANS = [C.SKY, C.LIME, C.GOLD, C.NEON, C.MINT];

export function paintVendingFront(pose = 'idle0', scale = 1) {
  const { list, id } = mats('sign', 'tin', 'rubber', 'enamel');
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 44, G = 61;
  const p = new Painter(W, 62, { seed: 51, scale });
  const x0 = 6, x1 = 34, top = 5 - lunge, bot = G - 3;
  // Lean: sheared back when hit, a hop forward when it attacks.
  const sh = (y) => (flinch ? (G - y) * 0.09 : 0);
  const P = (x, y) => [x + sh(y), y];

  // Stubby feet.
  for (const fx of [x0 + 3, x1 - 3]) p.ellipse(fx + sh(G), G - 1, 2.5, 1.5, id.rubber, { z: 0 });
  // Box: front, right side (seen at an angle), top.
  p.poly([P(x0, top), P(x1, top), P(x1, bot), P(x0, bot)], id.sign, { z: 10, normal: [-0.1, -0.05, 1] });
  p.poly([P(x1, top), P(x1 + 5, top - 3), P(x1 + 5, bot - 3), P(x1, bot)], id.sign, { z: 6, normal: [1, -0.1, 0.35] });
  p.poly([P(x0, top), P(x0 + 5, top - 3), P(x1 + 5, top - 3), P(x1, top)], id.sign, { z: 6, normal: [0, -1, 0.5] });

  const inBox = (x, y) => x >= x0 + sh(y) && x < x1 + sh(y) && y >= top && y < bot;
  const at = (x, y) => [x - sh(y), y];   // decal coords -> unsheared box coords

  // Header with the label, the window full of cans, controls, the flap.
  p.decal(x0 - 2, top, x1 + 4, bot, (x, y) => {
    if (!inBox(x, y)) return -1;
    const [u, v] = at(x + 0.5, y + 0.5);
    // Header panel
    if (v < top + 8 && u > x0 + 1.5 && u < x1 - 1.5 && v > top + 1.5) return C.BLACK;
    // Window: lit from inside, rows of cans.
    if (u > x0 + 1.5 && u < x0 + 18 && v > top + 9.5 && v < top + 37) {
      const row = Math.floor((v - top - 10) / 7), ry = (v - top - 10) % 7;
      const col = Math.floor((u - x0 - 2) / 3.2), rx = (u - x0 - 2) % 3.2;
      if (ry > 1.5 && ry < 6 && rx > 0.6 && rx < 2.6) return CANS[(row * 2 + col) % CANS.length];
      if (ry < 1) return C.STEEL_D;            // shelf
      return v < top + 12 ? C.VIOLET : C.NAVY;
    }
    // Control column: coin slot, buttons, a little change cup.
    if (u > x0 + 20 && u < x1 - 2 && v > top + 9.5 && v < top + 37) {
      const cu = u - x0 - 20, cv = v - top - 9.5;
      if (cv < 4) return cu > 1 && cu < 5 ? C.SOOT : C.STEEL;                      // price display
      if (cv > 6 && cv < 22 && (Math.floor(cu) % 3 === 1) && (Math.floor(cv) % 3 === 1)) {
        const n = Math.floor(cu / 3) + Math.floor(cv / 3) * 2;
        return (n + b) % 4 === 0 ? C.HOT : C.AMBER;
      }
      if (cv > 23 && cv < 27 && cu > 2.5 && cu < 3.6) return C.BLACK;           // coin slot
      if (cv > 6 && cv < 27) return C.STEEL_M;
      return -1;
    }
    // Dispenser flap / mouth.
    if (u > x0 + 2 && u < x0 + 19 && v > top + 40 && v < top + 49) {
      const mu = u - x0 - 2, mv = v - top - 40;
      if (!lunge) return mv < 1 ? C.STEEL_L : mv > 8 ? C.SOOT : C.BLACK;
      // Teeth top and bottom, a red throat, a can about to be launched.
      const tooth = (mu % 3.4) / 3.4;
      if (mv < 3 - Math.abs(tooth - 0.5) * 5) return C.BONE;
      if (mv > 6.5 + Math.abs(tooth - 0.5) * 5) return C.BONE;
      if (mu > 7 && mu < 10 && mv > 2 && mv < 7) return C.SKY;
      return C.GORE;
    }
    return -1;
  });
  // Label in the header: SODA, or the machine's mood.
  const label = lunge ? 'NO' : flinch ? 'ERR' : b ? 'SODA' : 'SODA';
  const lx = Math.round((x0 + x1) / 2 - (label.length * 4 - 1) / 2 + sh(top + 4));
  text(p, label, lx, top + 2, lunge ? C.FIRE : C.YELLOW);
  if (b) p.dot(lx + 16, top + 6, C.YELLOW); // blinking cursor
  // Two angry LED eyes in the price display when it attacks.
  if (lunge) {
    p.dot(x0 + 22, top + 10.5, C.FIRE).dot(x0 + 23, top + 11.5, C.FIRE);
    p.dot(x0 + 27, top + 10.5, C.FIRE).dot(x0 + 26, top + 11.5, C.FIRE);
  }
  return p.shade(list, {
    name: `vending_front_${pose}`,
    glowColors: [...CANS, C.VIOLET, C.NAVY, C.HOT, C.AMBER, C.YELLOW, C.FIRE],
  });
}

// ------------------------------------------------------------ feral robo-vac

const TAPE = { ramp: [C.STEEL_D, C.STEEL, C.STEEL_M, C.STEEL_L], rough: 0.25, outline: C.SOOT };

export function paintRoboVacFront(pose = 'idle0', scale = 1) {
  const { list, id } = mats('plastic', 'tin', 'wood', 'rubber', TAPE);
  id.tape = 4;
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 46, G = 27;
  const p = new Painter(W, 28, { seed: 61, scale });
  const cx = W / 2;
  const lift = flinch * 3;                // hops when hit
  const tip = lunge * 2;                  // noses down when it charges
  const by = G - 6 - lift;
  // Side brushes spinning under the front edge.
  for (const s of [-1, 1]) {
    const bx = cx + s * 12, byy = G - 2 - lift;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + (b ? 0.6 : 0) + lunge * 1.2;
      strokes(p, [[bx, byy, bx + Math.cos(a) * 5, byy + Math.sin(a) * 1.6]], C.GRAVEL_M, 0.45);
    }
  }
  p.ellipse(cx, by, 18, 6.5, id.plastic, { z: 2, depth: 0.5 });                // body
  p.ellipse(cx, by - 2.5 - tip * 0.5, 15, 4, id.tin, { z: 4, depth: 0.4 });     // top plate
  p.ellipse(cx, by - 3 - tip * 0.5, 4, 1.6, id.plastic, { z: 7, depth: 0.6 });  // button
  // Bumper band and the status LED strip across the front.
  const led = lunge ? C.RED : flinch ? C.AMBER : C.SKY;
  p.decal(cx - 18, by - 1, cx + 18, by + 6, (x, y) => {
    const u = (x + 0.5 - cx) / 18, v = (y + 0.5 - by) / 6.5;
    if (u * u + v * v > 1) return -1;
    if (Math.abs(y + 0.5 - (by + 1.5)) < 0.6 && Math.abs(u) < 0.55) {
      if (flinch) return (x % 3 === 0) ? C.AMBER : C.SOOT;     // error blink
      return (x + b) % 4 === 0 ? C.WHITE : led;
    }
    return y > by + 3 ? C.SOOT : -1;
  });
  // A steak knife duct-taped to the top, pointing your way.
  const hx = cx + 3, hy = by - 4.5 - tip;
  const kx = cx - 13, ky = by - 12 + tip * 3;
  // Blade: wide at the handle, pointed at the tip, serrated lower edge.
  p.poly([[hx, hy - 1.8], [kx, ky], [hx, hy + 1.4]], id.tin, { z: 12, normal: [0.2, -0.5, 1] });
  strokes(p, [[hx, hy - 1.6, kx + 0.5, ky]], C.WHITE, 0.45);
  for (let t = 0.15; t < 0.9; t += 0.2) p.dot(hx + (kx - hx) * t, hy + 1.2 + (ky - hy - 1) * t, C.STEEL_D);
  p.capsule(hx, hy, 1.4, hx + 9, hy + 2, 1.5, id.wood, { z0: 11 });
  // Two wraps of duct tape over the handle.
  for (const t of [0.2, 0.65]) {
    const tx = hx + 9 * t, ty = hy + 2 * t;
    p.capsule(tx, ty - 2.5, 1.1, tx + 0.5, ty + 2.5, 1.1, id.tape, { z0: 14 });
  }
  return p.shade(list, { name: `robovac_front_${pose}`, glowColors: [C.SKY, C.RED, C.AMBER, C.WHITE] });
}

// Side view, facing left: a flat puck on two little wheels, the taped
// knife sticking out ahead like a lance.
export function paintRoboVacSide(pose = 'idle0', scale = 1) {
  const { list, id } = mats('plastic', 'tin', 'wood', 'rubber', TAPE);
  id.tape = 4;
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 50, G = 27;
  const p = new Painter(W, 28, { seed: 62, scale });
  const cx = W / 2 + 4 - lunge * 4 + flinch * 2;
  const lift = flinch * 3;
  const tilt = lunge * 0.08 - flinch * 0.06;   // noses down to charge, rears when hit
  const by = G - 6 - lift;
  // Wheels and the spinning side brush at the front.
  for (const wx of [cx - 9, cx + 10]) p.ellipse(wx, G - 2 - lift, 2.4, 2.2, id.rubber, { z: 1 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + (b ? 0.7 : 0) + lunge * 1.2;
    strokes(p, [[cx - 15, G - 2 - lift, cx - 15 + Math.cos(a) * 5, G - 2 - lift + Math.sin(a) * 1.3]], C.GRAVEL_M, 0.45);
  }
  // Body: a short wide cylinder seen from the side, top plate on it.
  p.poly([[cx - 18, by - 3 + 18 * tilt], [cx + 18, by - 3 - 18 * tilt], [cx + 18, by + 3 - 18 * tilt], [cx - 18, by + 3 + 18 * tilt]], id.plastic, { z: 2, normal: [0, 0.1, 1] });
  p.ellipse(cx - 18, by + 18 * tilt, 2.2, 3, id.plastic, { z: 3 });
  p.ellipse(cx + 18, by - 18 * tilt, 2.2, 3, id.plastic, { z: 1 });
  p.poly([[cx - 16, by - 4.5 + 16 * tilt], [cx + 16, by - 4.5 - 16 * tilt], [cx + 16, by - 3 - 16 * tilt], [cx - 16, by - 3 + 16 * tilt]], id.tin, { z: 4, normal: [0, -0.8, 0.6] });
  p.ellipse(cx + 2, by - 5.2, 3, 1, id.plastic, { z: 6, depth: 0.6 });
  // LED strip along the front quarter, bumper shadow below.
  const led = lunge ? C.RED : flinch ? C.AMBER : C.SKY;
  p.decal(cx - 20, by - 1, cx - 6, by + 2, (x, y) => (Math.abs(y + 0.5 - (by + 0.5 + (cx - x) * tilt)) < 0.6 ? (flinch ? (x % 3 === 0 ? C.AMBER : C.SOOT) : (x + b) % 4 === 0 ? C.WHITE : led) : -1));
  p.decal(cx - 18, by + 2, cx + 18, by + 4, (x, y) => (y >= by + 2.2 ? C.SOOT : -1));
  // The knife, taped on top, pointing ahead.
  const hx = cx - 2, hy = by - 6 + tilt * 2;
  const kx = cx - 23 - lunge * 2, ky = by - 7 + lunge * 3;
  p.poly([[hx, hy - 1.6], [kx, ky], [hx, hy + 1.2]], id.tin, { z: 12, normal: [0.2, -0.5, 1] });
  strokes(p, [[hx, hy - 1.4, kx + 0.5, ky]], C.WHITE, 0.45);
  for (let t = 0.15; t < 0.9; t += 0.2) p.dot(hx + (kx - hx) * t, hy + 1.1 + (ky - hy - 1) * t, C.STEEL_D);
  p.capsule(hx, hy, 1.4, hx + 9, hy + 1, 1.5, id.wood, { z0: 11 });
  for (const t of [0.2, 0.65]) p.capsule(hx + 9 * t, hy - 2.3, 1.1, hx + 9 * t + 0.4, hy + 2.6, 1.1, id.tape, { z0: 14 });
  return p.shade(list, { name: `robovac_${pose}`, glowColors: [C.SKY, C.RED, C.AMBER, C.WHITE] });
}

// ------------------------------------------------------------ cart mimic

const TONGUE = { ramp: [C.GORE, C.WINE, C.MAGENTA, C.NEON], spec: C.SKIN_L, shine: 0.5, outline: C.BLACK };

export function paintCartFront(pose = 'idle0', scale = 1) {
  const { list, id } = mats('chrome', 'rubber', 'nylonRed', TONGUE);
  id.pink = 3;
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 56, G = 47;
  const p = new Painter(W, 48, { seed: 71, scale });
  const cx = W / 2;
  const sh = (y) => (flinch ? (G - y) * 0.08 : 0);
  const rim = 12 - lunge * 4;       // the upper jaw lifts when it bites
  const jaw = 26;                   // where the front panel folds
  // Handle bar at the back (red plastic), visible above the basket.
  p.capsule(cx - 17 + sh(6), 6 - lunge, 1.6, cx + 17 + sh(6), 6 - lunge, 1.6, id.nylonRed, { z0: -6 });
  for (const s of [-1, 1]) p.capsule(cx + s * 17 + sh(6), 6, 0.8, cx + s * 19 + sh(rim), rim, 0.8, id.chrome, { z0: -5 });
  // Wheels: back pair (narrow), front pair; one of them wobbles.
  for (const s of [-1, 1]) p.ellipse(cx + s * 12 + sh(G), G - 3, 2, 2, id.rubber, { z: -3 });
  for (const s of [-1, 1]) {
    const wob = s > 0 && b ? 1 : 0;
    p.ellipse(cx + s * 17 + wob + sh(G), G - 2.5, 2.4 - wob * 0.6, 2.4, id.rubber, { z: 8 });
    p.capsule(cx + s * 15 + sh(36), 36, 0.8, cx + s * 17 + sh(G - 5), G - 5, 0.8, id.chrome, { z0: 7 });
  }
  p.capsule(cx - 16 + sh(40), 40, 0.8, cx + 16 + sh(40), 40, 0.8, id.chrome, { z0: 6 });     // bottom tray
  // Basket: dark inside (that is where the mimic lives), wire mesh in front.
  const L = (y) => cx - 21 + (y - rim) * (5 / (36 - rim)) + sh(y);
  const R = (y) => cx + 21 - (y - rim) * (5 / (36 - rim)) + sh(y);
  p.poly([[L(rim), rim], [R(rim), rim], [R(36), 36], [L(36), 36]], id.rubber, { z: 2, normal: [0, 0, 1] });
  // Glowing eyes deep inside.
  if (!flinch) {
    for (const s of [-1, 1]) {
      const ex = cx + s * 6 + sh(20), ey = 19 - lunge * 2;
      spot(p, ex, ey, 2.8, 2 + b * 0.3, C.AMBER);
      spot(p, ex, ey, 2, 1.4 + b * 0.3, C.YELLOW);
      p.dot(ex, ey, C.BLACK).dot(ex, ey - 1, C.BLACK);
    }
  } else {
    for (const s of [-1, 1]) strokes(p, [[cx + s * 6 - 2 + sh(20), 19, cx + s * 6 + 2 + sh(20), 19]], C.AMBER, 0.5);
  }
  // Mesh: verticals and horizontals; teeth hang from the rim.
  p.decal(cx - 23, rim, cx + 23, 36, (x, y) => {
    const u = x + 0.5, v = y + 0.5;
    if (u < L(v) || u > R(v)) return -1;
    const f = (u - L(v)) / (R(v) - L(v));
    const vert = Math.abs((f * 13) % 1 - 0.5) > 0.4;
    const hor = (Math.floor(v) - rim) % 4 === 3;
    // Teeth: triangles off the rim, and up from the fold when biting.
    const tf = (f * 9) % 1;
    if (v - rim < 4 + lunge * 2 - Math.abs(tf - 0.5) * 8) return C.BONE;
    if (lunge && v > jaw - 3 + Math.abs(tf - 0.5) * 8 && v < jaw + 1) return C.BONE;
    if (vert || hor) return C.STEEL_M;
    return -1;
  });
  p.capsule(L(rim) - 0.5, rim, 1.3, R(rim) + 0.5, rim, 1.3, id.chrome, { z0: 9 });              // rim
  p.capsule(L(36), 36, 1, R(36), 36, 1, id.chrome, { z0: 8 });
  for (const s of [-1, 1]) p.capsule(s < 0 ? L(rim) : R(rim), rim, 1, s < 0 ? L(36) : R(36), 36, 1, id.chrome, { z0: 8 });
  // Tongue hanging over the front, lashing out when it bites.
  const tx0 = cx + 4 + sh(jaw), ty0 = jaw - 2;
  const tx1 = lunge ? cx - 2 : cx + 6 + b, ty1 = lunge ? 44 : 38 + b;
  p.capsule(tx0, ty0, 2.4, (tx0 + tx1) / 2 + 2, (ty0 + ty1) / 2, 2.2, id.pink, { z0: 12, z1: 14 + lunge * 8 });
  p.capsule((tx0 + tx1) / 2 + 2, (ty0 + ty1) / 2, 2.2, tx1, ty1, 1.8, id.pink, { z0: 14 + lunge * 8, z1: 16 + lunge * 10 });
  strokes(p, [[tx0, ty0 + 1, tx1, ty1 - 1]], C.GORE, 0.4);
  return p.shade(list, { name: `cart_front_${pose}`, glowColors: [C.YELLOW, C.AMBER] });
}

// Side view, facing left (the front of the cart is the mouth). Pose
// 'disguise' is the same cart with its mouth shut and eyes closed: just a
// shopping cart someone left in a dungeon. Nothing to worry about.
export function paintCartSide(pose = 'idle0', scale = 1) {
  const { list, id } = mats('chrome', 'rubber', 'nylonRed', TONGUE);
  id.pink = 3;
  const hide = pose === 'disguise';
  const { b, lunge, flinch } = poseFlags(hide ? 'idle0' : pose);
  const W = 58, G = 47;
  const p = new Painter(W, 48, { seed: 72, scale });
  const cx = W / 2 + 2 - lunge * 3 + flinch * 2;
  const rim = 12, bot = 34;
  const open = hide ? 0 : 3 + lunge * 6 - flinch * 2; // how far the front lid gapes
  // Basket outline: front (left) slopes in toward the bottom.
  const X0 = (y) => cx - 20 + (y - rim) * 0.35, X1 = cx + 14;
  // Handle at the back, frame down to the wheels.
  p.capsule(X1, rim, 0.8, X1 + 6, 7 - b * 0.3, 0.8, id.chrome, { z0: 3 });
  p.capsule(X1 + 6, 7 - b * 0.3, 1.6, X1 + 7, 4 - b * 0.3, 1.6, id.nylonRed, { z0: 4 });
  p.capsule(X1, bot, 0.8, X1 + 2, G - 4, 0.8, id.chrome, { z0: 3 });
  p.capsule(X0(bot) + 2, bot, 0.8, X0(bot), G - 4, 0.8, id.chrome, { z0: 3 });
  p.capsule(X0(bot) + 1, 40, 0.8, X1 + 1, 40, 0.8, id.chrome, { z0: 3 });   // bottom tray
  const wob = b && !hide ? 1 : 0;
  p.ellipse(X0(bot) - 0.5 + wob, G - 2.5, 2.4 - wob * 0.6, 2.4, id.rubber, { z: 6 });
  p.ellipse(X1 + 2, G - 2.5, 2.4, 2.4, id.rubber, { z: 6 });
  // Dark inside, then the mesh side panel.
  p.poly([[X0(rim) - open, rim - open * 0.6], [X1, rim], [X1, bot], [X0(bot), bot]], id.rubber, { z: 1, normal: [0, 0, 1] });
  if (!hide) {
    // Eyes glowing in the dark at the front end.
    const ex = X0(rim) + 6 - lunge * 2, ey = rim + 6 - lunge;
    if (flinch) strokes(p, [[ex - 2, ey, ex + 2, ey]], C.AMBER, 0.5);
    else {
      spot(p, ex, ey, 2.6, 1.9 + b * 0.3, C.AMBER);
      spot(p, ex, ey, 1.8, 1.3 + b * 0.3, C.YELLOW);
      p.dot(ex - 1, ey, C.BLACK).dot(ex - 1, ey - 1, C.BLACK);
    }
  }
  p.decal(X0(rim) - 10, rim - 8, X1 + 1, bot, (x, y) => {
    const u = x + 0.5, v = y + 0.5;
    if (v < rim || u < X0(v) || u > X1) return -1;
    // Teeth along the upper rim and up from the lower jaw at the front.
    const tf = ((u - X0(v)) / 3) % 1;
    if (!hide && u < X0(v) + 14 && v - rim < 3 + lunge - Math.abs(tf - 0.5) * 6) return C.BONE;
    const vert = Math.abs(((u - X0(v)) / 3) % 1 - 0.5) > 0.36;
    const hor = (Math.floor(v) - rim) % 4 === 3;
    return vert || hor ? C.STEEL_M : -1;
  });
  // Rim, with the front lid lifted like an upper jaw.
  p.capsule(X0(rim) - open, rim - open * 0.6, 1.2, X0(rim) + 12, rim, 1.2, id.chrome, { z0: 8 });
  p.capsule(X0(rim) + 12, rim, 1.2, X1, rim, 1.2, id.chrome, { z0: 8 });
  p.capsule(X0(bot), bot, 1, X1, bot, 1, id.chrome, { z0: 8 });
  p.capsule(X0(rim), rim, 1, X0(bot), bot, 1, id.chrome, { z0: 8 });
  p.capsule(X1, rim, 1, X1, bot, 1, id.chrome, { z0: 8 });
  if (!hide) {
    // Tongue lolling out of the front.
    const tx0 = X0(rim) + 2, ty0 = rim + 2;
    const tx1 = lunge ? tx0 - 14 : tx0 - 5 - b, ty1 = lunge ? rim + 6 : rim + 12 + b;
    p.capsule(tx0, ty0, 2.2, (tx0 + tx1) / 2, (ty0 + ty1) / 2 + 1, 2, id.pink, { z0: 12 });
    p.capsule((tx0 + tx1) / 2, (ty0 + ty1) / 2 + 1, 2, tx1, ty1, 1.6, id.pink, { z0: 13 });
  }
  return p.shade(list, { name: `cart_${pose}`, glowColors: hide ? [] : [C.YELLOW, C.AMBER] });
}

// ------------------------------------------------------------ wacky waving wailer

export function paintTubeFront(pose = 'idle0', scale = 1) {
  const { list, id } = mats('nylonRed', 'nylonGold', 'plastic');
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 56, G = 63;
  const p = new Painter(W, 64, { seed: 81, scale });
  const cx = W / 2;
  // Blower at the bottom.
  p.poly([[cx - 8, G - 7], [cx + 8, G - 7], [cx + 8, G], [cx - 8, G]], id.plastic, { z: 0, normal: [0, 0, 1] });
  p.decal(cx - 8, G - 7, cx + 8, G, (x, y) => ((x % 2 === 0 && y > G - 6 && y < G - 1) ? C.SOOT : -1));
  // The tube: a wobbling column. Hit: it folds over sideways.
  const phase = b ? 1.4 : 0;
  const bend = flinch ? 14 : 0;
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = cx + Math.sin(t * 3.6 + phase) * 3.5 * t + bend * t * t + (lunge ? -2 * t : 0);
    const y = G - 7 - t * (44 - flinch * 10) + (lunge ? t * t * 4 : 0);
    pts.push([x, y]);
  }
  for (let i = 0; i < 12; i++) {
    const r = 5 - i * 0.05 + (lunge && i > 8 ? 1 : 0);
    p.capsule(...pts[i], r, ...pts[i + 1], r, id.nylonRed, { z0: 4 + i * (lunge ? 1.5 : 0.2), z1: 4 + (i + 1) * (lunge ? 1.5 : 0.2) });
  }
  // A gold band at the waist.
  const [wx, wy] = pts[4];
  p.capsule(wx - 5.2, wy, 1.2, wx + 5.2, wy, 1.2, id.nylonGold, { z0: 10 });
  // Arms flailing from the shoulders.
  const [sx, sy] = pts[8];
  const armSets = {
    idle0: [[[-1, -0.6], [-0.4, -1.2]], [[1, 0.3], [0.7, 1]]],
    idle1: [[[-1, 0.4], [-0.6, 1]], [[1, -0.7], [0.3, -1.2]]],
    lunge: [[[-0.8, 0.3], [-0.2, 0.7]], [[0.8, 0.3], [0.2, 0.7]]],
    flinch: [[[-0.6, 0.9], [0, 1]], [[0.9, 0.6], [0.4, 1]]],
  }[pose];
  armSets.forEach(([a, c], i) => {
    const s = i ? 1 : -1;
    const e = [sx + s * 2 + a[0] * 8, sy + a[1] * 8];
    const h = [e[0] + c[0] * 8, e[1] + c[1] * 8];
    const z = lunge ? 30 : 6;
    p.capsule(sx + s * 3, sy, 2.4, ...e, 2.2, id.nylonRed, { z0: z, z1: z + (lunge ? 4 : 0) });
    p.capsule(...e, 2.2, ...h, 1.8, id.nylonRed, { z0: z + (lunge ? 4 : 0), z1: z + (lunge ? 8 : 0) });
  });
  // Head: top of the tube with a printed face and a fringe of "hair".
  const [hx, hy] = pts[12];
  p.ellipse(hx, hy, 5.6, 5, id.nylonRed, { z: 8 + (lunge ? 18 : 0), depth: 0.8 });
  for (let i = -3; i <= 3; i++) {
    const a = -Math.PI / 2 + i * 0.32 + (b ? 0.15 : -0.1);
    p.capsule(hx + i * 1.4, hy - 3.5, 0.9, hx + i * 1.4 + Math.cos(a) * 5, hy - 3.5 + Math.sin(a) * 5, 0.6, id.nylonGold, { z0: 9 + (lunge ? 18 : 0) });
  }
  // Face: wide eyes, mouth open in an eternal scream.
  for (const s of [-1, 1]) {
    const ex = hx + s * 2.4;
    if (flinch) { strokes(p, [[ex - 1.2, hy - 1.5, ex + 1.2, hy - 0.5]], C.BLACK, 0.5); continue; }
    spot(p, ex, hy - 1, 1.5, 1.8, C.WHITE);
    p.dot(ex - s * 0.4, hy - 0.6, C.BLACK);
  }
  spot(p, hx, hy + 2.5, 1.8, 1.4 + lunge * 0.6, C.BLACK);
  return p.shade(list, { name: `tube_front_${pose}` });
}

// ------------------------------------------------------------ trash panda

export function paintRaccoonFront(pose = 'idle0', scale = 1) {
  const LIGHT_FUR = { ramp: [C.GRAVEL_M, C.GRAVEL_L, C.PARCHMENT, C.BONE], rough: 0.2, outline: C.SOOT };
  const DARK_FUR = { ramp: [C.BLACK, C.SOOT, C.GRAVEL_D, C.GRAVEL], rough: 0.25, outline: C.BLACK };
  const { list, id } = mats('fur', LIGHT_FUR, DARK_FUR, 'bag');
  const light = 1, dark = 2;
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 50, G = 45;
  const p = new Painter(W, 46, { seed: 91, scale });
  const cx = W / 2 - 2;
  const hy = 15 + lunge * 3 - flinch * 1 + b * 0.4;
  // Ringed tail curling out to the right, behind everything.
  let tx = cx + 7, ty = G - 6;
  for (let i = 0; i < 8; i++) {
    const nx = tx + 2, ny = ty - 2 - Math.sin(i * 0.7 + b) * 0.8;
    p.capsule(tx, ty, 3 - i * 0.1, nx, ny, 3 - (i + 1) * 0.1, i % 2 ? dark : id.fur, { z0: -2 });
    tx = nx; ty = ny;
  }
  // Loot: a bulging trash bag slung over the left shoulder.
  p.ellipse(cx - 11, 22, 7.5, 8.5, id.bag, { z: -1, depth: 0.9 });
  p.capsule(cx - 8, 14, 1, cx - 6, 11, 1.2, id.bag, { z0: 0 });
  // Hind legs and feet, body, light belly.
  for (const s of [-1, 1]) {
    p.ellipse(cx + s * 5, G - 4, 3.5, 4, id.fur, { z: 3 });
    p.ellipse(cx + s * 6, G - 1, 3, 1.4, dark, { z: 5 });
  }
  p.ellipse(cx, 31, 9, 10.5 + b * 0.3, id.fur, { z: 4, depth: 0.8 });
  p.ellipse(cx, 33, 5.5, 7, light, { z: 7, depth: 0.6 });
  // Arms: one holds the bag, the other raised with tiny black hands.
  p.capsule(cx - 7, 24, 2, cx - 9, 16, 1.6, id.fur, { z0: 9 });
  p.ellipse(cx - 8.5, 15, 1.8, 1.6, dark, { z: 10 });
  const hand = lunge ? [cx + 5, 26] : flinch ? [cx + 4, 18] : [cx + 9, 30];
  p.capsule(cx + 7, 24, 2, ...hand, 1.6, id.fur, { z0: 9, z1: lunge ? 22 : 10 });
  p.ellipse(...hand, 2, 1.8, dark, { z: lunge ? 23 : 11 });
  if (lunge) {
    p.capsule(cx - 7, 24, 2, cx - 4, 26, 1.6, id.fur, { z0: 14, z1: 22 });
    p.ellipse(cx - 4, 26, 2, 1.8, dark, { z: 23 });
  }
  // Head: round, fluffy cheeks, rounded ears with pale rims.
  const ear = flinch ? 2 : 0;
  for (const s of [-1, 1]) {
    p.ellipse(cx + s * (6 + ear), hy - 6 + ear, 3, 3.2, light, { z: 8 });
    p.ellipse(cx + s * (6 + ear), hy - 5.6 + ear, 2, 2.2, dark, { z: 9 });
  }
  p.ellipse(cx, hy, 8.5, 7, id.fur, { z: 10, depth: 0.85 });
  p.ellipse(cx, hy + 0.5, 7, 5, light, { z: 11, depth: 0.6 });        // pale face plate
  for (const s of [-1, 1]) p.ellipse(cx + s * 6.5, hy + 2.5, 3.2, 2.8, light, { z: 12, depth: 0.6 });
  p.ellipse(cx, hy + 3, 3.4, 2.8, light, { z: 14, depth: 0.8 });     // muzzle
  p.decal(cx - 2, hy - 7, cx + 2, hy - 2, (x, y) => (Math.abs(x + 0.5 - cx) < 0.9 ? C.GRAVEL : -1)); // dark stripe up the forehead
  // The bandit mask, white brows, glowing eyes, black nose.
  p.decal(cx - 9, hy - 3, cx + 9, hy + 2, (x, y) => {
    const u = x + 0.5 - cx, v = y + 0.5 - hy;
    const band = Math.abs(v - 0.2 + Math.abs(u) * 0.12) < 1.8 && Math.abs(u) < 7.5 && Math.abs(u) > 0.8;
    if (!band) return -1;
    return C.BLACK;
  });
  for (const s of [-1, 1]) {
    const ex = cx + s * 3.6, ey = hy;
    strokes(p, [[ex - 2, ey - 2.5, ex + 1.5, ey - 2.2]], C.BONE, 0.5);
    if (flinch) { strokes(p, [[ex - 1, ey, ex + 1, ey]], C.GRAVEL, 0.5); continue; }
    p.dot(ex, ey, C.AMBER).dot(ex - s, ey, C.YELLOW);
  }
  spot(p, cx, hy + 1.8, 1.4, 1, C.BLACK);
  if (lunge) {
    spot(p, cx, hy + 4.5, 2, 1.3, C.GORE);
    p.dot(cx - 1, hy + 3.6, C.BONE).dot(cx + 1, hy + 3.6, C.BONE);
  } else {
    strokes(p, [[cx - 1.5, hy + 4, cx, hy + 3.4], [cx, hy + 3.4, cx + 1.5, hy + 4]], C.SOOT, 0.45);
  }
  // A banana peel sticking out of the bag.
  strokes(p, [[cx - 13, 16, cx - 12, 14], [cx - 13, 16, cx - 15, 14.5]], C.YELLOW, 0.6);
  return p.shade(list, { name: `raccoon_front_${pose}`, glowColors: [C.AMBER, C.YELLOW] });
}

// Side view, facing left: upright on its hind legs, snout and mask first,
// the loot bag on its back and the ringed tail behind.
export function paintRaccoonSide(pose = 'idle0', scale = 1) {
  const LIGHT_FUR = { ramp: [C.GRAVEL_M, C.GRAVEL_L, C.PARCHMENT, C.BONE], rough: 0.2, outline: C.SOOT };
  const DARK_FUR = { ramp: [C.BLACK, C.SOOT, C.GRAVEL_D, C.GRAVEL], rough: 0.25, outline: C.BLACK };
  const { list, id } = mats('fur', LIGHT_FUR, DARK_FUR, 'bag');
  const light = 1, dark = 2;
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 50, G = 45;
  const p = new Painter(W, 46, { seed: 93, scale });
  const cx = W / 2 + 1 - lunge * 3 + flinch * 2;
  const hx = cx - 4 - lunge * 3 + flinch, hy = 15 + lunge * 3 - flinch + b * 0.4;
  // Tail behind, rings alternating.
  let tx = cx + 5, ty = G - 6;
  for (let i = 0; i < 8; i++) {
    const nx = tx + 2.1, ny = ty - 1.5 - Math.sin(i * 0.7 + b) * 0.8;
    p.capsule(tx, ty, 3 - i * 0.1, nx, ny, 3 - (i + 1) * 0.1, i % 2 ? dark : id.fur, { z0: -2 });
    tx = nx; ty = ny;
  }
  // Loot bag on its back.
  p.ellipse(cx + 8, 24, 7, 8.5, id.bag, { z: -1, depth: 0.9 });
  p.capsule(cx + 6, 15, 1, cx + 3, 13, 1.2, id.bag, { z0: 0 });
  strokes(p, [[cx + 9, 16, cx + 10, 13.5], [cx + 9, 16, cx + 12, 14.5]], C.YELLOW, 0.6);
  // Legs and feet, body, belly.
  p.ellipse(cx + 2, G - 4, 4, 4.5, id.fur, { z: 2 });
  p.ellipse(cx - 1, G - 1, 3.4, 1.4, dark, { z: 4 });
  p.ellipse(cx + 3, G - 1, 3, 1.3, dark, { z: 1 });
  p.ellipse(cx, 31, 8, 10.5 + b * 0.3, id.fur, { z: 4, depth: 0.8 });
  p.ellipse(cx - 4, 33, 3.5, 7, light, { z: 6, depth: 0.6 });
  // Head: snout pointing left, ear on top, pale cheek.
  p.ellipse(hx + 4, hy - 6 + flinch, 3, 3.2, light, { z: 8 });
  p.ellipse(hx + 4, hy - 5.6 + flinch, 2, 2.2, dark, { z: 9 });
  p.ellipse(hx, hy, 7, 6.5, id.fur, { z: 10, depth: 0.85 });
  p.ellipse(hx - 1, hy + 2, 5, 4, light, { z: 11, depth: 0.6 });
  p.capsule(hx - 3, hy + 2, 3, hx - 9, hy + 3.5, 1.6, light, { z0: 13 });
  spot(p, hx - 9.5, hy + 3, 1.2, 1, C.BLACK);
  // Mask band across the eye.
  p.decal(hx - 7, hy - 3, hx + 5, hy + 2, (x, y) => (Math.abs(y + 0.5 - hy + 0.3 - (x + 0.5 - hx) * 0.15) < 1.7 && x + 0.5 > hx - 6 && x + 0.5 < hx + 4 ? C.BLACK : -1));
  strokes(p, [[hx - 5, hy - 2.6, hx - 1.5, hy - 2.4]], C.BONE, 0.5);
  if (flinch) strokes(p, [[hx - 4, hy, hx - 2, hy]], C.GRAVEL, 0.5);
  else p.dot(hx - 3, hy, C.YELLOW).dot(hx - 2, hy, C.AMBER);
  if (lunge) { spot(p, hx - 7, hy + 5, 1.8, 1.2, C.GORE); p.dot(hx - 8, hy + 4, C.BONE); }
  // Grabby arm: reaching out to snatch.
  const hand = lunge ? [cx - 15, 24] : flinch ? [cx - 4, 19] : [cx - 6, 30];
  p.capsule(cx - 2, 24, 2, ...hand, 1.6, id.fur, { z0: 16 });
  p.ellipse(...hand, 2, 1.8, dark, { z: 17 });
  return p.shade(list, { name: `raccoon_${pose}`, glowColors: [C.AMBER, C.YELLOW] });
}

// ------------------------------------------------------------ lawn gnome

// kit 'captain': colours swapped (red coat, blue hat) and a medal for
// services to property values.
function gnomeMats(kit) {
  const m = mats('ceramicSkin', 'ceramicRed', 'ceramicBlue', 'beard', 'rubber', 'wood', 'tin', 'leather', 'gold');
  if (kit === 'captain') [m.id.ceramicRed, m.id.ceramicBlue] = [m.id.ceramicBlue, m.id.ceramicRed];
  return m;
}

export function paintGnomeFront(pose = 'idle0', scale = 1, kit = 'militia') {
  const { list, id } = gnomeMats(kit);
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 34, G = 39;
  const p = new Painter(W, 40, { seed: 101, scale });
  const cx = W / 2 - 1;
  const hy = 18 + lunge * 1.5 + b * 0.3;
  // Boots, little legs, round blue coat, belt.
  for (const s of [-1, 1]) p.ellipse(cx + s * 3.5, G - 1.5, 3, 1.8, id.rubber, { z: 4 });
  p.ellipse(cx, 30, 7.5, 7.5, id.ceramicBlue, { z: 3, depth: 0.85 });
  p.capsule(cx - 7, 32, 1.1, cx + 7, 32, 1.1, id.leather, { z0: 9 });
  spot(p, cx, 32, 1.2, 1, C.GOLD);
  // Pickaxe: on the shoulder, or swung overhead.
  if (lunge) {
    p.capsule(cx + 6, 27, 0.9, cx - 2, 5, 0.9, id.wood, { z0: 18 });
    p.capsule(cx - 8, 7, 1, cx + 4, 3, 0.8, id.tin, { z0: 19 });
  } else {
    p.capsule(cx + 7, 30, 0.9, cx + 12, 13, 0.9, id.wood, { z0: 12 });
    p.capsule(cx + 8, 11, 0.8, cx + 16, 15, 1, id.tin, { z0: 13 });
  }
  p.ellipse(cx + 7, 28 - lunge * 2, 2, 1.8, id.ceramicSkin, { z: 15 });          // hand
  // Big white beard over the chest, face, round nose.
  p.ellipse(cx, hy + 6, 5.5, 6.5, id.beard, { z: 10, depth: 0.7 });
  p.ellipse(cx, hy, 4.8, 3.6, id.ceramicSkin, { z: 9, depth: 0.8 });
  p.ellipse(cx, hy + 1.2, 1.7, 1.5, id.ceramicSkin, { z: 14 });
  for (const s of [-1, 1]) p.ellipse(cx + s * 2.8, hy + 2.6, 2.2, 1.2, id.beard, { z: 13 });   // moustache
  // Pointy hat: stacked rings so it shades round and glossy.
  const bend = b ? 0.6 : flinch ? -1.5 : 0;
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    p.ellipse(cx + bend * t * t * 3, hy - 3 - t * 12, 5.6 * (1 - t) + 0.6, 1.8, id.ceramicRed, { z: 10 + t * 2, depth: 0.9 });
  }
  // Eyes under bushy brows; furious.
  for (const s of [-1, 1]) {
    const ex = cx + s * 2.2;
    if (!flinch) p.dot(ex, hy - 0.5, C.BLACK);
    strokes(p, [[ex - s * 1.6, hy - 2.4, ex + s * 1.2, hy - 1.6]], C.WHITE, 0.55);
  }
  p.dot(cx - 0.5, hy + 0.5, C.SKIN_D);
  if (kit === 'captain') { p.ellipse(cx - 4, 27, 1.6, 1.6, id.gold, { z: 16 }); p.dot(cx - 4, 25, C.RED).dot(cx - 4, 24, C.RED); }
  // Hit: the glaze cracks and a chip flies off the hat.
  if (flinch) {
    strokes(p, [[cx - 3, hy - 6, cx - 1, hy - 2], [cx - 1, hy - 2, cx - 2, hy + 1], [cx + 2, hy - 9, cx + 3, hy - 5]], C.SOOT, 0.45);
    p.erase((x, y) => x >= cx + 2 && x <= cx + 4 && y >= hy - 13 && y <= hy - 11);
  }
  return p.shade(list, { name: `gnome_${kit}_front_${pose}`, dither: 0.35 });
}

// Side view, facing left: hat leaning back, nose and beard first, pickaxe
// over the shoulder.
export function paintGnomeSide(pose = 'idle0', scale = 1, kit = 'militia') {
  const { list, id } = gnomeMats(kit);
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 36, G = 39;
  const p = new Painter(W, 40, { seed: 103, scale });
  const cx = W / 2 + 1 - lunge * 2 + flinch;
  const hx = cx - 1 - lunge, hy = 18 + lunge * 1.5 + b * 0.3;
  // Pickaxe behind (on the shoulder) or swung down in front.
  if (!lunge) {
    p.capsule(cx + 1, 29, 0.9, cx + 8, 12, 0.9, id.wood, { z0: 1 });
    p.capsule(cx + 4, 10, 0.8, cx + 12, 14, 1, id.tin, { z0: 2 });
  }
  // Boots, coat, belt.
  p.ellipse(cx - 2, G - 1.5, 3.5, 1.8, id.rubber, { z: 4 });
  p.ellipse(cx + 2, G - 1.6, 3, 1.6, id.rubber, { z: 3 });
  p.ellipse(cx, 30, 6.5, 7.5, id.ceramicBlue, { z: 5, depth: 0.85 });
  p.capsule(cx - 6, 32, 1.1, cx + 6, 32, 1.1, id.leather, { z0: 10 });
  // Head: face, beard down the front, round nose sticking out.
  p.ellipse(hx, hy, 4.5, 4, id.ceramicSkin, { z: 9, depth: 0.8 });
  p.ellipse(hx - 2, hy + 6, 4, 6, id.beard, { z: 11, depth: 0.7 });
  p.ellipse(hx - 4.5, hy + 1, 1.9, 1.7, id.ceramicSkin, { z: 15 });
  p.ellipse(hx - 3.5, hy + 2.6, 2.4, 1.2, id.beard, { z: 14 });
  // Hat: stacked rings leaning back.
  const bend = b ? 0.6 : flinch ? -1.5 : 0;
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    p.ellipse(hx + 1 + t * 3 + bend * t * t * 3, hy - 3 - t * 12, 5.2 * (1 - t) + 0.6, 1.8, id.ceramicRed, { z: 10 + t * 2, depth: 0.9 });
  }
  // Eye and brow.
  if (!flinch) p.dot(hx - 2, hy - 0.5, C.BLACK);
  strokes(p, [[hx - 3.6, hy - 2.6, hx - 0.6, hy - 1.6]], C.WHITE, 0.55);
  // Arm and hand; in the lunge the pickaxe comes down in front.
  const hand = lunge ? [cx - 6, 22] : [cx + 1, 28];
  p.capsule(cx, 25, 1.6, ...hand, 1.4, id.ceramicBlue, { z0: 13 });
  if (lunge) {
    p.capsule(...hand, 0.9, cx - 13, 12, 0.9, id.wood, { z0: 16 });
    p.capsule(cx - 16, 15, 1, cx - 10, 9, 0.8, id.tin, { z0: 17 });
  }
  p.ellipse(...hand, 1.8, 1.6, id.ceramicSkin, { z: 18 });
  if (kit === 'captain') { p.ellipse(cx - 3, 27, 1.5, 1.5, id.gold, { z: 16 }); p.dot(cx - 3, 25, C.RED).dot(cx - 3, 24, C.RED); }
  if (flinch) {
    strokes(p, [[hx - 2, hy - 6, hx, hy - 2], [hx, hy - 2, hx - 1, hy + 1]], C.SOOT, 0.45);
    p.erase((x, y) => x >= hx + 4 && x <= hx + 6 && y >= hy - 13 && y <= hy - 11);
  }
  return p.shade(list, { name: `gnome_${kit}_${pose}`, dither: 0.35 });
}
