// HUD: a coarse pixel layer drawn at 320 px width and scaled up 3x over and
// under the fine 3D view (like Daggerfall).
//   panel   320 x 60 under the view: status, message log, minimap
//   overlay 320 x 140 on top of the view (transparent): compass, full map

import { C } from '../engine/palette.js';
import { TRANSPARENT } from '../engine/framebuffer.js';
import { drawText, wrapText, textWidth, LINE_H } from '../engine/font.js';
import { DIRS } from './player.js';
import { WALL } from './textures.js';

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

// Labelled bar. value/max null = system not built yet (shown empty and dim).
function bar(fb, x, y, w, label, value, max, colors) {
  const [full, empty, text] = colors;
  drawText(fb, label, x, y, value === null ? C.ASH : text);
  const bx = x + 12, bw = w - 12;
  fb.bevel(bx, y, bw, 5, C.BLACK, C.BLACK, C.STONE);
  if (value !== null) fb.rect(bx + 1, y + 1, Math.round(((bw - 2) * value) / max), 3, full);
  else for (let i = bx + 2; i < bx + bw - 1; i += 3) fb.set(i, y + 2, empty);
}

function drawStatus(fb, { level, status }) {
  const x = STAT.x + 3, w = STAT.w - 6;
  drawText(fb, level.name.toUpperCase(), x, STAT.y + 3, C.GOLD);
  fb.rect(x, STAT.y + 10, w, 1, C.SHADOW);
  const low = status.hp !== null && status.hp <= status.hpMax / 4;
  bar(fb, x, STAT.y + 14, w, 'HP', status.hp, status.hpMax, [low ? C.FIRE : C.RED, C.SHADOW, low ? C.FIRE : C.BONE]);
  if (status.hp !== null) {
    const hp = `${status.hp}/${status.hpMax}`;
    drawText(fb, hp, x + w - textWidth(hp), STAT.y + 20, low ? C.FIRE : C.FOG);
  }
  fb.rect(x, STAT.y + 26, w, 1, C.SHADOW);
  // TODO(M5): floor countdown.
  drawText(fb, 'TIME', x, STAT.y + 29, status.timeLeft === null ? C.ASH : C.BONE);
  const t = status.timeLeft === null ? '--:--' : clock(status.timeLeft);
  drawText(fb, t, x + w - textWidth(t), STAT.y + 29, status.timeLeft === null ? C.ASH : C.FIRE);
  // TODO(M6): viewer count.
  const v = status.viewers === null ? '?' : String(status.viewers);
  drawText(fb, 'VIEWERS', x, STAT.y + 37, status.viewers === null ? C.ASH : C.BONE);
  drawText(fb, v, x + w - textWidth(v), STAT.y + 37, status.viewers === null ? C.ASH : C.NEON);
  if (status.atk !== undefined) {
    fb.rect(x, STAT.y + 44, w, 1, C.SHADOW);
    drawText(fb, `ATK ${status.atk}`, x, STAT.y + 46, C.BONE);
    const d = `DEF ${status.def}`;
    drawText(fb, d, x + w - textWidth(d), STAT.y + 46, C.BONE);
  }
}

function clock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
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
  if (w === WALL.STAIRS) return C.FIRE;
  if (w === WALL.POSTER) return C.LEATHER;
  if (w) return C.STONE_M;
  const o = level.objectAt(x, y);
  if (o && o.type === 'chest') return o.flags.openedAt != null ? C.RUST : C.GOLD;
  if (o && o.type === 'brazier') return C.RED;
  if (o && o.type === 'bag') return C.LEATHER;
  if (o && o.type === 'coldBrazier') return C.SKY;
  return C.DUSK;
}

// Draws explored cells around the player. cell = pixels per map cell.
// With fit=true the whole level is shown instead of following the player.
function drawMapArea(fb, level, player, x0, y0, w, h, cell, fit = false) {
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
  // Player marker: a dot with a nose pointing where we look.
  const px = padX + (player.x - ox) * cell, py = padY + (player.y - oy) * cell;
  fb.rect(px, py, cell, cell, C.LIME);
  const d = DIRS[player.dir];
  const nx = px + Math.floor(cell / 2) + d.x * Math.ceil(cell / 2);
  const ny = py + Math.floor(cell / 2) + d.y * Math.ceil(cell / 2);
  fb.rect(nx - (d.x === 0 ? 1 : 0), ny - (d.y === 0 ? 1 : 0), d.x === 0 ? 2 : 1, d.y === 0 ? 2 : 1, C.YELLOW);
}

// status: { hp, hpMax, atk, def, timeLeft, viewers } with null for systems
// that do not exist yet.
export function drawPanel(fb, { log, level, player, status }) {
  frame(fb);
  drawStatus(fb, { level, status });
  drawLog(fb, log);
  drawMapArea(fb, level, player, MAP.x, MAP.y, MAP.w, MAP.h, 4);
}

export function drawOverlay(fb, { level, player, showMap, notice }) {
  fb.clear(TRANSPARENT);
  const heading = DIRS[player.dir].name;
  const compass = `- ${heading} -`;
  drawText(fb, compass, (HUD_W - textWidth(compass)) >> 1, 4, C.GOLD, C.BLACK);
  if (notice) drawText(fb, notice, HUD_W - 4 - textWidth(notice), 4, C.FOG, C.BLACK);

  if (showMap) {
    const mw = 240, mh = 132;
    const mx = (HUD_W - mw) >> 1, my = 4;
    fb.bevel(mx - 2, my - 2, mw + 4, mh + 4, C.BLACK, C.STONE_M, C.NIGHT);
    drawMapArea(fb, level, player, mx, my, mw, mh - 8, 5, true);
    drawText(fb, 'MAP - PRESS M TO CLOSE', mx + 2, my + mh - 6, C.FOG);
  }
}
