// The combat screen: a little stage over the 3D view (overlay, 320 x 140
// HUD pixels) with the enemies in a spotlight, plus the action menu that
// replaces the minimap in the panel.
//
// The stage is built from the textures of the place where the fight happens
// and lit through the lit shade tables, so it keeps the floor's mood. The
// enemies are drawn at 2 HUD pixels per sprite pixel, about as fine as they
// look up close in the 3D view.

import { C, PALETTE_SIZE } from '../engine/palette.js';
import { TRANSPARENT } from '../engine/framebuffer.js';
import { BAYER4 } from '../engine/lighting.js';
import { drawText, textWidth } from '../engine/font.js';
import { frameAt } from '../engine/sprite.js';
import { CREATURES } from './assets.js';
import { ITEMS } from './items.js';

const W = 320, H = 140;
const TOP = 12;                 // stage starts under the turn-order bar
const FOCAL = 160, HORIZON = 64, CAM_H = 0.5;
const WALL_DIST = 2;            // the back wall
const FOE_DIST = 1.25;          // where the enemies stand: 2 px per sprite px
const WALL_TOP = HORIZON - (FOCAL * CAM_H) / WALL_DIST;    // 24
const WALL_BOTTOM = HORIZON + (FOCAL * CAM_H) / WALL_DIST; // 104
const FEET = HORIZON + (FOCAL * CAM_H) / FOE_DIST;         // 128
const SCALE = FOCAL / FOE_DIST / 64;                        // 2

const OPEN_MS = 220;
const POSE_MS = 260;
const FLOAT_MS = 900;
const ME = { x: 34, y: H - 18 };   // where the crawler's own numbers pop up

export const MAIN_MENU = [
  { id: 'attack', label: 'ATTACK' },
  { id: 'defend', label: 'DEFEND' },
  { id: 'item', label: 'ITEM' },
  { id: 'flee', label: 'FLEE' },
];

export class CombatScreen {
  // fight: Combat. scene: { wall, floor, ceil } textures, tint, light.
  // tables: lit shade tables. inventory: for the item menu.
  constructor({ fight, scene, tables, inventory, now = 0 }) {
    this.fight = fight;
    this.scene = scene;
    this.tables = tables;
    this.inv = inventory;
    this.openedAt = now;
    this.menu = 'main';    // 'main' | 'items'
    this.cursor = 0;
    this.itemCursor = 0;
    this.target = 0;       // index into the living enemies
    this.poses = new Map(); // enemy -> { pose, until }
    this.floats = [];       // { text, color, x, y, t0 }
    this.hurtAt = -1e9;     // crawler took damage (red frame, shake)
    this.banner = null;     // { text, color, t0 } big text in the middle
  }

  // ------------------------------------------------------------ menu

  // Consumables in the bag: [{ index, id, n }].
  items() {
    return this.inv.bag.map((s, index) => ({ ...s, index })).filter((s) => ITEMS[s.id].kind === 'consumable');
  }

  entries() {
    if (this.menu === 'items') {
      const list = this.items().map((s) => ({ id: 'use', index: s.index, label: shortName(s), count: s.n > 1 ? String(s.n) : '' }));
      list.push({ id: 'back', label: 'BACK' });
      return list;
    }
    const hasItems = this.items().length > 0;
    return MAIN_MENU.map((m) => ({ ...m, disabled: m.id === 'item' && !hasItems }));
  }

  move(dir) {
    const list = this.entries();
    if (dir === 'up' || dir === 'down') {
      const d = dir === 'up' ? -1 : 1;
      if (this.menu === 'items') this.itemCursor = (this.itemCursor + d + list.length) % list.length;
      else this.cursor = (this.cursor + d + list.length) % list.length;
    } else {
      const n = this.fight.alive.length;
      if (n > 1) this.target = (this.target + (dir === 'left' ? -1 : 1) + n) % n;
    }
  }

  // Returns what the crawler chose, or null (menu navigation only):
  // { kind: 'attack', target } | { kind: 'defend' } | { kind: 'flee' }
  // | { kind: 'useItem', index }.
  confirm() {
    if (!this.fight.crawlersTurn) return null;
    const list = this.entries();
    const e = list[this.menu === 'items' ? this.itemCursor : this.cursor];
    if (!e || e.disabled) return null;
    if (e.id === 'item') { this.menu = 'items'; this.itemCursor = 0; return null; }
    if (e.id === 'back') { this.back(); return null; }
    if (e.id === 'use') { this.menu = 'main'; return { kind: 'useItem', index: e.index }; }
    if (e.id === 'attack') return { kind: 'attack', target: this.currentTarget() };
    return { kind: e.id };
  }

  back() {
    this.menu = 'main';
  }

  currentTarget() {
    const alive = this.fight.alive;
    if (this.target >= alive.length) this.target = 0;
    return alive[this.target] || null;
  }

  // Mouse/touch on the panel's menu box. Returns true if an entry was hit
  // (the cursor moves there; the caller then confirms).
  hitMenu(px, py, box) {
    const i = Math.floor((py - (box.y + 10)) / 8);
    if (px < box.x || px >= box.x + box.w || i < 0) return false;
    const list = this.entries();
    const first = this.menu === 'items' ? this.scrollFirst(list.length) : 0;
    if (first + i >= list.length) return false;
    if (this.menu === 'items') this.itemCursor = first + i; else this.cursor = i;
    return true;
  }

  // Mouse/touch on the stage: picks an enemy as the target.
  hitStage(px, py) {
    const alive = this.fight.alive;
    const xs = this.slots(this.fight.enemies.length);
    let best = -1, bestD = 40;
    this.fight.enemies.forEach((e, i) => {
      if (!e.alive || py < TOP) return;
      const d = Math.abs(px - xs[i]);
      if (d < bestD) { bestD = d; best = alive.indexOf(e); }
    });
    if (best < 0) return false;
    this.target = best;
    return true;
  }

  scrollFirst(n) {
    const rows = 5;
    return Math.max(0, Math.min(this.itemCursor - rows + 1, n - rows));
  }

  // ------------------------------------------------------------ effects

  // Turns combat events into poses, flashes and floating numbers.
  onEvents(events, now) {
    const xs = this.slots(this.fight.enemies.length);
    const at = (e) => xs[this.fight.enemies.indexOf(e)];
    for (const ev of events) {
      const foe = ev.actor !== this.fight.crawler ? ev.actor : ev.target;
      if (foe && foe !== this.fight.crawler && ev.actor === foe) this.poses.set(foe, { pose: 'lunge', until: now + POSE_MS });
      switch (ev.kind) {
        case 'hit': case 'crit':
          if (ev.target === this.fight.crawler) {
            this.hurtAt = now;
            this.float(`-${ev.amount}`, C.RED, ME.x, ME.y, now);
          } else {
            this.poses.set(ev.target, { pose: 'flinch', until: now + POSE_MS, flash: now + 90 });
            this.float(ev.kind === 'crit' ? `CRIT ${ev.amount}!` : `${ev.amount}`, ev.kind === 'crit' ? C.YELLOW : C.WHITE, at(ev.target), FEET - 54, now);
          }
          break;
        case 'miss':
          if (ev.target === this.fight.crawler) this.float('MISS', C.SILVER, ME.x, ME.y, now);
          else this.float('MISS', C.SILVER, at(ev.target), FEET - 54, now);
          break;
        case 'blocked':
          this.float('BLOCKED', C.SKY, ME.x, ME.y, now);
          break;
        case 'defend':
          this.float('DEFENDING', C.SKY, ME.x, ME.y, now);
          break;
        case 'item':
          if (ev.amount) this.float(`+${ev.amount} HP`, C.LIME, ME.x, ME.y, now);
          break;
        case 'kill':
          this.poses.set(ev.target, { pose: 'dead', until: Infinity, at: now });
          break;
        case 'flee':
          this.banner = { text: 'GOT AWAY', color: C.SKY, t0: now };
          break;
        case 'fleeFail':
          this.float('CANNOT ESCAPE', C.FIRE, ME.x, ME.y, now);
          break;
        default:
      }
    }
    if (this.fight.result === 'won') this.banner = { text: 'VICTORY', color: C.GOLD, t0: now };
  }

  float(text, color, x, y, t0) {
    this.floats.push({ text, color, x, y, t0 });
  }

  // Screen x of each enemy slot.
  slots(n) {
    if (n <= 1) return [W / 2];
    const gap = n === 2 ? 110 : 96;
    return Array.from({ length: n }, (_, i) => Math.round(W / 2 + (i - (n - 1) / 2) * gap));
  }

  // ------------------------------------------------------------ drawing

  draw(fb, now) {
    const open = Math.min(1, (now - this.openedAt) / OPEN_MS);
    const shake = now - this.hurtAt < 220 ? Math.round(Math.sin((now - this.hurtAt) * 0.12) * 2) : 0;
    this.drawStage(fb, now, shake);
    this.drawEnemies(fb, now, shake);
    this.drawTopBar(fb);
    this.drawSelf(fb);
    this.drawFloats(fb, now);
    // Frame: red when the crawler was just hit.
    const hurt = now - this.hurtAt < 300;
    const edge = hurt ? C.RED : C.STONE_M;
    fb.rect(0, 0, W, 1, edge); fb.rect(0, H - 1, W, 1, edge);
    fb.rect(0, 0, 1, H, edge); fb.rect(W - 1, 0, 1, H, edge);
    if (hurt) { fb.rect(1, 1, W - 2, 1, C.BLOOD); fb.rect(1, H - 2, W - 2, 1, C.BLOOD); fb.rect(1, 1, 1, H - 2, C.BLOOD); fb.rect(W - 2, 1, 1, H - 2, C.BLOOD); }
    if (this.banner && now - this.banner.t0 < 1400) {
      const t = this.banner.text, w = textWidth(t) * 2;
      big(fb, t, (W - w) >> 1, 44, this.banner.color);
    }
    // Opening wipe: rows outside the growing band stay transparent.
    if (open < 1) {
      const half = Math.ceil((H / 2) * (1 - open));
      fb.rect(0, 0, W, half, TRANSPARENT);
      fb.rect(0, H - half, W, half, TRANSPARENT);
    }
  }

  // Brightness of a stage pixel: the room's light plus a spotlight.
  bright(x, y) {
    const dx = (x - W / 2) / 150, dy = (y - (FEET - 8)) / 70;
    const spot = Math.max(0, 1 - dx * dx - dy * dy);
    return Math.min(1.25, this.scene.light * 0.5 + 0.15 + spot * 0.6);
  }

  shadeIndex(b, x, y) {
    const { levels, maxBright } = this.tables;
    let l = (1 - b / maxBright) * (levels - 1) + BAYER4[((y & 3) << 2) | (x & 3)];
    l |= 0;
    return l < 0 ? 0 : l > levels - 1 ? levels - 1 : l;
  }

  drawStage(fb, now, shake) {
    const { wall, floor, ceil, tint } = this.scene;
    const { table, levels } = this.tables;
    const base = tint * levels;
    const px = fb.pixels, fw = fb.width;
    for (let y = TOP; y < H - 1; y++) {
      let tex, v, uScale, uOff;
      if (y < WALL_TOP) {
        const dist = (FOCAL * CAM_H) / (HORIZON - y);
        tex = ceil; v = dist * 64; uScale = dist / FOCAL * 64; uOff = 0;
      } else if (y < WALL_BOTTOM) {
        tex = wall; v = ((y - WALL_TOP) / (WALL_BOTTOM - WALL_TOP)) * 64; uScale = (WALL_DIST / FOCAL) * 64; uOff = 32;
      } else {
        const dist = (FOCAL * CAM_H) / (y - HORIZON);
        tex = floor; v = dist * 64; uScale = dist / FOCAL * 64; uOff = 0;
      }
      const tw = tex.w, th = tex.h;
      const row = (((v | 0) % th) + th) % th * tw;
      const edge = y === WALL_BOTTOM || y === WALL_BOTTOM + 1 ? 0.55 : 1; // contact shadow
      for (let x = 1; x < W - 1; x++) {
        const u = ((((x + shake - W / 2) * uScale + uOff) | 0) % tw + tw) % tw;
        const c = tex.data[row + u];
        let out;
        if (tex.glow && tex.glow[c]) out = c;
        else {
          const depthDim = y < WALL_TOP ? 0.55 : 1;
          out = table[(base + this.shadeIndex(this.bright(x, y) * edge * depthDim, x, y)) * PALETTE_SIZE + c];
        }
        px[y * fw + x] = out;
      }
    }
    // Soft shadow ellipse under each enemy.
    const xs = this.slots(this.fight.enemies.length);
    this.fight.enemies.forEach((e, i) => {
      const cx = xs[i] + shake;
      for (let y = FEET - 4; y <= FEET + 3; y++) {
        for (let x = cx - 44; x <= cx + 44; x++) {
          const d = ((x - cx) / 44) ** 2 + ((y - FEET) / 4) ** 2;
          if (d > 1 || x < 1 || x >= W - 1) continue;
          if (BAYER4[((y & 3) << 2) | (x & 3)] < (1 - d) * 0.8) px[y * fw + x] = C.BLACK;
        }
      }
    });
  }

  drawEnemies(fb, now, shake) {
    const xs = this.slots(this.fight.enemies.length);
    const { table, levels } = this.tables;
    const base = this.scene.tint * levels;
    const showTarget = this.fight.crawlersTurn && this.fight.alive.length > 1;
    const target = this.currentTarget();
    this.fight.enemies.forEach((e, i) => {
      const set = CREATURES[e.stats.sprite];
      const p = this.poses.get(e);
      const pose = p && (p.until > now || p.pose === 'dead') ? p.pose : 'idle';
      const img = pose === 'dead' ? set.corpse : pose === 'idle' ? frameAt(set.F.idle, now, i * 2) : set.F[pose];
      const flash = p && p.flash > now;
      const w = img.w * SCALE, h = img.h * SCALE;
      const x0 = xs[i] - (w >> 1) + shake;
      const y0 = FEET - h + (pose === 'dead' ? 2 : 0);
      // A dying enemy sinks into the floor and fades out in a dither.
      const fade = pose === 'dead' ? Math.min(1, (now - p.at) / 900) : 0;
      for (let sy = 0; sy < img.h; sy++) {
        for (let sx = 0; sx < img.w; sx++) {
          const c = img.data[sy * img.w + sx];
          if (c === TRANSPARENT) continue;
          for (let k = 0; k < SCALE * SCALE; k++) {
            const x = x0 + sx * SCALE + (k % SCALE), y = y0 + sy * SCALE + ((k / SCALE) | 0);
            if (x < 1 || y < TOP || x >= W - 1 || y >= H - 1) continue;
            if (fade && BAYER4[((y & 3) << 2) | (x & 3)] < fade) continue;
            let out;
            if (flash) out = C.WHITE;
            else if (img.glow && img.glow[c]) out = c;
            else out = table[(base + this.shadeIndex(this.bright(x, y), x, y)) * PALETTE_SIZE + c];
            fb.pixels[y * fb.width + x] = out;
          }
        }
      }
      if (!e.alive) return;
      // Name and hit points above the enemy.
      const top = FEET - set.F.idle.frames[0].h * SCALE - 4;
      const name = e.name.toUpperCase();
      const nx = xs[i] - (textWidth(name) >> 1);
      drawText(fb, name, nx, top - 13, e === target && showTarget ? C.YELLOW : C.BONE, C.BLACK);
      const bw = 40, bx = xs[i] - bw / 2;
      fb.bevel(bx, top - 6, bw, 4, C.BLACK, C.BLACK, C.STONE);
      fb.rect(bx + 1, top - 5, Math.max(0, Math.round(((bw - 2) * e.hp) / e.stats.hp)), 2, C.RED);
      if (e === target && showTarget) {
        for (let k = 0; k < 3; k++) fb.rect(xs[i] - k, top - 20 + k, 1 + k * 2, 1, C.YELLOW);
      }
    });
  }

  drawTopBar(fb) {
    fb.rect(1, 1, W - 2, TOP - 1, C.NIGHT);
    fb.rect(1, TOP - 1, W - 2, 1, C.STONE_D);
    const f = this.fight;
    let x = 4;
    drawText(fb, 'TURN', x, 3, C.FOG); x += 20;
    f.order.forEach((who) => {
      const me = who === f.crawler;
      if (!me && !who.alive) return;
      const label = me ? 'YOU' : who.name.split(' ').pop().toUpperCase();
      const w = textWidth(label) + 4;
      const now = who === f.current && !f.result;
      fb.rect(x, 2, w, 7, now ? (me ? C.GOLD : C.BLOOD) : C.SHADOW);
      drawText(fb, label, x + 2, 3, now ? C.BLACK : me ? C.BONE : C.SILVER);
      x += w + 3;
    });
    const r = `ROUND ${f.round}`;
    drawText(fb, r, W - 4 - textWidth(r), 3, C.FOG);
  }

  // The crawler's own corner: hit points and guard.
  drawSelf(fb) {
    const me = this.fight.crawler;
    const low = me.hp <= me.hpMax / 4;
    drawText(fb, 'YOU', 6, H - 9, C.GOLD, C.BLACK);
    drawText(fb, `${me.hp}/${me.hpMax}`, 22, H - 9, low ? C.FIRE : C.BONE, C.BLACK);
    if (this.fight.defending) drawText(fb, 'GUARD', 52, H - 9, C.SKY, C.BLACK);
  }

  drawFloats(fb, now) {
    this.floats = this.floats.filter((f) => now - f.t0 < FLOAT_MS);
    for (const f of this.floats) {
      const t = (now - f.t0) / FLOAT_MS;
      const y = Math.round(f.y - t * 14);
      drawText(fb, f.text, Math.round(f.x - textWidth(f.text) / 2), y, f.color, C.BLACK);
    }
  }

  // The action menu in the panel's right box.
  drawMenu(fb, box, now) {
    const f = this.fight;
    const myTurn = f.crawlersTurn;
    const title = this.menu === 'items' ? 'USE ITEM' : myTurn ? 'YOUR MOVE' : f.result ? '' : 'WAIT...';
    drawText(fb, title, box.x + 3, box.y + 2, myTurn ? C.GOLD : C.ASH);
    fb.rect(box.x + 2, box.y + 8, box.w - 4, 1, C.SHADOW);
    const list = this.entries();
    const rows = this.menu === 'items' ? 5 : list.length;
    const first = this.menu === 'items' ? this.scrollFirst(list.length) : 0;
    const cur = this.menu === 'items' ? this.itemCursor : this.cursor;
    for (let i = 0; i < Math.min(rows, list.length - first); i++) {
      const e = list[first + i];
      const y = box.y + 11 + i * 8;
      const sel = first + i === cur;
      const color = !myTurn || e.disabled ? C.ASH : sel ? C.YELLOW : C.BONE;
      if (sel && myTurn) {
        fb.rect(box.x + 1, y - 1, box.w - 2, 7, C.SHADOW);
        drawText(fb, '>', box.x + 3, y, C.YELLOW);
      }
      drawText(fb, e.label, box.x + 9, y, color);
      if (e.count) drawText(fb, e.count, box.x + box.w - 3 - textWidth(e.count), y, myTurn ? C.GOLD : C.ASH);
    }
  }
}

// Item name that fits the menu box next to its count.
function shortName({ id }) {
  const def = ITEMS[id];
  return (def.short || def.name).toUpperCase().slice(0, 12);
}

// Text at double size (each font pixel 2 x 2), with a drop shadow.
function big(fb, text, x, y, color) {
  const scaled = {
    set(px, py, c) { for (let k = 0; k < 4; k++) fb.set(x + px * 2 + (k & 1), y + py * 2 + (k >> 1), c); },
  };
  drawText(scaled, text, 1, 1, C.BLACK);
  drawText(scaled, text, 0, 0, color);
}
