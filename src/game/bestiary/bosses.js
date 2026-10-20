// Story bosses (GDD 2.3) and what they bring along.
//
// Officer Tow-Matic: a parking enforcement unit on treads with a tow crane
// on its back. It has been writing tickets since the world ended. kit
// 'towing' is its second phase: the light bar goes red and blue.
// Cone Drone: a traffic cone with a rotor, its backup.

import { C } from '../../engine/palette.js';
import { Painter } from '../../engine/paint.js';
import { mats } from '../materials.js';
import { poseFlags, strokes, spot, text } from './common.js';

const BODY = { ramp: [C.ASH, C.FOG, C.SILVER, C.BONE], spec: C.WHITE, shine: 0.35, outline: C.BLACK };
const PANEL = { ramp: [C.ASH, C.FOG, C.SILVER, C.BONE], outline: C.BLACK };       // matte, for flat faces
const STRIPE = { ramp: [C.NAVY, C.BLUE_D, C.BLUE], outline: C.BLACK };
const BOOM = { ramp: [C.SOOT, C.RUST, C.GOLD, C.YELLOW], rough: 0.1, outline: C.BLACK };
const VISOR = { ramp: [C.BLACK, C.NIGHT], flat: true, noOutline: true };
const PAPER = { ramp: [C.TAN, C.PARCHMENT, C.BONE], outline: C.WOOD_D };
const TICKET = { ramp: [C.GOLD, C.YELLOW], flat: true, outline: C.RUST };
const LAMP_OFF = { ramp: [C.BLACK, C.SOOT, C.SHADOW], outline: C.BLACK };
// What glows (per color, so nothing else may use these): the visor's eyes
// and error text, the light bar (amber; red and blue in towing mode).
const GLOW = [C.LIME, C.NEON, C.HOT, C.AMBER, C.RED, C.SKY, C.ICE];

function towMats() {
  const { list, id } = mats('rubber', 'iron', 'chrome', BOOM, BODY, PANEL, STRIPE, VISOR, PAPER, TICKET, LAMP_OFF);
  Object.assign(id, { boom: 3, body: 4, panel: 5, stripe: 6, visor: 7, paper: 8, ticket: 9, lampOff: 10 });
  return { list, id };
}

// Light bar: two lamps. Normal: amber, blinking in turn. Towing mode: red
// and blue, wig-wag.
function lightBar(p, id, cx, y, b, towing) {
  p.poly([[cx - 13, y + 2], [cx + 13, y + 2], [cx + 12, y + 5], [cx - 12, y + 5]], id.iron, { z: 20, normal: [0, -0.4, 1] });
  for (const s of [-1, 1]) {
    const lx = cx + s * 7;
    p.ellipse(lx, y, 5.5, 3, id.lampOff, { z: 22, depth: 0.6 });
    const on = towing ? (s < 0) === !b : (s < 0) === !!b;
    const c = towing ? (s < 0 ? C.RED : C.SKY) : C.AMBER;
    if (on || towing) {
      p.decal(lx - 6, y - 4, lx + 6, y + 4, (x, yy) => {
        const d = Math.hypot((x + 0.5 - lx) / 5, (yy + 0.5 - y) / 2.6);
        if (d > 1) return -1;
        if (!on) return towing ? (s < 0 ? C.BLOOD_D : C.NAVY) : -1;
        return d < 0.4 ? (towing && s > 0 ? C.ICE : C.HOT) : c;
      });
    }
  }
}

// Visor: the windshield with LED eyes (or ERR when hit), a wiper and,
// under the wiper, a yellow slip of paper: Ozzle's contract page.
function visor(p, id, cx, y, { b, lunge, flinch }) {
  p.poly([[cx - 15, y], [cx + 15, y], [cx + 13, y + 11], [cx - 13, y + 11]], id.visor, { z: 16 });
  if (flinch) {
    text(p, 'ERR', cx - 9, y + 3, C.NEON);
  } else {
    const eye = lunge ? C.RED : C.LIME;
    for (const s of [-1, 1]) {
      const ex = cx - 2 + s * 5;
      for (let k = -2; k <= 2; k++) {
        const up = lunge && k * s < 0 ? 1 : 0;   // angry brows
        p.dot(ex + k, y + 4 + up, eye);
        if (Math.abs(k) < 2 && !b) p.dot(ex + k, y + 5 + up, eye);
      }
    }
  }
  // Wiper blade, parked at an angle, with the yellow slip under it.
  p.poly([[cx + 9, y + 2], [cx + 14, y + 2], [cx + 13, y + 8], [cx + 9, y + 8]], id.ticket, { z: 18 });
  strokes(p, [[cx - 11, y + 10, cx + 12, y + 2]], C.BLACK, 0.6);
}

export function paintTowBotFront(pose = 'idle0', scale = 1, kit = 'normal') {
  const { list, id } = towMats();
  const f = poseFlags(pose);
  const { b, lunge, flinch } = f;
  const towing = kit === 'towing';
  const W = 82, H = 86, G = H - 1;
  const p = new Painter(W, H, { seed: 91, scale });
  const cx = W / 2 - flinch * 2;
  const dip = lunge * 3 + flinch;      // leans in to strike, rocks when hit
  const breathe = b * 0.6;
  // Treads.
  for (const s of [-1, 1]) {
    const tx = cx + s * 17;
    p.poly([[tx - 9, G - 15], [tx + 9, G - 15], [tx + 10, G - 3], [tx + 7, G], [tx - 7, G], [tx - 10, G - 3]], id.rubber, { z: 4, normal: [0, 0, 1] });
    for (let k = 0; k < 6; k++) strokes(p, [[tx - 9, G - 13 + k * 2.4, tx + 9, G - 13 + k * 2.4]], C.SHADOW, 0.4);
    p.ellipse(tx, G - 7, 4, 4, id.chrome, { z: 7, depth: 0.5 });
  }
  // Crane: a boom rising behind the right shoulder, cable and hook.
  const boomX = cx + 20, boomTop = 10 + dip;
  p.capsule(cx + 14, 46 + dip, 3, boomX + 12, boomTop, 2.4, id.boom, { z0: 1, z1: 0 });
  p.ellipse(boomX + 12, boomTop, 3, 3, id.iron, { z: 3 });
  const hookX = lunge ? cx + 8 : boomX + 13 + (b ? 1 : -1), hookY = lunge ? 46 : 42 + breathe;
  strokes(p, [[boomX + 12, boomTop + 2, hookX, hookY - 5]], C.STEEL_M, 0.5);
  p.capsule(hookX, hookY - 5, 1.4, hookX, hookY, 1.6, id.iron, { z0: lunge ? 30 : 8 });
  p.decal(hookX - 5, hookY - 1, hookX + 2, hookY + 6, (x, y) => {
    const d = Math.hypot(x + 0.5 - (hookX - 1.5), y + 0.5 - (hookY + 2.2));
    return d > 2.2 && d < 3.6 && !(x + 0.5 < hookX - 1.5 && y + 0.5 < hookY + 2) ? C.STEEL_L : -1;
  });
  p.capsule(hookX - 1, hookY + 1, 2.4, hookX - 3, hookY + 5, 1.2, id.iron, { z0: lunge ? 31 : 9 });
  // Chassis between the treads, the body block and shoulders.
  p.poly([[cx - 22, G - 22 + dip], [cx + 22, G - 22 + dip], [cx + 20, G - 12], [cx - 20, G - 12]], id.panel, { z: 8, normal: [0, -0.3, 1] });
  p.poly([[cx - 21, 34 + dip], [cx + 21, 34 + dip], [cx + 22, G - 20 + dip], [cx - 22, G - 20 + dip]], id.panel, { z: 10, normal: [0, -0.1, 1] });
  // Blue band with a checkered strip, like a patrol car.
  p.poly([[cx - 22, 50 + dip], [cx + 22, 50 + dip], [cx + 22, 57 + dip], [cx - 22, 57 + dip]], id.stripe, { z: 11 });
  p.decal(cx - 22, 57 + dip, cx + 22, 60 + dip, (x, y) => ((Math.floor(x / 3) + Math.floor(y)) % 2 ? C.BLACK : C.WHITE));
  // Badge: a gold shield.
  p.poly([[cx - 4, 39 + dip], [cx + 4, 39 + dip], [cx + 4, 44 + dip], [cx, 47 + dip], [cx - 4, 44 + dip]], id.ticket, { z: 13 });
  p.dot(cx, 42 + dip, C.RUST);
  // Ticket printer slot, a fresh ticket curling out.
  p.poly([[cx - 8, 63 + dip], [cx + 8, 63 + dip], [cx + 8, 65 + dip], [cx - 8, 65 + dip]], id.iron, { z: 12 });
  const curl = 3 + b + lunge * 2;
  p.poly([[cx - 5, 64 + dip], [cx + 5, 64 + dip], [cx + 6, 64 + dip + curl], [cx - 4, 64 + dip + curl + 1]], id.paper, { z: 14, normal: [0, 0.4, 1] });
  for (let k = 1; k < curl; k += 2) strokes(p, [[cx - 3, 64.5 + dip + k, cx + 3, 64.5 + dip + k]], C.GRAVEL_M, 0.35);
  // Shoulders and arms. Left: a ticket scanner. Right: a clamp (the boot).
  for (const s of [-1, 1]) {
    const sx = cx + s * 24, sy = 38 + dip;
    p.ellipse(sx, sy, 6, 5, id.body, { z: 14, depth: 0.7 });
    const hx = s < 0 ? cx - 30 + lunge * 6 : cx + 29 - lunge * 4, hy = s < 0 ? 58 - lunge * 6 + flinch * 3 : 60 - lunge * 2;
    p.capsule(sx, sy + 3, 2.6, hx, hy, 2.2, id.iron, { z0: 13, z1: 15 });
    if (s < 0) {
      p.poly([[hx - 4, hy - 2], [hx + 3, hy - 2], [hx + 3, hy + 7], [hx - 4, hy + 7]], id.iron, { z: 18 });
      p.poly([[hx - 3, hy - 1], [hx + 2, hy - 1], [hx + 2, hy + 2], [hx - 3, hy + 2]], id.visor, { z: 19 });
      p.dot(hx - 1, hy, lunge ? C.RED : C.LIME);
    } else {
      // The boot: a yellow wheel clamp with a padlock.
      p.ellipse(hx, hy + 2, 5, 5, id.ticket, { z: 18, depth: 0.5 });
      p.decal(hx - 5, hy - 3, hx + 5, hy + 7, (x, y) => (Math.hypot(x + 0.5 - hx, y + 0.5 - hy - 2) < 2.3 ? C.SOOT : -1));
      p.poly([[hx - 2, hy + 6], [hx + 2, hy + 6], [hx + 2, hy + 9], [hx - 2, hy + 9]], id.iron, { z: 19 });
    }
  }
  // Cab: the head block with its visor, the light bar on top.
  const hy = 18 + dip;
  p.poly([[cx - 17, hy], [cx + 17, hy], [cx + 18, hy + 16], [cx - 18, hy + 16]], id.panel, { z: 14, normal: [0, -0.15, 1] });
  p.poly([[cx - 17, hy - 2], [cx + 17, hy - 2], [cx + 17, hy + 1], [cx - 17, hy + 1]], id.stripe, { z: 15, normal: [0, -0.7, 0.7] });
  visor(p, id, cx, hy + 3, f);
  lightBar(p, id, cx, hy - 6, b, towing);
  // Sparks when hit.
  if (flinch) for (const [x, y] of [[cx + 15, hy + 18], [cx - 19, 44], [cx + 21, 55]]) {
    p.dot(x, y, C.HOT); p.dot(x + 1, y - 1, C.YELLOW); p.dot(x - 1, y + 1, C.GOLD);
  }
  return p.shade(list, { name: `towbot_front_${kit}_${pose}`, glowColors: GLOW });
}

// Side view, facing left: cab in front, crane boom over the back with the
// hook swinging behind.
export function paintTowBotSide(pose = 'idle0', scale = 1, kit = 'normal') {
  const { list, id } = towMats();
  const { b, lunge, flinch } = poseFlags(pose);
  const towing = kit === 'towing';
  const W = 92, H = 86, G = H - 1;
  const p = new Painter(W, H, { seed: 92, scale });
  const x0 = 12 - lunge * 4 + flinch * 2;   // nose
  const dip = lunge * 2;
  // One long tread with road wheels.
  p.poly([[x0 + 2, G - 14], [x0 + 62, G - 14], [x0 + 66, G - 7], [x0 + 62, G], [x0 + 4, G], [x0, G - 7]], id.rubber, { z: 4 });
  for (let k = 0; k < 5; k++) p.ellipse(x0 + 10 + k * 12, G - 7, 4.4, 4.4, id.chrome, { z: 7, depth: 0.5 });
  // Hull and the blue band.
  p.poly([[x0, G - 34 + dip], [x0 + 64, G - 34], [x0 + 66, G - 14], [x0 + 2, G - 14]], id.panel, { z: 9, normal: [0, -0.1, 1] });
  p.poly([[x0, G - 26 + dip], [x0 + 65, G - 26], [x0 + 65, G - 20], [x0 + 1, G - 20]], id.stripe, { z: 10 });
  p.decal(x0, G - 20, x0 + 65, G - 17, (x, y) => ((Math.floor(x / 3) + y) % 2 ? C.BLACK : C.WHITE));
  // Cab at the front with a windshield (visor) and the light bar.
  const cy = G - 60 + dip;
  p.poly([[x0 + 2, cy + 6], [x0 + 10, cy], [x0 + 32, cy], [x0 + 32, G - 33], [x0, G - 33]], id.panel, { z: 11, normal: [-0.2, -0.2, 1] });
  p.poly([[x0 + 5, cy + 7], [x0 + 11, cy + 3], [x0 + 22, cy + 3], [x0 + 22, cy + 14], [x0 + 4, cy + 14]], id.visor, { z: 12 });
  const eye = flinch ? C.NEON : lunge ? C.RED : C.LIME;
  for (let k = 0; k < 4; k++) p.dot(x0 + 8 + k, cy + 8, eye);
  p.poly([[x0 + 14, cy + 5], [x0 + 20, cy + 5], [x0 + 20, cy + 10], [x0 + 14, cy + 10]], id.ticket, { z: 13 }); // the slip under the wiper
  lightBar(p, id, x0 + 18, cy - 4, b, towing);
  // Crane boom from the back deck, up and over the rear, cable and hook.
  const bx = x0 + 44, by = G - 36;
  p.capsule(bx, by, 3, x0 + 74, 14 + dip, 2.4, id.boom, { z0: 8 });
  p.ellipse(bx, by, 4, 4, id.iron, { z: 10 });
  const hx = x0 + 76 + (b ? 1 : -1) - lunge * 6, hy = 40 + b;
  strokes(p, [[x0 + 74, 15 + dip, hx, hy - 5]], C.STEEL_M, 0.5);
  p.capsule(hx, hy - 5, 1.4, hx, hy, 1.6, id.iron, { z0: 9 });
  p.decal(hx - 5, hy - 1, hx + 2, hy + 6, (x, y) => {
    const d = Math.hypot(x + 0.5 - (hx - 1.5), y + 0.5 - (hy + 2.2));
    return d > 2.2 && d < 3.6 && !(x + 0.5 < hx - 1.5 && y + 0.5 < hy + 2) ? C.STEEL_L : -1;
  });
  if (flinch) for (const [x, y] of [[x0 + 30, cy + 2], [x0 + 50, G - 30]]) { p.dot(x, y, C.HOT); p.dot(x + 1, y - 1, C.YELLOW); }
  return p.shade(list, { name: `towbot_side_${kit}_${pose}`, glowColors: GLOW });
}

// Cone Drone: a traffic cone hanging under a rotor, one red eye.
const CONE_GLOW = [C.LIME, C.MINT];
function coneMats() {
  return mats('safety', 'plastic', 'tin', PANEL); // matte: a glossy flat cone turns into one highlight
}

export function paintConeDroneFront(pose = 'idle0', scale = 1) {
  const { list, id } = coneMats();
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 30, H = 40;
  const p = new Painter(W, H, { seed: 95, scale });
  const cx = W / 2 + flinch * 2;
  const hover = b ? 1 : 0;
  const top = 10 + hover + lunge * 5 + flinch;
  // Rotor: a blurred disc and the hub.
  p.ellipse(cx, top - 6, 13, 2, id.tin, { z: 2, depth: 0.2 });
  p.decal(cx - 14, top - 9, cx + 14, top - 3, (x, y) => ((x + (b ? 1 : 0)) % 4 < 2 && Math.abs(y + 0.5 - (top - 6)) < 1 ? C.STEEL_L : -1));
  p.capsule(cx, top - 6, 1.6, cx, top - 1, 1.4, id.plastic, { z0: 6 });
  // The cone, tip up, with its white reflective bands.
  p.poly([[cx - 2, top], [cx + 2, top], [cx + 9, top + 22], [cx - 9, top + 22]], id.safety, { z: 6, normal: [0, -0.25, 1] });
  p.decal(cx - 9, top, cx + 9, top + 22, (x, y) => {
    const v = y + 0.5 - top;
    return (v > 7 && v < 10) || (v > 14 && v < 17) ? C.WHITE : -1;
  });
  p.poly([[cx - 11, top + 22], [cx + 11, top + 22], [cx + 11, top + 25], [cx - 11, top + 25]], id.plastic, { z: 7 });
  // The eye, a camera in the top band.
  spot(p, cx, top + 5, 1.8, 1.6, C.BLACK);
  p.dot(cx, top + 5, flinch ? C.SOOT : lunge ? C.MINT : C.LIME);
  return p.shade(list, { name: `conedrone_front_${pose}`, glowColors: CONE_GLOW });
}

export function paintConeDroneSide(pose = 'idle0', scale = 1) {
  const { list, id } = coneMats();
  const { b, lunge, flinch } = poseFlags(pose);
  const W = 34, H = 40;
  const p = new Painter(W, H, { seed: 96, scale });
  const cx = W / 2 - lunge * 3 + flinch * 2;
  const top = 10 + (b ? 1 : 0) + lunge * 4 + flinch;
  const lean = lunge ? -3 : flinch ? 2 : -1; // tips forward to fly
  p.ellipse(cx + lean, top - 6, 14, 1.6, id.tin, { z: 2, depth: 0.2 });
  p.capsule(cx + lean, top - 6, 1.6, cx, top - 1, 1.4, id.plastic, { z0: 6 });
  p.poly([[cx - 2 + lean * 0.3, top], [cx + 2 + lean * 0.3, top], [cx + 9, top + 22], [cx - 9, top + 22]], id.safety, { z: 6, normal: [-0.2, -0.25, 1] });
  p.decal(cx - 9, top, cx + 9, top + 22, (x, y) => {
    const v = y + 0.5 - top;
    return (v > 7 && v < 10) || (v > 14 && v < 17) ? C.WHITE : -1;
  });
  p.poly([[cx - 11, top + 22], [cx + 11, top + 22], [cx + 11, top + 25], [cx - 11, top + 25]], id.plastic, { z: 7 });
  p.dot(cx - 3, top + 5, flinch ? C.SOOT : lunge ? C.MINT : C.LIME);
  return p.shade(list, { name: `conedrone_side_${pose}`, glowColors: CONE_GLOW });
}
