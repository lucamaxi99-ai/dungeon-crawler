// Game over screen over the 3D view (overlay, 320 x 140 HUD pixels): the
// view dithers to black, then the System's verdict and the run's numbers.

import { C } from '../engine/palette.js';
import { BAYER4 } from '../engine/lighting.js';
import { drawText, textWidth, wrapText } from '../engine/font.js';

const W = 320, H = 140;
const FADE_MS = 700;
const READY_MS = 1200; // input is ignored until then, so a held key doesn't skip it

export function gameOverReady(dead, now) {
  return now - dead.at >= READY_MS;
}

// dead: { at, killer, steps, kills, gold, comment }
export function drawGameOver(fb, dead, now) {
  const t = now - dead.at;
  const fade = Math.min(1, t / FADE_MS);
  // Dither to black, with a dark red vignette at the edges.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const b = BAYER4[((y & 3) << 2) | (x & 3)];
      if (b > fade) continue;
      const edge = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2));
      fb.pixels[y * fb.width + x] = edge > 0.85 && b < (edge - 0.85) * 4 ? C.GORE : C.BLACK;
    }
  }
  if (fade < 1) return;

  const title = 'YOU DIED';
  big(fb, title, (W - textWidth(title) * 3) >> 1, 18, C.RED, 3);

  let y = 44;
  for (const l of wrapText(dead.comment, 260)) {
    drawText(fb, l, (W - textWidth(l)) >> 1, y, C.GOLD);
    y += 7;
  }

  y += 6;
  const killer = `KILLED BY: ${dead.killer.toUpperCase()}`;
  drawText(fb, killer, (W - textWidth(killer)) >> 1, y, C.BONE);
  y += 10;
  const numbers = `STEPS ${dead.steps}   KILLS ${dead.kills}   GOLD ${dead.gold}`;
  drawText(fb, numbers, (W - textWidth(numbers)) >> 1, y, C.SILVER);

  if (gameOverReady(dead, now) && Math.floor(now / 500) % 2 === 0) {
    const hint = 'SPACE OR TAP TO TRY AGAIN';
    drawText(fb, hint, (W - textWidth(hint)) >> 1, H - 16, C.FOG);
  }
}

// Text scaled up n times, with a drop shadow.
function big(fb, text, x, y, color, n) {
  const at = (ox) => ({
    set(px, py, c) {
      for (let k = 0; k < n * n; k++) fb.set(x + ox + px * n + (k % n), y + ox + py * n + ((k / n) | 0), c);
    },
  });
  drawText(at(2), text, 0, 0, C.BLOOD_D);
  drawText(at(0), text, 0, 0, color);
}
