// Character sheet ("C"): the crawler's level, its five attributes and what
// they do, as a window over the 3D view (HUD overlay, 320 x 140 HUD pixels).
// With unspent points, UP/DOWN picks an attribute and SPACE raises it.

import { C } from '../engine/palette.js';
import { drawText, textWidth } from '../engine/font.js';
import { ATTRS, ATTR_NAMES } from './crawler.js';
import { RULES } from './combat.js';

const WIN = { x: 2, y: 2, w: 316, h: 136 };
const LEFT = 8, RIGHT = 188;
const ROW0 = 20, ROW_H = 20;          // attribute rows
const PIPS = 126, PLUS = 168;         // pip bar and the [+] button

// What each attribute does, in the System's words.
const BLURB = {
  str: 'Hit harder. Lift heavier regrets.',
  int: 'Mana for spells. Spells sold separately.',
  con: 'Hit points and healing. Staying alive.',
  dex: 'Aim, dodging, going first, running away.',
  cha: 'Viewers and merchants care. Eventually.',
};

const CLOSE = { label: 'C CLOSE' };

export class CharacterScreen {
  constructor() {
    this.open = false;
    this.cursor = 0;   // selected attribute (only shown with points to spend)
  }

  toggle() {
    this.open = !this.open;
  }

  move(dir) {
    if (dir === 'up') this.cursor = (this.cursor + ATTRS.length - 1) % ATTRS.length;
    if (dir === 'down') this.cursor = (this.cursor + 1) % ATTRS.length;
  }

  selected() {
    return ATTRS[this.cursor];
  }

  // Mouse/touch. Returns { kind: 'raise', attr } for a tap on an attribute
  // row, { kind: 'button', id: 'close' } for the close button, otherwise
  // { kind: 'outside' }.
  hit(px, py) {
    const b = closeBox();
    if (px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h) return { kind: 'button', id: 'close' };
    const i = Math.floor((py - ROW0 + 2) / ROW_H);
    if (px >= LEFT && px < RIGHT - 8 && i >= 0 && i < ATTRS.length) {
      this.cursor = i;
      return { kind: 'raise', attr: ATTRS[i] };
    }
    return { kind: 'outside' };
  }

  // crawler: Crawler. record: { steps, gold }.
  draw(fb, crawler, record, now = 0) {
    if (!this.open) return;
    fb.bevel(WIN.x, WIN.y, WIN.w, WIN.h, C.NIGHT, C.STONE_M, C.BLACK);
    fb.bevel(WIN.x + 1, WIN.y + 1, WIN.w - 2, WIN.h - 2, C.NIGHT, C.STONE_D, C.STONE_D);
    drawText(fb, 'CRAWLER', LEFT, 6, C.GOLD, C.BLACK);

    // Level and the way to the next one.
    const lvl = `LEVEL ${crawler.level}`;
    const xp = `XP ${crawler.xp}/${crawler.xpNext}`;
    const right = WIN.x + WIN.w - 6;
    drawText(fb, xp, right - textWidth(xp), 6, C.BONE);
    drawText(fb, lvl, right - textWidth(xp) - 8 - textWidth(lvl), 6, C.YELLOW);
    fb.rect(LEFT, 13, WIN.w - 12, 1, C.STONE_D);
    fb.rect(LEFT, 13, Math.round((WIN.w - 12) * crawler.xpShare), 1, C.GOLD);

    // Attributes: name, value, pips, what it does.
    const spend = crawler.points > 0;
    ATTRS.forEach((a, i) => {
      const y = ROW0 + i * ROW_H;
      const v = crawler[a];
      const sel = spend && i === this.cursor;
      if (sel) {
        fb.rect(LEFT - 3, y - 2, RIGHT - LEFT - 6, ROW_H - 1, C.SHADOW);
        drawText(fb, '>', LEFT - 2, y, C.YELLOW);
      }
      const x = sel ? LEFT + 3 : LEFT;
      drawText(fb, ATTR_NAMES[a].toUpperCase(), x, y, sel ? C.YELLOW : C.BONE);
      drawText(fb, a.toUpperCase(), LEFT + 66, y, C.ASH);
      const vs = String(v);
      drawText(fb, vs, 120 - textWidth(vs), y, C.YELLOW);
      // Ten pips; above ten they fill again in a brighter color.
      for (let k = 0; k < 10; k++) {
        const c = k < v - 10 ? C.YELLOW : k < v ? C.GOLD : C.SHADOW;
        fb.rect(PIPS + k * 4, y + 1, 3, 3, c);
      }
      if (spend) {
        fb.bevel(PLUS, y - 1, 9, 7, sel ? C.GOLD : C.STONE_D, sel ? C.YELLOW : C.STONE_M, C.BLACK);
        drawText(fb, '+', PLUS + 3, y, sel ? C.BLACK : C.BONE);
      }
      drawText(fb, BLURB[a], LEFT, y + 7, a === 'cha' ? C.ASH : C.FOG);
    });

    // Derived values.
    fb.rect(RIGHT - 6, 16, 1, 104, C.STONE_D);
    const pct = (x) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;
    const dexBonus = RULES.dexHit * (crawler.dex - 5);
    const rows = [
      ['HIT POINTS', `${crawler.hp}/${crawler.hpMax}`, C.RED],
      ['MANA', `${crawler.mp}/${crawler.mpMax}`, C.SKY],
      ['ATTACK', String(crawler.atk), C.BONE],
      ['DEFENSE', String(crawler.def), C.BONE],
      ['AIM / DODGE', `${pct(dexBonus)} / ${pct(dexBonus)}`, C.BONE],
      ['INITIATIVE', `D6+${crawler.dex}`, C.BONE],
      ['REGENERATION', `1 PER ${crawler.regenSteps} STEPS`, C.BONE],
      null,
      ['KILLS', String(crawler.kills), C.BONE],
      ['STEPS', String(record.steps), C.BONE],
      ['GOLD', String(record.gold), C.YELLOW],
    ];
    rows.forEach((r, i) => {
      if (!r) return;
      const y = 18 + i * 9;
      drawText(fb, r[0], RIGHT, y, C.FOG);
      drawText(fb, r[1], right - textWidth(r[1]), y, r[2]);
    });

    // Unspent points and the close button.
    if (spend) {
      const blink = Math.floor(now / 500) % 2 === 0;
      const p = `${crawler.points} POINT${crawler.points > 1 ? 'S' : ''} TO SPEND - SPACE RAISES`;
      drawText(fb, p, LEFT, 126, blink ? C.YELLOW : C.GOLD);
    }
    const b = closeBox();
    fb.bevel(b.x, b.y, b.w, b.h, C.STONE_D, C.STONE_M, C.BLACK);
    drawText(fb, 'C', b.x + 3, b.y + 3, C.GOLD);
    drawText(fb, 'CLOSE', b.x + 11, b.y + 3, C.BONE);
  }
}

function closeBox() {
  const w = textWidth(CLOSE.label) + 6;
  return { x: WIN.x + WIN.w - 6 - w, y: 123, w, h: 11 };
}
