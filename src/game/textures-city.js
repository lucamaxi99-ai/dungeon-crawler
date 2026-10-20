// Textures of the city on story floor 3 (GDD 2.3): brick facades, a diner,
// a laundromat, a pharmacy, a Borant store, a fenced parking lot, a subway
// station, asphalt and sidewalks, and the painted studio sky Borant hung
// over the street because a real one was not in the Encore budget.
// Same rules as textures.js: 64 x 64, procedural, seeded.

import { C } from '../engine/palette.js';
import { blank, rng, fbm, voronoi, glowMask } from '../engine/texgen.js';
import {
  S, set, get, normalize, emboss, pick, bigText, smallText, safeDoor, borantPoster, buildTextures, WALL, FLAT,
} from './textures.js';

const BRICK_RAMP = [C.SOOT, C.BLOOD_D, C.GORE, C.RUST, C.LEATHER];
const CONCRETE_RAMP = [C.SOOT, C.GRAVEL_D, C.GRAVEL, C.GRAVEL_M, C.GRAVEL_L];
const ASPHALT_RAMP = [C.BLACK, C.SOOT, C.NIGHT, C.SHADOW, C.GRAVEL_D];
const ENAMEL_RAMP = [C.ASH, C.FOG, C.SILVER, C.BONE, C.WHITE];
const STEEL_RAMP = [C.BLACK, C.STEEL_D, C.STEEL, C.STEEL_M, C.STEEL_L];

// ------------------------------------------------------------- walls

// Old red brick, sooty toward the top (the fires were a while ago).
function brick(seed = 201) {
  const t = blank(S, C.SOOT);
  const r = rng(seed);
  const n = normalize(fbm(S, seed + 1, { base: 8, octaves: 3 }));
  const soot = normalize(fbm(S, seed + 2, { base: 2, octaves: 3 }));
  const BW = 16, BH = 8;
  for (let row = 0; row < S / BH; row++) {
    const off = row % 2 ? BW / 2 : 0;
    for (let col = -1; col <= S / BW; col++) {
      const base = r();
      for (let yy = 1; yy < BH; yy++) {
        for (let xx = 1; xx < BW; xx++) {
          const x = col * BW + off + xx, y = row * BH + yy;
          if (x < 0 || x >= S) continue;
          let v = 0.32 + base * 0.3 + (n[y * S + x] - 0.5) * 0.35;
          if (yy === 1) v += 0.18; else if (yy === BH - 1) v -= 0.18;
          if (xx === 1) v += 0.08;
          if (r() < 0.02) v -= 0.35;
          // Soot climbs up from where the windows burned.
          v -= Math.max(0, soot[y * S + x] - 0.55) * 1.2 * (1 - y / S);
          set(t, x, y, pick(BRICK_RAMP, v, x, y));
        }
      }
    }
  }
  return t;
}

// A brick facade with a boarded-up window: what the streets are made of.
function facade() {
  const t = brick(211);
  const r = rng(212);
  const x0 = 18, x1 = 46, y0 = 12, y1 = 42;
  // Lintel and sill in pale stone.
  for (let x = x0 - 3; x < x1 + 3; x++) {
    for (let y = y0 - 4; y < y0; y++) set(t, x, y, pick(CONCRETE_RAMP, 0.7 - (y - y0 + 4) * 0.08, x, y));
    set(t, x, y1, C.GRAVEL_L); set(t, x, y1 + 1, C.GRAVEL_M); set(t, x, y1 + 2, C.SOOT);
  }
  // The dark room behind, a few glass shards still in the frame.
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const frame = x < x0 + 2 || x >= x1 - 2 || y < y0 + 2 || x === 31 || x === 32;
      let c = frame ? (x < x0 + 1 || y < y0 + 1 ? C.WOOD_D : C.SOOT) : (y + x) % 9 === 0 ? C.NIGHT : C.BLACK;
      const shard = !frame && ((x - x0 < 7 && y - y0 < 9 - (x - x0)) || (x1 - x < 6 && y1 - y < 8 - (x1 - x)));
      if (shard) c = (x + y) % 3 ? C.STEEL_D : C.SKY;
      set(t, x, y, c);
    }
  }
  // Two planks nailed across.
  const plank = (ya, yb) => {
    for (let x = x0 - 2; x < x1 + 2; x++) {
      const yc = ya + ((yb - ya) * (x - x0 + 2)) / (x1 - x0 + 4);
      for (let k = -2; k <= 2; k++) {
        const y = Math.round(yc + k);
        const v = 0.55 + (k === -2 ? 0.2 : k === 2 ? -0.3 : 0) + (r() - 0.5) * 0.25;
        set(t, x, y, pick([C.SOOT, C.WOOD_D, C.WOOD, C.WOOD_L], v, x, y));
      }
      if (x === x0 || x === x1 - 1) { set(t, x, Math.round(yc), C.STEEL_L); }
    }
  };
  plank(y0 + 6, y1 - 10);
  plank(y1 - 6, y0 + 12);
  return t;
}

// Diner: pastel paint, a chrome strip, checkerboard tiles.
function diner() {
  const t = blank(S);
  const n = normalize(fbm(S, 221, { base: 8, octaves: 3 }));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      if (y < 34) {
        const v = 0.55 + (n[i] - 0.5) * 0.35 - (y < 4 ? 0.25 : 0) - Math.max(0, n[i] - 0.75) * 1.5;
        t.data[i] = pick([C.TEAL_D, C.TEAL, C.TEAL_M, C.MINT], v, x, y, 0.5);
      } else if (y < 39) {
        t.data[i] = [C.STEEL_L, C.WHITE, C.STEEL_M, C.STEEL, C.BLACK][y - 34];
      } else {
        const dark = ((x >> 3) + ((y - 39) >> 3)) % 2 === 0;
        const grime = n[i] > 0.66 ? 1 : 0;
        if ((x & 7) === 0 || ((y - 39) & 7) === 0) t.data[i] = C.ASH;
        else t.data[i] = dark ? (grime ? C.BLACK : C.SOOT) : grime ? C.FOG : (x + y) % 11 === 0 ? C.SILVER : C.BONE;
      }
    }
  }
  return t;
}

// The diner's neon EAT sign (one per diner). The A is out.
function eatSign() {
  const t = diner();
  for (let y = 6; y < 28; y++) {
    for (let x = 6; x < 58; x++) {
      const edge = y === 6 || y === 27 || x === 6 || x === 57;
      set(t, x, y, edge ? C.BLACK : y % 2 ? C.WINE : C.NIGHT);
    }
  }
  const tmp = blank(S, 0);
  bigText(tmp, 'E', 16, 11, 1);
  bigText(tmp, 'A', 28, 11, 2);
  bigText(tmp, 'T', 40, 11, 1);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = tmp.data[y * S + x];
      if (v === 1) {
        set(t, x, y, (x + y) % 5 === 0 ? C.YELLOW : C.FIRE);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!tmp.data[(y + dy) * S + x + dx] && get(t, x + dx, y + dy) !== C.BLACK) set(t, x + dx, y + dy, C.RED);
        }
      } else if (v === 2) set(t, x, y, C.GORE);
    }
  }
  t.glow = glowMask([C.FIRE, C.YELLOW, C.RED]);
  return t;
}

// Laundromat: two front-loaders per wall, their round doors full of
// somebody's laundry that will never be collected.
function laundry() {
  const t = blank(S);
  const n = normalize(fbm(S, 231, { base: 8, octaves: 2 }));
  const r = rng(232);
  // Pale tiles above the machines.
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < S; x++) {
      const line = (x & 15) === 0 || (y & 7) === 0;
      t.data[y * S + x] = line ? C.ASH : pick([C.FOG, C.SILVER, C.BONE], 0.5 + (n[y * S + x] - 0.5) * 0.6, x, y);
    }
  }
  for (const mx of [0, 32]) {
    for (let y = 14; y < S; y++) {
      for (let x = mx; x < mx + 32; x++) {
        const lx = x - mx;
        let v = 0.62 + (n[y * S + x] - 0.5) * 0.25;
        if (lx === 0 || lx === 31) v = 0.05;
        else if (lx === 1) v += 0.25; else if (lx === 30) v -= 0.3;
        if (y === 14) v = 0.95;
        if (y >= 60) v = 0.1;           // kick plate in shadow
        if (y >= 18 && y < 22 && lx > 2 && lx < 29) v = 0.35; // control strip
        set(t, x, y, pick(ENAMEL_RAMP, v, x, y));
      }
      // Knob and a tiny display.
      set(t, mx + 24, 19, C.BLACK); set(t, mx + 25, 19, C.STEEL_L); set(t, mx + 24, 20, C.STEEL); set(t, mx + 25, 20, C.BLACK);
      for (let x = mx + 5; x < mx + 11; x++) { set(t, x, 19, C.NIGHT); set(t, x, 20, x % 2 ? C.TEAL : C.NIGHT); }
      // Round door: chrome ring, dark glass, tumbled clothes.
      const cx = mx + 15.5, cy = 39.5;
      for (let y = 26; y < 54; y++) {
        for (let x = mx + 2; x < mx + 30; x++) {
          const d = Math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy - 0.5);
          if (d > 12.5) continue;
          if (d > 10.5) { set(t, x, y, x + y < cx + cy ? C.STEEL_L : C.STEEL); continue; }
          if (d > 9.5) { set(t, x, y, C.BLACK); continue; }
          const cloth = n[((y * 3) % S) * S + ((x * 3 + mx) % S)];
          let c = C.NAVY;
          if (y > cy - 2 + Math.sin(x * 0.7) * 1.5) c = cloth > 0.6 ? C.RED : cloth > 0.4 ? C.BLUE_D : cloth > 0.25 ? C.AMBER : C.PLUM;
          if (Math.hypot(x - cx + 4, y - cy + 4) < 2.5) c = C.SKY; // reflection
          set(t, x, y, c);
        }
      }
      if (r() < 0.5) for (let y = 30; y < 50; y++) if (y % 3) set(t, mx + 26, y, C.GRAVEL_M); // a scratch
    }
  }
  return t;
}

// Pharmacy: shelves of little boxes and bottles in loud colors.
function pharmacy() {
  const t = blank(S, C.NIGHT);
  const r = rng(241);
  const COLORS = [[C.BLOOD, C.RED], [C.BLUE_D, C.SKY], [C.MOSS, C.LIME], [C.RUST, C.AMBER], [C.FOG, C.WHITE], [C.PLUM, C.MAGENTA], [C.TEAL, C.MINT]];
  // Back panel.
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) set(t, x, y, (x & 7) === 0 ? C.SOOT : y % 2 ? C.NIGHT : C.SHADOW);
  // Uprights.
  for (let y = 0; y < S; y++) for (const x of [0, 1, 62, 63]) set(t, x, y, x === 1 ? C.STEEL_M : x === 0 ? C.STEEL : C.STEEL_D);
  for (const sy of [18, 38, 58]) {
    // Goods on the shelf: boxes and bottles of different heights.
    let x = 3;
    while (x < 61) {
      const w = 3 + Math.floor(r() * 5), h = 5 + Math.floor(r() * 9);
      const [dark, light] = COLORS[Math.floor(r() * COLORS.length)];
      const bottle = r() < 0.4;
      if (r() < 0.12) { x += w; continue; } // sold out
      for (let y = sy - h; y < sy; y++) {
        for (let xx = x; xx < Math.min(x + w, 61); xx++) {
          const neck = bottle && y < sy - h + 3 && (xx === x || xx === x + w - 1);
          if (neck) continue;
          const lit = xx === x ? light : xx === x + w - 1 ? dark : (y === sy - h ? light : dark);
          const label = !bottle && y === sy - h + 3 && xx > x && xx < x + w - 1;
          set(t, xx, y, label ? C.BONE : lit);
        }
      }
      if (bottle) for (let xx = x + 1; xx < Math.min(x + w - 1, 61); xx++) set(t, xx, sy - h, C.WHITE); // cap
      x += w + (r() < 0.3 ? 1 : 0);
    }
    for (let x = 2; x < 62; x++) { set(t, x, sy, C.STEEL_L); set(t, x, sy + 1, C.STEEL); set(t, x, sy + 2, C.BLACK); }
  }
  return t;
}

// The pharmacy's green cross (one per pharmacy), lit like it still matters.
function pharmacyCross() {
  const t = blank(S);
  const n = normalize(fbm(S, 251, { base: 8, octaves: 2 }));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) t.data[y * S + x] = pick(ENAMEL_RAMP, 0.55 + (n[y * S + x] - 0.5) * 0.4, x, y);
  const arm = (x, y) => (Math.abs(x - 31.5) < 6 && Math.abs(y - 29.5) < 18) || (Math.abs(x - 31.5) < 18 && Math.abs(y - 29.5) < 6);
  for (let y = 8; y < 52; y++) {
    for (let x = 10; x < 54; x++) {
      if (arm(x, y)) set(t, x, y, (x + y) % 6 === 0 ? C.MINT : C.LIME);
      else if (arm(x - 1, y) || arm(x + 1, y) || arm(x, y - 1) || arm(x, y + 1)) set(t, x, y, C.GREEN);
    }
  }
  smallText(t, 'PHARMACY', 16, 56, C.MOSS_D);
  t.glow = glowMask([C.LIME, C.MINT, C.GREEN]);
  return t;
}

// Chain-link fence with barbed wire around the parking lot, dark city
// silhouettes behind it.
function fence() {
  const t = blank(S);
  const n = normalize(fbm(S, 261, { base: 4, octaves: 3 }));
  const r = rng(262);
  // Background: skyline far away, a few lit windows.
  const sky = (x) => 20 + Math.floor(n[(x % S)] * 14) + ((x >> 3) % 3) * 3;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const top = sky(x);
      let c = y < top ? (y < 8 ? C.NIGHT : C.SHADOW) : C.BLACK;
      if (y >= top + 2 && (x % 6 === 2) && (y % 5 === 1) && r() < 0.18) c = C.AMBER;
      set(t, x, y, c);
    }
  }
  // Posts at both edges.
  for (let y = 4; y < S; y++) for (const [x, c] of [[0, C.STEEL_L], [1, C.STEEL_M], [2, C.STEEL_D], [62, C.STEEL_M], [63, C.STEEL_D]]) set(t, x, y, c);
  // Diamond mesh.
  for (let y = 8; y < 56; y++) {
    for (let x = 3; x < 62; x++) {
      const a = (x + y) % 8, b = (x - y + 64) % 8;
      if (a === 0 || b === 0) set(t, x, y, (x + y) % 16 === 0 ? C.STEEL_L : C.STEEL);
    }
  }
  // Top rail with barbed wire.
  for (let x = 0; x < S; x++) {
    set(t, x, 7, C.STEEL_M); set(t, x, 8, C.STEEL_D);
    const y = 3 + Math.round(Math.sin(x * 0.55) * 1.5);
    set(t, x, y, C.STEEL_M);
    if (x % 6 === 0) { set(t, x, y - 1, C.STEEL_L); set(t, x, y + 1, C.STEEL_D); }
  }
  // Concrete curb.
  for (let y = 56; y < S; y++) for (let x = 0; x < S; x++) set(t, x, y, pick(CONCRETE_RAMP, (y === 56 ? 0.85 : 0.5) + (n[y * S + x] - 0.5) * 0.4, x, y));
  return t;
}

// Subway: white glazed tiles with a colored band and the station name.
function subway() {
  const t = blank(S);
  const n = normalize(fbm(S, 271, { base: 8, octaves: 3 }));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const lx = (x + ((y >> 3) % 2 ? 8 : 0)) & 15, ly = y & 7;
      if (lx === 0 || ly === 0) { t.data[i] = n[i] > 0.62 ? C.SOOT : C.GRAVEL; continue; }
      let v = 0.62 + (n[i] - 0.5) * 0.4 - (y > 48 ? (y - 48) * 0.02 : 0);
      if (ly === 1) v += 0.2;
      t.data[i] = y >= 24 && y < 32 ? pick([C.NAVY, C.BLUE_D, C.BLUE], v, x, y) : pick(ENAMEL_RAMP, v, x, y);
    }
  }
  // Grime streaks.
  const r = rng(272);
  for (let k = 0; k < 6; k++) {
    const x = Math.floor(r() * S);
    for (let y = 33 + Math.floor(r() * 10); y < S; y++) if (r() < 0.7) set(t, x, y, C.GRAVEL_D);
  }
  return t;
}

// Stairs down into the subway (the city's stairwell).
function subwayStairs() {
  const t = subway();
  const x0 = 12, x1 = 52, top = 22;
  // Sign above: glowing globe green "SUBWAY".
  for (let y = 2; y < 16; y++) {
    for (let x = 4; x < 60; x++) {
      const edge = y === 2 || y === 15 || x === 4 || x === 59;
      set(t, x, y, edge ? C.BLACK : y % 2 ? C.MOSS_D : C.NIGHT);
    }
  }
  bigText(t, 'SUBWAY', 8, 4, C.LIME);
  // The opening: dark, deeper toward the middle, with steps going down.
  for (let y = top; y < S; y++) {
    for (let x = x0 - 2; x < x1 + 2; x++) {
      if (x < x0 || x >= x1) { set(t, x, y, x < x0 ? C.STEEL_L : C.STEEL_D); continue; } // frame
      const d = 1 - Math.min(1, Math.hypot((x - 31.5) / 20, (y - 36) / 26));
      set(t, x, y, d > 0.55 ? C.BLACK : d > 0.3 ? C.SOOT : C.NIGHT);
    }
  }
  for (let x = x0 - 2; x < x1 + 2; x++) { set(t, x, top - 1, C.STEEL_L); set(t, x, top - 2, C.STEEL); }
  const steps = [[61, 0.75], [56, 0.55], [51, 0.4], [47, 0.25], [44, 0.12]];
  for (const [y, v] of steps) {
    const inset = (61 - y) * 0.6;
    for (let x = Math.round(x0 + inset); x < Math.round(x1 - inset); x++) {
      set(t, x, y, pick(CONCRETE_RAMP, v, x, y));
      set(t, x, y + 1, pick(CONCRETE_RAMP, v - 0.3, x, y + 1));
      if (y === 61) { set(t, x, y - 1, (x & 3) < 2 ? C.YELLOW : C.SOOT); } // worn safety edge
    }
  }
  // Handrails.
  for (let y = top + 6; y < S - 2; y++) { set(t, x0 + 2, y, C.STEEL_L); set(t, x1 - 3, y, C.STEEL_M); }
  t.glow = glowMask([C.LIME]);
  return t;
}

// Borant store: white panels, a magenta corporate stripe and the logo.
function shop() {
  const t = blank(S);
  const n = normalize(fbm(S, 281, { base: 8, octaves: 2 }));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      let c = pick(ENAMEL_RAMP, 0.6 + (n[i] - 0.5) * 0.3, x, y);
      if ((x & 31) === 0) c = C.FOG;
      if (y >= 40 && y < 46) c = y === 40 ? C.NEON : C.MAGENTA;
      if (y >= 46 && y < 48) c = C.PLUM_D;
      if (y >= 58) c = C.STEEL_D;
      t.data[i] = c;
    }
  }
  smallText(t, 'BORANT', 20, 30, C.PLUM);
  smallText(t, 'BUY. OBEY.', 13, 51, C.FOG);
  t.glow = glowMask([C.NEON]);
  return t;
}

// ------------------------------------------------------------- flats

function asphalt() {
  const t = blank(S);
  const n = normalize(fbm(S, 301, { base: 8, octaves: 4 }));
  const big = normalize(fbm(S, 302, { base: 2, octaves: 2 }));
  const v = voronoi(S, 303, 7);
  const r = rng(304);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      let val = 0.42 + (n[i] - 0.5) * 0.5 + (big[i] - 0.5) * 0.3 + emboss(n, x, y) * 0.8;
      if (r() < 0.04) val += 0.35;                  // aggregate glints
      if (v.edge[i] < 0.8 && big[i] > 0.45) { t.data[i] = C.BLACK; continue; } // cracks
      if (big[i] < 0.18) val -= 0.25;               // tar patch
      t.data[i] = pick(ASPHALT_RAMP, val, x, y);
    }
  }
  return t;
}

function sidewalk() {
  const t = blank(S);
  const n = normalize(fbm(S, 311, { base: 8, octaves: 3 }));
  const r = rng(312);
  const base = [r(), r(), r(), r()];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x, lx = x & 31, ly = y & 31;
      if (lx === 0 || ly === 0) { t.data[i] = C.GRAVEL_D; continue; }
      let v = 0.5 + base[(x >> 5) + 2 * (y >> 5)] * 0.2 + (n[i] - 0.5) * 0.35 + emboss(n, x, y) * 0.5;
      if (lx === 1 || ly === 1) v += 0.15;
      if ((x * 13 + y * 7) % 97 === 0) { t.data[i] = C.SOOT; continue; } // gum
      t.data[i] = pick(CONCRETE_RAMP, v, x, y);
    }
  }
  // A crack across one slab.
  let x = 40, y = 34;
  for (let k = 0; k < 22; k++) { set(t, x, y, C.SOOT); x += r() < 0.6 ? 1 : 0; y += 1; }
  return t;
}

// Parking lot: asphalt with a painted bay line along one edge.
function parking() {
  const t = asphalt();
  const r = rng(321);
  for (let y = 0; y < S; y++) {
    for (const x of [0, 1, 2]) if (r() < 0.82) set(t, x, y, y % 23 < 2 ? C.FOG : C.SILVER);
  }
  // An oil stain where a car stood.
  for (let y = 24; y < 44; y++) for (let x = 22; x < 46; x++) if (Math.hypot((x - 34) / 11, (y - 34) / 8) < 1 && (x + y) % 2) set(t, x, y, C.BLACK);
  return t;
}

function checker() {
  const t = blank(S);
  const n = normalize(fbm(S, 331, { base: 8, octaves: 3 }));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const dark = ((x >> 4) + (y >> 4)) % 2 === 0;
      const dirt = n[i] > 0.68;
      if ((x & 15) === 0 || (y & 15) === 0) { t.data[i] = C.ASH; continue; }
      t.data[i] = dark ? (dirt ? C.BLACK : C.SOOT) : dirt ? C.FOG : (x * y) % 13 === 0 ? C.SILVER : C.BONE;
    }
  }
  return t;
}

function lino() {
  const t = blank(S);
  const n = normalize(fbm(S, 341, { base: 8, octaves: 3 }));
  const r = rng(342);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      if ((x & 31) === 0 || (y & 31) === 0) { t.data[i] = C.ASH; continue; }
      let v = 0.5 + (n[i] - 0.5) * 0.4;
      if (r() < 0.06) v -= 0.3; // speckle
      t.data[i] = pick([C.ASH, C.FOG, C.SILVER, C.BONE], v, x, y);
    }
  }
  return t;
}

function concrete() {
  const t = blank(S);
  const n = normalize(fbm(S, 351, { base: 4, octaves: 5 }));
  const stain = normalize(fbm(S, 352, { base: 2, octaves: 3 }));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      let v = 0.42 + (n[i] - 0.5) * 0.35 + emboss(n, x, y) * 0.6 - Math.max(0, stain[i] - 0.6) * 1.2;
      if (y === 0 || y === 32) v = 0.1; // formwork seams
      t.data[i] = pick(CONCRETE_RAMP, v, x, y);
    }
  }
  for (const [x, y] of [[16, 16], [48, 16], [16, 48], [48, 48]]) { set(t, x, y, C.SOOT); set(t, x + 1, y, C.GRAVEL_D); } // tie holes
  return t;
}

// The sky over the street: painted canvas with clouds, a lighting truss
// and a spotlight. Borant Encore could not afford a real one.
function studioSky() {
  const t = blank(S);
  const n = normalize(fbm(S, 361, { base: 4, octaves: 4 }));
  const r = rng(362);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const v = 0.35 + (n[i] - 0.5) * 0.9;
      t.data[i] = pick([C.NAVY, C.BLUE_D, C.BLUE, C.SKY, C.FOG], v, x, y, 0.9);
      if (x === 40) t.data[i] = C.BLUE_D; // canvas seam
      if (x === 41 && r() < 0.6) t.data[i] = C.NAVY;
    }
  }
  // Truss along one edge: two rails with zigzag struts.
  for (let x = 0; x < S; x++) {
    for (const [y, c] of [[2, C.STEEL_M], [3, C.STEEL_D], [10, C.STEEL_M], [11, C.STEEL_D]]) set(t, x, y, c);
    const z = Math.abs(((x % 8) - 4)) * 2;
    set(t, x, 3 + z, C.STEEL); if (z < 7) set(t, x, 4 + z, C.BLACK);
  }
  // A spotlight hanging off it, still on.
  for (let y = 12; y < 20; y++) for (let x = 26; x < 36; x++) {
    const d = Math.hypot((x - 30.5) / 5, (y - 16) / 4);
    if (d < 1) set(t, x, y, d < 0.45 ? C.WHITE : d < 0.75 ? C.YELLOW : C.AMBER);
  }
  set(t, 30, 12, C.STEEL_L); set(t, 31, 12, C.STEEL_L);
  t.glow = glowMask([C.WHITE, C.YELLOW, C.AMBER]);
  return t;
}

// Drop ceiling: grey tiles in a metal grid, one fluorescent panel still on.
function dropCeiling() {
  const t = blank(S);
  const n = normalize(fbm(S, 371, { base: 8, octaves: 3 }));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x, lx = x & 31, ly = y & 31;
      if (lx === 0 || ly === 0) { t.data[i] = C.STEEL_M; continue; }
      if (lx === 1 || ly === 1) { t.data[i] = C.STEEL_D; continue; }
      const panel = x >= 32 && y < 32;
      if (panel) { t.data[i] = (lx > 3 && lx < 29 && ly > 3 && ly < 29) ? ((x + y) % 4 ? C.WHITE : C.ICE) : C.STEEL_L; continue; }
      let v = 0.5 + (n[i] - 0.5) * 0.5;
      if ((x * 7 + y * 11) % 17 === 0) v -= 0.3; // pin holes
      if (x < 32 && y >= 32 && n[i] > 0.62) v -= 0.4; // water stain
      t.data[i] = pick([C.GRAVEL, C.FOG, C.SILVER, C.BONE], v, x, y);
    }
  }
  t.glow = glowMask([C.WHITE, C.ICE]);
  return t;
}

// ------------------------------------------------------------ registry

// Both skins share one flats list. The dungeon skin is buildTextures() plus
// the city's own walls and flats; the city skin repaints the generic walls
// (ROCK = facades, STONE = brick, STAIRS = subway, SAFE and POSTER on brick).
export function buildSkins(portraitImg = null) {
  const dungeon = buildTextures(portraitImg);
  const { walls, flats } = dungeon;
  walls[WALL.DINER] = diner();
  walls[WALL.LAUNDRY] = laundry();
  walls[WALL.PHARMACY] = pharmacy();
  walls[WALL.FENCE] = fence();
  walls[WALL.SUBWAY] = subway();
  walls[WALL.SHOP] = shop();
  walls[WALL.EAT] = eatSign();
  walls[WALL.CROSS] = pharmacyCross();
  flats[FLAT.ASPHALT] = asphalt();
  flats[FLAT.SIDEWALK] = sidewalk();
  flats[FLAT.PARKING] = parking();
  flats[FLAT.CHECKER] = checker();
  flats[FLAT.LINO] = lino();
  flats[FLAT.CONCRETE] = concrete();
  flats[FLAT.SKY] = studioSky();
  flats[FLAT.DROP] = dropCeiling();
  const city = { walls: walls.slice(), flats };
  city.walls[WALL.ROCK] = facade();
  city.walls[WALL.STONE] = brick();
  city.walls[WALL.STAIRS] = subwayStairs();
  city.walls[WALL.SAFE] = safeDoor(brick());
  city.walls[WALL.POSTER] = borantPoster(brick());
  return { dungeon, city };
}

// Which skin a floor's setting uses.
export const skinFor = (skins, setting) => (setting === 'city' ? skins.city : skins.dungeon);
