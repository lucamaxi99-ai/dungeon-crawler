// The Safe Room screen (overlay, 320 x 140 HUD pixels, opaque). Time
// stands still in here: no countdown, no enemies, no walking around. A
// painted backdrop (a little bar behind a counter), Ozzle leaning on the
// counter with a speech bubble, and a Borant terminal on the right:
//   TALK          conversations with Ozzle (dialogue.js)
//   TRADE         Thrum's Previously Owned: buy and sell (shop.js); Thrum
//                 takes Ozzle's place at the counter while it is open
//   LEVEL UP      spend attribute points (opens the character sheet)
//   LOOT BOXES    open the boxes earned so far
//   ACHIEVEMENTS  the list, earned and still open
//   REST          HP and MP back to full, once per Safe Room
//   SAVE & QUIT   suspends the run (save.js); the page can be closed
//   LEAVE         back to the dungeon, in front of the door
// The achievements list is a page of its own; the loot boxes have theirs
// in lootbox-ui.js.

import { C } from '../engine/palette.js';
import { drawText, textWidth, wrapText } from '../engine/font.js';
import { rng } from '../engine/texgen.js';
import { MENTOR, paintOzzlePoses } from './mentor.js';
import { ACHIEVEMENTS } from './achievements.js';
import { TIER } from './lootboxes.js';
import { drawBoxList, drawOpening, openingDone } from './lootbox-ui.js';
import { paintThrumPoses } from './merchant.js';
import { ITEMS, RARITY, itemStats } from './items.js';
import { buyPrice, sellPrice } from './shop.js';

const W = 320, H = 140;
const COUNTER_Y = 100;                         // top of the bar counter
const OZ = { x: 72, y: COUNTER_Y + 3 - MENTOR.h }; // Ozzle's sprite position
const TERM = { x: 213, y: 3, w: 104, h: 134 };     // the terminal on the right
const MENU_Y = 22, MENU_H = 10;
const BUBBLE = { x: 5, y: 4, w: 202 };

export const SAFE_MENU = [
  { id: 'talk', label: 'TALK' },
  { id: 'shop', label: 'TRADE' },
  { id: 'levelup', label: 'LEVEL UP' },
  { id: 'boxes', label: 'LOOT BOXES' },
  { id: 'achievements', label: 'ACHIEVEMENTS' },
  { id: 'rest', label: 'REST' },
  { id: 'save', label: 'SAVE & QUIT' },
  { id: 'leave', label: 'LEAVE' },
];

// Achievements page.
const LIST = { x: 8, y: 18, rows: 13, rowH: 8 };
// Talking: topics on the terminal, the crawler's replies in a box over the
// bar counter, Ozzle's side in the speech bubble.
const TOPIC_Y = 22, TOPIC_H = 11;
export const REPLY_BOX = { x: 4, y: 105, w: 205, h: 32, rowH: 8 };
// Trading: the list on the terminal, details in the box over the counter.
const SHOP_Y = 27, SHOP_H = 9, SHOP_ROWS = 10;

// ------------------------------------------------------------ backdrop

// Painted once: wallpaper, a Borant poster, a neon sign, shelves with
// bottles and the counter. Returns a sprite-like { w, h, data }.
function paintBackdrop() {
  const data = new Uint8Array(W * H);
  const r = rng(907);
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) data[y * W + x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
  const text = (s, x, y, c) => drawText({ set }, s, x, y, c);
  // Wallpaper: wine stripes with a small diamond pattern, darker at the top.
  for (let y = 0; y < COUNTER_Y; y++) {
    for (let x = 0; x < W; x++) {
      const stripe = Math.floor(x / 6) % 2;
      const dx = Math.abs(((x + 6) % 12) - 6), dy = Math.abs((y % 12) - 6);
      let c = stripe ? C.WINE : C.PLUM_D;
      if (dx + dy === 4) c = stripe ? C.PLUM : C.WINE;
      if (y < 16 && (x + y) % 3 === 0) c = C.NIGHT;
      else if (y < 8) c = C.NIGHT;
      set(x, y, c);
    }
  }
  // Crown molding and a dado rail.
  rect(0, 8, W, 2, C.WOOD_D); rect(0, 10, W, 1, C.WOOD);
  rect(0, 88, W, 1, C.WOOD); rect(0, 89, W, 2, C.WOOD_D);
  for (let y = 91; y < COUNTER_Y; y++) for (let x = 0; x < W; x++) set(x, y, (x % 10 === 0) ? C.SOOT : y % 3 ? C.WOOD_D : C.SOOT);

  // A Borant poster on the left wall (promises, with an asterisk).
  const px = 14, py = 42;
  rect(px - 1, py - 1, 40, 42, C.WOOD_D);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 38; x++) set(px + x, py + y, (x * 7 + y * 3) % 17 === 0 ? C.TAN : C.PARCHMENT);
  text('BORANT', px + 7, py + 3, C.BLOOD);
  rect(px + 4, py + 10, 30, 1, C.BLOOD_D);
  text('YOU ARE', px + 5, py + 14, C.WOOD);
  text('SAFE*', px + 9, py + 21, C.GORE);
  for (let k = 0; k < 3; k++) for (let x = 4; x < 34; x++) if ((x + k * 3) % 5) set(px + x, py + 29 + k * 2, C.TAN);
  text('*', px + 31, py + 33, C.WOOD);

  // Neon sign behind the bar.
  const sx = 152, sy = 40;
  rect(sx, sy, 56, 16, C.BLACK);
  rect(sx + 1, sy + 1, 54, 14, C.NIGHT);
  const tmp = new Uint8Array(W * H);
  drawText({ set: (x, y) => { tmp[y * W + x] = 1; } }, 'SAFE ROOM', sx + 10, sy + 5, 1);
  for (let y = sy + 1; y < sy + 15; y++) for (let x = sx + 1; x < sx + 55; x++) {
    if (tmp[y * W + x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tmp[(y + dy) * W + x + dx])) set(x, y, C.TEAL_D);
  }
  for (let i = 0; i < W * H; i++) if (tmp[i]) data[i] = C.MINT;

  // Shelves with bottles.
  for (const y of [70, 86]) {
    rect(150, y, 60, 2, C.WOOD); rect(150, y + 2, 60, 1, C.SOOT);
    let x = 152;
    while (x < 204) {
      const h = 6 + Math.floor(r() * 7), w = 3 + Math.floor(r() * 3);
      const glass = [C.MOSS, C.BLOOD, C.AMBER, C.TEAL, C.PLUM, C.STEEL][Math.floor(r() * 6)];
      rect(x, y - h, w, h, glass);
      rect(x + 1, y - h - 2, Math.max(1, w - 2), 2, glass);
      set(x, y - h + 1, C.WHITE);
      rect(x, y - h + 3, w, 2, C.PARCHMENT);
      x += w + 1 + Math.floor(r() * 3);
    }
  }

  // The counter: a polished top and a planked front with a brass foot rail.
  rect(0, COUNTER_Y, 210, 2, C.LEATHER);
  rect(0, COUNTER_Y + 2, 210, 2, C.WOOD_L);
  rect(0, COUNTER_Y + 4, 210, 1, C.SOOT);
  for (let y = COUNTER_Y + 5; y < H; y++) {
    for (let x = 0; x < 210; x++) {
      const lx = x % 14;
      let c = lx === 0 ? C.SOOT : lx === 1 ? C.WOOD : (x * 5 + y * 2) % 23 === 0 ? C.WOOD : C.WOOD_D;
      if (y > H - 4) c = C.SOOT;
      set(x, y, c);
    }
  }
  rect(0, 126, 210, 1, C.YELLOW); rect(0, 127, 210, 1, C.GOLD); rect(0, 128, 210, 1, C.RUST);
  for (let x = 20; x < 210; x += 40) rect(x, 126, 2, 8, C.RUST);
  // Floor between counter and terminal, and the terminal's dark backing.
  rect(210, 0, 110, H, C.BLACK);
  return { w: W, h: H, data };
}

// ------------------------------------------------------------ screen

export class SafeRoomScreen {
  constructor() {
    this.open = false;
    this.page = 'menu';  // 'menu' | 'achievements' | 'boxes' | 'topics' | 'talk'
    this.cursor = 0;
    this.listCursor = 0;
    this.listTop = 0;
    this.boxCursor = 0;
    this.opening = null; // { box, loot, at } while a box is being opened
    this.topics = [];    // what the crawler can bring up (dialogue.js topicsFor)
    this.topicCursor = 0;
    this.convo = null;   // the running Conversation
    this.replyCursor = 0;
    this.shopTab = 'buy'; // 'buy' | 'sell'
    this.shopCursor = 0;
    this.thrum = null;    // painted on first use
    this.say = '';
    this.sayAt = 0;
    this.backdrop = null; // painted on first use
    this.ozzle = null;
  }

  enter(line, now) {
    this.open = true;
    this.page = 'menu';
    this.cursor = 0;
    this.opening = null;
    this.talk(line, now);
    if (!this.backdrop) { this.backdrop = paintBackdrop(); this.ozzle = paintOzzlePoses(); }
  }

  close() { this.open = false; }

  // Still typing the current line (a key press shows it all at once).
  typing(now) { return (now - this.sayAt) / 12 < this.say.length; }
  skipTyping() { this.sayAt = -1e9; }

  // delay: Ozzle waits a moment before saying it (after a box bursts open).
  talk(line, now, delay = 0) {
    if (delay > 0) { this.pending = { line, at: now + delay }; return; }
    this.pending = null;
    this.say = line;
    this.sayAt = now;
  }

  // Keyboard. Returns a menu command id when one is chosen, else null.
  // dir: 'up' | 'down' | 'left' | 'right'; act: 'interact' | 'close'.
  move(dir, nAchievements = ACHIEVEMENTS.length, nBoxes = 0) {
    const d = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    if (this.page === 'shop' && (dir === 'left' || dir === 'right')) { this.shopTab = this.shopTab === 'buy' ? 'sell' : 'buy'; this.shopCursor = 0; return; }
    if (!d) return;
    if (this.page === 'boxes') this.boxCursor = (this.boxCursor + d + nBoxes) % Math.max(1, nBoxes);
    else if (this.page === 'shop') this.shopCursor = Math.max(0, Math.min(nBoxes - 1, this.shopCursor + d));
    else if (this.page === 'topics') this.topicCursor = (this.topicCursor + d + this.topics.length + 1) % (this.topics.length + 1);
    else if (this.page === 'talk' && this.convo) {
      const n = this.convo.replies.length;
      this.replyCursor = (this.replyCursor + d + n) % n;
    }
    else if (this.page === 'menu') this.cursor = (this.cursor + d + SAFE_MENU.length) % SAFE_MENU.length;
    else if (this.page === 'achievements') {
      this.listCursor = Math.max(0, Math.min(nAchievements - 1, this.listCursor + d));
      if (this.listCursor < this.listTop) this.listTop = this.listCursor;
      if (this.listCursor >= this.listTop + LIST.rows) this.listTop = this.listCursor - LIST.rows + 1;
    }
  }

  // The highlighted menu entry.
  selected() { return SAFE_MENU[this.cursor].id; }

  // Still showing a box being opened (input waits until the card is full).
  openingBusy(now) { return !!this.opening && !openingDone(this.opening, now); }

  // Mouse / touch. Returns { kind: 'menu', id } | { kind: 'back' } | { kind: 'row' } | null.
  hit(px, py) {
    if (this.page === 'shop') {
      if (px < TERM.x) return null;
      if (py < SHOP_Y - 3) {
        const tab = px < TERM.x + TERM.w / 2 ? 'buy' : 'sell';
        if (tab !== this.shopTab) { this.shopTab = tab; this.shopCursor = 0; }
        return { kind: 'tab' };
      }
      if (py > TERM.y + TERM.h - 14) return { kind: 'back' };
      const j = Math.floor((py - SHOP_Y + 2) / SHOP_H);
      if (j >= 0 && j < SHOP_ROWS) return { kind: 'ware', row: j };
      return null;
    }
    if (this.page === 'topics') {
      const i = Math.floor((py - TOPIC_Y + 2) / TOPIC_H);
      if (px >= TERM.x && i >= 0 && i <= this.topics.length) {
        this.topicCursor = i;
        return { kind: 'topic' };
      }
      return null;
    }
    if (this.page === 'talk') {
      const n = this.convo ? this.convo.replies.length : 0;
      const i = Math.floor((py - REPLY_BOX.y - 4) / REPLY_BOX.rowH);
      if (px < TERM.x && py >= REPLY_BOX.y && i >= 0 && i < n) {
        this.replyCursor = i;
        return { kind: 'reply' };
      }
      return px >= TERM.x && py > TERM.y + TERM.h - 14 ? { kind: 'back' } : { kind: 'continue' };
    }
    if (this.page === 'boxes') {
      if (this.opening) return { kind: 'continue' };
      const j = Math.floor((py - TERM.y - 17) / 11);
      if (px >= TERM.x && j >= 0 && j < 8) return { kind: 'box', row: j };
      return px >= TERM.x && py > TERM.y + TERM.h - 14 ? { kind: 'back' } : null;
    }
    if (this.page === 'saved') return { kind: 'continue' };
    if (this.page === 'achievements') {
      const j = Math.floor((py - LIST.y + 1) / LIST.rowH);
      if (px < 200 && j >= 0 && j < LIST.rows && this.listTop + j < ACHIEVEMENTS.length) {
        this.listCursor = this.listTop + j;
        return { kind: 'row' };
      }
      return { kind: 'back' };
    }
    if (this.page !== 'menu') return null;
    const i = Math.floor((py - MENU_Y + 2) / MENU_H);
    if (px >= TERM.x && i >= 0 && i < SAFE_MENU.length) {
      this.cursor = i;
      return { kind: 'menu', id: SAFE_MENU[i].id };
    }
    return null;
  }

  // info: { points, boxes (list), unlocked (ids), total, rested, hp, hpMax, mp, mpMax, viewers, deaths, newTopics }
  draw(fb, now, info) {
    if (!this.open) return;
    if (this.pending && now >= this.pending.at) this.talk(this.pending.line, now);
    fb.blit(this.backdrop, 0, 0);
    drawTally(fb, info.deaths || 0);
    if (this.page === 'shop') this.drawThrum(fb, now); else this.drawOzzle(fb, now);
    if (this.page === 'achievements') return this.drawAchievements(fb, info);
    this.drawBubble(fb, now);
    if (this.page === 'boxes') {
      this.drawFrame(fb);
      if (this.boxCursor >= info.boxes.length) this.boxCursor = Math.max(0, info.boxes.length - 1);
      drawBoxList(fb, TERM, info.boxes, this.boxCursor, now);
    } else if (this.page === 'shop') {
      this.drawShop(fb, now, info.shop);
    } else if (this.page === 'saved') {
      this.drawTerminal(fb, now, info);
      this.drawSaved(fb, now);
    } else if (this.page === 'topics') {
      this.drawTopics(fb);
    } else if (this.page === 'talk') {
      this.drawTalk(fb, now);
    } else {
      this.drawTerminal(fb, now, info);
    }
    if (this.opening) drawOpening(fb, this.opening, now);
  }

  drawFrame(fb) {
    const { x, y, w, h } = TERM;
    fb.bevel(x, y, w, h, C.STEEL_D, C.STEEL_M, C.BLACK);
    fb.bevel(x + 3, y + 3, w - 6, h - 6, C.NIGHT, C.BLACK, C.STEEL);
    for (let j = y + 4; j < y + h - 4; j += 2) fb.rect(x + 4, j, w - 8, 1, C.BLACK);
  }

  drawOzzle(fb, now) {
    const t = now - this.sayAt;
    // Talking for a moment after a new line (mouth flaps), otherwise
    // breathing with a slow blink.
    const talking = ['menu', 'topics', 'talk', 'saved'].includes(this.page) && t < Math.min(2600, 400 + this.say.length * 18);
    let pose = 'idle0';
    if (talking) pose = Math.floor(t / 140) % 2 ? 'talk' : 'idle0';
    else if (now % 3400 < 260) pose = 'idle1';
    fb.blit(this.ozzle[pose], OZ.x, OZ.y);
    // Name badge on the uniform.
    const bx = OZ.x + 41, by = OZ.y + 49;
    fb.rect(bx - 1, by - 1, 15, 7, C.BLACK);
    fb.rect(bx, by, 13, 5, C.BONE);
    drawText(fb, 'OZ', bx + 3, by, C.BLOOD);
  }

  drawBubble(fb, now) {
    const lines = wrapText(this.say, BUBBLE.w - 10);
    // Typewriter: the line appears over the first moments.
    let left = Math.floor((now - this.sayAt) / 12);
    const h = lines.length * 7 + 7;
    const { x, y, w } = BUBBLE;
    fb.rect(x + 1, y, w - 2, h, C.BONE);
    fb.rect(x, y + 1, w, h - 2, C.BONE);
    fb.rect(x + 1, y + h, w - 2, 1, C.FOG);
    // Tail down toward Ozzle.
    const tx = OZ.x + 30;
    for (let k = 0; k < 6; k++) fb.rect(tx + k, y + h + k, 6 - k, 1, k === 5 ? C.FOG : C.BONE);
    lines.forEach((l, i) => {
      const shown = l.slice(0, Math.max(0, left));
      left -= l.length + 1;
      drawText(fb, shown, x + 5, y + 4 + i * 7, C.NIGHT);
    });
  }

  drawTerminal(fb, now, info) {
    const { x, y, w, h } = TERM;
    this.drawFrame(fb);
    drawText(fb, 'SAFE ROOM', x + 7, y + 7, C.MINT);
    drawText(fb, 'SERVICES', x + w - 7 - textWidth('SERVICES'), y + 7, C.TEAL_M);
    fb.rect(x + 6, y + 14, w - 12, 1, C.TEAL_D);
    const blink = Math.floor(now / 450) % 2 === 0;
    SAFE_MENU.forEach((m, i) => {
      const my = MENU_Y + i * MENU_H;
      const sel = i === this.cursor;
      if (sel) fb.rect(x + 5, my - 3, w - 10, MENU_H - 1, C.TEAL_D);
      let label = m.label, badge = '', bc = C.MINT, dim = false;
      if (m.id === 'talk') { badge = info.newTopics ? 'NEW' : ''; bc = blink ? C.YELLOW : C.GOLD; }
      if (m.id === 'levelup') { badge = info.points ? `+${info.points}` : ''; bc = blink ? C.YELLOW : C.GOLD; dim = !info.points; }
      if (m.id === 'boxes') { badge = info.boxes.length ? String(info.boxes.length) : ''; bc = C.YELLOW; dim = !info.boxes.length; }
      if (m.id === 'achievements') { badge = `${info.unlocked.length}/${info.total}`; bc = C.TEAL_M; }
      if (m.id === 'rest' && info.rested) { label = 'RESTED'; dim = true; }
      drawText(fb, sel ? '>' : ' ', x + 7, my, C.YELLOW);
      drawText(fb, label, x + 12, my, sel ? C.WHITE : dim ? C.ASH : C.BONE);
      if (badge) drawText(fb, badge, x + w - 8 - textWidth(badge), my, bc);
    });
    // The crawler's state, and a reminder that time is frozen.
    const sy = MENU_Y + SAFE_MENU.length * MENU_H + 2;
    fb.rect(x + 6, sy, w - 12, 1, C.TEAL_D);
    const row = (label, v, c, k) => {
      drawText(fb, label, x + 8, sy + 4 + k * 7, C.FOG);
      drawText(fb, v, x + w - 8 - textWidth(v), sy + 4 + k * 7, c);
    };
    const ry = sy + 4;
    drawText(fb, 'HP', x + 8, ry, C.FOG);
    drawText(fb, `${info.hp}/${info.hpMax}`, x + 20, ry, info.hp <= info.hpMax / 4 ? C.FIRE : C.RED);
    const mp = `${info.mp}/${info.mpMax}`;
    drawText(fb, 'MP', x + w - 20 - textWidth(mp), ry, C.FOG);
    drawText(fb, mp, x + w - 8 - textWidth(mp), ry, C.SKY);
    row('VIEWERS', info.viewers, C.NEON, 1);
    drawText(fb, 'COUNTDOWN PAUSED', x + 8, y + h - 12, blink ? C.TEAL_M : C.TEAL);
  }

  // After SAVE & QUIT: the run is safe; close the page or keep playing.
  drawSaved(fb, now) {
    const b = { x: 40, y: 44, w: 240, h: 54 };
    fb.bevel(b.x, b.y, b.w, b.h, C.NIGHT, C.MINT, C.TEAL_D);
    fb.bevel(b.x + 2, b.y + 2, b.w - 4, b.h - 4, C.BLACK, C.TEAL_D, C.TEAL_D);
    const t = 'RUN SAVED';
    drawText(fb, t, b.x + ((b.w - textWidth(t)) >> 1), b.y + 8, C.MINT);
    const lines = ['YOU CAN CLOSE THE PAGE NOW.', 'NEXT TIME YOU ARE BACK IN THIS SAFE ROOM.', 'THE SAVE IS USED UP WHEN YOU RETURN.'];
    lines.forEach((l, i) => drawText(fb, l, b.x + ((b.w - textWidth(l)) >> 1), b.y + 18 + i * 7, i === 2 ? C.ASH : C.BONE));
    if (Math.floor(now / 500) % 2) {
      const k = 'SPACE: KEEP PLAYING';
      drawText(fb, k, b.x + ((b.w - textWidth(k)) >> 1), b.y + b.h - 10, C.YELLOW);
    }
  }

  // Thrum at the counter, in Ozzle's place: talking, idle, wings settling.
  drawThrum(fb, now) {
    if (!this.thrum) this.thrum = paintThrumPoses();
    const t = now - this.sayAt;
    let pose = now % 2900 < 380 ? 'idle1' : 'idle0';
    if (t < Math.min(2600, 400 + this.say.length * 18)) pose = Math.floor(t / 160) % 2 ? 'talk' : 'idle0';
    fb.blit(this.thrum[pose], OZ.x, OZ.y);
  }

  // The trade: BUY / SELL tabs, a list with prices on the terminal, the
  // selected item's details in a box over the counter.
  // shop: { stock: [{ id, n }], bag: [{ id, n }], cha, gold }
  drawShop(fb, now, shop) {
    const { x, y, w, h } = TERM;
    this.drawFrame(fb);
    const tabs = [['buy', 'BUY', x + 7], ['sell', 'SELL', x + w / 2 + 4]];
    for (const [id, label, tx] of tabs) {
      const on = this.shopTab === id;
      if (on) fb.rect(tx - 2, y + 5, textWidth(label) + 4, 9, C.TEAL_D);
      drawText(fb, label, tx, y + 7, on ? C.WHITE : C.TEAL);
    }
    fb.rect(x + 6, y + 15, w - 12, 1, C.TEAL_D);
    const list = this.shopTab === 'buy' ? shop.stock : shop.bag;
    if (this.shopCursor >= list.length) this.shopCursor = Math.max(0, list.length - 1);
    const top = Math.max(0, Math.min(this.shopCursor - SHOP_ROWS + 1, list.length - SHOP_ROWS));
    this.shopTop = top;
    if (!list.length) drawText(fb, this.shopTab === 'buy' ? 'SOLD OUT' : 'NOTHING TO SELL', x + 8, SHOP_Y, C.ASH);
    for (let j = 0; j < SHOP_ROWS && top + j < list.length; j++) {
      const it = list[top + j], def = ITEMS[it.id];
      const ry = SHOP_Y + j * SHOP_H;
      const sel = top + j === this.shopCursor;
      if (sel) fb.rect(x + 5, ry - 2, w - 10, SHOP_H, C.SHADOW);
      const price = this.shopTab === 'buy' ? buyPrice(it.id, shop.cha) : sellPrice(it.id, shop.cha);
      const ps = String(price);
      const room = w - 22 - textWidth(ps) - 4;
      let name = def.short || def.name;
      if (it.n > 1) name = `${it.n}X ${name}`;
      while (textWidth(name.toUpperCase()) > room && name.length > 3) name = name.slice(0, -1);
      drawText(fb, name, x + 8, ry, sel ? C.WHITE : RARITY[def.rarity].color);
      const poor = this.shopTab === 'buy' && price > shop.gold;
      drawText(fb, ps, x + w - 8 - textWidth(ps), ry, poor ? C.BLOOD : C.GOLD);
    }
    const gold = `GOLD ${shop.gold}`;
    drawText(fb, gold, x + 8, y + h - 12, C.GOLD);
    drawText(fb, 'ESC', x + w - 8 - textWidth('ESC'), y + h - 12, C.ASH);

    // Details of the selected item over the counter.
    const b = REPLY_BOX;
    fb.bevel(b.x, b.y, b.w, b.h, C.NIGHT, C.STEEL_M, C.BLACK);
    const it = list[this.shopCursor];
    if (!it) {
      drawText(fb, 'LEFT/RIGHT: BUY OR SELL', b.x + 6, b.y + 5, C.ASH);
      return;
    }
    const def = ITEMS[it.id];
    drawText(fb, def.name, b.x + 5, b.y + 4, RARITY[def.rarity].color);
    const stats = itemStats(def);
    drawText(fb, stats, b.x + b.w - 5 - textWidth(stats), b.y + 4, C.FOG);
    wrapText(def.desc, b.w - 10).slice(0, 2).forEach((l, i) => drawText(fb, l, b.x + 5, b.y + 12 + i * 7, C.BONE));
    const hint = this.shopTab === 'buy' ? 'SPACE BUY' : 'SPACE SELL ONE';
    if (Math.floor(now / 500) % 2) drawText(fb, hint, b.x + b.w - 5 - textWidth(hint), b.y + b.h - 2 - 6, C.TEAL_M);
  }

  // The topic list on the terminal: new ones marked, heard ones dimmed.
  drawTopics(fb) {
    const { x, y, w } = TERM;
    this.drawFrame(fb);
    drawText(fb, 'TALK TO OZZLE', x + 7, y + 7, C.MINT);
    fb.rect(x + 6, y + 14, w - 12, 1, C.TEAL_D);
    const rows = [...this.topics.map((t) => ({ label: t.label, fresh: t.fresh, heard: !t.fresh && !t.repeat })), { label: 'BACK', back: true }];
    rows.forEach((r, i) => {
      const my = TOPIC_Y + i * TOPIC_H;
      const sel = i === this.topicCursor;
      if (sel) fb.rect(x + 5, my - 3, w - 10, TOPIC_H - 1, C.TEAL_D);
      drawText(fb, sel ? '>' : ' ', x + 7, my, C.YELLOW);
      drawText(fb, r.label, x + 12, my, sel ? C.WHITE : r.back || r.heard ? C.ASH : C.BONE);
      if (r.fresh) drawText(fb, '*', x + w - 11, my, C.YELLOW);
    });
    drawText(fb, '* NEW', x + 8, y + TERM.h - 12, C.TEAL);
  }

  // A conversation: replies in a box over the counter, the topic on the terminal.
  drawTalk(fb, now) {
    const { x, y, w } = TERM;
    this.drawFrame(fb);
    drawText(fb, 'TALKING TO', x + 7, y + 7, C.TEAL_M);
    drawText(fb, 'OZZLE', x + 7, y + 15, C.MINT);
    fb.rect(x + 6, y + 22, w - 12, 1, C.TEAL_D);
    let ty = y + 27;
    for (const l of wrapText(this.convo.topic.label, w - 16)) { drawText(fb, l, x + 8, ty, C.BONE); ty += 7; }
    drawText(fb, 'UP/DOWN PICK', x + 8, y + TERM.h - 34, C.TEAL);
    drawText(fb, 'SPACE SAY', x + 8, y + TERM.h - 26, C.TEAL);
    drawText(fb, 'ESC BACK', x + 8, y + TERM.h - 12, C.ASH);
    // The reply box.
    const b = REPLY_BOX;
    fb.bevel(b.x, b.y, b.w, b.h, C.NIGHT, C.STEEL_M, C.BLACK);
    if (this.typing(now)) {
      if (Math.floor(now / 300) % 2) drawText(fb, '...', b.x + 6, b.y + 5, C.ASH);
      return;
    }
    this.convo.replies.forEach((r, i) => {
      const ry = b.y + 5 + i * b.rowH;
      const sel = i === this.replyCursor;
      if (sel) fb.rect(b.x + 2, ry - 2, b.w - 4, b.rowH, C.SHADOW);
      drawText(fb, sel ? '>' : '-', b.x + 5, ry, sel ? C.YELLOW : C.ASH);
      drawText(fb, r.text, b.x + 11, ry, sel ? C.WHITE : C.BONE);
    });
  }

  drawAchievements(fb, info) {
    const win = { x: 2, y: 2, w: 316, h: 136 };
    fb.bevel(win.x, win.y, win.w, win.h, C.NIGHT, C.STEEL_M, C.BLACK);
    fb.bevel(win.x + 1, win.y + 1, win.w - 2, win.h - 2, C.NIGHT, C.STEEL_D, C.STEEL_D);
    drawText(fb, 'ACHIEVEMENTS', LIST.x, 6, C.GOLD);
    const count = `${info.unlocked.length} OF ${info.total} EARNED`;
    drawText(fb, count, win.x + win.w - 6 - textWidth(count), 6, C.TEAL_M);
    fb.rect(LIST.x, 13, win.w - 12, 1, C.STEEL_D);
    const got = new Set(info.unlocked);
    for (let j = 0; j < LIST.rows; j++) {
      const a = ACHIEVEMENTS[this.listTop + j];
      if (!a) break;
      const y = LIST.y + j * LIST.rowH;
      const has = got.has(a.id);
      const sel = this.listTop + j === this.listCursor;
      if (sel) fb.rect(LIST.x - 3, y - 2, 196, LIST.rowH, C.SHADOW);
      const name = has || !a.secret ? a.name.toUpperCase() : '???';
      drawText(fb, has ? '*' : '-', LIST.x, y, has ? C.YELLOW : C.ASH);
      drawText(fb, name, LIST.x + 6, y, has ? (sel ? C.WHITE : C.BONE) : sel ? C.FOG : C.ASH);
      const tag = rewardTag(a, has);
      drawText(fb, tag.text, LIST.x + 188 - textWidth(tag.text), y, tag.color);
    }
    // Scroll bar.
    const n = ACHIEVEMENTS.length, barH = LIST.rows * LIST.rowH;
    fb.rect(204, LIST.y - 2, 1, barH, C.STEEL_D);
    fb.rect(204, LIST.y - 2 + Math.round((barH * this.listTop) / n), 1, Math.max(3, Math.round((barH * LIST.rows) / n)), C.STEEL_L);
    // Details of the selected one on the right.
    const a = ACHIEVEMENTS[this.listCursor];
    const has = got.has(a.id);
    const dx = 212, dw = 100;
    drawText(fb, has ? 'EARNED' : 'NOT YET', dx, LIST.y, has ? C.YELLOW : C.ASH);
    const body = has ? a.text : a.secret ? 'A secret. The System will tell you when you stumble into it.' : a.hint;
    let y = LIST.y + 9;
    for (const l of wrapText(body, dw)) {
      if (y > 120) break;
      drawText(fb, l, dx, y, has ? C.BONE : C.FOG);
      y += 7;
    }
    drawText(fb, 'ESC BACK', LIST.x, 126, C.ASH);
  }
}

// Ozzle's tally of dead crawlers, chalked on the wallpaper between the
// poster and the bar: one stroke per death (of this soul, GDD 2.1), in
// groups of five. The wall holds 50; after that he gave up counting.
export const TALLY = { x: 55, y: 45, cols: 2, rows: 5, max: 50 };
export function drawTally(fb, deaths) {
  const n = Math.min(deaths, TALLY.max);
  for (let i = 0; i < n; i++) {
    const g = Math.floor(i / 5), k = i % 5;
    const gx = TALLY.x + (g % TALLY.cols) * 9, gy = TALLY.y + Math.floor(g / TALLY.cols) * 9;
    const chalk = (g + k) % 3 ? C.FOG : C.ASH;
    if (k < 4) {
      fb.rect(gx + k * 2, gy + (k & 1), 1, 6 - (k & 1), chalk);
    } else {
      for (let t = 0; t < 8; t++) fb.set(gx - 1 + t, gy + 5 - Math.floor(t * 5 / 8), C.BONE);
    }
  }
  if (deaths > TALLY.max) drawText(fb, '+', TALLY.x + 6, TALLY.y + TALLY.rows * 9, C.BONE);
}

// The reward column: box tier, item, or a dash.
function rewardTag(a, has) {
  if (!has && a.secret) return { text: '', color: C.ASH };
  if (!a.reward) return { text: '-', color: C.ASH };
  if (a.reward.box) return { text: TIER[a.reward.box].name.toUpperCase(), color: has ? TIER[a.reward.box].color : C.ASH };
  return { text: 'ITEM', color: has ? C.BONE : C.ASH };
}

