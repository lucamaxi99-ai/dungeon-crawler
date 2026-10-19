// The crawler intake form (overlay, 320 x 140 HUD pixels, opaque): shown at
// the start of every run. A name (the same soul keeps its name from rerun to
// rerun, GDD 2.1) and a former job (jobs.js). Locked jobs show how to get
// them. Rows: NAME, the jobs, START.
//
// Typing the name goes through a hidden text field that main.js owns (so
// phones get their keyboard); this screen only shows it.

import { C } from '../engine/palette.js';
import { drawText, textWidth, wrapText } from '../engine/font.js';
import { ATTRS, ATTR_NAMES, START, DERIVE } from './crawler.js';
import { JOBS, JOB_BONUS, NAMES, startAttrs } from './jobs.js';

const W = 320, H = 140;
const L = 8;                                   // left column
const R = 166, RW = 146;                       // right column (details)
export const NAME_BOX = { x: L, y: 25, w: 140, h: 11 };
const JOB_Y = 55, JOB_H = 10;
export const START_BOX = { x: L, y: 113, w: 140, h: 15 };

export class CreationScreen {
  constructor() {
    this.open = false;
    this.editing = false;
  }

  // opts: { name, rerun, isOpen(job) -> bool, fresh (Set of job ids just unlocked) }
  show({ name, rerun = 0, isOpen = () => true, fresh = new Set(), job = 'barista' }) {
    this.open = true;
    this.editing = false;
    this.rerun = rerun;
    this.isOpen = isOpen;
    this.fresh = fresh;
    this.name = name || this.randomName();
    this.job = isOpen(JOBS.find((j) => j.id === job) || JOBS[0]) ? job : JOBS[0].id;
    this.cursor = 0;
  }

  close() { this.open = false; this.editing = false; }

  get rows() { return JOBS.length + 2; }
  rowJob(i) { return i >= 1 && i <= JOBS.length ? JOBS[i - 1] : null; }

  randomName() {
    let n;
    do n = NAMES[Math.floor(Math.random() * NAMES.length)]; while (n === this.name && NAMES.length > 1);
    return n;
  }

  // The job the details pane shows: the one under the cursor, else the chosen one.
  get shown() { return this.rowJob(this.cursor) || JOBS.find((j) => j.id === this.job); }

  // dir: 'up' | 'down' | 'left' | 'right'.
  move(dir) {
    if (dir === 'left' || dir === 'right') {
      if (this.cursor === 0) this.name = this.randomName();
      return;
    }
    this.cursor = (this.cursor + (dir === 'up' ? -1 : 1) + this.rows) % this.rows;
  }

  // SPACE on the current row: 'edit' (the name), 'start', or null.
  act() {
    if (this.cursor === 0) return 'edit';
    if (this.cursor === this.rows - 1) return this.name.trim() ? 'start' : 'edit';
    const j = this.rowJob(this.cursor);
    if (j && this.isOpen(j)) this.job = j.id;
    return null;
  }

  // Mouse / touch: selects the row under the point and returns act()'s answer
  // for it (a tap on a job chooses it, a tap on START starts).
  hit(px, py) {
    const inBox = (b) => px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h;
    if (inBox(NAME_BOX)) { this.cursor = 0; return 'edit'; }
    if (inBox(START_BOX)) { this.cursor = this.rows - 1; return this.act(); }
    const i = Math.floor((py - JOB_Y + 2) / JOB_H);
    if (px >= L && px < R - 8 && i >= 0 && i < JOBS.length) {
      this.cursor = i + 1;
      this.act();
    }
    return null;
  }

  draw(fb, now) {
    if (!this.open) return;
    fb.rect(0, 0, W, H, C.BLACK);
    fb.bevel(2, 2, W - 4, H - 4, C.NIGHT, C.STEEL_M, C.BLACK);
    fb.bevel(3, 3, W - 6, H - 6, C.NIGHT, C.STEEL_D, C.STEEL_D);
    const blink = Math.floor(now / 450) % 2 === 0;

    // Header: the form, and which episode this is.
    drawText(fb, 'BORANT ENCORE', L, 7, C.NEON);
    drawText(fb, '-  CRAWLER INTAKE FORM', L + textWidth('BORANT ENCORE') + 5, 7, C.GOLD);
    const ep = this.rerun ? `RERUN ${this.rerun}` : 'PREMIERE';
    drawText(fb, ep, W - 8 - textWidth(ep), 7, C.TEAL_M);
    fb.rect(L, 14, W - 16, 1, C.STEEL_D);

    // Name.
    drawText(fb, this.rerun ? 'NAME (SAME SOUL, NEW BODY)' : 'NAME', L, 18, C.FOG);
    const nb = NAME_BOX, onName = this.cursor === 0;
    fb.bevel(nb.x, nb.y, nb.w, nb.h, this.editing ? C.SHADOW : C.NIGHT, onName ? C.YELLOW : C.STEEL_D, onName ? C.GOLD : C.STEEL_D);
    drawText(fb, this.name, nb.x + 3, nb.y + 3, C.WHITE);
    if (this.editing && blink) fb.rect(nb.x + 4 + textWidth(this.name), nb.y + 2, 1, 7, C.YELLOW);
    const onJob = !!this.rowJob(this.cursor) && this.isOpen(this.rowJob(this.cursor));
    const hint = this.editing ? 'TYPE A NAME, ENTER TO FINISH' : onName ? 'SPACE TYPE   LEFT/RIGHT RANDOM' : onJob ? 'SPACE CHOOSES THIS JOB' : '';
    if (hint) drawText(fb, hint, L, 39, C.ASH);

    // Jobs.
    drawText(fb, 'FORMER OCCUPATION', L, 47, C.FOG);
    JOBS.forEach((j, i) => {
      const y = JOB_Y + i * JOB_H;
      const sel = this.cursor === i + 1;
      const open = this.isOpen(j);
      if (sel) fb.rect(L - 3, y - 2, R - L - 6, JOB_H - 1, C.SHADOW);
      drawText(fb, sel ? '>' : ' ', L, y, C.YELLOW);
      if (!open) {
        drawText(fb, '??? LOCKED', L + 12, y, sel ? C.FOG : C.ASH);
        return;
      }
      const chosen = this.job === j.id;
      if (chosen) drawText(fb, '*', L + 6, y, C.YELLOW);
      drawText(fb, j.name.toUpperCase(), L + 12, y, chosen ? C.YELLOW : sel ? C.WHITE : C.BONE);
      const tag = `+${JOB_BONUS} ${j.attr.toUpperCase()}`;
      drawText(fb, tag, R - 12 - textWidth(tag), y, chosen ? C.LIME : C.MOSS);
      if (this.fresh.has(j.id)) drawText(fb, 'NEW', R - 12 - textWidth(tag) - 6 - textWidth('NEW'), y, blink ? C.YELLOW : C.GOLD);
    });

    // Start.
    const sb = START_BOX, onStart = this.cursor === this.rows - 1;
    fb.bevel(sb.x, sb.y, sb.w, sb.h, onStart ? C.TEAL_D : C.NIGHT, onStart ? C.MINT : C.STEEL_M, C.BLACK);
    const job = JOBS.find((j) => j.id === this.job);
    const go = `START AS ${job.name.toUpperCase()}`;
    drawText(fb, go, sb.x + ((sb.w - textWidth(go)) >> 1), sb.y + 5, onStart ? C.WHITE : C.MINT);

    this.drawDetails(fb);
  }

  // The right column: the job under the cursor (or the chosen one).
  drawDetails(fb) {
    fb.rect(R - 6, 18, 1, 112, C.STEEL_D);
    const j = this.shown;
    if (!this.isOpen(j)) {
      drawText(fb, 'LOCKED', R, 20, C.ASH);
      let y = 30;
      for (const l of wrapText(`Unlock: ${j.unlock.hint}.`, RW)) { drawText(fb, l, R, y, C.FOG); y += 7; }
      y += 4;
      for (const l of wrapText('Borant reserves the right to remember what you were. Eventually.', RW)) { drawText(fb, l, R, y, C.ASH); y += 7; }
      return;
    }
    drawText(fb, j.name.toUpperCase(), R, 20, C.GOLD);
    drawText(fb, `+${JOB_BONUS} ${ATTR_NAMES[j.attr].toUpperCase()}`, R, 28, C.LIME);
    let y = 38;
    for (const l of wrapText(j.blurb, RW)) { drawText(fb, l, R, y, C.BONE); y += 7; }
    // What the new body starts with.
    const a = startAttrs(START, j);
    y = Math.max(y + 5, 84);
    fb.rect(R, y - 3, RW, 1, C.STEEL_D);
    ATTRS.forEach((k, i) => {
      const x = R + i * 29;
      drawText(fb, k.toUpperCase(), x, y + 1, C.FOG);
      drawText(fb, String(a[k]), x + 14, y + 1, k === j.attr ? C.LIME : C.BONE);
    });
    drawText(fb, `HP ${DERIVE.hpMax(a)}`, R, y + 11, C.RED);
    drawText(fb, `MP ${DERIVE.mpMax(a)}`, R + 36, y + 11, C.SKY);
  }
}
