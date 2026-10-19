// Graphics prototype: the same showroom rendered with the classic settings
// (320x140, 32 px textures, 32 colors, fog only) or the new ones (higher
// resolution, 64 px textures, 64 colors, colored light, dithering, ambient
// occlusion). Every switch can be flipped on its own; FPS is measured live.

import { FrameBuffer } from '../engine/framebuffer.js';
import { LitRaycaster } from '../engine/raycaster-lit.js';
import { buildLitTables, LightMap } from '../engine/lighting.js';
import { PALETTE_HEX, PALETTE_SIZE, CLASSIC_SIZE, RGBA32 } from '../engine/palette.js';
import { frameAt } from '../engine/sprite.js';
import { TRANSPARENT } from '../engine/framebuffer.js';
import { buildTextures as buildClassicTextures } from './classic.js';
import { Player } from '../game/player.js';
import { bindInput } from '../game/input.js';
import { buildTextures as buildHdTextures, WALL as WALL_HD } from '../game/textures.js';
import { buildSprites } from './sprites.js';
import { buildLevel, TINT, TINTS, EXHIBIT_SPOTS } from './level.js';
import { EXHIBITS, RATING } from './exhibits.js';
import { buildBestiary } from './bestiary-ui.js';

const $ = (id) => document.getElementById(id);
PALETTE_HEX.forEach((hex, i) => document.documentElement.style.setProperty(`--c${i}`, hex));

// ------------------------------------------------------------ assets

const spriteSets = { 64: buildSprites(1), 32: buildSprites(0.5) };
const hdTex = buildHdTextures(spriteSets[64].portrait);
const classic = buildClassicTextures();
const level = buildLevel();
const map = level.map;

// The classic texture set only has five walls; everything else falls back to stone.
const CLASSIC_WALL = { [WALL_HD.STONE]: 1, [WALL_HD.ROCK]: 2, [WALL_HD.MOSSY]: 3, [WALL_HD.STAIRS]: 4, [WALL_HD.NEON]: 5 };
const classicMap = {
  w: map.w, h: map.h,
  wall: (x, y) => { const m = map.wall(x, y); return m ? CLASSIC_WALL[m] || 1 : 0; },
  floorAt: () => 0,
  ceilAt: () => 1,
};
const classicSet = { map: classicMap, walls: classic.walls, flats: [classic.floor, classic.ceiling] };
const hdSet = { map, walls: hdTex.walls, flats: hdTex.flats };

// Light map: ambient per room/corridor, then the light sources.
const isWall = (x, y) => map.wall(x, y) !== 0;
const light = new LightMap(map.w, map.h, isWall, TINTS.length);
for (const a of level.ambient) light.setAmbient(a.x, a.y, a.x + a.w - 1, a.y + a.h - 1, a.ambient, a.tint);
for (const l of level.lights) light.addLight(l);

// Objects in the world. The animation is looked up in the current sprite
// set each frame, so the 32/64 px switch applies instantly.
const objects = [];
for (const d of level.decor) objects.push({ ...d, key: d.anim || d.type, phase: Math.floor(d.x * 3 + d.y) });
for (const [id, spot] of Object.entries(EXHIBIT_SPOTS)) {
  if (spot.decor || spot.wall) continue;
  if (id === 'lootboxes') {
    spriteSets[64].lootboxes.forEach((_, i) => objects.push({ type: id, key: id, index: i, x: spot.x + i + 0.5, y: spot.y + 0.5, phase: i, solid: true }));
    continue;
  }
  objects.push({ type: id, key: id, x: spot.x + 0.5, y: spot.y + 0.5, phase: spot.x, solid: true });
}
const animOf = (o, set) => (o.index !== undefined ? set[o.key][o.index] : set[o.key]);
const solid = new Set(objects.filter((o) => o.solid).map((o) => `${Math.floor(o.x)},${Math.floor(o.y)}`));

// ------------------------------------------------------------ settings

const PRESETS = {
  classic: { res: 320, tex: 32, colors: 32, light: false, lantern: false, dither: false, ao: false, spr: 32 },
  mix: { res: 640, tex: 64, colors: 64, light: true, lantern: true, dither: true, ao: true, spr: 32 },
  modern: { res: 640, tex: 64, colors: 64, light: true, lantern: true, dither: true, ao: true, spr: 64 },
};
const settings = { ...PRESETS.modern };

const tableCache = new Map();
function tablesFor(colors, lit) {
  const key = `${colors}-${lit}`;
  if (!tableCache.has(key)) {
    const limit = colors === 32 ? CLASSIC_SIZE : PALETTE_SIZE;
    tableCache.set(key, lit
      ? buildLitTables({ tints: TINTS, levels: 32, maxBright: 1.5, limit })
      : buildLitTables({ tints: [[1, 1, 1]], levels: 16, maxBright: 1, limit }));
  }
  return tableCache.get(key);
}

const canvas = $('view');
const ctx = canvas.getContext('2d');
let fb, caster;

function rebuild() {
  const w = settings.res, h = Math.round((settings.res * 140) / 320);
  canvas.width = w; canvas.height = h;
  fb = new FrameBuffer(w, h);
  caster = new LitRaycaster({
    w, h, fov: 66,
    tables: tablesFor(settings.colors, settings.light),
    lighting: settings.light,
    dither: settings.dither,
    ao: settings.ao,
    fogFar: settings.light ? 16 : 9.7,
  });
  syncControls();
}

function syncControls() {
  for (const el of document.querySelectorAll('[data-setting]')) {
    const k = el.dataset.setting;
    if (el.type === 'checkbox') el.checked = settings[k];
    else el.value = String(settings[k]);
  }
  const match = Object.entries(PRESETS).find(([, p]) => Object.keys(p).every((k) => p[k] === settings[k]));
  for (const b of document.querySelectorAll('[data-preset]')) b.setAttribute('aria-pressed', String(match?.[0] === b.dataset.preset));
  $('lantern').disabled = !settings.light;
}

for (const el of document.querySelectorAll('[data-setting]')) {
  el.addEventListener('change', () => {
    const k = el.dataset.setting;
    settings[k] = el.type === 'checkbox' ? el.checked : Number(el.value);
    rebuild();
    updateExhibitCard(true);
  });
}
for (const b of document.querySelectorAll('[data-preset]')) {
  b.addEventListener('click', () => { Object.assign(settings, PRESETS[b.dataset.preset]); rebuild(); updateExhibitCard(true); });
}

// ------------------------------------------------------------ player

const player = new Player(level.start);
const world = {
  canEnter: (x, y) => !isWall(x, y) && !solid.has(`${x},${y}`),
  onEnter: () => updateExhibitCard(),
};
function onAction(action) {
  if (action === 'map' || action === 'interact') return;
  player.act(action, world);
}
bindInput(onAction);

function goTo(id) {
  const v = EXHIBIT_SPOTS[id].view;
  player.x = v[0]; player.y = v[1]; player.dir = v[2];
  player.anim = null; player.queued = null;
  updateExhibitCard();
  canvas.focus();
}

// ------------------------------------------------------------ exhibits UI

function buildExhibitList() {
  const list = $('exhibits');
  list.textContent = '';
  for (const e of EXHIBITS) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.id = `go-${e.id}`;
    b.dataset.exhibit = e.id;
    b.innerHTML = `<span class="ex-name">${e.name}</span><span class="badge" data-rating="${e.rating}">${RATING[e.rating]}</span><span class="ex-room">${e.room}</span>`;
    b.addEventListener('click', () => goTo(e.id));
    li.appendChild(b);
    list.appendChild(li);
  }
}

let current = null;
function exhibitHere() {
  return EXHIBITS.find((e) => {
    const v = EXHIBIT_SPOTS[e.id].view;
    return v[0] === player.x && v[1] === player.y && v[2] === player.dir;
  }) || null;
}

function updateExhibitCard(force = false) {
  const e = exhibitHere();
  if (e === current && !force) return;
  current = e;
  for (const b of document.querySelectorAll('[data-exhibit]')) b.classList.toggle('here', b.dataset.exhibit === e?.id);
  const card = $('card');
  if (!e) {
    card.dataset.empty = 'true';
    $('card-name').textContent = 'Kein Exponat im Blick';
    $('card-meta').textContent = '';
    $('card-note').textContent = 'Wähle rechts ein Exponat oder lauf mit W A S D und Q E durch die Räume. Vor jedem Exponat erscheint hier meine Einschätzung.';
    $('card-rating').hidden = true;
    return;
  }
  card.dataset.empty = 'false';
  $('card-name').textContent = e.name;
  const img = zoomSprites(e.id, 0)[0];
  $('card-meta').textContent = `${e.technique} · ${img.w} × ${img.h} px · ${e.frames} ${e.frames === 1 ? 'Bild' : 'Bilder'}`;
  $('card-note').textContent = e.note;
  $('card-rating').hidden = false;
  $('card-rating').dataset.rating = e.rating;
  $('card-rating').textContent = RATING[e.rating];
}

// Close-up of the exhibit's sprite(s), unlit, scaled up with nearest neighbour.
const zoomCanvas = $('zoom');
const zctx = zoomCanvas.getContext('2d');
const zoomBuf = document.createElement('canvas');
const zbctx = zoomBuf.getContext('2d');

function zoomSprites(id, t) {
  if (!id) return [];
  const sprites = spriteSets[settings.spr];
  if (id === 'lootboxes') return sprites.lootboxes.map((a, i) => frameAt(a, t, i));
  if (id === 'goblin') return [frameAt(sprites.goblin, t), frameAt(sprites.goblinShaman, t, 1)];
  if (id === 'brazier') return [frameAt(sprites.brazier, t), frameAt(sprites.coldBrazier, t, 2)];
  if (id === 'portrait') return [sprites.portrait];
  return [frameAt(sprites[id], t)];
}

function drawZoom(t) {
  const imgs = zoomSprites(current?.id, t);
  zoomCanvas.hidden = !imgs.length;
  if (!imgs.length) return;
  const gap = 4;
  const w = imgs.reduce((s, i) => s + i.w, 0) + gap * (imgs.length - 1);
  const h = Math.max(...imgs.map((i) => i.h));
  zoomBuf.width = w; zoomBuf.height = h;
  const id = zbctx.createImageData(w, h);
  const out = new Uint32Array(id.data.buffer);
  let ox = 0;
  for (const img of imgs) {
    const oy = h - img.h;
    for (let y = 0; y < img.h; y++) {
      for (let x = 0; x < img.w; x++) {
        const c = img.data[y * img.w + x];
        if (c !== TRANSPARENT) out[(oy + y) * w + ox + x] = RGBA32[c];
      }
    }
    ox += img.w + gap;
  }
  zbctx.putImageData(id, 0, 0);
  // Same world size for both sprite sets: 32 px sprites get twice the zoom.
  const base = Math.max(1, Math.min(6, Math.floor(Math.min(360 / (w * (64 / (imgs[0].unit || 64))), 200 / (h * (64 / (imgs[0].unit || 64)))))));
  const scale = base * (64 / (imgs[0].unit || 64));
  if (zoomCanvas.width !== w * scale || zoomCanvas.height !== h * scale) {
    zoomCanvas.width = w * scale; zoomCanvas.height = h * scale;
  }
  zctx.imageSmoothingEnabled = false;
  zctx.clearRect(0, 0, zoomCanvas.width, zoomCanvas.height);
  zctx.drawImage(zoomBuf, 0, 0, w * scale, h * scale);
}

// ------------------------------------------------------------ loop

let last = performance.now();
let acc = 0, frames = 0, renderMs = 0, shownAt = 0;

function loop(now) {
  const dt = Math.min(100, now - last);
  last = now;
  const queued = player.update(dt);
  if (queued) onAction(queued);

  const t0 = performance.now();
  const cam = player.camera();
  const dyn = settings.light && settings.lantern
    ? [{ x: cam.x, y: cam.y, radius: 3.4, intensity: 0.45, tint: TINT.TORCH }]
    : [];
  if (settings.light) light.update(now, dyn);

  const set = settings.tex === 64 ? hdSet : classicSet;
  const sprSet = spriteSets[settings.spr];
  const list = objects.map((o) => ({ x: o.x, y: o.y, lift: o.lift || 0, img: frameAt(animOf(o, sprSet), now, o.phase) }));
  caster.render(fb, { map: set.map, walls: set.walls, flats: set.flats, sprites: list, light }, cam, now);
  fb.present(ctx);
  renderMs += performance.now() - t0;

  acc += dt; frames++;
  if (now - shownAt > 500) {
    $('fps').textContent = String(Math.round((frames * 1000) / Math.max(1, acc)));
    $('ms').textContent = (renderMs / frames).toFixed(1);
    $('pixels').textContent = `${fb.width} × ${fb.height}`;
    acc = 0; frames = 0; renderMs = 0; shownAt = now;
  }
  drawZoom(now);
  requestAnimationFrame(loop);
}

buildExhibitList();
buildBestiary($('bestiary'));
rebuild();
updateExhibitCard();
requestAnimationFrame(loop);

window.proto = { settings, player, rebuild, goTo, PRESETS, light };
