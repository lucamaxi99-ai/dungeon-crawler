// Bottom panel: message log and minimap. Plus overlays on the 3D view.

import { C } from '../engine/palette.js';
import { drawText, wrapText, textWidth, LINE_H } from '../engine/font.js';
import { DIRS } from './player.js';
import { WALL } from './assets.js';

export const SCREEN_W = 320;
export const SCREEN_H = 200;
export const VIEW_H = 140;

const LOG_X = 4, LOG_Y = VIEW_H + 4, LOG_W = 236, LOG_H = 52;
const MAP_X = 244, MAP_Y = VIEW_H + 4, MAP_W = 72, MAP_H = 52;

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
    for (const t of wrapText(text, LOG_W - 6)) this.lines.push({ text: t, style, fresh: true });
    const max = Math.floor((LOG_H - 4) / LINE_H) * 4;
    if (this.lines.length > max) this.lines.splice(0, this.lines.length - max);
  }
}

function frame(fb) {
  fb.bevel(0, VIEW_H, SCREEN_W, SCREEN_H - VIEW_H, C.STONE_D, C.STONE_M, C.NIGHT);
  fb.bevel(LOG_X - 1, LOG_Y - 1, LOG_W + 2, LOG_H + 2, C.NIGHT, C.BLACK, C.STONE);
  fb.bevel(MAP_X - 1, MAP_Y - 1, MAP_W + 2, MAP_H + 2, C.BLACK, C.BLACK, C.STONE);
}

function drawLog(fb, log) {
  const visible = Math.floor((LOG_H - 4) / LINE_H);
  const lines = log.lines.slice(-visible);
  lines.forEach((l, i) => {
    const [fresh, old] = STYLE[l.style] || STYLE.info;
    drawText(fb, l.text, LOG_X + 3, LOG_Y + 3 + i * LINE_H, l.fresh ? fresh : old);
  });
}

function cellColor(level, x, y) {
  const w = level.wall(x, y);
  if (w === WALL.STAIRS) return C.FIRE;
  if (w) return C.STONE_M;
  const o = level.objectAt(x, y);
  if (o && o.type === 'chest') return C.GOLD;
  if (o && o.type === 'brazier') return C.RED;
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

export function drawHud(fb, { log, level, player, showMap }) {
  frame(fb);
  drawLog(fb, log);
  drawMapArea(fb, level, player, MAP_X, MAP_Y, MAP_W, MAP_H, 4);

  // View overlays: floor name and compass.
  drawText(fb, level.name, 4, 4, C.BONE, C.BLACK);
  const heading = DIRS[player.dir].name;
  const compass = `- ${heading} -`;
  drawText(fb, compass, (SCREEN_W - textWidth(compass)) >> 1, 4, C.GOLD, C.BLACK);

  if (showMap) {
    const mw = 240, mh = 132;
    const mx = (SCREEN_W - mw) >> 1, my = 4;
    fb.bevel(mx - 2, my - 2, mw + 4, mh + 4, C.BLACK, C.STONE_M, C.NIGHT);
    drawMapArea(fb, level, player, mx, my, mw, mh - 8, 5, true);
    drawText(fb, 'MAP - PRESS M TO CLOSE', mx + 2, my + mh - 6, C.FOG);
  }
}
