// Inventory screen: a window over the 3D view, drawn into the HUD overlay
// (320 x 140 HUD pixels, scaled 3x). The panel with the log stays visible
// underneath, so the System AI can comment on what you do.
//
//   +-------------------------------------------------------------+
//   | INVENTORY                                       24 ITEMS    |
//   | [slot]  figure  [slot] | 12 x 4 item grid (scrolls)      | |
//   | [slot]          [slot] |                                 | |
//   |  ...                   | name / rarity, stats / text        |
//   | ATK  DEF  GOLD         | [SPACE] USE  [X] DROP  [I] CLOSE   |
//   +-------------------------------------------------------------+
//
// The cursor walks over the paper doll's 11 slots and the item grid as one
// space. Pure UI: actions are reported back through `onCommand`.

import { C } from '../engine/palette.js';
import { drawText, wrapText, textWidth, LINE_H } from '../engine/font.js';
import { ITEMS, RARITY, SLOTS, itemStats } from './items.js';
import { ICONS } from './icons.js';

const WIN = { x: 2, y: 2, w: 316, h: 136 };
const CELL = 16;                                  // slot / grid cell incl. frame
const GRID = { x: 112, y: 15, cols: 12, rows: 4 };
const DETAIL = { x: 112, y: 83, w: 200, h: 36 };
const BAR = { x: 112, y: 123 };                   // button row

// Paper doll: left column top to bottom, right column top to bottom.
const DOLL_LEFT = ['head', 'neck', 'cloak', 'body', 'belt', 'feet'];
const DOLL_RIGHT = ['hands', 'weapon', 'offhand', 'ring1', 'ring2'];
const SLOT_POS = {};
DOLL_LEFT.forEach((id, i) => { SLOT_POS[id] = { x: 8, y: 15 + i * CELL, col: 0, row: i }; });
DOLL_RIGHT.forEach((id, i) => { SLOT_POS[id] = { x: 88, y: 23 + i * CELL, col: 1, row: i }; });
const SLOT_SHORT = { head: 'HD', neck: 'NK', cloak: 'CL', body: 'BD', belt: 'BT', feet: 'FT', hands: 'HN', weapon: 'WP', offhand: 'OH', ring1: 'R1', ring2: 'R2' };

const BUTTONS = [
  { id: 'interact', key: 'SPC', label: 'USE' },
  { id: 'drop', key: 'X', label: 'DROP' },
  { id: 'inventory', key: 'I', label: 'CLOSE' },
];

export class InventoryScreen {
  constructor(inventory) {
    this.inv = inventory;
    this.open = false;
    this.area = 'grid';  // 'grid' | 'doll'
    this.index = 0;      // grid: bag index; doll: slot id
    this.slot = 'weapon';
    this.scroll = 0;     // first visible grid row
    this.buttons = [];   // hit boxes, filled while drawing
  }

  toggle() {
    this.open = !this.open;
    if (this.open) this.clamp();
  }

  // What the cursor points at: { where: 'bag', index, stack } or
  // { where: 'slot', slot, stack } (stack null when empty).
  selection() {
    if (this.area === 'doll') return { where: 'slot', slot: this.slot, stack: this.inv.equip[this.slot] };
    return { where: 'bag', index: this.index, stack: this.inv.bag[this.index] || null };
  }

  clamp() {
    const n = this.inv.bag.length;
    this.index = Math.max(0, Math.min(this.index, Math.max(0, n - 1)));
    const row = Math.floor(this.index / GRID.cols);
    if (row < this.scroll) this.scroll = row;
    if (row >= this.scroll + GRID.rows) this.scroll = row - GRID.rows + 1;
    const maxScroll = Math.max(0, Math.ceil(n / GRID.cols) - GRID.rows);
    this.scroll = Math.max(0, Math.min(this.scroll, maxScroll));
  }

  // Cursor movement. dir: 'up' | 'down' | 'left' | 'right'.
  move(dir) {
    if (this.area === 'doll') return this.moveDoll(dir);
    const cols = GRID.cols, n = this.inv.bag.length;
    const col = this.index % cols;
    if (dir === 'left' && col === 0) {
      // Over to the paper doll, the right column at about the same height.
      const row = Math.floor(this.index / cols) - this.scroll;
      this.area = 'doll';
      this.slot = DOLL_RIGHT[Math.min(DOLL_RIGHT.length - 1, Math.max(0, row + 1))];
      return;
    }
    const step = { left: -1, right: 1, up: -cols, down: cols }[dir];
    const next = this.index + step;
    if (next >= 0 && next < n && !(dir === 'right' && col === cols - 1)) this.index = next;
    else if (dir === 'down' && Math.floor(this.index / cols) < Math.floor((n - 1) / cols)) this.index = n - 1;
    this.clamp();
  }

  moveDoll(dir) {
    const p = SLOT_POS[this.slot];
    const column = p.col === 0 ? DOLL_LEFT : DOLL_RIGHT;
    if (dir === 'up' || dir === 'down') {
      const r = p.row + (dir === 'up' ? -1 : 1);
      if (r >= 0 && r < column.length) this.slot = column[r];
      return;
    }
    if (dir === 'left' && p.col === 1) { this.slot = DOLL_LEFT[Math.min(DOLL_LEFT.length - 1, p.row + 1)]; return; }
    if (dir === 'right' && p.col === 0) { this.slot = DOLL_RIGHT[Math.max(0, Math.min(DOLL_RIGHT.length - 1, p.row - 1))]; return; }
    if (dir === 'right' && p.col === 1) {
      this.area = 'grid';
      const row = Math.max(0, p.row - 1);
      this.index = Math.min(Math.max(0, this.inv.bag.length - 1), (this.scroll + row) * GRID.cols);
      this.clamp();
    }
  }

  // Maps a click/tap in overlay pixels to a target. Returns
  // { kind: 'slot', slot } | { kind: 'bag', index } | { kind: 'button', id }
  // | { kind: 'scroll', delta } | { kind: 'outside' } | null.
  hit(x, y) {
    for (const b of this.buttons) {
      if (x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h) return { kind: 'button', id: b.id };
    }
    for (const [slot, p] of Object.entries(SLOT_POS)) {
      if (x >= p.x && y >= p.y && x < p.x + CELL && y < p.y + CELL) return { kind: 'slot', slot };
    }
    const gx = x - GRID.x, gy = y - GRID.y;
    if (gx >= 0 && gy >= 0 && gx < GRID.cols * CELL && gy < GRID.rows * CELL) {
      const index = (this.scroll + Math.floor(gy / CELL)) * GRID.cols + Math.floor(gx / CELL);
      return { kind: 'bag', index };
    }
    const sx = GRID.x + GRID.cols * CELL + 2;
    if (x >= sx && x < sx + 8 && gy >= 0 && gy < GRID.rows * CELL) return { kind: 'scroll', delta: gy < (GRID.rows * CELL) / 2 ? -1 : 1 };
    if (x < WIN.x || y < WIN.y || x >= WIN.x + WIN.w || y >= WIN.y + WIN.h) return { kind: 'outside' };
    return null;
  }

  // Selects the clicked target. Returns true if it was already selected
  // (a second tap means "use it").
  select(target) {
    if (target.kind === 'slot') {
      const again = this.area === 'doll' && this.slot === target.slot;
      this.area = 'doll'; this.slot = target.slot;
      return again;
    }
    if (target.kind === 'bag') {
      if (target.index >= this.inv.bag.length) return false;
      const again = this.area === 'grid' && this.index === target.index;
      this.area = 'grid'; this.index = target.index;
      this.clamp();
      return again;
    }
    if (target.kind === 'scroll') {
      this.scroll += target.delta;
      const maxScroll = Math.max(0, Math.ceil(this.inv.bag.length / GRID.cols) - GRID.rows);
      this.scroll = Math.max(0, Math.min(this.scroll, maxScroll));
    }
    return false;
  }

  // ------------------------------------------------------------ drawing

  draw(fb, time) {
    if (!this.open) return;
    this.clamp();
    const inv = this.inv;
    fb.bevel(WIN.x, WIN.y, WIN.w, WIN.h, C.NIGHT, C.STONE_M, C.BLACK);
    fb.bevel(WIN.x + 1, WIN.y + 1, WIN.w - 2, WIN.h - 2, C.NIGHT, C.STONE_D, C.STONE_D);
    drawText(fb, 'INVENTORY', 8, 6, C.GOLD, C.BLACK);
    const count = `${inv.bag.reduce((s, b) => s + b.n, 0)} ITEMS`;
    drawText(fb, count, GRID.x + GRID.cols * CELL - textWidth(count), 6, C.FOG);

    this.drawDoll(fb, time);
    this.drawGrid(fb, time);
    this.drawDetail(fb);
    this.drawButtons(fb);

    // Totals and gold under the doll.
    // TODO(M4): ATK and DEF are shown but not used until combat exists.
    const t = inv.totals();
    drawText(fb, `ATK ${t.atk}`, 8, 113, C.BONE);
    drawText(fb, `DEF ${t.def}`, 40, 113, C.BONE);
    drawText(fb, 'GOLD', 8, 121, C.GOLD);
    drawText(fb, String(inv.gold), 28, 121, C.YELLOW);
  }

  drawDoll(fb, time) {
    // A crawler silhouette between the two slot columns.
    const S = C.SHADOW, D = C.DUSK;
    fb.rect(50, 18, 8, 9, D); fb.rect(51, 17, 6, 1, D);                    // head
    fb.rect(52, 27, 4, 2, S);                                             // neck
    fb.rect(44, 29, 20, 4, D); fb.rect(46, 33, 16, 18, D);                // shoulders, torso
    fb.rect(46, 51, 16, 3, S);                                            // belt
    fb.rect(39, 31, 5, 22, S); fb.rect(64, 31, 5, 22, S);                 // arms
    fb.rect(38, 53, 6, 5, D); fb.rect(64, 53, 6, 5, D);                   // hands
    fb.rect(47, 54, 6, 38, S); fb.rect(55, 54, 6, 38, S);                 // legs
    fb.rect(45, 92, 8, 4, D); fb.rect(55, 92, 8, 4, D);                   // feet
    for (const s of SLOTS) {
      const p = SLOT_POS[s.id];
      const stack = this.inv.equip[s.id];
      this.drawCell(fb, p.x, p.y, stack, this.area === 'doll' && this.slot === s.id, time);
      if (!stack) drawText(fb, SLOT_SHORT[s.id], p.x + 4, p.y + 5, C.SHADOW);
    }
  }

  drawGrid(fb, time) {
    const { cols, rows } = GRID;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const index = (this.scroll + r) * cols + c;
        const stack = this.inv.bag[index] || null;
        this.drawCell(fb, GRID.x + c * CELL, GRID.y + r * CELL, stack, this.area === 'grid' && this.index === index && !!stack, time);
      }
    }
    if (!this.inv.bag.length && this.area === 'grid') this.drawCursor(fb, GRID.x, GRID.y, time);
    // Scroll bar.
    const total = Math.max(1, Math.ceil(this.inv.bag.length / cols));
    const bx = GRID.x + cols * CELL + 2, bh = rows * CELL;
    fb.bevel(bx, GRID.y, 6, bh, C.BLACK, C.BLACK, C.STONE_D);
    const knobH = Math.max(6, Math.round((bh - 2) * Math.min(1, rows / total)));
    const knobY = total > rows ? Math.round(((bh - 2 - knobH) * this.scroll) / (total - rows)) : 0;
    fb.bevel(bx + 1, GRID.y + 1 + knobY, 4, knobH, C.STONE, C.STONE_L, C.STONE_D);
  }

  drawCell(fb, x, y, stack, selected, time) {
    fb.bevel(x, y, CELL, CELL, C.BLACK, C.NIGHT, C.STONE_D);
    if (stack) {
      const def = ITEMS[stack.id];
      const ic = ICONS[stack.id];
      if (ic) fb.blit(ic, x + 2, y + 2);
      else drawText(fb, '?', x + 6, y + 5, C.FOG);
      // Rarity marker: a corner in the rarity color for anything above common.
      if (def.rarity !== 'common') {
        const rc = RARITY[def.rarity].color;
        fb.rect(x + 1, y + 1, 3, 1, rc); fb.rect(x + 1, y + 2, 1, 2, rc);
      }
      if (stack.n > 1) {
        const t = String(stack.n);
        drawText(fb, t, x + CELL - 1 - textWidth(t), y + CELL - 6, C.WHITE, C.BLACK);
      }
    }
    if (selected) this.drawCursor(fb, x, y, time);
  }

  drawCursor(fb, x, y, time) {
    const c = Math.floor(time / 300) % 2 ? C.YELLOW : C.GOLD;
    fb.rect(x - 1, y - 1, CELL + 2, 1, c); fb.rect(x - 1, y + CELL, CELL + 2, 1, c);
    fb.rect(x - 1, y - 1, 1, CELL + 2, c); fb.rect(x + CELL, y - 1, 1, CELL + 2, c);
  }

  drawDetail(fb) {
    const { x, y, w, h } = DETAIL;
    fb.bevel(x - 1, y - 1, w + 2, h + 2, C.BLACK, C.BLACK, C.STONE_D);
    const sel = this.selection();
    const tx = x + 3;
    if (!sel.stack) {
      const msg = sel.where === 'slot'
        ? `${SLOTS.find((s) => s.id === sel.slot).name}: nothing equipped. Your ${sel.slot === 'body' ? 'dignity' : 'fashion sense'} is showing.`
        : 'Your inventory is empty. The System is disappointed but not surprised.';
      wrapText(msg, w - 6).slice(0, 5).forEach((l, i) => drawText(fb, l, tx, y + 3 + i * LINE_H, C.ASH));
      return;
    }
    const def = ITEMS[sel.stack.id];
    const rarity = RARITY[def.rarity];
    drawText(fb, def.name, tx, y + 3, rarity.color);
    const where = sel.where === 'slot' ? '  (EQUIPPED)' : sel.stack.n > 1 ? `  X${sel.stack.n}` : '';
    drawText(fb, `${rarity.name}  ${itemStats(def)}${where}`, tx, y + 3 + LINE_H, C.FOG);
    wrapText(def.desc, w - 6).slice(0, 3).forEach((l, i) => drawText(fb, l, tx, y + 3 + (i + 2) * LINE_H, C.BONE));
  }

  drawButtons(fb) {
    const sel = this.selection();
    const def = sel.stack && ITEMS[sel.stack.id];
    // The first button says what SPACE would do with the selection.
    const verb = !def ? 'USE' : sel.where === 'slot' ? 'REMOVE' : def.kind === 'gear' ? 'EQUIP' : def.kind === 'consumable' ? 'USE' : 'LOOK';
    this.buttons = [];
    let x = BAR.x;
    for (const b of BUTTONS) {
      const label = b.id === 'interact' ? verb : b.label;
      const active = b.id === 'inventory' || !!def;
      const w = textWidth(b.key) + textWidth(label) + 9;
      fb.bevel(x, BAR.y, w, 11, C.STONE_D, C.STONE_M, C.BLACK);
      drawText(fb, b.key, x + 3, BAR.y + 3, active ? C.GOLD : C.SHADOW);
      drawText(fb, label, x + 6 + textWidth(b.key), BAR.y + 3, active ? C.BONE : C.SHADOW);
      this.buttons.push({ id: b.id, x, y: BAR.y, w, h: 11 });
      x += w + 4;
    }
  }
}

