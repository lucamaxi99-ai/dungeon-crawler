// Borant Sprite Forge: pixel editor for the game's ASCII sprites.
// Draws with the game palette, previews in the real raycaster and exports
// code for src/game/assets.js.

import { PALETTE_HEX, RGBA32, SHADE, PALETTE_SIZE, C } from '../engine/palette.js';
import { TRANSPARENT } from '../engine/framebuffer.js';
import { frameAt, KEY_CHARS } from '../engine/sprite.js';
import { SPRITES } from '../game/assets.js';
import { SpriteDoc, clampSize } from './doc.js';
import { toSource, parseSource, COLOR_NAME } from './codec.js';
import { Preview } from './preview.js';

const STORE_KEY = 'dungeon-crawler.sprite-forge.v1';
const $ = (id) => document.getElementById(id);

// UI colors come from the game palette too, so the editor looks like the game.
PALETTE_HEX.forEach((hex, i) => document.documentElement.style.setProperty(`--c${i}`, hex));

const doc = new SpriteDoc();
const ui = {
  tool: 'pencil',
  color: C.FIRE,
  sym: { x: false, y: false },
  grid: true,
  onion: false,
  all: false,
  playing: true,
  variant: false,
  zoom: 16,
  drag: null,
  hover: null,
};

const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const pixelLayer = document.createElement('canvas');
const pixelCtx = pixelLayer.getContext('2d');
const preview = new Preview($('preview'));

// ------------------------------------------------------------ helpers

const colorLabel = (c) => (c === TRANSPARENT ? 'TRANSPARENT (.)' : `${COLOR_NAME[c]} (${KEY_CHARS[c]})`);

function toast(msg, kind = 'ok') {
  const el = $('status');
  el.textContent = msg;
  el.dataset.kind = kind;
}

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const s = doc.snapshot();
      localStorage.setItem(STORE_KEY, JSON.stringify({ ...s, frames: s.frames.map((f) => Array.from(f)) }));
    } catch { /* storage unavailable: work just isn't remembered */ }
  }, 300);
}

function restoreSaved() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    doc.restore(JSON.parse(raw));
    return true;
  } catch { return false; }
}

function loadGameSprite(id) {
  const def = SPRITES[id];
  doc.load({ name: id, frames: def.anim.frames, frameMs: def.anim.frameMs, mode: def.anim.mode });
}

// ------------------------------------------------------------ drawing the canvas

function fitZoom() {
  const wrap = $('stage-wrap');
  const avail = Math.max(120, wrap.clientWidth - 4);
  const maxH = Math.max(200, Math.min(window.innerHeight * 0.62, 640));
  ui.zoom = Math.max(4, Math.min(32, Math.floor(Math.min(avail / doc.w, maxH / doc.h))));
  canvas.width = doc.w * ui.zoom;
  canvas.height = doc.h * ui.zoom;
  canvas.style.setProperty('--cell', `${ui.zoom}px`);
  pixelLayer.width = doc.w;
  pixelLayer.height = doc.h;
}

function drawCanvas(frame = doc.frame) {
  const { w, h } = doc;
  if (canvas.width !== w * ui.zoom || canvas.height !== h * ui.zoom || pixelLayer.width !== w || pixelLayer.height !== h) fitZoom();
  const z = ui.zoom;
  const img = pixelCtx.createImageData(w, h);
  const out = new Uint32Array(img.data.buffer);
  const prev = ui.onion && doc.frames.length > 1 ? doc.frames[(doc.cur - 1 + doc.frames.length) % doc.frames.length] : null;
  for (let i = 0; i < w * h; i++) {
    const c = frame[i];
    if (c !== TRANSPARENT) out[i] = RGBA32[c];
    else if (prev && prev[i] !== TRANSPARENT) out[i] = RGBA32[SHADE[10 * PALETTE_SIZE + prev[i]]];
  }
  pixelCtx.putImageData(img, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pixelLayer, 0, 0, w * z, h * z);

  if (ui.grid && z >= 6) {
    ctx.save();
    ctx.lineWidth = 1;
    for (let x = 1; x < w; x++) {
      ctx.strokeStyle = PALETTE_HEX[x % 8 === 0 ? C.ASH : C.DUSK];
      ctx.globalAlpha = x % 8 === 0 ? 0.8 : 0.45;
      ctx.beginPath(); ctx.moveTo(x * z + 0.5, 0); ctx.lineTo(x * z + 0.5, h * z); ctx.stroke();
    }
    for (let y = 1; y < h; y++) {
      ctx.strokeStyle = PALETTE_HEX[y % 8 === 0 ? C.ASH : C.DUSK];
      ctx.globalAlpha = y % 8 === 0 ? 0.8 : 0.45;
      ctx.beginPath(); ctx.moveTo(0, y * z + 0.5); ctx.lineTo(w * z, y * z + 0.5); ctx.stroke();
    }
    ctx.restore();
  }
  // Symmetry axes
  ctx.save();
  ctx.strokeStyle = PALETTE_HEX[C.GOLD];
  ctx.lineWidth = 2;
  ctx.setLineDash([z / 2, z / 2]);
  if (ui.sym.x) { ctx.beginPath(); ctx.moveTo(w * z / 2, 0); ctx.lineTo(w * z / 2, h * z); ctx.stroke(); }
  if (ui.sym.y) { ctx.beginPath(); ctx.moveTo(0, h * z / 2); ctx.lineTo(w * z, h * z / 2); ctx.stroke(); }
  ctx.restore();
  // Hover cell
  if (ui.hover && !ui.drag) {
    ctx.save();
    ctx.strokeStyle = PALETTE_HEX[C.BONE];
    ctx.lineWidth = 1;
    ctx.strokeRect(ui.hover.x * z + 0.5, ui.hover.y * z + 0.5, z - 1, z - 1);
    ctx.restore();
  }
}

// ------------------------------------------------------------ side panels

function buildPalette() {
  const grid = $('palette');
  grid.textContent = '';
  const colors = [TRANSPARENT, ...PALETTE_HEX.map((_, i) => i)];
  for (const c of colors) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (c === TRANSPARENT ? ' clear' : '');
    if (c !== TRANSPARENT) b.style.setProperty('--swatch', PALETTE_HEX[c]);
    b.dataset.color = String(c);
    b.title = colorLabel(c);
    b.setAttribute('aria-label', colorLabel(c));
    b.addEventListener('click', () => selectColor(c));
    grid.appendChild(b);
  }
}

function selectColor(c) {
  ui.color = c;
  if (ui.tool === 'picker' || (ui.tool === 'eraser' && c !== TRANSPARENT)) setTool('pencil');
  refreshPalette();
}

function refreshPalette() {
  const used = doc.usedColors();
  for (const b of $('palette').children) {
    const c = Number(b.dataset.color);
    b.classList.toggle('on', c === ui.color);
    b.classList.toggle('used', used.has(c));
    b.classList.toggle('glow', doc.glow.has(c));
  }
  const c = ui.color;
  $('cur-swatch').style.setProperty('--swatch', c === TRANSPARENT ? 'transparent' : PALETTE_HEX[c]);
  $('cur-swatch').classList.toggle('clear', c === TRANSPARENT);
  $('cur-name').textContent = c === TRANSPARENT ? 'Transparent' : COLOR_NAME[c];
  $('cur-meta').textContent = c === TRANSPARENT ? "key '.'" : `index ${c} · key '${KEY_CHARS[c]}'`;
  $('glow').checked = doc.glow.has(c);
  $('glow').disabled = c === TRANSPARENT;
}

function colorOptions(selected) {
  return PALETTE_HEX.map((_, i) => `<option value="${i}"${i === selected ? ' selected' : ''}>${COLOR_NAME[i]}</option>`).join('');
}

function buildVariant() {
  const list = $('swaps');
  list.textContent = '';
  if (!doc.recolor.length) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = 'No swaps yet. Pick a color, then add a swap to build a recolor variant.';
    list.appendChild(p);
  }
  doc.recolor.forEach(([from, to], i) => {
    const row = document.createElement('div');
    row.className = 'swap';
    row.innerHTML = `
      <span class="dot" style="--swatch:${PALETTE_HEX[from]}"></span>
      <select id="swap-from-${i}" aria-label="Swap from">${colorOptions(from)}</select>
      <span aria-hidden="true">→</span>
      <span class="dot" style="--swatch:${PALETTE_HEX[to]}"></span>
      <select id="swap-to-${i}" aria-label="Swap to">${colorOptions(to)}</select>
      <button type="button" class="icon" aria-label="Remove swap">×</button>`;
    const [fromSel, toSel] = row.querySelectorAll('select');
    fromSel.addEventListener('change', () => { doc.checkpoint(); doc.recolor[i][0] = Number(fromSel.value); changed(); });
    toSel.addEventListener('change', () => { doc.checkpoint(); doc.recolor[i][1] = Number(toSel.value); changed(); });
    row.querySelector('button').addEventListener('click', () => { doc.checkpoint(); doc.recolor.splice(i, 1); changed(); });
    list.appendChild(row);
  });
  $('bake').disabled = !doc.recolor.length;
}

function buildFrames() {
  const strip = $('frames');
  strip.textContent = '';
  doc.frames.forEach((f, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb' + (i === doc.cur ? ' on' : '');
    b.setAttribute('aria-label', `Frame ${i + 1}`);
    const cv = document.createElement('canvas');
    cv.width = doc.w; cv.height = doc.h;
    const c2 = cv.getContext('2d');
    const img = c2.createImageData(doc.w, doc.h);
    const out = new Uint32Array(img.data.buffer);
    for (let p = 0; p < f.length; p++) if (f[p] !== TRANSPARENT) out[p] = RGBA32[f[p]];
    c2.putImageData(img, 0, 0);
    const n = document.createElement('span');
    n.textContent = String(i + 1);
    b.append(cv, n);
    b.addEventListener('click', () => { doc.cur = i; changed(false); });
    strip.appendChild(b);
  });
  $('frame-count').textContent = `${doc.cur + 1} / ${doc.frames.length}`;
  $('frame-ms').value = doc.frameMs;
  $('frame-mode').value = doc.mode;
}

function refreshExport() {
  try {
    $('code').value = toSource(doc);
  } catch (err) {
    $('code').value = `// ${err.message}`;
  }
}

// Everything after a document change. `edit` = pixels changed (save, export).
function changed(edit = true) {
  $('name').value = doc.name;
  $('size-w').value = doc.w;
  $('size-h').value = doc.h;
  fitZoom();
  drawCanvas();
  refreshPalette();
  buildFrames();
  buildVariant();
  refreshExport();
  $('undo').disabled = !doc.undoStack.length;
  $('redo').disabled = !doc.redoStack.length;
  if (edit) save();
}

// ------------------------------------------------------------ tools

const TOOLS = { pencil: 'b', eraser: 'e', fill: 'g', line: 'l', rect: 'r', picker: 'i' };

function setTool(t) {
  ui.tool = t;
  for (const b of document.querySelectorAll('[data-tool]')) b.setAttribute('aria-pressed', String(b.dataset.tool === t));
  canvas.dataset.tool = t;
}

function cellAt(e) {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * doc.w);
  const y = Math.floor(((e.clientY - r.top) / r.height) * doc.h);
  return doc.inside(x, y) ? { x, y } : null;
}

function paintColor(e) {
  if (ui.tool === 'eraser' || e.button === 2) return TRANSPARENT;
  return ui.color;
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  const p = cellAt(e);
  if (!p) return;
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  const color = paintColor(e);
  const tool = e.button === 2 && (ui.tool === 'pencil' || ui.tool === 'eraser') ? 'eraser' : ui.tool;

  if (tool === 'picker') {
    const c = doc.get(p.x, p.y);
    ui.color = c;
    setTool(c === TRANSPARENT ? 'eraser' : 'pencil');
    refreshPalette();
    return;
  }
  doc.checkpoint();
  if (tool === 'fill') { doc.fill(p.x, p.y, color, ui.sym); changed(); return; }
  ui.drag = { tool, start: p, last: p, color, base: doc.frame.slice() };
  if (tool === 'pencil' || tool === 'eraser') doc.plot(p.x, p.y, color, ui.sym);
  drawCanvas();
});

canvas.addEventListener('pointermove', (e) => {
  const p = cellAt(e);
  ui.hover = p;
  $('coords').textContent = p ? `x ${p.x} · y ${p.y} · ${colorLabel(doc.get(p.x, p.y))}` : `${doc.w} × ${doc.h} px`;
  const d = ui.drag;
  if (!d) { drawCanvas(); return; }
  if (!p) return;
  if (d.tool === 'pencil' || d.tool === 'eraser') {
    doc.line(d.last.x, d.last.y, p.x, p.y, d.color, ui.sym);
  } else {
    doc.frame.set(d.base);
    if (d.tool === 'line') doc.line(d.start.x, d.start.y, p.x, p.y, d.color, ui.sym);
    else doc.rect(d.start.x, d.start.y, p.x, p.y, d.color, ui.sym);
  }
  d.last = p;
  drawCanvas();
});

function endStroke() {
  if (!ui.drag) return;
  ui.drag = null;
  changed();
}
canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);
canvas.addEventListener('pointerleave', () => { ui.hover = null; if (!ui.drag) drawCanvas(); });

// ------------------------------------------------------------ actions

function act(fn, msg) {
  doc.checkpoint();
  fn();
  changed();
  if (msg) toast(msg);
}

const actions = {
  undo: () => { if (doc.undo()) changed(); },
  redo: () => { if (doc.redo()) changed(); },
  new: () => act(() => {
    const fresh = new SpriteDoc(16, 16);
    doc.restore(fresh.snapshot());
  }, 'Blank 16 × 16 sprite. Undo brings the old one back.'),
  flipH: () => act(() => doc.flipH(ui.all)),
  flipV: () => act(() => doc.flipV(ui.all)),
  mirrorLeft: () => act(() => doc.mirrorLeft(ui.all), 'Left half mirrored onto the right.'),
  shiftL: () => act(() => doc.shift(-1, 0, ui.all)),
  shiftR: () => act(() => doc.shift(1, 0, ui.all)),
  shiftU: () => act(() => doc.shift(0, -1, ui.all)),
  shiftD: () => act(() => doc.shift(0, 1, ui.all)),
  resize: () => act(() => doc.resize($('size-w').value, $('size-h').value), 'Resized, anchored at the bottom center.'),
  addFrame: () => act(() => doc.addFrame(false)),
  dupFrame: () => act(() => doc.addFrame(true)),
  delFrame: () => act(() => doc.deleteFrame()),
  frameLeft: () => act(() => doc.moveFrame(-1)),
  frameRight: () => act(() => doc.moveFrame(1)),
  prevFrame: () => { doc.cur = (doc.cur - 1 + doc.frames.length) % doc.frames.length; changed(false); },
  nextFrame: () => { doc.cur = (doc.cur + 1) % doc.frames.length; changed(false); },
  addSwap: () => act(() => {
    const from = ui.color === TRANSPARENT ? C.RED : ui.color;
    doc.recolor.push([from, from]);
    ui.variant = true;
    $('show-variant').checked = true;
  }),
  bake: () => act(() => {
    const map = doc.recolorMap();
    const glow = new Set([...doc.glow].map((c) => (c in map ? map[c] : c)));
    for (const f of doc.frames) for (let i = 0; i < f.length; i++) if (f[i] in map) f[i] = map[f[i]];
    doc.glow = glow;
    doc.recolor = [];
  }, 'Variant applied to the sprite.'),
  copy: () => {
    const text = $('code').value;
    const fallback = () => { $('code').focus(); $('code').select(); toast('Copy blocked here. The code is selected, press Ctrl+C.', 'warn'); };
    try {
      navigator.clipboard.writeText(text).then(() => toast('Code copied. Paste it into src/game/assets.js.'), fallback);
    } catch { fallback(); }
  },
  import: () => {
    try {
      const parsed = parseSource($('import-text').value);
      doc.checkpoint();
      doc.load(parsed);
      changed();
      toast(`Imported "${parsed.name}": ${parsed.frames.length} frame(s), ${doc.w} × ${doc.h}.`);
      $('import-error').textContent = '';
    } catch (err) {
      $('import-error').textContent = err.message;
    }
  },
};

for (const b of document.querySelectorAll('[data-act]')) {
  b.addEventListener('click', () => actions[b.dataset.act]());
}
for (const b of document.querySelectorAll('[data-tool]')) {
  b.addEventListener('click', () => setTool(b.dataset.tool));
}

$('sym-x').addEventListener('change', (e) => { ui.sym.x = e.target.checked; drawCanvas(); });
$('sym-y').addEventListener('change', (e) => { ui.sym.y = e.target.checked; drawCanvas(); });
$('grid').addEventListener('change', (e) => { ui.grid = e.target.checked; drawCanvas(); });
$('onion').addEventListener('change', (e) => { ui.onion = e.target.checked; drawCanvas(); });
$('all-frames').addEventListener('change', (e) => { ui.all = e.target.checked; });
$('play').addEventListener('change', (e) => { ui.playing = e.target.checked; });
$('show-variant').addEventListener('change', (e) => { ui.variant = e.target.checked; });
$('glow').addEventListener('change', (e) => {
  doc.checkpoint();
  if (e.target.checked) doc.glow.add(ui.color); else doc.glow.delete(ui.color);
  changed();
});
$('name').addEventListener('change', (e) => {
  doc.checkpoint();
  doc.name = e.target.value.trim().replace(/[^\w]/g, '_') || 'sprite';
  changed();
});
$('frame-ms').addEventListener('change', (e) => {
  doc.checkpoint();
  doc.frameMs = Math.max(20, Math.min(2000, Number(e.target.value) || 150));
  changed();
});
$('frame-mode').addEventListener('change', (e) => { doc.checkpoint(); doc.mode = e.target.value; changed(); });
$('load-game').addEventListener('change', (e) => {
  const id = e.target.value;
  if (!id) return;
  act(() => loadGameSprite(id), `Loaded "${id}" from the game. Keys are re-lettered with the default key.`);
  e.target.value = '';
});

// Keyboard shortcuts, ignored while typing in a field.
window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); actions[e.shiftKey ? 'redo' : 'undo'](); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); actions.redo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tool = Object.keys(TOOLS).find((t) => TOOLS[t] === k);
  if (tool) { setTool(tool); return; }
  if (k === 'm') { $('sym-x').click(); return; }
  if (k === 'h') { actions.flipH(); return; }
  if (k === 'v') { actions.flipV(); return; }
  if (k === '[' || k === ',') { actions.prevFrame(); return; }
  if (k === ']' || k === '.') { actions.nextFrame(); return; }
  if (k === 'arrowleft') { e.preventDefault(); actions.shiftL(); }
  if (k === 'arrowright') { e.preventDefault(); actions.shiftR(); }
  if (k === 'arrowup') { e.preventDefault(); actions.shiftU(); }
  if (k === 'arrowdown') { e.preventDefault(); actions.shiftD(); }
});

window.addEventListener('resize', () => { fitZoom(); drawCanvas(); });

// ------------------------------------------------------------ preview loop

function tick(now) {
  const sprites = doc.toSprites(ui.variant);
  const anim = { frames: sprites, frameMs: doc.frameMs, mode: doc.mode };
  preview.render(ui.playing ? frameAt(anim, now) : sprites[doc.cur]);
  requestAnimationFrame(tick);
}

// ------------------------------------------------------------ start

$('load-game').insertAdjacentHTML('beforeend',
  Object.keys(SPRITES).map((id) => `<option value="${id}">${id} (${SPRITES[id].anim.frames.length} frame${SPRITES[id].anim.frames.length > 1 ? 's' : ''})</option>`).join(''));
buildPalette();
if (!restoreSaved()) {
  loadGameSprite('brazier');
  toast('Example loaded: the brazier from the game. Draw over it or start a new sprite.');
} else {
  toast('Your last sprite is back.');
}
setTool('pencil');
changed(false);
requestAnimationFrame(tick);

// For scripted tests.
window.forge = { doc, ui, actions, toSource: () => toSource(doc) };
