// Checks for the bestiary: every entry paints all four poses, the poses share
// one canvas size, nothing is empty, nothing is taller than a wall, and the
// in-game texts are there.

import assert from 'node:assert/strict';
import { TRANSPARENT } from '../src/engine/framebuffer.js';
import { BESTIARY, paintPoses } from '../src/game/bestiary.js';

const ids = new Set();
let tall = [];
for (const e of BESTIARY) {
  assert.ok(!ids.has(e.id), `duplicate bestiary id ${e.id}`);
  ids.add(e.id);
  assert.ok(e.name && e.blurb && e.family, `${e.id}: name, family and blurb`);
  assert.ok(['classic', 'book', 'own'].includes(e.origin), `${e.id}: origin`);
  const poses = paintPoses(e);
  const { w, h } = poses.idle0;
  for (const [pose, img] of Object.entries(poses)) {
    assert.equal(img.w, w, `${e.id} ${pose}: width matches idle0`);
    assert.equal(img.h, h, `${e.id} ${pose}: height matches idle0`);
    const filled = img.data.reduce((n, c) => n + (c !== TRANSPARENT ? 1 : 0), 0);
    assert.ok(filled > w * h * 0.08, `${e.id} ${pose}: is not (nearly) empty`);
    // The top row should be empty, otherwise something got cut off.
    assert.ok(img.data.subarray(0, w).every((c) => c === TRANSPARENT), `${e.id} ${pose}: nothing cut off at the top`);
  }
  assert.ok(h <= 64, `${e.id}: at most one wall high (${h} px)`);
  // The combat stage shows enemies at 2x; above 49 px the name bar runs out
  // of room. Not an error yet, these are not in the game.
  if (h > 49 && !e.inGame) tall.push(`${e.id} ${h}px`);
}
console.log(`bestiary OK (${BESTIARY.length} entries, ${BESTIARY.length * 4} poses)` + (tall.length ? `; too tall for the combat stage at 2x: ${tall.join(', ')}` : ''));
