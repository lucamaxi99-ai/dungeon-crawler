// HUD: a coarse pixel layer drawn at 320 px width and scaled up 3x over and
// under the fine 3D view (like Daggerfall).
//   panel   320 x 60 under the view: status, message log, minimap
//   overlay 320 x 140 on top of the view (transparent): compass, full map

import { C } from '../engine/palette.js';
import { TRANSPARENT } from '../engine/framebuffer.js';
import { drawText, wrapText, textWidth, LINE_H } from '../engine/font.js';
import { DIRS } from './player.js';
import { WALL } from './textures.js';
import { big } from './gameover-ui.js';

export const HUD_W = 320;
export const OVERLAY_H = 140;
export const PANEL_H = 60;
export const HUD_SCALE = 3;

// Screen in real pixels: the 3D view on top, the panel below.
export const SCREEN_W = HUD_W * HUD_SCALE;            // 960
export const VIEW_H = OVERLAY_H * HUD_SCALE;          // 420
export const SCREEN_H = (OVERLAY_H + PANEL_H) * HUD_SCALE; // 600

// Panel boxes (panel coordinates).
const STAT = { x: 4, y: 4, w: 64, h: 52 };
const LOG = { x: 72, y: 4, w: 168, h: 52 };
const MAP = { x: 244, y: 4, w: 72, h: 52 };
// The combat menu takes the minimap's place.
export const MENU_BOX = MAP;

const STYLE = {
  system: [C.GOLD, C.LEATHER],
  info: [C.BONE, C.FOG],
  warn: [C.FIRE, C.BLOOD],
};

export class MessageLog {
  constructor() {
    this.lines = []; // { text, style, fresh }
  }

  push(text, style = 'system') {
    for (const l of this.lines) l.fresh = false;
    for (const t of wrapText(text, LOG.w - 6)) this.lines.push({ text: t, style, fresh: true });
    const max = Math.floor((LOG.h - 4) / LINE_H) * 4;
    if (this.lines.length > max) this.lines.splice(0, this.lines.length - max);
  }
}

function box(fb, b, fill = C.BLACK) {
  fb.bevel(b.x - 1, b.y - 1, b.w + 2, b.h + 2, fill, C.NIGHT, C.STONE);
}

function frame(fb) {
  fb.bevel(0, 0, HUD_W, PANEL_H, C.STONE_D, C.STONE_M, C.NIGHT);
  // A little rivet in each corner, because Borant spared no expense.
  for (const [x, y] of [[1, 1], [HUD_W - 3, 1], [1, PANEL_H - 3], [HUD_W - 3, PANEL_H - 3]]) {
    fb.set(x, y, C.STONE_L); fb.set(x + 1, y + 1, C.NIGHT);
  }
  box(fb, STAT, C.NIGHT);
  box(fb, LOG);
  box(fb, MAP);
}

// Bar with a label and value on the line above. value/max null = system not
// built yet (shown empty and dim).
function bar(fb, x, y, w, label, value, max, [full, text]) {
  const off = value === null;
  drawText(fb, label, x, y, off ? C.ASH : text);
  const v = off ? '--' : `${value}/${max}`;
  drawText(fb, v, x + w - textWidth(v), y, off ? C.ASH : text);
  fb.bevel(x, y + 6, w, 4, C.BLACK, C.BLACK, C.STONE);
  if (!off) fb.rect(x + 1, y + 7, Math.round(((w - 2) * value) / max), 2, full);
}

function drawStatus(fb, { level, status }) {
  const x = STAT.x + 3, w = STAT.w - 6;
  drawText(fb, level.name.toUpperCase(), x, STAT.y + 3, C.GOLD);
  // Crawler level on the right (blinking + with points to spend), and the
  // way to the next level as a thin gold line under it.
  if (status.level) {
    const spend = status.points > 0 && Math.floor(performance.now() / 500) % 2 === 0;
    const lv = `L${status.level}${status.points > 0 ? '+' : ''}`;
    drawText(fb, lv, x + w - textWidth(lv), STAT.y + 3, spend ? C.YELLOW : C.BONE);
  }
  fb.rect(x, STAT.y + 10, w, 1, C.SHADOW);
  if (status.level) fb.rect(x, STAT.y + 10, Math.round(w * status.xpShare), 1, C.GOLD);
  const low = status.hp !== null && status.hp <= status.hpMax / 4;
  bar(fb, x, STAT.y + 13, w, 'HP', status.hp, status.hpMax, low ? [C.FIRE, C.FIRE] : [C.RED, C.BONE]);
  bar(fb, x, STAT.y + 25, w, 'MP', status.mp ?? null, status.mpMax, [C.SKY, C.BONE]);
  fb.rect(x, STAT.y + 37, w, 1, C.SHADOW);
  // Floor countdown in turns: grey while the stairs are still sealed, gold
  // once they are open, blinking red in the last tenth.
  const off = status.turnsLeft === null;
  const hurry = !off && status.turnsShare <= 0.1;
  const color = off ? C.ASH : hurry ? (Math.floor(performance.now() / 400) % 2 ? C.FIRE : C.RED) : status.stairsOpen ? C.GOLD : C.SILVER;
  drawText(fb, 'TURNS', x, STAT.y + 40, off ? C.ASH : C.BONE);
  const t = off ? '--' : String(status.turnsLeft);
  drawText(fb, t, x + w - textWidth(t), STAT.y + 40, color);
  if (!off && !status.stairsOpen) lock(fb, x + w - textWidth(t) - 6, STAT.y + 40, C.SILVER);
  // Viewers, with an arrow while they pour in (up) or drift away (down).
  const v = status.viewers === null ? '?' : status.viewers;
  drawText(fb, 'VIEWERS', x, STAT.y + 46, status.viewers === null ? C.ASH : C.BONE);
  const vx = x + w - textWidth(v);
  drawText(fb, v, vx, STAT.y + 46, status.viewers === null ? C.ASH : status.viewersFlash ? C.WHITE : C.NEON);
  if (status.viewersDir) arrow(fb, vx - 5, STAT.y + 47, status.viewersDir, status.viewersDir > 0 ? C.LIME : C.RED);
}

// A tiny arrow (3 x 3), dir > 0 up, < 0 down.
function arrow(fb, x, y, dir, c) {
  const rows = dir > 0 ? [1, 3, 3] : [3, 3, 1];
  rows.forEach((n, i) => fb.rect(x + (n === 1 ? 1 : 0), y + i, n, 1, c));
}

// A tiny padlock (4 x 5): the stairs are still sealed.
function lock(fb, x, y, c) {
  fb.rect(x + 1, y, 2, 1, c);
  fb.set(x, y + 1, c); fb.set(x + 3, y + 1, c);
  fb.rect(x, y + 2, 4, 3, c);
}

function drawLog(fb, log) {
  const visible = Math.floor((LOG.h - 4) / LINE_H);
  const lines = log.lines.slice(-visible);
  lines.forEach((l, i) => {
    const [fresh, old] = STYLE[l.style] || STYLE.info;
    drawText(fb, l.text, LOG.x + 3, LOG.y + 3 + i * LINE_H, l.fresh ? fresh : old);
  });
}

function cellColor(level, x, y) {
  const w = level.wall(x, y);
  if (w === WALL.STAIRS) return level.stairsOpen === false ? C.RUST : C.FIRE;
  if (w === WALL.POSTER) return C.LEATHER;
  if (w === WALL.SAFE) return C.MINT;
  if (w) return C.STONE_M;
  const o = level.objectAt(x, y);
  if (o && o.type === 'chest') return o.flags.openedAt != null ? C.RUST : C.GOLD;
  if (o && o.type === 'brazier') return C.AMBER; // red is for enemies
  if (o && o.type === 'bag') return C.LEATHER;
  if (o && o.type === 'coldBrazier') return C.SKY;
  return C.DUSK;
}

// Draws explored cells around the player. cell = pixels per map cell.
// With fit=true the whole level is shown instead of following the player.
// marks: [{ x, y, color }] drawn on top (enemies in sight, as red dots).
function drawMapArea(fb, level, player, x0, y0, w, h, cell, fit = false, marks = []) {
  if (fit) cell = Math.max(1, Math.min(Math.floor(w / level.w), Math.floor(h / level.h)));
  const cols = fit ? level.w : Math.floor(w / cell);
  const rows = fit ? level.h : Math.floor(h / cell);
  const ox = fit ? 0 : player.x - Math.floor(cols / 2);
  const oy = fit ? 0 : player.y - Math.floor(rows / 2);
  const padX = x0 + Math.floor((w - cols * cell) / 2);
  const padY = y0 + Math.floor((h - rows * cell) / 2);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const mx = ox + i, my = oy + j;
      if (!level.inside(mx, my) || !level.seen[my * level.w + mx]) continue;
      fb.rect(padX + i * cell, padY + j * cell, cell, cell, cellColor(level, mx, my));
    }
  }
  for (const m of marks) {
    const i = m.x - ox, j = m.y - oy;
    if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
    const mx = padX + i * cell, my = padY + j * cell;
    fb.rect(mx + (cell > 2 ? 1 : 0), my + (cell > 2 ? 1 : 0), Math.max(1, cell - 2), Math.max(1, cell - 2), m.color);
  }
  // Player marker: a dot with a nose pointing where we look.
  const px = padX + (player.x - ox) * cell, py = padY + (player.y - oy) * cell;
  fb.rect(px, py, cell, cell, C.LIME);
  const d = DIRS[player.dir];
  const nx = px + Math.floor(cell / 2) + d.x * Math.ceil(cell / 2);
  const ny = py + Math.floor(cell / 2) + d.y * Math.ceil(cell / 2);
  fb.rect(nx - (d.x === 0 ? 1 : 0), ny - (d.y === 0 ? 1 : 0), d.x === 0 ? 2 : 1, d.y === 0 ? 2 : 1, C.YELLOW);
}

// status: { hp, hpMax, mp, mpMax, turnsLeft, turnsShare, stairsOpen, viewers }
// with null for systems
// that do not exist yet.
// menu(fb, box): draws something else (the combat menu) instead of the minimap.
export function drawPanel(fb, { log, level, player, status, marks = [], menu = null }) {
  frame(fb);
  drawStatus(fb, { level, status });
  drawLog(fb, log);
  if (menu) menu(fb, MAP);
  else drawMapArea(fb, level, player, MAP.x, MAP.y, MAP.w, MAP.h, 4, false, marks);
}

export function drawOverlay(fb, { level, player, showMap, notice, marks = [] }) {
  fb.clear(TRANSPARENT);
  const heading = DIRS[player.dir].name;
  const compass = `- ${heading} -`;
  drawText(fb, compass, (HUD_W - textWidth(compass)) >> 1, 4, C.GOLD, C.BLACK);
  if (notice) drawText(fb, notice, HUD_W - 4 - textWidth(notice), 4, C.FOG, C.BLACK);

  if (showMap) {
    const mw = 240, mh = 132;
    const mx = (HUD_W - mw) >> 1, my = 4;
    fb.bevel(mx - 2, my - 2, mw + 4, mh + 4, C.BLACK, C.STONE_M, C.NIGHT);
    drawMapArea(fb, level, player, mx, my, mw, mh - 8, 5, true, marks);
    drawText(fb, 'MAP - PRESS M TO CLOSE', mx + 2, my + mh - 6, C.FOG);
  }
}

// A big announcement in the middle of the view (LEVEL UP). Returns false
// once it is over. banner: { text, sub, at }.
const BANNER_MS = 2200;
export function drawBanner(fb, banner, now) {
  const t = now - banner.at;
  if (t > BANNER_MS) return false;
  if (t > BANNER_MS - 300 && Math.floor(t / 80) % 2) return true; // flickers out
  const lift = Math.max(0, 8 - Math.floor(t / 20));
  big(fb, banner.text, (HUD_W - textWidth(banner.text) * 3) >> 1, 40 + lift, C.YELLOW, 3);
  if (banner.sub) drawText(fb, banner.sub, (HUD_W - textWidth(banner.sub)) >> 1, 64 + lift, C.GOLD, C.BLACK);
  return true;
}
