// Opening loot boxes in the Safe Room (overlay, HUD pixels): the terminal
// lists the boxes; the chosen one drops onto the bar counter, shakes, bursts
// open in a flash of rays, and a card shows what was inside, item by item.

import { C } from '../engine/palette.js';
import { drawText, textWidth } from '../engine/font.js';
import { ITEMS, RARITY } from './items.js';
import { ICONS } from './icons.js';
import { TIER, boxName } from './lootboxes.js';
import { BOX_ART, paintLootBox } from './lootbox-art.js';

// Timeline of an opening, in ms.
const T = { drop: 450, shake: 1350, flash: 1550, card: 1750, perItem: 260 };
export const BOX_SPOT = { x: 160, y: 72 };   // the box on the counter (top left)
const CARD = { x: 4, y: 34, w: 154 };

const sprites = {};
function boxSprite(tier, frame, open) {
  const key = `${tier}_${open ? 'o' : frame}`;
  if (!sprites[key]) sprites[key] = paintLootBox(tier, frame, { open });
  return sprites[key];
}

// opening: { box, loot: { gold, items }, at }. Done once the card shows
// every item (then SPACE goes on).
export function openingDone(opening, now) {
  return now - opening.at >= T.card + opening.loot.items.length * T.perItem + 300;
}

export function drawOpening(fb, opening, now) {
  const t = now - opening.at;
  const tier = opening.box.tier;
  const glow = BOX_ART[tier].glow;
  const cx = BOX_SPOT.x + 17, cy = BOX_SPOT.y + 16;
  if (t >= T.flash) rays(fb, cx, cy, glow, now, t < T.card ? 1 : 0.6);
  if (t < T.drop) {
    // Falls from above and bounces once.
    const k = t / T.drop;
    const y = Math.round(-32 + (BOX_SPOT.y + 32) * k * k);
    fb.blit(boxSprite(tier, 0, false), BOX_SPOT.x, Math.min(BOX_SPOT.y, y));
  } else if (t < T.flash) {
    // Shakes harder and pulses faster until it bursts.
    const k = (t - T.drop) / (T.flash - T.drop);
    const jx = Math.floor(t / 50) % 2 ? Math.round(k * 2) : -Math.round(k * 2);
    const frame = Math.floor(t / (180 - k * 140)) % 3;
    fb.blit(boxSprite(tier, frame, false), BOX_SPOT.x + jx, BOX_SPOT.y - (k > 0.7 && Math.floor(t / 70) % 2 ? 1 : 0));
  } else {
    fb.blit(boxSprite(tier, 0, true), BOX_SPOT.x, BOX_SPOT.y);
    if (t < T.card) burst(fb, cx, cy, (t - T.flash) / (T.card - T.flash), glow);
  }
  if (t >= T.card) drawCard(fb, opening, t - T.card, now);
}

// Light rays turning slowly behind the box.
function rays(fb, cx, cy, color, now, strength) {
  const n = 10, a0 = now / 2400;
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * Math.PI * 2;
    for (let r = 12; r < 44 * strength + 12; r++) {
      if ((r + k) % 3 === 0) continue;
      const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r * 0.8);
      if (y < 100 && x < 209) fb.set(x, y, r > 34 ? C.WHITE : color);
    }
  }
}

// The moment it bursts: a ring of white and tier-colored sparks.
function burst(fb, cx, cy, k, color) {
  const r = 6 + k * 30;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r * 0.8);
    fb.rect(x, y, 2, 2, i % 2 ? C.WHITE : color);
  }
}

function drawCard(fb, opening, t, now) {
  const { box, loot } = opening;
  const rows = loot.items.length + 1;
  const h = 18 + rows * 15;
  const { x, y, w } = CARD;
  const slide = Math.min(1, t / 160);
  const cy = Math.round(y - (1 - slide) * 20);
  const color = TIER[box.tier].color;
  fb.bevel(x, cy, w, h, C.NIGHT, color, C.BLACK);
  fb.rect(x + 2, cy + 2, w - 4, 1, C.SHADOW);
  const title = boxName(box.tier, box.sponsored).toUpperCase();
  drawText(fb, title, x + 6, cy + 5, color);
  const shown = Math.floor(t / T.perItem) + 1;
  loot.items.forEach((s, i) => {
    if (i >= shown) return;
    const ry = cy + 15 + i * 15;
    const def = ITEMS[s.id];
    fb.bevel(x + 5, ry, 14, 14, C.BLACK, C.NIGHT, C.STONE_D);
    if (ICONS[s.id]) fb.blit(ICONS[s.id], x + 6, ry + 1);
    const name = `${s.n > 1 ? `${s.n}X ` : ''}${def.name.toUpperCase()}`;
    drawText(fb, name, x + 23, ry + 2, RARITY[def.rarity].color);
    drawText(fb, RARITY[def.rarity].name.toUpperCase(), x + 23, ry + 8, C.ASH);
  });
  if (shown > loot.items.length) {
    const gy = cy + 15 + loot.items.length * 15;
    drawText(fb, `+${loot.gold} GOLD`, x + 23, gy + 4, C.YELLOW);
    coin(fb, x + 9, gy + 3);
  }
  if (openingDone(opening, now) && Math.floor(now / 500) % 2 === 0) drawText(fb, 'SPACE', x + w - 6 - textWidth('SPACE'), cy + h - 8, C.FOG);
}

function coin(fb, x, y) {
  fb.rect(x + 1, y, 4, 7, C.GOLD);
  fb.rect(x, y + 1, 6, 5, C.GOLD);
  fb.rect(x + 2, y + 2, 2, 3, C.YELLOW);
  fb.set(x + 1, y + 1, C.HOT);
}

// The box list on the terminal. boxes: [{ tier, sponsored, from }].
export function drawBoxList(fb, term, boxes, cursor, now) {
  const { x, y, w, h } = term;
  drawText(fb, 'LOOT BOXES', x + 7, y + 7, C.MINT);
  const n = String(boxes.length);
  drawText(fb, n, x + w - 7 - textWidth(n), y + 7, C.YELLOW);
  fb.rect(x + 6, y + 14, w - 12, 1, C.TEAL_D);
  const rows = 8, top = Math.max(0, Math.min(cursor - rows + 1, boxes.length - rows));
  boxes.slice(Math.max(0, top), Math.max(0, top) + rows).forEach((b, j) => {
    const i = Math.max(0, top) + j;
    const ry = y + 19 + j * 11;
    if (i === cursor) fb.rect(x + 5, ry - 2, w - 10, 10, C.TEAL_D);
    fb.rect(x + 8, ry, 5, 5, TIER[b.tier].color);
    fb.rect(x + 8, ry + 2, 5, 1, C.BLACK);
    drawText(fb, TIER[b.tier].name.toUpperCase(), x + 16, ry, i === cursor ? C.WHITE : C.BONE);
    if (b.sponsored) drawText(fb, 'SPONSOR', x + w - 8 - textWidth('SPONSOR'), ry, C.NEON);
  });
  const blink = Math.floor(now / 450) % 2 === 0;
  drawText(fb, 'SPACE OPENS', x + 8, y + h - 19, blink ? C.TEAL_M : C.TEAL);
  drawText(fb, 'ESC BACK', x + 8, y + h - 12, C.ASH);
}
