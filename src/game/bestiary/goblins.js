// Goblin classes, front view. One body, different kit scavenged from the
// world above:
//   grunt  - saucepan helmet, meat cleaver, dish-towel loincloth
//   sapper - welding goggles, dynamite bandolier, a lit round bomb
//   shaman - colander hat (blocks mind rays), robe, bottle-cap necklace,
//            a staff with a glowing light bulb
//   boss   - traffic-cone crown, STOP-sign shield, nail bat, hubcap pauldrons
// Goblins are small: about 3/4 of a wall high.

import { C } from '../../engine/palette.js';
import { Painter } from '../../engine/paint.js';
import { mats } from '../materials.js';
import { poseFlags, spot, strokes, text } from './common.js';

export const GOBLIN_KITS = ['grunt', 'sapper', 'shaman', 'boss'];

export function paintGoblinFront(kit = 'grunt', pose = 'idle0', scale = 1) {
  const { list, id } = mats('gob', 'leather', 'cloth', 'steel', 'wood', 'bomb', 'robe', 'safety', 'sign', 'chrome', 'tin');
  const { b, lunge, flinch } = poseFlags(pose);
  const boss = kit === 'boss';
  const W = 60, H = boss ? 64 : 55, G = H - 1;
  const p = new Painter(W, H, { seed: 17, scale });
  const k = boss ? 1.12 : 1;                       // the boss is a bit bigger
  const cx = W / 2 - flinch * 1.5 + lunge * 0.5;
  const Y = (y) => G - (49 - y) * k;               // body heights relative to the feet
  const hy = Y(13) + b * 0.4 + lunge * 2 - flinch * 1.5;
  const tilt = flinch ? -1.5 : 0;

  // Boss cape behind everything.
  if (boss) {
    p.poly([[cx - 10 * k, Y(21)], [cx + 10 * k, Y(21)], [cx + 14 * k, Y(45)], [cx + 4, Y(42)], [cx - 3, Y(46)], [cx - 14 * k, Y(44)]], id.cloth, { z: -4, normal: [0, -0.3, 1] });
  }

  // Legs and big feet.
  for (const s of [-1, 1]) {
    p.capsule(cx + s * 4 * k, Y(34), 2.4 * k, cx + s * 6 * k, Y(41), 2 * k, id.gob, { z0: 5 });
    p.capsule(cx + s * 6 * k, Y(41), 2 * k, cx + s * 6 * k, Y(46), 1.8 * k, id.gob, { z0: 5 });
    p.ellipse(cx + s * 7.5 * k, G - 1.5, 4.5 * k, 2.2, id.gob, { z: 7, depth: 0.7 });
  }

  // Torso
  p.ellipse(cx, Y(27) - b * 0.3 + lunge, 9.5 * k, (9 + b * 0.4) * k, id.gob, { z: 6, depth: 0.8 });

  // Clothing by class.
  if (kit === 'shaman') {
    // Robe from the shoulders to the knees.
    p.poly([[cx - 7, Y(19)], [cx + 7, Y(19)], [cx + 11, Y(43)], [cx - 11, Y(43)]], id.robe, { z: 10, normal: [0, -0.15, 1] });
    p.poly([[cx - 1.5, Y(19)], [cx + 1.5, Y(19)], [cx + 1, Y(43)], [cx - 1, Y(43)]], id.robe, { z: 11, normal: [0.3, -0.1, 1] });
  } else {
    // Loincloth (dish towel for the grunt), belt.
    p.poly([[cx - 8 * k, Y(33)], [cx + 8 * k, Y(33)], [cx + 6 * k, Y(42)], [cx + 1, Y(39.5)], [cx - 3, Y(43)], [cx - 7 * k, Y(41)]], id.cloth, { z: 11, normal: [0, -0.2, 1] });
    if (kit === 'grunt') {
      p.decal(cx - 9, Y(33), cx + 9, Y(43), (x, y) => (((x >> 1) + (y >> 1)) % 2 === 0 ? C.PARCHMENT : -1));
    }
    p.capsule(cx - 9 * k, Y(33), 1.5, cx + 9 * k, Y(33), 1.5, id.leather, { z0: 13 });
    p.ellipse(cx, Y(33), 1.7, 1.5, id.steel, { z: 15 });
  }
  if (kit === 'sapper') {
    // Leather apron and a bandolier of dynamite.
    p.poly([[cx - 6, Y(24)], [cx + 6, Y(24)], [cx + 7, Y(37)], [cx - 7, Y(37)]], id.leather, { z: 12, normal: [0, -0.1, 1] });
    p.capsule(cx - 8, Y(20), 1.4, cx + 7, Y(33), 1.4, id.leather, { z0: 14 });
    for (let t = 0.12; t < 0.95; t += 0.2) {
      const x = cx - 8 + 15 * t, y = Y(20) + (Y(33) - Y(20)) * t;
      p.capsule(x - 1.2, y - 2.6, 1, x + 1.2, y + 2.6, 1, id.cloth, { z0: 16 });
      p.dot(x - 1.4, y - 3.4, C.PARCHMENT);
    }
  }
  if (kit === 'shaman') {
    // Bottle caps on a string.
    const caps = [C.RED, C.GOLD, C.SKY, C.STEEL_L, C.LIME, C.RED, C.GOLD];
    caps.forEach((c, i) => {
      const t = i / (caps.length - 1);
      const x = cx - 6 + 12 * t, y = Y(21) + Math.sin(t * Math.PI) * 4;
      spot(p, x, y, 1.1, 1.1, c);
    });
  }
  if (boss) {
    // Hubcap pauldrons.
    for (const s of [-1, 1]) {
      p.ellipse(cx + s * 9.5 * k, Y(20), 4.2, 3.4, id.chrome, { z: 13, depth: 0.4 });
      p.dot(cx + s * 9.5 * k, Y(20), C.STEEL_D);
    }
  }

  // ---- arms. Left arm (viewer's left) holds the off-hand item.
  const shL = [cx - 9 * k, Y(21)], shR = [cx + 9 * k, Y(21)];
  const offUp = boss ? 6 : 0;
  const lHand = [cx - 13 * k + flinch * 2, Y(37 - offUp) - flinch * 6];
  p.capsule(...shL, 2.2, cx - 13 * k, Y(29), 1.8, id.gob, { z0: 9 });
  p.capsule(cx - 13 * k, Y(29), 1.8, ...lHand, 1.6, id.gob, { z0: 9, z1: 10 });
  p.ellipse(...lHand, 2.4, 2.2, id.gob, { z: 11 });

  // Right arm: weapon hand, raised or thrust forward in the lunge.
  const rHand = lunge
    ? (kit === 'shaman' ? [cx + 8, Y(28)] : [cx + 12, Y(9)])
    : [cx + 14 * k, Y(35)];
  const elbow = lunge ? [cx + 15, Y(19)] : [cx + 14 * k, Y(28)];
  p.capsule(...shR, 2.2, ...elbow, 1.8, id.gob, { z0: 9 });
  p.capsule(...elbow, 1.8, ...rHand, 1.6, id.gob, { z0: 11, z1: lunge ? 18 : 12 });

  // ---- weapons and off-hand items.
  if (kit === 'grunt') {
    // Meat cleaver: blade above the fist.
    const [x, y] = rHand;
    const up = lunge ? -1 : 1;
    p.capsule(x, y, 1, x, y + 4 * up * -1, 1, id.wood, { z0: 19 });
    const by = lunge ? y - 4 : y - 10, bx = x - 1;
    p.poly([[bx, by], [bx + 7, by - 1], [bx + 7, by + 6], [bx, by + 6]], id.steel, { z: 20, normal: [0.4, -0.3, 1] });
    p.dot(bx + 5, by + 1, C.BLACK);
  }
  if (kit === 'sapper') {
    // Round bomb with a burning fuse; the off hand holds a spare stick.
    const [x, y] = lunge ? [cx + 11, Y(5)] : [rHand[0] + 1, rHand[1] - 4];
    p.ellipse(x, y, 4, 4, id.bomb, { z: 20 });
    p.capsule(x + 1, y - 4, 0.8, x + 2.5, y - 6.5, 0.6, id.leather, { z0: 21 });
    const sp = b ? C.HOT : C.YELLOW;
    p.dot(x + 3, y - 7, sp).dot(x + 4, y - 8, C.FIRE).dot(x + 2, y - 8, C.AMBER);
    if (b) p.dot(x + 4, y - 6, C.YELLOW);
    p.capsule(lHand[0] - 1, lHand[1] - 3, 1, lHand[0] + 1, lHand[1] + 2, 1, id.cloth, { z0: 13 });
  }
  if (kit === 'shaman') {
    // Staff with a light bulb screwed on top and a dangling cord.
    const [x, y] = rHand;
    const top = lunge ? [x + 4, Y(15)] : [x, Y(11)];
    p.capsule(x + (lunge ? -2 : 0), Math.min(G - 1, y + 9), 1, ...top, 1, id.wood, { z0: lunge ? 14 : 12, z1: lunge ? 26 : 12 });
    p.ellipse(top[0], top[1] - 1.5, 1.6, 1.4, id.steel, { z: 23 + lunge * 6 });
    // The glass is a shape first, then gets its glowing colours as decals.
    const br = 3.6 + lunge * 0.8;
    p.ellipse(top[0], top[1] - 5, br, br + 0.4, id.steel, { z: 22 + lunge * 6 });
    spot(p, top[0], top[1] - 5, br, br + 0.4, lunge || b ? C.HOT : C.YELLOW);
    spot(p, top[0] + 0.5, top[1] - 4.5, br - 1.6, br - 1.4, lunge || b ? C.WHITE : C.HOT);
    p.dot(top[0] - 1.5, top[1] - 7, C.WHITE);
    p.capsule(top[0] + 1, top[1] + 2, 0.5, top[0] + 3, top[1] + 7, 0.5, id.leather, { z0: 21 });
    p.capsule(top[0] + 3, top[1] + 7, 0.5, top[0] + 2, top[1] + 11, 0.5, id.leather, { z0: 21 });
    p.ellipse(...rHand, 2.4, 2.2, id.gob, { z: 24 });
  }
  if (boss) {
    // Nail bat in the right hand.
    const [x, y] = rHand;
    const tip = lunge ? [cx - 4, Y(-2)] : [x + 2, Y(14)];
    p.capsule(x, y + 2, 1.1, ...tip, 2.2, id.wood, { z0: lunge ? 18 : 14, z1: lunge ? 22 : 14 });
    for (let t = 0.65; t <= 1; t += 0.1) {
      const nx = x + (tip[0] - x) * t, ny = y + 2 + (tip[1] - y - 2) * t;
      p.dot(nx - 2.5, ny, C.STEEL_L).dot(nx + 2.5, ny + 1, C.STEEL_L);
    }
    // STOP sign shield in the left hand.
    const [sx, sy] = [lHand[0] - 1, lHand[1] - 2];
    const R = 10.5, oct = [];
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) * (Math.PI / 4);
      oct.push([sx + Math.cos(a) * R, sy + Math.sin(a) * R]);
    }
    p.poly(oct, id.sign, { z: 18, normal: [-0.1, -0.1, 1] });
    p.decal(sx - R - 1, sy - R - 1, sx + R + 1, sy + R + 1, (x, y) => {
      const u = x + 0.5 - sx, v = y + 0.5 - sy;
      const d = Math.max(Math.abs(u), Math.abs(v), (Math.abs(u) + Math.abs(v)) / Math.SQRT2);
      return d > R * 0.86 && d < R * 0.97 ? C.BONE : -1;
    });
    text(p, 'STOP', Math.round(sx - 7), Math.round(sy - 2), C.WHITE);
    // A bullet hole, because of course.
    p.dot(sx + 5, sy + 4, C.BLACK).dot(sx + 5, sy + 3, C.STEEL_L);
  } else {
    p.ellipse(...rHand, 2.4, 2.2, id.gob, { z: 24 });
  }

  // ---- head: long ears, big nose, jaw.
  const ear = flinch ? 4 : 0;
  for (const s of [-1, 1]) {
    p.capsule(cx + s * 7 * k + tilt, hy - 1, 3 * k, cx + s * (19 - ear) * k + tilt, hy - 7 + ear * 2, 0.6, id.gob, { z0: 8, z1: 6 });
  }
  p.ellipse(cx + tilt, hy, 9 * k, 8.5 * k, id.gob, { z: 10, depth: 0.85 });
  p.ellipse(cx + tilt, hy + 3 * k, 7.5 * k, 4.5 * k, id.gob, { z: 13, depth: 0.5 });
  p.ellipse(cx + tilt, hy + 1.5, 2.6, 3.2, id.gob, { z: 19, depth: 0.8 });
  // Inner ears.
  for (const s of [-1, 1]) {
    p.decal(cx + s * 8 - 7, hy - 9, cx + s * 8 + 7, hy, (x, y) => {
      const t = (x + 0.5 - (cx + s * 7 + tilt)) / (s * (12 - ear));
      if (t < 0.15 || t > 0.85) return -1;
      const ly = hy - 1 - t * (6 - ear * 2);
      return Math.abs(y + 0.5 - ly) < 1.2 * (1 - t) ? C.WINE : -1;
    });
  }

  // ---- headgear.
  const hx = cx + tilt;
  if (kit === 'grunt') {
    // Saucepan, handle sticking out sideways. Three strips shaded like a cylinder.
    const strips = [[-8.5, -3, [-0.8, -0.1, 0.6]], [-3, 3, [0, -0.1, 1]], [3, 8.5, [0.8, -0.1, 0.6]]];
    for (const [a, c, n] of strips) {
      p.poly([[hx + a, hy - 12], [hx + c, hy - 12], [hx + c * 1.05, hy - 4.5], [hx + a * 1.05, hy - 4.5]], id.tin, { z: 22, normal: n });
    }
    p.capsule(hx - 9.8, hy - 4.5, 1, hx + 9.8, hy - 4.5, 1, id.steel, { z0: 23 });
    p.capsule(hx + 8, hy - 9, 1, hx + 21, hy - 13 - b * 0.5, 1.2, id.wood, { z0: 21 });
    p.dot(hx + 19, hy - 12.5, C.BLACK);
    strokes(p, [[hx - 8, hy - 11.5, hx + 8, hy - 11.5]], C.STEEL_L, 0.5);
  }
  if (kit === 'sapper') {
    // Welding goggles pushed up on the forehead, soot on the cheeks.
    p.capsule(hx - 9.5, hy - 5, 1, hx + 9.5, hy - 5, 1, id.leather, { z0: 20 });
    for (const s of [-1, 1]) {
      p.ellipse(hx + s * 4, hy - 5.5, 3, 2.6, id.steel, { z: 22, depth: 0.6 });
      spot(p, hx + s * 4, hy - 5.5, 1.8, 1.5, C.TEAL_D);
      p.dot(hx + s * 4 - 1, hy - 6.5, C.MINT);
    }
    for (const [x, y] of [[-6, 3], [-5, 4], [5, 4], [6, 2], [-2, 6]]) p.dot(hx + x, hy + y, C.MOSS_D);
  }
  if (kit === 'shaman') {
    // Colander: a dome full of holes, with little handles.
    p.ellipse(hx, hy - 6, 8.5, 6.5, id.tin, { z: 22, depth: 0.8 });
    p.decal(hx - 9, hy - 13, hx + 9, hy - 3, (x, y) => {
      if (y > hy - 4) return -1;
      return (x + y * 2) % 4 === 0 && (y % 2 === 0) ? C.SOOT : -1;
    });
    p.capsule(hx - 10, hy - 3.5, 0.9, hx + 10, hy - 3.5, 0.9, id.tin, { z0: 23 });
    for (const s of [-1, 1]) p.ellipse(hx + s * 11, hy - 4, 1.6, 1.2, id.tin, { z: 23 });
  }
  if (boss) {
    // Traffic cone with a reflective band, sitting on a square base.
    p.poly([[hx - 9, hy - 6], [hx + 9, hy - 6], [hx + 9, hy - 4], [hx - 9, hy - 4]], id.safety, { z: 21, normal: [0, -0.4, 1] });
    p.poly([[hx - 6.5, hy - 6], [hx - 1, hy - 20], [hx, hy - 20], [hx, hy - 6]], id.safety, { z: 22, normal: [-0.5, -0.3, 1] });
    p.poly([[hx, hy - 6], [hx, hy - 20], [hx + 1, hy - 20], [hx + 6.5, hy - 6]], id.safety, { z: 22, normal: [0.6, -0.2, 0.8] });
    p.decal(hx - 7, hy - 15, hx + 7, hy - 9, (x, y) => (y >= Math.round(hy - 13) && y <= Math.round(hy - 11) ? (x < hx ? C.WHITE : C.STEEL_L) : -1));
  }

  // ---- face: eyes, brows, grin.
  const ey = hy - 2;
  for (const s of [-1, 1]) {
    const ex = hx + s * 4;
    if (flinch) {
      strokes(p, [[ex - 1.5, ey - 0.5, ex + 1.5, ey + 0.5]], C.SOOT, 0.55);
    } else {
      const glow = kit === 'shaman' ? C.LILAC : C.YELLOW;
      p.dot(ex - 1, ey, glow).dot(ex, ey, C.BLACK).dot(ex + 1, ey, kit === 'shaman' ? C.VIOLET_M : C.AMBER);
      p.dot(ex, ey + 1, kit === 'shaman' ? C.VIOLET_M : C.AMBER);
    }
    // Angry brows slanting down to the nose.
    p.dot(ex - s * 2, ey - 2.5, C.MOSS_D).dot(ex - s * 1, ey - 2, C.MOSS_D).dot(ex, ey - 1.6, C.MOSS_D);
  }
  const gy = hy + 5 + lunge;
  for (let x = -5; x <= 5; x++) {
    const y = gy + Math.round((x * x) / 14) * (flinch ? -1 : 1);
    p.dot(hx + x, y, C.SOOT);
    if (lunge) p.dot(hx + x, y + 1, Math.abs(x) < 5 ? C.GORE : C.SOOT);
    if (x % 2 === 0 && Math.abs(x) < 5) p.dot(hx + x, y - 1, C.BONE);
  }
  const glowColors = { grunt: [C.YELLOW, C.AMBER], sapper: [C.YELLOW, C.AMBER, C.HOT, C.FIRE], shaman: [C.LILAC, C.VIOLET_M, C.HOT, C.YELLOW, C.WHITE], boss: [C.YELLOW, C.AMBER] }[kit];
  return p.shade(list, { name: `goblin_${kit}_front_${pose}`, glowColors });
}

// Side view, facing left: hunched, big nose first, one long ear swept back.
// The near (weapon) arm is in front of the body, the off arm behind it.
export function paintGoblinSide(kit = 'grunt', pose = 'idle0', scale = 1) {
  const { list, id } = mats('gob', 'leather', 'cloth', 'steel', 'wood', 'bomb', 'robe', 'safety', 'sign', 'chrome', 'tin');
  const { b, lunge, flinch } = poseFlags(pose);
  const boss = kit === 'boss';
  const W = 60, H = boss ? 64 : 55, G = H - 1;
  const p = new Painter(W, H, { seed: 19, scale });
  const k = boss ? 1.12 : 1;
  const lean = lunge * 4 - flinch * 3;               // how far the upper body leans forward (left)
  const cx = W / 2 + 4 - lunge * 2 + flinch * 2;
  const Y = (y) => G - (49 - y) * k;
  const tx = cx - lean * 0.5;                        // torso center x
  const hx = cx - 3 - lean, hy = Y(14) + b * 0.4 + lunge * 2 - flinch * 1;

  // Boss cape trailing behind.
  if (boss) {
    p.poly([[tx + 2, Y(20)], [tx + 9, Y(21)], [tx + 16, Y(44)], [tx + 9, Y(43)], [tx + 3, Y(45)]], id.cloth, { z: -4, normal: [0.3, -0.2, 1] });
  }

  // Off arm (behind the body).
  const offHand = [tx + 5 - lunge * 3, Y(34) - flinch * 4];
  p.capsule(tx + 2, Y(21), 2, tx + 6, Y(28), 1.7, id.gob, { z0: 1 });
  p.capsule(tx + 6, Y(28), 1.7, ...offHand, 1.5, id.gob, { z0: 1 });
  p.ellipse(...offHand, 2.2, 2, id.gob, { z: 2 });

  // Legs: far one slightly back, near one forward; big flat feet pointing left.
  const step = b ? 1 : 0;
  for (const [s, z] of [[1, 2], [-1, 6]]) {
    const hip = [cx + s * 1.5, Y(34)];
    const knee = [cx - 1 + s * 2 - step * s - lunge * (s < 0 ? 3 : 0), Y(41)];
    const foot = [cx - 1 + s * 3 - lunge * (s < 0 ? 5 : -1) + flinch * 2, G - 2];
    p.capsule(...hip, 2.4 * k, ...knee, 2 * k, id.gob, { z0: z });
    p.capsule(...knee, 2 * k, ...foot, 1.8 * k, id.gob, { z0: z });
    p.ellipse(foot[0] - 2.5, G - 1.5, 4.5 * k, 2, id.gob, { z: z + 1, depth: 0.7 });
  }

  // Torso, hunched forward.
  p.ellipse(tx, Y(27) - b * 0.3 + lunge, 7.5 * k, (9 + b * 0.4) * k, id.gob, { z: 4, depth: 0.8 });
  p.ellipse(tx + 2, Y(22), 6 * k, 5 * k, id.gob, { z: 3, depth: 0.8 }); // hunched back

  if (kit === 'shaman') {
    p.poly([[tx - 6, Y(19)], [tx + 6, Y(19)], [tx + 9, Y(43)], [tx - 9, Y(43)]], id.robe, { z: 8, normal: [-0.2, -0.15, 1] });
    p.poly([[tx - 7, Y(30)], [tx - 3, Y(30)], [tx - 5, Y(43)], [tx - 9, Y(43)]], id.robe, { z: 9, normal: [-0.6, -0.1, 0.8] });
  } else {
    p.poly([[tx - 7 * k, Y(33)], [tx + 7 * k, Y(33)], [tx + 6 * k, Y(41)], [tx, Y(39)], [tx - 6 * k, Y(42)]], id.cloth, { z: 9, normal: [-0.1, -0.2, 1] });
    if (kit === 'grunt') p.decal(tx - 8, Y(33), tx + 8, Y(43), (x, y) => (((x >> 1) + (y >> 1)) % 2 === 0 ? C.PARCHMENT : -1));
    p.capsule(tx - 7.5 * k, Y(33), 1.5, tx + 7.5 * k, Y(33), 1.5, id.leather, { z0: 11 });
  }
  if (kit === 'sapper') {
    p.poly([[tx - 7, Y(24)], [tx - 1, Y(24)], [tx - 1, Y(37)], [tx - 8, Y(37)]], id.leather, { z: 10, normal: [-0.4, -0.1, 1] });
    p.capsule(tx + 5, Y(20), 1.4, tx - 6, Y(33), 1.4, id.leather, { z0: 12 });
    for (let t = 0.12; t < 0.95; t += 0.22) {
      const x = tx + 5 - 11 * t, y = Y(20) + (Y(33) - Y(20)) * t;
      p.capsule(x - 1.2, y - 2.4, 1, x + 1.2, y + 2.4, 1, id.cloth, { z0: 14 });
      p.dot(x - 1.4, y - 3.2, C.PARCHMENT);
    }
  }
  if (kit === 'shaman') {
    const caps = [C.RED, C.GOLD, C.SKY, C.STEEL_L, C.LIME];
    caps.forEach((c, i) => spot(p, tx - 6 + i * 1.8, Y(21) + Math.sin((i / 4) * Math.PI) * 3, 1.1, 1.1, c));
  }
  if (boss) {
    p.ellipse(tx, Y(20), 4.4, 3.4, id.chrome, { z: 13, depth: 0.4 });
    p.dot(tx, Y(20), C.STEEL_D);
  }

  // ---- head: profile with a long hooked nose, jaw and one big swept ear.
  const ear = flinch ? 3 : 0;
  p.capsule(hx + 4, hy - 2, 3 * k, hx + (17 - ear) * k, hy - 8 + ear * 2 + b * 0.5, 0.6, id.gob, { z0: 9, z1: 7 });
  p.decal(hx + 3, hy - 10, hx + 18, hy, (x, y) => {
    const t = (x + 0.5 - (hx + 4)) / (13 - ear);
    if (t < 0.15 || t > 0.85) return -1;
    const ly = hy - 2 - t * (6 - ear * 2);
    return Math.abs(y + 0.5 - ly) < 1.1 * (1 - t) ? C.WINE : -1;
  });
  p.ellipse(hx, hy, 8 * k, 8 * k, id.gob, { z: 12, depth: 0.85 });
  p.ellipse(hx - 3, hy + 3.5 * k, 6 * k, 4 * k, id.gob, { z: 13, depth: 0.5 });          // jaw
  p.capsule(hx - 5, hy - 1, 2.8, hx - 12.5 - lunge, hy + 2.5, 1.5, id.gob, { z0: 16 }); // nose
  // Eye: one, glowing; squeezed shut when hit.
  const ex = hx - 4, ey = hy - 2.5;
  if (flinch) strokes(p, [[ex - 1.5, ey - 0.5, ex + 1.5, ey + 0.5]], C.SOOT, 0.55);
  else {
    const glow = kit === 'shaman' ? C.LILAC : C.YELLOW, dim = kit === 'shaman' ? C.VIOLET_M : C.AMBER;
    p.dot(ex - 1, ey, C.BLACK).dot(ex, ey, glow).dot(ex + 1, ey, dim).dot(ex, ey + 1, dim);
  }
  p.dot(ex - 2, ey - 2.5, C.MOSS_D).dot(ex - 1, ey - 2, C.MOSS_D).dot(ex + 1, ey - 2.2, C.MOSS_D);
  // Grin with a tusk.
  const gy = hy + 4 + lunge;
  for (let x = -8; x <= -1; x++) p.dot(hx + x, gy + Math.round(((x + 4) * (x + 4)) / 20) * (flinch ? -1 : 1), C.SOOT);
  p.dot(hx - 6, gy - 1, C.BONE).dot(hx - 6, gy - 2, C.BONE);
  if (lunge) for (let x = -7; x <= -2; x++) p.dot(hx + x, gy + 1, C.GORE);

  // ---- headgear.
  if (kit === 'grunt') {
    p.poly([[hx - 8, hy - 12], [hx + 7, hy - 12], [hx + 7.5, hy - 4.5], [hx - 8.5, hy - 4.5]], id.tin, { z: 22, normal: [-0.3, -0.2, 1] });
    p.capsule(hx - 9.5, hy - 4.5, 1, hx + 8.5, hy - 4.5, 1, id.steel, { z0: 23 });
    p.capsule(hx - 8, hy - 9, 1, hx - 19, hy - 13 - b * 0.5, 1.2, id.wood, { z0: 21 });  // handle out front
    strokes(p, [[hx - 7, hy - 11.5, hx + 6, hy - 11.5]], C.STEEL_L, 0.5);
  }
  if (kit === 'sapper') {
    p.capsule(hx - 7, hy - 5.5, 1, hx + 7, hy - 4.5, 1, id.leather, { z0: 20 });
    p.ellipse(hx - 4, hy - 6, 3, 2.6, id.steel, { z: 22, depth: 0.6 });
    spot(p, hx - 4, hy - 6, 1.8, 1.5, C.TEAL_D);
    p.dot(hx - 5, hy - 7, C.MINT);
    for (const [x, y] of [[-3, 3], [1, 4], [-1, 5]]) p.dot(hx + x, hy + y, C.MOSS_D);
  }
  if (kit === 'shaman') {
    p.ellipse(hx, hy - 6, 8, 6.5, id.tin, { z: 22, depth: 0.8 });
    p.decal(hx - 9, hy - 13, hx + 9, hy - 3, (x, y) => (y <= hy - 4 && (x + y * 2) % 4 === 0 && y % 2 === 0 ? C.SOOT : -1));
    p.capsule(hx - 9.5, hy - 3.5, 0.9, hx + 9.5, hy - 3.5, 0.9, id.tin, { z0: 23 });
    p.ellipse(hx - 10.5, hy - 4, 1.6, 1.2, id.tin, { z: 23 });
  }
  if (boss) {
    p.poly([[hx - 9, hy - 6], [hx + 9, hy - 6], [hx + 9, hy - 4], [hx - 9, hy - 4]], id.safety, { z: 21, normal: [0, -0.4, 1] });
    p.poly([[hx - 6.5, hy - 6], [hx - 1, hy - 20], [hx + 1, hy - 20], [hx + 6.5, hy - 6]], id.safety, { z: 22, normal: [-0.3, -0.3, 1] });
    p.decal(hx - 7, hy - 15, hx + 7, hy - 9, (x, y) => (y >= Math.round(hy - 13) && y <= Math.round(hy - 11) ? C.WHITE : -1));
  }

  // ---- near arm and weapon, in front of everything.
  const sh = [tx - 2, Y(21)];
  const hand = lunge
    ? (kit === 'shaman' ? [tx - 12, Y(26)] : [tx - 14, Y(17)])
    : [tx - 6, Y(33)];
  const elbow = lunge ? [tx - 8, Y(22)] : [tx - 5, Y(28)];
  p.capsule(...sh, 2.2, ...elbow, 1.8, id.gob, { z0: 24 });
  p.capsule(...elbow, 1.8, ...hand, 1.6, id.gob, { z0: 25 });
  const [x, y] = hand;
  if (kit === 'grunt') {
    const bx = lunge ? x - 7 : x - 3, by = lunge ? y - 4 : y - 10;
    p.capsule(x, y, 1, x, lunge ? y - 2 : y - 4, 1, id.wood, { z0: 26 });
    p.poly([[bx, by], [bx + 7, by - 1], [bx + 7, by + 6], [bx, by + 6]], id.tin, { z: 27, normal: [-0.4, -0.3, 1] });
    strokes(p, [[bx, by + 6, bx + 7, by + 6]], C.STEEL_L, 0.5);
    p.dot(bx + 5, by + 1, C.BLACK);
  }
  if (kit === 'sapper') {
    const [bx, by] = lunge ? [x - 3, y - 4] : [x - 1, y - 4];
    p.ellipse(bx, by, 4, 4, id.bomb, { z: 27 });
    p.capsule(bx - 1, by - 4, 0.8, bx - 2.5, by - 6.5, 0.6, id.leather, { z0: 28 });
    const sp = b ? C.HOT : C.YELLOW;
    p.dot(bx - 3, by - 7, sp).dot(bx - 4, by - 8, C.FIRE).dot(bx - 2, by - 8, C.AMBER);
  }
  if (kit === 'shaman') {
    const top = lunge ? [x - 6, Y(13)] : [x - 1, Y(10)];
    p.capsule(x + (lunge ? 2 : 0), Math.min(G - 1, y + 9), 1, ...top, 1, id.wood, { z0: 26 });
    p.ellipse(top[0], top[1] - 1.5, 1.6, 1.4, id.steel, { z: 28 });
    const br = 3.6 + lunge * 0.8;
    p.ellipse(top[0], top[1] - 5, br, br + 0.4, id.steel, { z: 29 });
    spot(p, top[0], top[1] - 5, br, br + 0.4, lunge || b ? C.HOT : C.YELLOW);
    spot(p, top[0] - 0.5, top[1] - 4.5, br - 1.6, br - 1.4, lunge || b ? C.WHITE : C.HOT);
    p.dot(top[0] + 1.5, top[1] - 7, C.WHITE);
  }
  if (boss) {
    // STOP sign carried on the near side, seen at an angle; bat over it.
    const sx = tx - 5, sy = Y(31), R = 10;
    const oct = [];
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) * (Math.PI / 4);
      oct.push([sx + Math.cos(a) * R * 0.62, sy + Math.sin(a) * R]);
    }
    p.poly(oct, id.sign, { z: 23, normal: [-0.6, -0.1, 0.8] });
    p.decal(sx - R, sy - R - 1, sx + R, sy + R + 1, (px, py) => {
      const u = (px + 0.5 - sx) / 0.62, v = py + 0.5 - sy;
      const d = Math.max(Math.abs(u), Math.abs(v), (Math.abs(u) + Math.abs(v)) / Math.SQRT2);
      return d > R * 0.84 && d < R * 0.97 ? C.BONE : Math.abs(v) < 1 && Math.abs(u) < 6 ? C.WHITE : -1;
    });
    const tip = lunge ? [x - 10, Y(2)] : [x - 3, Y(12)];
    p.capsule(x, y + 2, 1.1, ...tip, 2.2, id.wood, { z0: 30 });
    for (let t = 0.65; t <= 1; t += 0.1) {
      const nx = x + (tip[0] - x) * t, ny = y + 2 + (tip[1] - y - 2) * t;
      p.dot(nx - 2.5, ny, C.STEEL_L).dot(nx + 2.5, ny + 1, C.STEEL_L);
    }
  }
  p.ellipse(...hand, 2.4, 2.2, id.gob, { z: 31 });

  const glowColors = { grunt: [C.YELLOW, C.AMBER], sapper: [C.YELLOW, C.AMBER, C.HOT, C.FIRE], shaman: [C.LILAC, C.VIOLET_M, C.HOT, C.YELLOW, C.WHITE], boss: [C.YELLOW, C.AMBER] }[kit];
  return p.shade(list, { name: `goblin_${kit}_${pose}`, glowColors });
}
