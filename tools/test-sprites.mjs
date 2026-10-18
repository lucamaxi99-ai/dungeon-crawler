// Small self-checks for the sprite engine: animation timing, variants and the
// ASCII round trip that the pixel editor relies on.

import assert from 'node:assert/strict';
import { C, PALETTE_SIZE } from '../src/engine/palette.js';
import { TRANSPARENT } from '../src/engine/framebuffer.js';
import {
  defineSprite, defineFrames, animation, frameIndex, recolor, rampMap,
  mirror, flip, spriteToAscii,
} from '../src/engine/sprite.js';
import { SPRITES } from '../src/game/assets.js';
import { SpriteDoc } from '../src/editor/doc.js';
import { toSource, parseSource } from '../src/editor/codec.js';

const key = { k: C.BLACK, f: C.FIRE, w: C.WOOD };
const frames = defineFrames({
  name: 't', key, glow: 'f',
  frames: [['kf.', '.ww'], ['fk.', 'w.w'], ['...', 'kkk']],
});

// Animation modes
const seq = (anim) => [0, 1, 2, 3, 4, 5].map((i) => frameIndex(anim, i * 100));
assert.deepEqual(seq(animation(frames, { frameMs: 100 })), [0, 1, 2, 0, 1, 2]);
assert.deepEqual(seq(animation(frames, { frameMs: 100, mode: 'pingpong' })), [0, 1, 2, 1, 0, 1]);
assert.deepEqual(seq(animation(frames, { frameMs: 100, mode: 'once' })), [0, 1, 2, 2, 2, 2]);
assert.equal(frameIndex(animation(frames, { frameMs: 100 }), 0, 4), 1, 'phase shifts the cycle');
assert.equal(frameIndex(animation(frames[0]), 9999), 0, 'single frame never changes');

// Frames must match in size
assert.throws(() => defineFrames({ key, frames: [['k'], ['kk']] }), /frame 1/);

// Recolor keeps glow on the swapped color
const blue = recolor(frames, rampMap([C.FIRE], [C.BLUE]));
assert.equal(blue[0].data[1], C.BLUE);
assert.equal(blue[0].glow[C.BLUE], 1);
assert.equal(blue[0].glow[C.FIRE], 0);
assert.equal(frames[0].data[1], C.FIRE, 'original untouched');

// Variants keep the shape of their input
const anim = animation(frames, { frameMs: 50 });
assert.equal(recolor(anim, {}).frameMs, 50);
assert.equal(mirror(anim).frames.length, 3);
assert.deepEqual([...mirror(frames[0]).data.slice(0, 3)], [TRANSPARENT, C.FIRE, C.BLACK]);
assert.deepEqual([...flip(frames[0]).data.slice(0, 3)], [TRANSPARENT, C.WOOD, C.WOOD]);

// ASCII round trip, including every sprite in the game
function roundTrip(list) {
  const a = spriteToAscii(list);
  const back = defineFrames({ key: a.key, glow: a.glow, frames: a.frames });
  list.forEach((f, i) => {
    assert.deepEqual([...back[i].data], [...f.data], `${f.name} data`);
    for (let c = 0; c < PALETTE_SIZE; c++) {
      if (f.data.includes(c)) assert.equal(!!back[i].glow?.[c], !!f.glow?.[c], `${f.name} glow ${c}`);
    }
  });
}
roundTrip(frames);
for (const [name, def] of Object.entries(SPRITES)) roundTrip(def.anim.frames, name);

// defineSprite still works the old way
const single = defineSprite({ key, rows: ['kw'] });
assert.equal(single.w, 2);

// Editor: export code, import it again, same pixels/glow/timing
for (const [id, def] of Object.entries(SPRITES)) {
  const doc = new SpriteDoc();
  doc.load({ name: id, frames: def.anim.frames, frameMs: def.anim.frameMs, mode: def.anim.mode });
  doc.recolor = [[C.FIRE, C.BLUE]];
  const src = toSource(doc);
  const parsed = parseSource(src);
  assert.equal(parsed.frames.length, def.anim.frames.length, `${id} frame count`);
  parsed.frames.forEach((f, i) => assert.deepEqual([...f.data], [...def.anim.frames[i].data], `${id} import`));
  if (def.anim.frames.length > 1) assert.equal(parsed.frameMs, def.anim.frameMs);
  assert.match(src, /recolor\(/);
}
// Bare ASCII rows with the default key
assert.deepEqual([...parseSource('kf\n.b').frames[0].data], [C.BLACK, C.FIRE, TRANSPARENT, C.BONE]);
// Editor resize keeps the sprite on the floor (bottom-center)
const d = new SpriteDoc(2, 2);
d.frame.set([C.RED, C.RED, C.BLUE, C.BLUE]);
d.resize(4, 4);
assert.deepEqual([...d.frame.slice(12)], [TRANSPARENT, C.BLUE, C.BLUE, TRANSPARENT]);

console.log(`sprite engine OK (${Object.keys(SPRITES).length} game sprites round-tripped)`);
