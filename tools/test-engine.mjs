// Self-checks for engine parts that run without a browser: automatic
// resolution switching.

import assert from 'node:assert/strict';
import { AutoResolution } from '../src/engine/resolution.js';

const STEPS = [{ w: 960, h: 420 }, { w: 640, h: 280 }, { w: 320, h: 140 }];

// Feeds `frames` samples at a fixed cost; returns the switches that happened.
function run(res, frames, renderMs, frameMs, t0) {
  const switches = [];
  for (let i = 0; i < frames; i++) {
    const s = res.sample(renderMs, frameMs, t0 + i * frameMs);
    if (s >= 0) switches.push(s);
  }
  return switches;
}

// Too slow at 960: steps down once per window, never below the last step.
let res = new AutoResolution(STEPS);
assert.deepEqual(run(res, 60, 14, 16, 0), [1], 'render over budget steps down');
assert.deepEqual(run(res, 400, 14, 16, 1000), [2], 'keeps stepping down, stops at the lowest');

// Fast frames at 960 stay at 960.
res = new AutoResolution(STEPS);
assert.deepEqual(run(res, 600, 6, 16, 0), [], 'fast enough: no change');

// Slow whole frames count only if the 3D view is a real part of them.
res = new AutoResolution(STEPS);
assert.deepEqual(run(res, 120, 2, 30, 0), [], 'slow frames with a cheap view: no change');
assert.deepEqual(run(res, 70, 6, 30, 5000), [1], 'slow frames with a costly view: step down');

// Steps back up when there is room, but only after the cooldown.
res = new AutoResolution(STEPS);
run(res, 60, 14, 16, 0);
assert.equal(res.index, 1);
assert.deepEqual(run(res, 200, 2, 16, 1000), [], 'no step up during cooldown');
assert.deepEqual(run(res, 400, 2, 16, 20000), [0], 'steps up when the bigger view fits');
// 640 would cost 3 ms * 2.25 = 6.75 ms at 960: under the 8 ms bar, so up.
// At 4 ms (9 ms predicted) it stays.
res = new AutoResolution(STEPS);
run(res, 60, 14, 16, 0);
assert.deepEqual(run(res, 400, 4, 16, 20000), [], 'predicted cost too high: stays down');

// Fixed mode never switches.
res = new AutoResolution(STEPS);
assert.equal(res.setMode(2), 2);
assert.deepEqual(run(res, 400, 30, 40, 0), [], 'fixed resolution stays fixed');
assert.equal(res.setMode('auto'), 2, 'back to auto keeps the current step');

// Hitches (tab switches) are ignored.
res = new AutoResolution(STEPS);
assert.deepEqual(run(res, 200, 14, 400, 0), [], 'long hitches are ignored');

console.log('engine OK (auto resolution)');
