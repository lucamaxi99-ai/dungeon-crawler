// End of a run over the 3D view (overlay, 320 x 140 HUD pixels): the view
// dithers to black, then the System's verdict and the run's numbers. Used
// for death and for surviving the last floor (won: true).

import { C } from '../engine/palette.js';
import { BAYER4 } from '../engine/lighting.js';
import { drawText, textWidth, wrapText } from '../engine/font.js';

const W = 320, H = 140;
const FADE_MS = 700;
const READY_MS = 1200; // input is ignored until then, so a held key doesn't skip it

export function gameOverReady(dead, now) {
  return now - dead.at >= READY_MS;
}

// dead: { at, won, killer, depth, level, steps, kills, gold, comment, viewers, achievements, record, nextRerun, unlocked }
export function drawGameOver(fb, dead, now) {
  const t = now - dead.at;
  const fade = Math.min(1, t / FADE_MS);
  // Dither to black, with a dark red vignette at the edges.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const b = BAYER4[((y & 3) << 2) | (x & 3)];
      if (b > fade) continue;
      const edge = Math.max(Math.abs(x - W / 2) / (W / 2), Math.abs(y - H / 2) / (H / 2));
      fb.pixels[y * fb.width + x] = edge > 0.85 && b < (edge - 0.85) * 4 ? (dead.won ? C.LEATHER : C.GORE) : C.BLACK;
    }
  }
  if (fade < 1) return;

  const title = dead.won ? 'YOU SURVIVED' : 'YOU DIED';
  big(fb, title, (W - textWidth(title) * 3) >> 1, 18, dead.won ? C.GOLD : C.RED, 3);

  let y = 44;
  for (const l of wrapText(dead.comment, 260)) {
    drawText(fb, l, (W - textWidth(l)) >> 1, y, C.GOLD);
    y += 7;
  }

  y += 6;
  const killer = dead.won ? `FLOOR ${dead.depth} CLEARED. SEASON OVER... FOR NOW.` : `KILLED BY: ${dead.killer.toUpperCase()} ON FLOOR ${dead.depth}`;
  drawText(fb, killer, (W - textWidth(killer)) >> 1, y, C.BONE);
  y += 10;
  const numbers = `LEVEL ${dead.level}   STEPS ${dead.steps}   KILLS ${dead.kills}   GOLD ${dead.gold}`;
  drawText(fb, numbers, (W - textWidth(numbers)) >> 1, y, C.SILVER);
  if (dead.viewers != null) {
    y += 8;
    const show = `PEAK VIEWERS ${dead.viewers}   ACHIEVEMENTS ${dead.achievements}`;
    drawText(fb, show, (W - textWidth(show)) >> 1, y, C.NEON);
  }
  // Borant Encore (GDD 2.1): the soul goes back on the shelf for the rerun.
  if (dead.record) {
    y += 10;
    const rec = `NEW PERSONAL RECORD: FLOOR ${dead.depth}`;
    drawText(fb, rec, (W - textWidth(rec)) >> 1, y, C.GOLD);
  }
  for (const job of dead.unlocked || []) {
    y += 8;
    const t = `NEW JOB UNLOCKED: ${job.toUpperCase()}`;
    drawText(fb, t, (W - textWidth(t)) >> 1, y, C.LIME);
  }
  if (dead.nextRerun) {
    y += dead.record ? 8 : 10;
    const next = `SOUL BACKUP SAVED. RERUN ${dead.nextRerun} IN PREPARATION`;
    drawText(fb, next, (W - textWidth(next)) >> 1, y, C.TEAL_M);
  }

  if (gameOverReady(dead, now) && Math.floor(now / 500) % 2 === 0) {
    const hint = dead.nextRerun ? 'SPACE OR TAP TO START THE RERUN' : 'SPACE OR TAP FOR A NEW RUN';
    drawText(fb, hint, (W - textWidth(hint)) >> 1, H - 16, C.FOG);
  }
}

// Text scaled up n times, with a drop shadow.
export function big(fb, text, x, y, color, n) {
  const at = (ox) => ({
    set(px, py, c) {
      for (let k = 0; k < n * n; k++) fb.set(x + ox + px * n + (k % n), y + ox + py * n + ((k / n) | 0), c);
    },
  });
  drawText(at(2), text, 0, 0, C.BLOOD_D);
  drawText(at(0), text, 0, 0, color);
}
