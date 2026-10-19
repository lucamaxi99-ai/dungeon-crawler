// Achievement pop-ups (overlay, HUD pixels): a plaque slides down under the
// compass, shows the title and the reward, and slides away again. Several
// achievements at once queue up. While something else owns the screen
// (combat, title card, game over) the queue waits.

import { C } from '../engine/palette.js';
import { drawText, textWidth } from '../engine/font.js';
import { ITEMS } from './items.js';
import { TIER, boxName } from './lootboxes.js';

const W = 320;
const SLIDE_MS = 220;
const HOLD_MS = 3600;
const TOTAL_MS = SLIDE_MS * 2 + HOLD_MS;

// Text scaled 2x with a black shadow.
function text2(fb, str, x, y, color) {
  const at = (o, c) => ({
    set(px, py) { for (let k = 0; k < 4; k++) fb.set(x + o + px * 2 + (k & 1), y + o + py * 2 + (k >> 1), c); },
  });
  drawText(at(1, C.BLACK), str, 0, 0, C.BLACK);
  drawText(at(0, color), str, 0, 0, color);
}

// What the reward line says, and in which color.
export function rewardLabel(reward) {
  if (!reward) return { text: 'REWARD: NONE', color: C.ASH };
  if (reward.box) return { text: `REWARD: ${boxName(reward.box).toUpperCase()}`, color: TIER[reward.box].color };
  return { text: `REWARD: ${ITEMS[reward.item].name.toUpperCase()}`, color: C.BONE };
}

// A tiny five-pointed star (7 x 7) for the plaque's corners.
function star(fb, x, y, c) {
  fb.set(x + 3, y, c); fb.set(x + 3, y + 1, c);
  for (let i = 0; i < 7; i++) fb.set(x + i, y + 2, c);
  fb.rect(x + 1, y + 3, 5, 1, c);
  fb.rect(x + 2, y + 4, 3, 1, c);
  fb.set(x + 1, y + 5, c); fb.set(x + 5, y + 5, c);
  fb.set(x, y + 6, c); fb.set(x + 6, y + 6, c);
}

export class AchievementPopups {
  constructor() {
    this.queue = [];
    this.current = null; // { a, at }
  }

  push(a) { this.queue.push(a); }
  clear() { this.queue = []; this.current = null; }
  get busy() { return !!this.current || this.queue.length > 0; }

  // paused: something else owns the screen; the plaque waits off screen.
  draw(fb, now, paused) {
    if (paused) { if (this.current) this.current.at = now; return; }
    if (!this.current && this.queue.length) this.current = { a: this.queue.shift(), at: now };
    if (!this.current) return;
    const t = now - this.current.at;
    if (t > TOTAL_MS) { this.current = null; return; }
    const { a } = this.current;
    const reward = rewardLabel(a.reward);
    const title = a.name.toUpperCase();
    const w = Math.max(textWidth(title) * 2, textWidth(reward.text), 96) + 28;
    const h = 30;
    const x = (W - w) >> 1;
    const slide = t < SLIDE_MS ? t / SLIDE_MS : t > TOTAL_MS - SLIDE_MS ? (TOTAL_MS - t) / SLIDE_MS : 1;
    const y = Math.round(-h + (h + 12) * slide);
    const glow = a.reward && a.reward.box ? TIER[a.reward.box].color : C.GOLD;
    fb.bevel(x, y, w, h, C.NIGHT, glow, C.BLACK);
    fb.rect(x + 2, y + 2, w - 4, 1, C.SHADOW);
    const head = 'ACHIEVEMENT UNLOCKED!';
    const blink = t < 900 && Math.floor(t / 110) % 2;
    drawText(fb, head, (W - textWidth(head)) >> 1, y + 4, blink ? C.WHITE : C.GOLD);
    text2(fb, title, (W - textWidth(title) * 2) >> 1, y + 11, C.WHITE);
    drawText(fb, reward.text, (W - textWidth(reward.text)) >> 1, y + h - 7, reward.color);
    star(fb, x + 4, y + 11, glow);
    star(fb, x + w - 11, y + 11, glow);
  }
}
