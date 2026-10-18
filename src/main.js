// Entry point: wires engine, level, player, HUD and input together.
//
// Screen layout (960 x 600, square pixels):
//   3D view   960 x 420, rendered at 960x420, 640x280 or 320x140 and scaled
//             up; the resolution follows the frame rate (AutoResolution).
//   overlay   320 x 140 HUD pixels, scaled 3x over the view.
//   panel     320 x 60 HUD pixels, scaled 3x under the view.

import { FrameBuffer } from './engine/framebuffer.js';
import { LitRaycaster } from './engine/raycaster-lit.js';
import { buildLitTables, LightMap } from './engine/lighting.js';
import { AutoResolution } from './engine/resolution.js';
import { frameAt } from './engine/sprite.js';
import { buildTextures, SPRITES, WALL } from './game/assets.js';
import { TINTS, LANTERN } from './game/lights.js';
import { Level, TEST_FLOOR } from './game/map.js';
import { Player } from './game/player.js';
import {
  MessageLog, drawPanel, drawOverlay,
  HUD_W, OVERLAY_H, PANEL_H, SCREEN_W, SCREEN_H, VIEW_H,
} from './game/hud.js';
import { bindInput } from './game/input.js';
import { line } from './game/system-ai.js';
import { Inventory } from './game/inventory.js';
import { ITEMS, RARITY_ORDER } from './game/items.js';
import { rollLoot } from './game/loot.js';
import { InventoryScreen } from './game/inventory-ui.js';

const canvas = document.getElementById('screen');
canvas.width = SCREEN_W;
canvas.height = SCREEN_H;
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

// ------------------------------------------------------------ world

const textures = buildTextures();
const level = new Level(TEST_FLOOR);
const player = new Player(level.start);
const log = new MessageLog();
const inventory = new Inventory();
const invScreen = new InventoryScreen(inventory);
const state = { showMap: false, bumps: 0, saidFirstSteps: false, notice: null, noticeUntil: 0 };

const isWall = (x, y) => level.wall(x, y) !== 0;
const light = new LightMap(level.w, level.h, isWall, TINTS.length);
for (const a of level.ambient) light.setAmbient(a.x, a.y, a.x + a.w - 1, a.y + a.h - 1, a.ambient, a.tint);
for (const l of level.lights) light.addLight(l);

const decor = level.decor.map((d, i) => ({ ...d, phase: i * 3 + 1 }));

// ------------------------------------------------------------ renderer

const tables = buildLitTables({ tints: TINTS, levels: 32, maxBright: 1.5 });
const STEPS = [{ w: 960, h: 420 }, { w: 640, h: 280 }, { w: 320, h: 140 }];
const res = new AutoResolution(STEPS);
let viewFb, caster;

function setResolution(index) {
  const { w, h } = STEPS[index];
  viewFb = new FrameBuffer(w, h);
  caster = new LitRaycaster({ w, h, fov: 66, tables, lighting: true, dither: true, ao: true, fogFar: 16 });
}
setResolution(res.index);

const overlayFb = new FrameBuffer(HUD_W, OVERLAY_H);
const panelFb = new FrameBuffer(HUD_W, PANEL_H);

// Fixed resolution from the URL for testing: ?res=640
const fixed = STEPS.findIndex((s) => String(s.w) === new URLSearchParams(location.search).get('res'));
if (fixed >= 0) setResolution(res.setMode(fixed));

// ------------------------------------------------------------ rules

const world = {
  canEnter(x, y) {
    if (level.wall(x, y)) return false;
    const o = level.objectAt(x, y);
    return !(o && SPRITES[o.type].solid);
  },
  onBlocked(x, y) {
    // Only comment on every few bumps so the log doesn't drown in sarcasm.
    state.bumps++;
    if (level.objectAt(x, y)) {
      if (state.bumps % 3 === 1) log.push(line('bumpObject'));
    } else if (state.bumps % 4 === 1) {
      log.push(line('bumpWall'));
    }
  },
  onEnter(x, y) {
    const o = level.objectAt(x, y);
    if (o && o.type === 'bones' && !o.flags.seen) {
      o.flags.seen = true;
      log.push(line('bones'), 'info');
    }
    if (level.bagAt(x, y)) log.push(line('bagHere'), 'info');
    if (!state.saidFirstSteps && player.steps >= 12) {
      state.saidFirstSteps = true;
      log.push(line('firstSteps'));
    }
  },
};

function interact() {
  const f = player.front();
  const frontBag = level.bagAt(f.x, f.y);
  if (frontBag) return pickUp(frontBag);
  const w = level.wall(f.x, f.y);
  if (w === WALL.STAIRS) return log.push(line('stairs'), 'warn');
  if (w === WALL.POSTER) return log.push(line('poster'), 'info');
  const o = level.objectAt(f.x, f.y);
  if (o && o.type === 'chest') return openChest(o);
  if (o) return log.push(line(o.type));
  const ownBag = level.bagAt(player.x, player.y);
  if (ownBag) return pickUp(ownBag);
  if (!w) log.push(line('nothing'), 'info');
}

const itemLabel = ({ id, n }) => (n > 1 ? `${n}x ${ITEMS[id].name}` : ITEMS[id].name);

// ------------------------------------------------------------ inventory

function pickUp(bag) {
  for (const { id, n } of bag.items) inventory.add(id, n);
  level.removeObject(bag);
  log.push(`Picked up: ${bag.items.map(itemLabel).join(', ')}.`, 'info');
  log.push(line('pickup'));
}

// Drops a stack into a bag on the floor: in front of the player if there is
// room, otherwise on the player's own cell. Items join a bag already there.
function dropStack(stack) {
  const f = player.front();
  const free = (x, y) => level.inside(x, y) && !level.wall(x, y) && !(level.objectAt(x, y) && SPRITES[level.objectAt(x, y).type].solid);
  const cell = free(f.x, f.y) ? f : { x: player.x, y: player.y };
  let bag = level.bagAt(cell.x, cell.y);
  if (!bag) {
    bag = { type: 'bag', x: cell.x, y: cell.y, flags: {}, items: [] };
    level.objects.push(bag);
  }
  const same = ITEMS[stack.id].stack && bag.items.find((s) => s.id === stack.id);
  if (same) same.n += stack.n; else bag.items.push({ ...stack });
  log.push(`Dropped: ${itemLabel(stack)}.`, 'info');
  log.push(line('drop'));
}

// SPACE / X inside the inventory screen.
function inventoryCommand(cmd) {
  const sel = invScreen.selection();
  if (!sel.stack) return;
  const def = ITEMS[sel.stack.id];
  if (cmd === 'drop') {
    const stack = sel.where === 'slot' ? inventory.takeEquipped(sel.slot) : inventory.take(sel.index);
    return dropStack(stack);
  }
  if (sel.where === 'slot') {
    inventory.unequip(sel.slot);
    log.push(`Unequipped: ${def.name}.`, 'info');
    return log.push(line('unequip'));
  }
  if (def.kind === 'gear') {
    const r = inventory.equipFromBag(sel.index);
    log.push(`Equipped: ${def.name}${r.swapped ? ` (instead of ${ITEMS[r.swapped].name})` : ''}.`, 'info');
    return log.push(line('equip'));
  }
  if (def.kind === 'consumable') {
    inventory.use(sel.index);
    log.push(`Used: ${def.name}.`, 'info');
    // TODO(M4): heal by def.heal once the player has hit points.
    return log.push(line(def.heal ? 'noHealth' : 'use'));
  }
  log.push(line('look'));
}

function onInventoryAction(action) {
  const dir = { forward: 'up', back: 'down', left: 'left', turnLeft: 'left', right: 'right', turnRight: 'right' }[action];
  if (dir) return invScreen.move(dir);
  if (action === 'interact') return inventoryCommand('interact');
  if (action === 'drop') return inventoryCommand('drop');
  if (action === 'inventory' || action === 'close') return invScreen.toggle();
}

// Opens a chest: plays the lid animation and moves the loot straight into
// the inventory. Loot is seeded per chest, so a floor always holds the same.
function openChest(o) {
  if (o.flags.openedAt != null) return log.push(line('chestEmpty'), 'info');
  o.flags.openedAt = performance.now();
  const loot = rollLoot(o.loot || 'chest', level.seed * 7919 + o.y * level.w + o.x);
  inventory.gold += loot.gold;
  for (const { id, n } of loot.items) inventory.add(id, n);
  log.push(line('chestOpen'));
  const names = loot.items.map(({ id, n }) => (n > 1 ? `${n}x ${ITEMS[id].name}` : ITEMS[id].name));
  log.push(`Loot: ${[...names, `${loot.gold} gold`].join(', ')}.`, 'info');
  const best = Math.max(0, ...loot.items.map(({ id }) => RARITY_ORDER.indexOf(ITEMS[id].rarity)));
  const verdict = ['lootCommon', 'lootGood', 'lootGood', 'lootGreat', 'lootLegendary'][best];
  log.push(line(verdict));
  if (!state.saidInventoryHint) { state.saidInventoryHint = true; log.push(line('inventoryHint'), 'info'); }
}

// Cycles AUTO -> 960 -> 640 -> 320 -> AUTO.
function cycleQuality() {
  const order = ['auto', 0, 1, 2];
  const next = order[(order.indexOf(res.mode) + 1) % order.length];
  setResolution(res.setMode(next));
  showNotice();
}

function showNotice() {
  const { w, h } = res.step;
  state.notice = `${res.mode === 'auto' ? 'AUTO ' : ''}${w}X${h}`;
  state.noticeUntil = performance.now() + 2500;
}

function onAction(action) {
  if (action === 'quality') return cycleQuality();
  if (action === 'inventory' && !invScreen.open) {
    state.showMap = false;
    player.queued = null;
    return invScreen.toggle();
  }
  if (invScreen.open) return onInventoryAction(action);
  if (action === 'close') { state.showMap = false; return; }
  if (action === 'drop') return;
  if (action === 'map') { state.showMap = !state.showMap; return; }
  if (state.showMap) return;
  if (action === 'interact') return interact();
  player.act(action, world);
}

bindInput(onAction);

// Mouse and touch on the inventory screen: tap selects, a second tap on the
// same thing uses it, the buttons do what their keys do, the wheel scrolls.
function hudPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: Math.floor(((e.clientX - r.left) / r.width) * HUD_W),
    y: Math.floor(((e.clientY - r.top) / r.height) * (OVERLAY_H + PANEL_H)),
  };
}
canvas.addEventListener('pointerdown', (e) => {
  if (!invScreen.open) return;
  e.preventDefault();
  const p = hudPoint(e);
  if (p.y >= OVERLAY_H) return;
  const target = invScreen.hit(p.x, p.y);
  if (!target) return;
  if (target.kind === 'button') return onAction(target.id);
  if (target.kind === 'outside') return;
  if (invScreen.select(target)) inventoryCommand('interact');
});
canvas.addEventListener('wheel', (e) => {
  if (!invScreen.open) return;
  e.preventDefault();
  invScreen.select({ kind: 'scroll', delta: Math.sign(e.deltaY) });
}, { passive: false });
log.push(line('welcome'));          // greeting
log.push(line('welcome'), 'info');  // controls hint

// ------------------------------------------------------------ loop

// Nothing is built yet for these; the panel shows them empty.
const status = {
  hp: null, hpMax: null,   // TODO(M4)
  timeLeft: null,          // TODO(M5)
  viewers: null,           // TODO(M6)
};

function spriteList(time) {
  const list = level.objects.map((o) => {
    const spr = SPRITES[o.type];
    const opened = spr.open && o.flags.openedAt != null;
    return {
      x: o.x + 0.5, y: o.y + 0.5,
      img: opened ? frameAt(spr.open, time - o.flags.openedAt) : frameAt(spr.anim, time, o.x * 3 + o.y),
    };
  });
  for (const d of decor) list.push({ x: d.x, y: d.y, lift: d.lift, img: frameAt(SPRITES[d.type].anim, time, d.phase) });
  return list;
}

const stats = { fps: 0, renderMs: 0 };
let last = performance.now();
let statFrames = 0, statTime = 0, statRender = 0;

function loop(now) {
  const frameMs = now - last;
  const dt = Math.min(100, frameMs);
  last = now;

  const queued = player.update(dt);
  if (queued) onAction(queued);

  const cam = player.camera();
  const t0 = performance.now();
  light.update(now, [{ ...LANTERN, x: cam.x, y: cam.y }]);
  caster.render(viewFb, {
    map: level,
    walls: textures.walls,
    flats: textures.flats,
    sprites: spriteList(now),
    light,
    seen: level.seen,
  }, cam, now);
  const renderMs = performance.now() - t0;

  const next = res.sample(renderMs, frameMs, now);
  if (next >= 0) { setResolution(next); showNotice(); }
  if (state.notice && now > state.noticeUntil) state.notice = null;

  drawOverlay(overlayFb, { level, player, showMap: state.showMap && !invScreen.open, notice: state.notice });
  invScreen.draw(overlayFb, now);
  drawPanel(panelFb, { log, level, player, status });
  viewFb.presentScaled(ctx, 0, 0, SCREEN_W, VIEW_H);
  overlayFb.presentScaled(ctx, 0, 0, SCREEN_W, VIEW_H);
  panelFb.presentScaled(ctx, 0, VIEW_H, SCREEN_W, SCREEN_H - VIEW_H);

  statFrames++; statTime += frameMs; statRender += renderMs;
  if (statTime > 1000) {
    stats.fps = Math.round((statFrames * 1000) / statTime);
    stats.renderMs = +(statRender / statFrames).toFixed(1);
    statFrames = 0; statTime = 0; statRender = 0;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Debug handle for the browser console and automated tests.
window.game = {
  level, player, log, state, onAction, light, stats, inventory, invScreen,
  get resolution() { return { mode: res.mode, ...res.step }; },
  setResolution: (mode) => setResolution(res.setMode(mode)),
};
