// Bestiary gallery for the showroom: every enemy design in its front view,
// animated (idle, now and then an attack and a hit), with all four poses,
// the System AI's in-game text and a developer note.

import { RGBA32 } from '../engine/palette.js';
import { TRANSPARENT } from '../engine/framebuffer.js';
import { BESTIARY, paintPoses } from '../game/bestiary.js';
import { BESTIARY_NOTES, ORIGIN_LABEL } from './bestiary-notes.js';

const SCALE = 3;
const STAGE_H = 64;           // one wall high, so sizes compare
const POSE_LABEL = { idle0: 'Ruhe 1', idle1: 'Ruhe 2', lunge: 'Angriff', flinch: 'Treffer' };

function toCanvas(img, scale, canvas = document.createElement('canvas'), stageW = img.w, stageH = img.h) {
  canvas.width = stageW * scale;
  canvas.height = stageH * scale;
  const ctx = canvas.getContext('2d');
  const id = ctx.createImageData(stageW * scale, stageH * scale);
  const out = new Uint32Array(id.data.buffer);
  const ox = Math.floor((stageW - img.w) / 2), oy = stageH - img.h;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const c = img.data[y * img.w + x];
      if (c === TRANSPARENT) continue;
      for (let k = 0; k < scale * scale; k++) {
        const px = (ox + x) * scale + (k % scale), py = (oy + y) * scale + ((k / scale) | 0);
        out[py * stageW * scale + px] = RGBA32[c];
      }
    }
  }
  ctx.putImageData(id, 0, 0);
  return canvas;
}

// Which pose a card shows at time t: mostly idle, an attack and a hit now and then.
function poseAt(t, frameMs) {
  const cycle = t % 4200;
  if (cycle > 2600 && cycle < 3100) return 'lunge';
  if (cycle > 3500 && cycle < 3900) return 'flinch';
  return Math.floor(t / frameMs) % 2 ? 'idle1' : 'idle0';
}

export function buildBestiary(root) {
  const cards = [];
  const grid = root.querySelector('.beasts');
  BESTIARY.forEach((e, i) => {
    const poses = paintPoses(e);
    const stageW = Math.max(...Object.values(poses).map((p) => p.w));
    // Pre-render each pose once at gallery scale.
    const big = Object.fromEntries(Object.entries(poses).map(([k, img]) => [k, toCanvas(img, SCALE, undefined, stageW, STAGE_H)]));

    const card = document.createElement('article');
    card.className = 'beast';
    card.dataset.origin = e.origin;
    card.innerHTML = `
      <div class="beast-stage"><canvas aria-label="${e.name}, animiert"></canvas></div>
      <div class="beast-head">
        <h3>${e.name}</h3>
        <span class="tag" data-origin="${e.origin}">${ORIGIN_LABEL[e.origin]}</span>
      </div>
      <p class="beast-meta">${e.family} · ${poses.idle0.w} × ${poses.idle0.h} px${e.inGame ? ' · <b>im Spiel</b>' : ''}</p>
      <blockquote lang="en">${e.blurb}</blockquote>
      <p class="beast-note">${BESTIARY_NOTES[e.id] || ''}</p>
      <ol class="pose-strip" aria-label="Alle Posen"></ol>`;
    const strip = card.querySelector('.pose-strip');
    for (const [k, img] of Object.entries(poses)) {
      const li = document.createElement('li');
      li.appendChild(toCanvas(img, 1, undefined, stageW, STAGE_H));
      const label = document.createElement('span');
      label.textContent = POSE_LABEL[k];
      li.appendChild(label);
      strip.appendChild(li);
    }
    grid.appendChild(card);
    const view = card.querySelector('.beast-stage canvas');
    view.width = stageW * SCALE;
    view.height = STAGE_H * SCALE;
    cards.push({ e, big, ctx: view.getContext('2d'), shown: null, offset: i * 530 });
  });

  // Filter by origin.
  for (const b of root.querySelectorAll('[data-filter]')) {
    b.addEventListener('click', () => {
      for (const o of root.querySelectorAll('[data-filter]')) o.setAttribute('aria-pressed', String(o === b));
      for (const c of grid.children) c.hidden = b.dataset.filter !== 'all' && c.dataset.origin !== b.dataset.filter;
    });
  }
  root.querySelector('#beast-count').textContent = String(BESTIARY.length);

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function tick(now) {
    for (const c of cards) {
      const pose = reduced ? 'idle0' : poseAt(now + c.offset, c.e.frameMs);
      if (pose === c.shown) continue;
      c.shown = pose;
      c.ctx.clearRect(0, 0, c.ctx.canvas.width, c.ctx.canvas.height);
      c.ctx.drawImage(c.big[pose], 0, 0);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
