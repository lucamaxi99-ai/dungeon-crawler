// Entry point: wires engine, level, player, HUD and input together.

import { FrameBuffer } from './engine/framebuffer.js';
import { Raycaster } from './engine/raycaster.js';
import { buildTextures, SPRITES, TEX, WALL } from './game/assets.js';
import { Level, TEST_FLOOR } from './game/map.js';
import { Player } from './game/player.js';
import { MessageLog, drawHud, SCREEN_W, SCREEN_H, VIEW_H } from './game/hud.js';
import { bindInput } from './game/input.js';
import { line } from './game/system-ai.js';

const canvas = document.getElementById('screen');
canvas.width = SCREEN_W;
canvas.height = SCREEN_H;
const ctx = canvas.getContext('2d');

const fb = new FrameBuffer(SCREEN_W, SCREEN_H);
const caster = new Raycaster({ x: 0, y: 0, w: SCREEN_W, h: VIEW_H, fov: 66, fog: 1.55, texSize: TEX });
const textures = buildTextures();
const level = new Level(TEST_FLOOR);
const player = new Player(level.start);
const log = new MessageLog();
const state = { showMap: false, bumps: 0, saidFirstSteps: false };

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
    if (!state.saidFirstSteps && player.steps >= 12) {
      state.saidFirstSteps = true;
      log.push(line('firstSteps'));
    }
  },
};

function interact() {
  const f = player.front();
  const w = level.wall(f.x, f.y);
  if (w === WALL.STAIRS) return log.push(line('stairs'), 'warn');
  if (w === WALL.POSTER) return log.push(line('poster'), 'info');
  const o = level.objectAt(f.x, f.y);
  if (o) return log.push(line(o.type));
  if (!w) log.push(line('nothing'), 'info');
}

function onAction(action) {
  if (action === 'map') { state.showMap = !state.showMap; return; }
  if (state.showMap) return;
  if (action === 'interact') return interact();
  player.act(action, world);
}

bindInput(onAction);
log.push(line('welcome'));          // greeting
log.push(line('welcome'), 'info');  // controls hint

function spriteList(time) {
  return level.objects.map((o) => {
    const def = SPRITES[o.type];
    const frame = def.frameMs ? Math.floor(time / def.frameMs + o.x * 3 + o.y) % def.frames.length : 0;
    return { x: o.x + 0.5, y: o.y + 0.5, img: def.frames[frame] };
  });
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(100, now - last);
  last = now;

  const queued = player.update(dt);
  if (queued) onAction(queued);

  const cam = player.camera();
  fb.clear(0);
  caster.render(fb, {
    map: level,
    walls: textures.walls,
    floor: textures.floor,
    ceiling: textures.ceiling,
    sprites: spriteList(now),
    seen: level.seen,
  }, cam);
  drawHud(fb, { log, level, player, showMap: state.showMap });
  fb.present(ctx);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Debug handle for the browser console and automated tests.
window.game = { level, player, log, state, onAction };
