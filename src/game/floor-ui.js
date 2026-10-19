// Title card between floors (overlay, 320 x 140 HUD pixels): black with the
// floor's name and a word from the System, then it dithers away and shows
// the new floor.

import { C } from '../engine/palette.js';
import { BAYER4 } from '../engine/lighting.js';
import { drawText, textWidth, wrapText } from '../engine/font.js';
import { big } from './gameover-ui.js';

const W = 320, H = 140;
export const CARD_MS = 2200;   // full card, then it fades
const FADE_MS = 500;
const SKIP_MS = 600;           // SPACE skips the card after this

// card: { at, title, sub, comment }
export function cardDone(card, now) {
  return now - card.at >= CARD_MS + FADE_MS;
}

export function cardSkippable(card, now) {
  return now - card.at >= SKIP_MS;
}

export function drawFloorCard(fb, card, now) {
  const t = now - card.at;
  const cover = t < CARD_MS ? 1 : Math.max(0, 1 - (t - CARD_MS) / FADE_MS);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (BAYER4[((y & 3) << 2) | (x & 3)] < cover) fb.pixels[y * fb.width + x] = C.BLACK;
    }
  }
  if (cover < 1) return;
  big(fb, card.title, (W - textWidth(card.title) * 3) >> 1, 30, C.GOLD, 3);
  if (card.sub) drawText(fb, card.sub, (W - textWidth(card.sub)) >> 1, 54, C.FIRE);
  let y = 68;
  for (const l of wrapText(card.comment, 250)) {
    drawText(fb, l, (W - textWidth(l)) >> 1, y, C.BONE);
    y += 7;
  }
}
