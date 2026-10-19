// Character sheet ("C"): the crawler's five attributes and what they do,
// as a window over the 3D view (HUD overlay, 320 x 140 HUD pixels).

import { C } from '../engine/palette.js';
import { drawText, textWidth } from '../engine/font.js';
import { ATTRS, ATTR_NAMES } from './crawler.js';
import { RULES } from './combat.js';

const WIN = { x: 2, y: 2, w: 316, h: 136 };
const LEFT = 8, RIGHT = 188;

// What each attribute does, in the System's words.
const BLURB = {
  str: 'Hit harder. Lift heavier regrets.',
  int: 'Mana for spells. Spells sold separately.',
  con: 'Hit points and healing. Staying alive.',
  dex: 'Aim, dodging, going first, running away.',
  cha: 'Viewers and merchants care. Eventually.',
};

export class CharacterScreen {
  constructor() {
    this.open = false;
    this.button = null;
  }

  toggle() {
    this.open = !this.open;
  }

  // Any tap closes it (the window has only one button anyway).
  hit() {
    return { kind: 'button', id: 'close' };
  }

  // crawler: Crawler. record: { steps, gold }.
  draw(fb, crawler, record) {
    if (!this.open) return;
    fb.bevel(WIN.x, WIN.y, WIN.w, WIN.h, C.NIGHT, C.STONE_M, C.BLACK);
    fb.bevel(WIN.x + 1, WIN.y + 1, WIN.w - 2, WIN.h - 2, C.NIGHT, C.STONE_D, C.STONE_D);
    drawText(fb, 'CRAWLER', LEFT, 6, C.GOLD, C.BLACK);
    // TODO(M5): level and experience.
    const lvl = 'LEVEL 1   XP --';
    drawText(fb, lvl, WIN.x + WIN.w - 6 - textWidth(lvl), 6, C.ASH);
    fb.rect(LEFT, 13, WIN.w - 12, 1, C.STONE_D);

    // Attributes: name, value, pips, what it does.
    ATTRS.forEach((a, i) => {
      const y = 18 + i * 21;
      const v = crawler[a];
      drawText(fb, ATTR_NAMES[a].toUpperCase(), LEFT, y, C.BONE);
      drawText(fb, a.toUpperCase(), LEFT + 64, y, C.ASH);
      const vs = String(v);
      drawText(fb, vs, 120 - textWidth(vs), y, C.YELLOW);
      for (let k = 0; k < 10; k++) fb.rect(126 + k * 5, y + 1, 4, 3, k < v ? C.GOLD : C.SHADOW);
      drawText(fb, BLURB[a], LEFT, y + 8, a === 'cha' ? C.ASH : C.FOG);
    });

    // Derived values.
    fb.rect(RIGHT - 6, 16, 1, 102, C.STONE_D);
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
      drawText(fb, r[1], WIN.x + WIN.w - 6 - textWidth(r[1]), y, r[2]);
    });

    // Close button.
    const label = 'C CLOSE', bx = WIN.x + WIN.w - 6 - textWidth(label) - 6, by = 123;
    fb.bevel(bx, by, textWidth(label) + 6, 11, C.STONE_D, C.STONE_M, C.BLACK);
    drawText(fb, 'C', bx + 3, by + 3, C.GOLD);
    drawText(fb, 'CLOSE', bx + 11, by + 3, C.BONE);
  }
}
