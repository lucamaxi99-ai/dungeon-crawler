// Character sheet ("C"): a window over the 3D view (HUD overlay, 320 x 140
// HUD pixels) with two tabs, switched with LEFT/RIGHT or a tap:
//   STATS   level, the five attributes and what they do. With unspent
//           points, UP/DOWN picks an attribute and SPACE raises it.
//   SKILLS  skills and spells with their level, progress and effect.
//           SPACE casts the selected spell if it works outside combat.

import { C } from '../engine/palette.js';
import { drawText, textWidth } from '../engine/font.js';
import { ATTRS, ATTR_NAMES } from './crawler.js';
import { RULES } from './combat.js';
import { SKILLS } from './skills.js';
import { SPELLS } from './spells.js';
import { MASTERY } from './mastery.js';

const TABS = [{ id: 'stats', label: 'STATS' }, { id: 'skills', label: 'SKILLS' }];
const LIST_Y = 27, LIST_H = 15, LIST_ROWS = 6;  // skills tab rows
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
  cha: 'More viewers, and they stay longer.',
};

const CLOSE = { label: 'C CLOSE' };

export class CharacterScreen {
  constructor() {
    this.open = false;
    this.tab = 'stats';
    this.cursor = 0;      // selected attribute (only shown with points to spend)
    this.spellCursor = 0; // selected spell on the skills tab
    this.canSpend = false; // points are only spent in a Safe Room
  }

  toggle(tab) {
    this.open = !this.open;
    if (this.open && tab) this.tab = tab;
  }

  // dir: 'up' | 'down' | 'left' | 'right'. n: number of spells known.
  move(dir, n = 1) {
    if (dir === 'left' || dir === 'right') {
      const i = TABS.findIndex((t) => t.id === this.tab);
      this.tab = TABS[(i + (dir === 'left' ? TABS.length - 1 : 1)) % TABS.length].id;
      return;
    }
    const d = dir === 'up' ? -1 : 1;
    if (this.tab === 'skills') this.spellCursor = (this.spellCursor + d + n) % Math.max(1, n);
    else this.cursor = (this.cursor + d + ATTRS.length) % ATTRS.length;
  }

  selected() {
    return ATTRS[this.cursor];
  }

  // Mouse/touch. Returns { kind: 'raise', attr } for a tap on an attribute
  // row, { kind: 'cast', index } for a spell on the skills tab, { kind: 'tab' }
  // for a tab, { kind: 'button', id: 'close' } for the close button,
  // otherwise { kind: 'outside' }.
  hit(px, py) {
    const b = closeBox();
    if (px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h) return { kind: 'button', id: 'close' };
    const tab = tabBoxes().find((t) => px >= t.x && px < t.x + t.w && py >= t.y && py < t.y + t.h);
    if (tab) { this.tab = tab.id; return { kind: 'tab' }; }
    if (this.tab === 'skills') {
      const j = Math.floor((py - LIST_Y + 1) / LIST_H);
      if (px >= RIGHT - 2 && j >= 0 && j < LIST_ROWS) { this.spellCursor = j; return { kind: 'cast', index: j }; }
      return { kind: 'outside' };
    }
    const i = Math.floor((py - ROW0 + 2) / ROW_H);
    if (px >= LEFT && px < RIGHT - 8 && i >= 0 && i < ATTRS.length) {
      this.cursor = i;
      return { kind: 'raise', attr: ATTRS[i] };
    }
    return { kind: 'outside' };
  }

  // crawler: Crawler. record: { steps, gold, name, job }.
  draw(fb, crawler, record, now = 0) {
    if (!this.open) return;
    fb.bevel(WIN.x, WIN.y, WIN.w, WIN.h, C.NIGHT, C.STONE_M, C.BLACK);
    fb.bevel(WIN.x + 1, WIN.y + 1, WIN.w - 2, WIN.h - 2, C.NIGHT, C.STONE_D, C.STONE_D);
    for (const t of tabBoxes()) {
      const on = t.id === this.tab;
      if (on) fb.rect(t.x, t.y, t.w, t.h, C.SHADOW);
      drawText(fb, t.label, t.x + 2, t.y + 2, on ? C.GOLD : C.ASH, on ? C.BLACK : -1);
      if (t.id === 'stats' && crawler.points > 0 && !on) fb.rect(t.x + t.w - 2, t.y + 1, 2, 2, C.YELLOW);
    }

    // Level and the way to the next one.
    const lvl = `LEVEL ${crawler.level}`;
    const xp = `XP ${crawler.xp}/${crawler.xpNext}`;
    const right = WIN.x + WIN.w - 6;
    drawText(fb, xp, right - textWidth(xp), 6, C.BONE);
    drawText(fb, lvl, right - textWidth(xp) - 8 - textWidth(lvl), 6, C.YELLOW);
    // Who this is: the name and former job from the intake form.
    if (record.name) {
      const who = record.job ? `${record.name}, ${record.job.toUpperCase()}` : record.name;
      const x0 = 80, x1 = right - textWidth(xp) - 16 - textWidth(lvl);
      if (textWidth(who) <= x1 - x0) drawText(fb, who, x0 + ((x1 - x0 - textWidth(who)) >> 1), 6, C.BONE);
    }
    fb.rect(LEFT, 13, WIN.w - 12, 1, C.STONE_D);
    fb.rect(LEFT, 13, Math.round((WIN.w - 12) * crawler.xpShare), 1, C.GOLD);
    if (this.tab === 'skills') this.drawSkills(fb, crawler);
    else this.drawStats(fb, crawler, record, now);
    const b = closeBox();
    fb.bevel(b.x, b.y, b.w, b.h, C.STONE_D, C.STONE_M, C.BLACK);
    drawText(fb, 'C', b.x + 3, b.y + 3, C.GOLD);
    drawText(fb, 'CLOSE', b.x + 11, b.y + 3, C.BONE);
  }

  // Skills on the left, spells on the right: name, level, a progress line
  // toward the next level and what it does at the current level.
  drawSkills(fb, crawler) {
    const right = WIN.x + WIN.w - 6;
    const skills = crawler.skills.list();
    const spells = crawler.spells.list();
    drawText(fb, 'SKILLS', LEFT, 18, C.GOLD);
    drawText(fb, 'SPELLS', RIGHT, 18, C.GOLD);
    const mpText = `MP ${crawler.mp}/${crawler.mpMax}`;
    drawText(fb, mpText, right - textWidth(mpText), 18, C.SKY);
    fb.rect(RIGHT - 6, 16, 1, 104, C.STONE_D);
    const row = (x, y, w, name, tag, L, progress, info, sel, color) => {
      if (sel) fb.rect(x - 3, y - 2, w + 5, LIST_H - 1, C.SHADOW);
      drawText(fb, name, x, y, sel ? C.YELLOW : color);
      const lv = L >= MASTERY.max ? 'MAX' : `LV ${L}`;
      drawText(fb, lv, x + w - textWidth(lv), y, C.YELLOW);
      if (tag) drawText(fb, tag, x + w - textWidth(lv) - 6 - textWidth(tag), y, C.ASH);
      fb.rect(x, y + 6, w, 1, C.NIGHT);
      fb.rect(x, y + 6, Math.round(w * progress), 1, C.GOLD);
      drawText(fb, info, x, y + 8, C.FOG);
    };
    skills.slice(0, LIST_ROWS).forEach((id, i) => {
      const def = SKILLS[id], L = crawler.skills.level(id);
      row(LEFT, LIST_Y + i * LIST_H, RIGHT - LEFT - 12, def.name.toUpperCase(), def.active ? 'ACTIVE' : 'PASSIVE',
        L, crawler.skills.progress(id), def.info(L, crawler), false, C.BONE);
    });
    if (skills.length > LIST_ROWS) drawText(fb, `+${skills.length - LIST_ROWS} MORE`, LEFT, LIST_Y + LIST_ROWS * LIST_H, C.ASH);
    if (this.spellCursor >= spells.length) this.spellCursor = 0;
    spells.slice(0, LIST_ROWS).forEach((id, i) => {
      const def = SPELLS[id], L = crawler.spells.level(id);
      const name = (def.name.length > 18 ? def.short || def.name : def.name).toUpperCase();
      row(RIGHT, LIST_Y + i * LIST_H, right - RIGHT, name, `${def.mp}MP`, L, crawler.spells.progress(id),
        def.info(L, crawler).replace(', NEVER MISSES', ''), i === this.spellCursor, C.BONE);
    });
    const sel = SPELLS[spells[this.spellCursor]];
    if (sel && sel.act(1, crawler).target === 'self') drawText(fb, `SPACE CASTS ${(sel.short || sel.name).toUpperCase()} - COSTS A TURN`, LEFT, 126, C.FOG);
    else if (skills.length) drawText(fb, 'SKILLS GROW WHEN USED. SO DO GRUDGES.', LEFT, 126, C.ASH);
  }

  drawStats(fb, crawler, record, now) {
    const right = WIN.x + WIN.w - 6;

    // Attributes: name, value, pips, what it does.
    const spend = crawler.points > 0 && this.canSpend;
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
    if (crawler.points > 0) {
      const blink = Math.floor(now / 500) % 2 === 0;
      const n = `${crawler.points} POINT${crawler.points > 1 ? 'S' : ''}`;
      const p = spend ? `${n} TO SPEND - SPACE RAISES` : `${n} TO SPEND IN A SAFE ROOM`;
      drawText(fb, p, LEFT, 126, blink ? C.YELLOW : C.GOLD);
    }
  }
}

function tabBoxes() {
  let x = LEFT - 2;
  return TABS.map((t) => {
    const b = { ...t, x, y: 4, w: textWidth(t.label) + 4, h: 8 };
    x += b.w + 3;
    return b;
  });
}

function closeBox() {
  const w = textWidth(CLOSE.label) + 6;
  return { x: WIN.x + WIN.w - 6 - w, y: 123, w, h: 11 };
}
