// The combat screen: a little stage over the 3D view (overlay, 320 x 140
// HUD pixels) with the enemies in a spotlight, plus the action menu that
// replaces the minimap in the panel.
//
// The stage is built from the textures of the place where the fight happens
// and lit through the lit shade tables, so it keeps the floor's mood. The
// enemies are drawn at 2 HUD pixels per sprite pixel, about as fine as they
// look up close in the 3D view. Tall enemies, or three wide ones, don't fit
// that way: then the camera zooms out to 1.5 (or 1) for the whole fight,
// like the 3D view does at a distance, so names and hit points still fit.
//
// Story bosses (rank 'boss') get the stage to themselves: big in the middle,
// their name and a segmented health bar up in a second row of the top bar,
// helpers they call in small at the sides.

import { C, PALETTE_SIZE } from '../engine/palette.js';
import { TRANSPARENT } from '../engine/framebuffer.js';
import { BAYER4 } from '../engine/lighting.js';
import { drawText, textWidth } from '../engine/font.js';
import { frameAt } from '../engine/sprite.js';
import { CREATURES } from './assets.js';
import { ITEMS } from './items.js';
import { SKILLS } from './skills.js';
import { SPELLS } from './spells.js';

const W = 320, H = 140;
const TOP = 12;                 // stage starts under the turn-order bar
const FOCAL = 160, HORIZON = 64, CAM_H = 0.5;
const WALL_DIST = 2;            // the back wall
const FOE_DIST = 1.25;          // where the enemies stand: 2 px per sprite px
const WALL_TOP = HORIZON - (FOCAL * CAM_H) / WALL_DIST;    // 24
const WALL_BOTTOM = HORIZON + (FOCAL * CAM_H) / WALL_DIST; // 104
const FEET = HORIZON + (FOCAL * CAM_H) / FOE_DIST;         // 128
const SCALE = FOCAL / FOE_DIST / 64;                        // 2: closest zoom
const ZOOMS = [SCALE, 1.5, 1];
const NAME_ROOM = 18;            // name, HP bar and status tags above the head
const BOSS_TOP = 21;            // boss fights: two rows of top bar
const HELPER_X = [62, 258, 100, 220]; // where a boss's helpers stand
const BOSS_SEG = 4;             // HP per segment of a boss's health bar

const OPEN_MS = 220;
const POSE_MS = 260;
const FLOAT_MS = 900;
const ME = { x: 34, y: H - 18 };   // where the crawler's own numbers pop up

export const MAIN_MENU = [
  { id: 'attack', label: 'ATTACK' },
  { id: 'skill', label: 'SKILL' },
  { id: 'spell', label: 'SPELL' },
  { id: 'defend', label: 'DEFEND' },
  { id: 'item', label: 'ITEM' },
  { id: 'flee', label: 'FLEE' },
];
const ROW = 7, ROWS = 6;          // menu rows in the panel box
const SUB_TITLE = { items: 'USE ITEM', skills: 'SKILLS', spells: 'SPELLS' };
const STATUS_TAG = { daze: ['Z', C.YELLOW], blind: ['B', C.FOG], hex: ['H', C.LILAC] };
const SELF_TAG = { blind: ['BLIND', C.SILVER], hex: ['HEXED', C.LILAC], boot: ['BOOTED', C.YELLOW] };
const STATUS_TEXT = { daze: ['DAZED', C.YELLOW], blind: ['BLINDED', C.SILVER], hex: ['HEXED', C.LILAC], boot: ['BOOTED', C.YELLOW] };

export class CombatScreen {
  // fight: Combat. scene: { wall, floor, ceil } textures, tint, light.
  // tables: lit shade tables. inventory: for the item menu.
  constructor({ fight, scene, tables, inventory, now = 0 }) {
    this.fight = fight;
    this.scene = scene;
    this.tables = tables;
    this.inv = inventory;
    this.openedAt = now;
    this.menu = 'main';    // 'main' | 'items' | 'skills' | 'spells'
    this.cursor = 0;
    this.itemCursor = 0;   // cursor inside a sub menu
    this.target = 0;       // index into the living enemies
    this.poses = new Map(); // enemy -> { pose, until }
    this.floats = [];       // { text, color, x, y, t0 }
    this.hurtAt = -1e9;     // crawler took damage (red frame, shake)
    this.banner = null;     // { text, color, t0 } big text in the middle
    this.fx = [];           // spell effects: { kind, x, y, t0 }
    this.boss = fight.enemies.find((e) => e.stats.rank === 'boss') || null;
    this.top = this.boss ? BOSS_TOP : TOP;
    this.scale = this.boss ? bossZoom(this.boss) : stageZoom(fight.enemies, this.slots(fight.enemies.length));
  }

  // Screen x of an enemy on the stage.
  slotX(e) {
    const list = this.fight.enemies;
    if (!this.boss) return this.slots(list.length)[list.indexOf(e)];
    if (e === this.boss) return W / 2;
    return HELPER_X[list.filter((o) => o !== this.boss).indexOf(e) % HELPER_X.length];
  }

  // Height on the stage of an enemy's front view, and a point at share k of
  // that height above its feet (for numbers and effects).
  heightOf(e) {
    return CREATURES[e.sprite].F.idle.frames[0].h * this.scale;
  }
  yAt(e, k) {
    return Math.max(this.top + 10, Math.round(FEET - this.heightOf(e) * k));
  }

  // ------------------------------------------------------------ menu

  // Consumables in the bag: [{ index, id, n }].
  items() {
    // Tomes and skill potions need a quiet moment, not a rat in your face.
    const usable = (d) => d.kind === 'consumable' && !d.teach && !d.skillPotion;
    return this.inv.bag.map((s, index) => ({ ...s, index })).filter((s) => usable(ITEMS[s.id]));
  }

  // Active skills: ready, or the turns until they are (- once used up).
  skills() {
    const me = this.fight.crawler;
    return me.skills.list().filter((id) => SKILLS[id].active).map((id) => {
      const cd = this.fight.cooldown(id);
      const def = SKILLS[id];
      return {
        id: 'useSkill', skill: id, label: (def.short || def.name).toUpperCase().slice(0, 12),
        count: cd === Infinity ? '-' : cd ? String(cd) : '', countColor: C.ASH,
        disabled: !this.fight.canSkill(id), info: `LV ${me.skills.level(id)}: ${def.info(me.skills.level(id), me)}`,
      };
    });
  }

  // Spells with their mana cost.
  spells() {
    const me = this.fight.crawler;
    return me.spells.list().map((id) => {
      const def = SPELLS[id];
      return {
        id: 'cast', spell: id, label: (def.short || def.name).toUpperCase().slice(0, 12),
        count: String(def.mp), countColor: C.SKY,
        disabled: !this.fight.canCast(id), info: `LV ${me.spells.level(id)}: ${def.info(me.spells.level(id), me)}  ${def.mp} MP`,
      };
    });
  }

  entries() {
    if (this.menu !== 'main') {
      const list = this.menu === 'items'
        ? this.items().map((s) => ({ id: 'use', index: s.index, label: shortName(s), count: s.n > 1 ? String(s.n) : '' }))
        : this.menu === 'skills' ? this.skills() : this.spells();
      list.push({ id: 'back', label: 'BACK' });
      return list;
    }
    const me = this.fight.crawler;
    const off = {
      item: !this.items().length,
      skill: !me.skills.list().some((id) => SKILLS[id].active),
      spell: !me.spells.list().length,
      flee: !this.fight.canFlee,
    };
    return MAIN_MENU.map((m) => ({ ...m, disabled: !!off[m.id] }));
  }

  move(dir) {
    const list = this.entries();
    if (dir === 'up' || dir === 'down') {
      const d = dir === 'up' ? -1 : 1;
      if (this.menu !== 'main') this.itemCursor = (this.itemCursor + d + list.length) % list.length;
      else this.cursor = (this.cursor + d + list.length) % list.length;
    } else {
      const n = this.fight.alive.length;
      if (n > 1) this.target = (this.target + (dir === 'left' ? -1 : 1) + n) % n;
    }
  }

  // Returns what the crawler chose, or null (menu navigation only):
  // { kind: 'attack', target } | { kind: 'defend' } | { kind: 'flee' }
  // | { kind: 'useItem', index } | { kind: 'skill', id, target }
  // | { kind: 'spell', id, target }.
  confirm() {
    if (!this.fight.crawlersTurn) return null;
    const list = this.entries();
    const e = list[this.menu !== 'main' ? this.itemCursor : this.cursor];
    if (!e || e.disabled) return null;
    const sub = { item: 'items', skill: 'skills', spell: 'spells' }[e.id];
    if (sub) { this.menu = sub; this.itemCursor = 0; return null; }
    if (e.id === 'back') { this.back(); return null; }
    if (e.id === 'use') { this.menu = 'main'; return { kind: 'useItem', index: e.index }; }
    if (e.id === 'useSkill') { this.menu = 'main'; return { kind: 'skill', id: e.skill, target: this.currentTarget() }; }
    if (e.id === 'cast') { this.menu = 'main'; return { kind: 'spell', id: e.spell, target: this.currentTarget() }; }
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
    const i = Math.floor((py - (box.y + 9)) / ROW);
    if (px < box.x || px >= box.x + box.w || i < 0) return false;
    const list = this.entries();
    const first = this.menu !== 'main' ? this.scrollFirst(list.length) : 0;
    if (i >= ROWS || first + i >= list.length) return false;
    if (this.menu !== 'main') this.itemCursor = first + i; else this.cursor = i;
    return true;
  }

  // Mouse/touch on the stage: picks an enemy as the target.
  hitStage(px, py) {
    const alive = this.fight.alive;
    let best = -1, bestD = 40;
    this.fight.enemies.forEach((e) => {
      if (!alive.includes(e) || py < TOP) return;
      const d = Math.abs(px - this.slotX(e));
      if (d < bestD) { bestD = d; best = alive.indexOf(e); }
    });
    if (best < 0) return false;
    this.target = best;
    return true;
  }

  scrollFirst(n) {
    return Math.max(0, Math.min(this.itemCursor - ROWS + 1, n - ROWS));
  }

  // ------------------------------------------------------------ effects

  // Turns combat events into poses, flashes and floating numbers.
  onEvents(events, now) {
    const at = (e) => this.slotX(e);
    const me = this.fight.crawler;
    const y = (e, k) => this.yAt(e, k);
    let delay = 0; // a missile has to fly before its numbers pop up
    for (const ev of events) {
      const foe = ev.actor !== me ? ev.actor : ev.target;
      if (foe && foe !== me && ev.actor === foe && ev.kind !== 'dazed') this.poses.set(foe, { pose: 'lunge', until: now + POSE_MS });
      const t = now + delay;
      switch (ev.kind) {
        case 'skill':
          this.float(ev.name.toUpperCase(), C.GOLD, W / 2, TOP + 16, now);
          break;
        case 'cast':
          this.float(ev.name.toUpperCase(), C.SKY, W / 2, TOP + 16, now);
          if (ev.id === 'magicMissile') delay = 260;
          this.castFx = { id: ev.id, t0: now };
          break;
        case 'heal':
          this.float(`+${ev.amount} HP`, C.LIME, ME.x, ME.y, now);
          this.fx.push({ kind: 'sparkle', x: ME.x + 6, y: H - 14, t0: now });
          break;
        case 'status': {
          const [text, color] = STATUS_TEXT[ev.status];
          this.float(text, color, at(ev.target), y(ev.target, 0.85), t);
          if (ev.status === 'hex') this.fx.push({ kind: 'hex', x: at(ev.target), y: y(ev.target, 0.5), t0: t });
          if (ev.status === 'blind') this.fx.push({ kind: 'sand', x: at(ev.target), y: y(ev.target, 0.65), t0: t });
          break;
        }
        case 'curse': {
          const [text, color] = STATUS_TEXT[ev.status];
          this.float(text, color, ME.x, ME.y - 8, now + 200);
          if (ev.status !== 'boot') this.fx.push({ kind: ev.status === 'hex' ? 'hex' : 'sand', x: ME.x + 6, y: H - 16, t0: now + 100 });
          else this.hurtAt = now + 100;
          break;
        }
        case 'ticket':
          this.float('TICKET!', C.YELLOW, at(ev.actor), y(ev.actor, 0.75), now);
          this.float(`-${ev.amount} GOLD`, C.GOLD, ME.x, ME.y - 8, now + 250);
          break;
        case 'windup':
          this.float('WINDS UP THE HOOK!', C.AMBER, at(ev.actor), y(ev.actor, 0.9), now);
          break;
        case 'summon':
          this.float('BACKUP!', C.SKY, at(ev.target), y(ev.target, 1.1), now + 100);
          this.poses.set(ev.target, { pose: 'arrive', until: now + 600, at: now, dir: at(ev.target) < W / 2 ? -1 : 1 });
          break;
        case 'phase':
          this.banner = { text: 'TOWING MODE', color: C.RED, t0: now + 200 };
          this.hurtAt = now + 200;
          break;
        case 'dazed':
          this.float('DAZED', C.YELLOW, at(ev.actor), y(ev.actor, 0.7), now);
          this.fx.push({ kind: 'stars', x: at(ev.actor), y: y(ev.actor, 0.8), t0: now });
          break;
        case 'throw':
          this.fx.push({ kind: ev.what, x: at(ev.actor), y: y(ev.actor, 0.7), t0: now });
          delay = 300;
          break;
        case 'blast':
          this.fx.push({ kind: 'boom', x: at(ev.actor), y: y(ev.actor, 0.4), t0: now + 150 });
          this.hurtAt = now + 150;
          delay = 250;
          break;
        case 'mend':
          this.float(`+${ev.amount} HP`, C.LIME, at(ev.target), y(ev.target, 0.85), now + 150);
          this.fx.push({ kind: 'sparkle', x: at(ev.target) - 6, y: FEET, t0: now });
          break;
        case 'steal':
          this.float(`-${ev.amount} GOLD`, C.GOLD, ME.x, ME.y - 8, now + 150);
          break;
        case 'escape': case 'rout':
          this.float(ev.kind === 'escape' ? 'ESCAPES' : 'FLEES', C.SILVER, at(ev.actor), y(ev.actor, 0.85), t);
          this.poses.set(ev.actor, { pose: 'gone', until: Infinity, at: t, dir: at(ev.actor) < W / 2 ? -1 : 1 });
          break;
        case 'skillUp':
          this.float(`${ev.name.toUpperCase()} LV ${ev.level}`, C.YELLOW, W / 2, TOP + 26, now + 300);
          break;
        case 'hit': case 'crit':
          if (ev.target === this.fight.crawler) {
            this.hurtAt = Math.max(this.hurtAt, t);
            this.float(`-${ev.amount}`, C.RED, ME.x, ME.y, t);
            if (ev.special === 'bomb') this.fx.push({ kind: 'boom', x: ME.x + 10, y: H - 22, t0: t });
            if (ev.special === 'spit') this.fx.push({ kind: 'splat', x: ME.x + 10, y: H - 22, t0: t });
            if (ev.special === 'tow') this.fx.push({ kind: 'boom', x: ME.x + 10, y: H - 22, t0: t });
          } else {
            if (this.castFx && this.castFx.id === 'magicMissile' && this.castFx.t0 === now) {
              this.fx.push({ kind: 'missile', x: at(ev.target), y: y(ev.target, 0.5), t0: now });
            }
            this.poses.set(ev.target, { pose: 'flinch', from: t, until: t + POSE_MS, flash: t + 90 });
            this.float(ev.kind === 'crit' ? `CRIT ${ev.amount}!` : `${ev.amount}`, ev.kind === 'crit' ? C.YELLOW : C.WHITE, at(ev.target), y(ev.target, 0.7), t);
            if (ev.crack) this.float('CRACK!', C.BONE, at(ev.target), y(ev.target, 0.95), t + 120);
          }
          break;
        case 'miss':
          if (ev.target === this.fight.crawler) this.float('MISS', C.SILVER, ME.x, ME.y, t);
          else this.float('MISS', C.SILVER, at(ev.target), y(ev.target, 0.7), now);
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
          this.poses.set(ev.target, { pose: 'dead', until: Infinity, at: t });
          break;
        case 'flee':
          this.banner = { text: 'GOT AWAY', color: C.SKY, t0: now };
          break;
        case 'fleeFail':
          this.float(ev.booted ? 'CLAMPED!' : 'CANNOT ESCAPE', C.FIRE, ME.x, ME.y, now);
          break;
        default:
      }
    }
    if (this.fight.result === 'won') {
      const ran = this.fight.enemies.every((e) => e.alive);
      this.banner = { text: ran ? 'THEY RAN' : 'VICTORY', color: ran ? C.SILVER : C.GOLD, t0: now };
    }
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
    this.drawFx(fb, now);
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
    for (let y = this.top; y < H - 1; y++) {
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
    this.fight.enemies.forEach((e) => {
      if (this.fight.out.has(e) && e.alive) return;
      const rx = Math.round((e === this.boss ? 34 : 22) * this.scale);
      const cx = this.slotX(e) + shake;
      for (let y = FEET - 4; y <= FEET + 3; y++) {
        for (let x = cx - rx; x <= cx + rx; x++) {
          const d = ((x - cx) / rx) ** 2 + ((y - FEET) / 4) ** 2;
          if (d > 1 || x < 1 || x >= W - 1) continue;
          if (BAYER4[((y & 3) << 2) | (x & 3)] < (1 - d) * 0.8) px[y * fw + x] = C.BLACK;
        }
      }
    });
  }

  drawEnemies(fb, now, shake) {
    const { table, levels } = this.tables;
    const base = this.scene.tint * levels;
    const showTarget = this.fight.crawlersTurn && this.fight.alive.length > 1;
    const target = this.currentTarget();
    // The boss first, so its helpers stand in front of it.
    const list = this.fight.enemies.slice().sort((a, b) => (b === this.boss) - (a === this.boss));
    list.forEach((e) => {
      const i = this.fight.enemies.indexOf(e);
      const sx = this.slotX(e);
      const set = CREATURES[e.sprite];
      let p = this.poses.get(e);
      if (p && (p.from > now || (p.pose === 'dead' && p.at > now))) p = null; // not yet: the missile is still flying
      const pose = p && (p.until > now || p.pose === 'dead' || p.pose === 'gone') ? p.pose : 'idle';
      const img = pose === 'dead' ? set.corpse : pose === 'idle' || pose === 'gone' || pose === 'arrive' ? frameAt(set.F.idle, now, i * 2) : set.F[pose];
      const flash = p && p.flash > now;
      const S = this.scale;
      const w = Math.round(img.w * S), h = Math.round(img.h * S);
      // Running off: slides out to the side and fades. Arriving: slides in.
      const off = pose === 'gone' ? Math.round(Math.min(1, (now - p.at) / 700) * 90 * p.dir)
        : pose === 'arrive' ? Math.round((1 - Math.min(1, (now - p.at) / 600)) * 90 * p.dir) : 0;
      const x0 = sx - (w >> 1) + shake + off;
      const y0 = FEET - h + (pose === 'dead' ? 2 : 0);
      // A dying enemy sinks into the floor and fades out in a dither.
      const fade = pose === 'dead' ? Math.min(1, (now - p.at) / 900) : pose === 'gone' ? Math.min(1, (now - p.at) / 800) : 0;
      if (fade >= 1 && pose === 'gone') return;
      for (let dy = 0; dy < h; dy++) {
        const y = y0 + dy;
        if (y < this.top || y >= H - 1) continue;
        const sy = Math.min(img.h - 1, Math.floor(dy / S));
        for (let dx = 0; dx < w; dx++) {
          const x = x0 + dx;
          if (x < 1 || x >= W - 1) continue;
          const c = img.data[sy * img.w + Math.min(img.w - 1, Math.floor(dx / S))];
          if (c === TRANSPARENT) continue;
          if (fade && BAYER4[((y & 3) << 2) | (x & 3)] < fade) continue;
          let out;
          if (flash) out = C.WHITE;
          else if (img.glow && img.glow[c]) out = c;
          else out = table[(base + this.shadeIndex(this.bright(x, y), x, y)) * PALETTE_SIZE + c];
          fb.pixels[y * fb.width + x] = out;
        }
      }
      if (!e.alive || this.fight.out.has(e) || e === this.boss) return;
      // Name and hit points above the enemy.
      const top = Math.round(FEET - set.F.idle.frames[0].h * S - 4);
      const name = e.name.toUpperCase();
      const nx = sx - (textWidth(name) >> 1);
      drawText(fb, name, nx, top - 13, e === target && showTarget ? C.YELLOW : C.BONE, C.BLACK);
      const bw = 40, bx = sx - bw / 2;
      fb.bevel(bx, top - 6, bw, 4, C.BLACK, C.BLACK, C.STONE);
      fb.rect(bx + 1, top - 5, Math.max(0, Math.round(((bw - 2) * e.hp) / e.stats.hp)), 2, C.RED);
      // Status effects as little tags right of the bar.
      const st = this.fight.status.get(e);
      let tx = bx + bw + 2;
      for (const s of ['daze', 'blind', 'hex']) {
        if (!st || !st[s]) continue;
        const [tag, color] = STATUS_TAG[s];
        fb.rect(tx, top - 8, 5, 7, C.BLACK);
        drawText(fb, tag, tx + 1, top - 7, color);
        tx += 6;
      }
      if (e === target && showTarget) {
        if (top - 20 >= this.top) for (let k = 0; k < 3; k++) fb.rect(sx - k, top - 20 + k, 1 + k * 2, 1, C.YELLOW);
        else { drawText(fb, '>', nx - 6, top - 13, C.YELLOW, C.BLACK); drawText(fb, '<', nx + textWidth(name) + 2, top - 13, C.YELLOW, C.BLACK); }
      }
    });
  }

  drawTopBar(fb) {
    fb.rect(1, 1, W - 2, this.top - 1, C.NIGHT);
    fb.rect(1, this.top - 1, W - 2, 1, C.STONE_D);
    const f = this.fight;
    if (this.boss) this.drawBossBar(fb);
    const row = this.boss ? 10 : 0; // boss fights: turn order in the second row
    let x = 4;
    drawText(fb, 'TURN', x, 3 + row, C.FOG); x += 20;
    f.order.forEach((who) => {
      const me = who === f.crawler;
      if (!me && (!who.alive || f.out.has(who))) return;
      const label = me ? 'YOU' : who.name.split(' ').pop().toUpperCase();
      const w = textWidth(label) + 4;
      const now = who === f.current && !f.result;
      fb.rect(x, 2 + row, w, 7, now ? (me ? C.GOLD : C.BLOOD) : C.SHADOW);
      drawText(fb, label, x + 2, 3 + row, now ? C.BLACK : me ? C.BONE : C.SILVER);
      x += w + 3;
    });
    const r = `ROUND ${f.round}`;
    drawText(fb, r, W - 4 - textWidth(r), 3 + row, C.FOG);
  }

  // Boss fights: the boss's name, a health bar in segments and its status
  // tags along the top.
  drawBossBar(fb) {
    const e = this.boss, f = this.fight;
    const targeted = f.crawlersTurn && f.alive.length > 1 && this.currentTarget() === e;
    const name = e.name.toUpperCase();
    if (targeted) drawText(fb, '>', 2, 3, C.YELLOW);
    drawText(fb, name, 7, 3, targeted ? C.YELLOW : e.enraged ? C.RED : C.GOLD);
    const segs = Math.ceil(e.stats.hp / BOSS_SEG);
    const x0 = 12 + textWidth(name), seg = Math.max(3, Math.floor((W - 60 - x0) / segs));
    for (let k = 0; k < segs; k++) {
      const hp = Math.max(0, Math.min(BOSS_SEG, e.hp - k * BOSS_SEG));
      const x = x0 + k * seg;
      fb.rect(x, 2, seg - 1, 7, C.BLACK);
      const fill = Math.round(((seg - 3) * hp) / BOSS_SEG);
      if (fill) fb.rect(x + 1, 3, fill, 5, e.enraged ? C.FIRE : C.RED);
    }
    const st = f.status.get(e);
    let tx = x0 + segs * seg + 2;
    for (const s of ['daze', 'blind', 'hex']) {
      if (!st || !st[s]) continue;
      const [tag, color] = STATUS_TAG[s];
      drawText(fb, tag, tx, 3, color);
      tx += 6;
    }
  }

  // The crawler's own corner: hit points, mana and guard. In the skill and
  // spell lists, what the selected one does goes along the bottom.
  drawSelf(fb) {
    const me = this.fight.crawler;
    const low = me.hp <= me.hpMax / 4;
    drawText(fb, 'YOU', 6, H - 9, C.GOLD, C.BLACK);
    const hp = `${me.hp}/${me.hpMax}`;
    drawText(fb, hp, 22, H - 9, low ? C.FIRE : C.BONE, C.BLACK);
    const mp = `MP ${me.mp}/${me.mpMax}`;
    drawText(fb, mp, 30 + textWidth(hp), H - 9, C.SKY, C.BLACK);
    let tx = 38 + textWidth(hp) + textWidth(mp);
    if (this.fight.defending) { drawText(fb, 'GUARD', tx, H - 9, C.SKY, C.BLACK); tx += textWidth('GUARD') + 4; }
    for (const k of ['blind', 'hex', 'boot']) {
      if (!this.fight.self[k]) continue;
      const [tag, color] = SELF_TAG[k];
      drawText(fb, tag, tx, H - 9, color, C.BLACK);
      tx += textWidth(tag) + 4;
    }
    if (this.menu === 'skills' || this.menu === 'spells') {
      const e = this.entries()[this.itemCursor];
      if (e && e.info) drawText(fb, e.info, W - 6 - textWidth(e.info), H - 9, C.BONE, C.BLACK);
    }
  }

  // Spell and skill effects, drawn in palette colors straight onto the stage.
  drawFx(fb, now) {
    this.fx = this.fx.filter((f) => now - f.t0 < 700);
    const put = (x, y, c) => { if (x >= 1 && y >= TOP && x < W - 1 && y < H - 1) fb.pixels[(y | 0) * fb.width + (x | 0)] = c; };
    for (const f of this.fx) {
      const t = now - f.t0;
      if (t < 0) continue;
      if (f.kind === 'missile') {
        // A bolt from the crawler (bottom middle) to the target, then a burst.
        const fly = 260;
        const sx = W / 2, sy = H - 6;
        if (t < fly) {
          const k = t / fly;
          for (let j = 11; j >= 0; j--) {
            const kk = Math.max(0, k - j * 0.025);
            const x = sx + (f.x - sx) * kk + Math.sin(t / 25 + j) * (j ? 1 : 0), y = sy + (f.y - sy) * kk;
            const r = j === 0 ? 3 : j < 4 ? 2 : 1;
            for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
              const d = Math.abs(dx) + Math.abs(dy);
              if (d > r) continue;
              put(x + dx, y + dy, j === 0 ? (d === 0 ? C.WHITE : d === 1 ? C.LILAC : C.VIOLET_M) : j < 4 ? (d ? C.VIOLET : C.VIOLET_M) : C.VIOLET_D);
            }
          }
        } else {
          const k = (t - fly) / 300;
          if (k < 1) for (let a = 0; a < 12; a++) {
            const ang = (a / 12) * Math.PI * 2;
            const d = 3 + k * 16;
            put(f.x + Math.cos(ang) * d, f.y + Math.sin(ang) * d * 0.8, k < 0.5 ? C.WHITE : C.LILAC);
            put(f.x + Math.cos(ang) * d * 0.6, f.y + Math.sin(ang) * d * 0.5, C.VIOLET_M);
          }
        }
      } else if (f.kind === 'sparkle') {
        // Green motes rising around the crawler's corner.
        for (let a = 0; a < 14; a++) {
          const x = f.x + ((a * 37) % 60) - 10 + Math.sin(t / 90 + a) * 2;
          const y = f.y - ((t / 12 + a * 9) % 40);
          put(x, y, a % 3 ? C.LIME : C.MINT);
          if (a % 4 === 0) { put(x - 1, y, C.GREEN); put(x + 1, y, C.GREEN); }
        }
      } else if (f.kind === 'hex') {
        // A violet ring spinning around the target.
        for (let a = 0; a < 16; a++) {
          const ang = (a / 16) * Math.PI * 2 + t / 120;
          const r = 22 - t / 50;
          put(f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r * 0.35, a % 2 ? C.VIOLET_M : C.LILAC);
        }
      } else if (f.kind === 'sand') {
        // A puff of grit in the target's face.
        for (let a = 0; a < 30; a++) {
          const ang = (a * 2.4) % (Math.PI * 2);
          const d = (t / 30) * (0.4 + ((a * 13) % 10) / 10);
          put(f.x + Math.cos(ang) * d, f.y + Math.sin(ang) * d * 0.6 + t / 60, a % 2 ? C.TAN : C.PARCHMENT);
        }
      } else if (f.kind === 'bomb' || f.kind === 'spit') {
        // Lobbed from the enemy to the crawler's corner in an arc.
        const fly = 300, k = t / fly;
        if (k < 1) {
          const tx = ME.x + 10, ty = H - 22;
          const x = f.x + (tx - f.x) * k, y = f.y + (ty - f.y) * k - Math.sin(k * Math.PI) * 30;
          const bomb = f.kind === 'bomb';
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            if (dx * dx + dy * dy > 5) continue;
            put(x + dx, y + dy, bomb ? (dx < 0 && dy < 0 ? C.STEEL_L : C.SOOT) : dx * dx + dy * dy > 2 ? C.MOSS : C.LIME);
          }
          if (bomb) { put(x + 2, y - 3, t % 80 < 40 ? C.YELLOW : C.FIRE); put(x + 3, y - 4, C.HOT); }
          else for (let j = 1; j < 4; j++) put(x - (tx - f.x) * 0.02 * j, y + j * 2, C.MOSS);
        }
      } else if (f.kind === 'boom') {
        // Fireball: a white core, rings of fire, sooty sparks flying out.
        const k = t / 500;
        if (k < 1) for (let a = 0; a < 28; a++) {
          const ang = (a / 28) * Math.PI * 2 + a;
          const d = (4 + k * 26) * (0.6 + ((a * 7) % 5) / 10);
          const c = k < 0.25 ? C.WHITE : k < 0.5 ? C.YELLOW : k < 0.75 ? C.FIRE : C.SOOT;
          put(f.x + Math.cos(ang) * d, f.y + Math.sin(ang) * d * 0.7, c);
          put(f.x + Math.cos(ang) * d * 0.5, f.y + Math.sin(ang) * d * 0.35, k < 0.5 ? C.HOT : C.AMBER);
        }
      } else if (f.kind === 'splat') {
        // Green acid dripping down.
        for (let a = 0; a < 18; a++) {
          const x = f.x + ((a * 29) % 30) - 15, y = f.y + ((a * 17) % 12) - 6 + (t / 40) * ((a % 3) + 1) * 0.5;
          put(x, y, a % 3 ? C.LIME : C.MOSS);
          if (a % 2) put(x, y + 1, C.MOSS_D);
        }
      } else if (f.kind === 'stars') {
        // Little stars circling the head of a dazed enemy.
        for (let a = 0; a < 3; a++) {
          const ang = (a / 3) * Math.PI * 2 + t / 110;
          const x = f.x + Math.cos(ang) * 12, y = f.y + Math.sin(ang) * 3;
          put(x, y, C.YELLOW); put(x - 1, y, C.GOLD); put(x + 1, y, C.GOLD); put(x, y - 1, C.GOLD); put(x, y + 1, C.GOLD);
        }
      }
    }
  }

  drawFloats(fb, now) {
    this.floats = this.floats.filter((f) => now - f.t0 < FLOAT_MS);
    for (const f of this.floats) {
      if (now < f.t0) continue;
      const t = (now - f.t0) / FLOAT_MS;
      const y = Math.round(f.y - t * 14);
      drawText(fb, f.text, Math.round(f.x - textWidth(f.text) / 2), y, f.color, C.BLACK);
    }
  }

  // The action menu in the panel's right box.
  drawMenu(fb, box, now) {
    const f = this.fight;
    const myTurn = f.crawlersTurn;
    const sub = this.menu !== 'main';
    const title = sub ? SUB_TITLE[this.menu] : myTurn ? 'YOUR MOVE' : f.result ? '' : 'WAIT...';
    drawText(fb, title, box.x + 3, box.y + 2, myTurn ? C.GOLD : C.ASH);
    if (this.menu === 'spells') {
      const mp = `${f.crawler.mp}MP`;
      drawText(fb, mp, box.x + box.w - 3 - textWidth(mp), box.y + 2, C.SKY);
    }
    fb.rect(box.x + 2, box.y + 8, box.w - 4, 1, C.SHADOW);
    const list = this.entries();
    const first = sub ? this.scrollFirst(list.length) : 0;
    const cur = sub ? this.itemCursor : this.cursor;
    for (let i = 0; i < Math.min(ROWS, list.length - first); i++) {
      const e = list[first + i];
      const y = box.y + 10 + i * ROW;
      const sel = first + i === cur;
      const color = !myTurn || e.disabled ? C.ASH : sel ? C.YELLOW : C.BONE;
      if (sel && myTurn) {
        fb.rect(box.x + 1, y - 1, box.w - 2, ROW, C.SHADOW);
        drawText(fb, '>', box.x + 3, y, C.YELLOW);
      }
      drawText(fb, e.label, box.x + 9, y, color);
      if (e.count) drawText(fb, e.count, box.x + box.w - 3 - textWidth(e.count), y, !myTurn ? C.ASH : e.countColor || C.GOLD);
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

// A boss fight's zoom: as big as the boss fits under the two-row top bar
// (in eighths, never closer than the usual 2).
export function bossZoom(boss) {
  const h = CREATURES[boss.sprite].F.idle.frames[0].h;
  return Math.min(SCALE, Math.floor(((FEET - BOSS_TOP) / h) * 8) / 8);
}

// The zoom for a whole fight: as close as possible while every enemy's front
// view (plus its name and hit points) fits on the stage and neighbours
// don't swallow each other.
export function stageZoom(enemies, xs) {
  const imgs = enemies.map((e) => CREATURES[e.sprite].F.idle.frames[0]);
  const tall = Math.max(...imgs.map((i) => i.h));
  const wide = Math.max(...imgs.map(opaqueWidth));
  const gap = xs.length > 1 ? xs[1] - xs[0] : Infinity;
  for (const z of ZOOMS) {
    if (FEET - tall * z - 4 - 13 >= TOP + 1 && wide * z <= gap + 16) return z;
  }
  return ZOOMS[ZOOMS.length - 1];
}

// Width of the painted part of a sprite.
function opaqueWidth(img) {
  let lo = img.w, hi = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.data[y * img.w + x] === TRANSPARENT) continue;
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
  }
  return hi < lo ? 0 : hi - lo + 1;
}
