// Lit grid raycaster: same projection as Raycaster, plus
//   - any view size (320x140, 640x280, ...)
//   - textures of any power-of-two size (32 or 64), per texture
//   - floor and ceiling material per cell
//   - per-cell colored light (LightMap) sampled bilinearly
//   - ambient occlusion where floor meets wall
//   - ordered dithering between shade levels
//   - glowing texels on walls and sprites (neon, runes, flames)
//   - sprites carry their own resolution (img.unit = pixels per world unit)
//
// All shading goes through lit shade tables (lighting.js), so every pixel
// stays a palette index.

import { PALETTE_SIZE } from './palette.js';
import { TRANSPARENT } from './framebuffer.js';
import { BAYER4 } from './lighting.js';

const CAM_HEIGHT = 0.5;

export class LitRaycaster {
  // tables: result of buildLitTables(). lighting: use the light map.
  // dither: ordered dithering between levels. fogFar: distance where the
  // view is fully dark.
  constructor({ x = 0, y = 0, w, h, fov = 66, tables, lighting = true, dither = true, ao = true, fogFar = 12 }) {
    this.vx = x; this.vy = y; this.vw = w; this.vh = h;
    this.fov = (fov * Math.PI) / 180;
    this.planeLen = Math.tan(this.fov / 2);
    this.projDist = w / 2 / this.planeLen;
    this.tables = tables;
    this.lighting = lighting;
    this.dither = dither;
    this.ao = ao;
    this.fogFar = fogFar;
    this.zbuf = new Float32Array(w);
    this.wallBottom = new Int32Array(w);
    this.prepared = null;
  }

  basis(cam) {
    const dx = Math.cos(cam.angle), dy = Math.sin(cam.angle);
    return { dx, dy, px: -dy * this.planeLen, py: dx * this.planeLen };
  }

  // Per-map lookup arrays: flat materials and ambient-occlusion masks.
  // map: { w, h, wall(x, y), floorAt(x, y), ceilAt(x, y) }
  prepare(map) {
    if (this.prepared && this.prepared.map === map) return this.prepared;
    const { w, h } = map;
    const floor = new Uint8Array(w * h), ceil = new Uint8Array(w * h), ao = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        floor[i] = map.floorAt ? map.floorAt(x, y) : 0;
        ceil[i] = map.ceilAt ? map.ceilAt(x, y) : 0;
        const W = map.wall(x - 1, y) ? 1 : 0, E = map.wall(x + 1, y) ? 2 : 0;
        const N = map.wall(x, y - 1) ? 4 : 0, S = map.wall(x, y + 1) ? 8 : 0;
        let m = W | E | N | S;
        if (!W && !N && map.wall(x - 1, y - 1)) m |= 16;
        if (!E && !N && map.wall(x + 1, y - 1)) m |= 32;
        if (!W && !S && map.wall(x - 1, y + 1)) m |= 64;
        if (!E && !S && map.wall(x + 1, y + 1)) m |= 128;
        ao[i] = m;
      }
    }
    this.prepared = { map, floor, ceil, ao };
    return this.prepared;
  }

  fog(dist) {
    const f = 1 - dist / this.fogFar;
    return f <= 0 ? 0 : f;
  }

  // Bilinear light at a world position. Returns brightness (1 = as drawn).
  lightAt(light, x, y) {
    if (!light) return 1;
    const W = light.w, H = light.h, L = light.level;
    let gx = x - 0.5, gy = y - 0.5;
    if (gx < 0) gx = 0; else if (gx > W - 1.001) gx = W - 1.001;
    if (gy < 0) gy = 0; else if (gy > H - 1.001) gy = H - 1.001;
    const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy;
    const i = iy * W + ix;
    const a = L[i] + (L[i + 1] - L[i]) * fx;
    const b = L[i + W] + (L[i + W + 1] - L[i + W]) * fx;
    return a + (b - a) * fy;
  }

  tintAt(light, x, y) {
    if (!light) return 0;
    const cx = x | 0, cy = y | 0;
    if (cx < 0 || cy < 0 || cx >= light.w || cy >= light.h) return 0;
    return light.tint[cy * light.w + cx];
  }

  // scene: { map, walls: [tex], flats: [tex], sprites: [{x, y, img, lift?, emissive?}], light? }
  render(fb, scene, cam, time = 0) {
    this.prepare(scene.map);
    this.light = this.lighting ? scene.light || null : null;
    this.drawWalls(fb, scene, cam);
    this.drawFlats(fb, scene, cam);
    this.drawSprites(fb, scene, cam);
  }

  // Shade level for a brightness, dithered at screen position (x, y).
  level(b, x, y) {
    const { levels, maxBright } = this.tables;
    let l = (1 - b / maxBright) * (levels - 1);
    l = this.dither ? l + BAYER4[((y & 3) << 2) | (x & 3)] : l + 0.5;
    l |= 0;
    return l < 0 ? 0 : l > levels - 1 ? levels - 1 : l;
  }

  drawWalls(fb, scene, cam) {
    const { vx, vy, vw, vh, projDist, zbuf, wallBottom } = this;
    const { dx, dy, px, py } = this.basis(cam);
    const map = scene.map, light = this.light;
    const out = fb.pixels, FW = fb.width;
    const horizon = vh / 2;
    const T = this.tables.table, LV = this.tables.levels;
    const useAo = this.ao;

    for (let col = 0; col < vw; col++) {
      const camX = (2 * (col + 0.5)) / vw - 1;
      const rdx = dx + px * camX, rdy = dy + py * camX;
      let mx = Math.floor(cam.x), my = Math.floor(cam.y);
      const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
      const ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      const stepX = rdx < 0 ? -1 : 1, stepY = rdy < 0 ? -1 : 1;
      let sdx = rdx < 0 ? (cam.x - mx) * ddx : (mx + 1 - cam.x) * ddx;
      let sdy = rdy < 0 ? (cam.y - my) * ddy : (my + 1 - cam.y) * ddy;
      let side = 0, hit = 0;
      for (let i = 0; i < 96; i++) {
        if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; }
        else { sdy += ddy; my += stepY; side = 1; }
        hit = map.wall(mx, my);
        if (hit) break;
      }
      if (!hit) { zbuf[col] = 1e30; wallBottom[col] = horizon | 0; continue; }

      const dist = side === 0 ? sdx - ddx : sdy - ddy;
      zbuf[col] = dist;
      const t = scene.walls[hit];
      const tw = t.w, th = t.h;
      let wallX = side === 0 ? cam.y + dist * rdy : cam.x + dist * rdx;
      wallX -= Math.floor(wallX);
      let texX = (wallX * tw) | 0;
      if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) texX = tw - 1 - texX;

      // Light just in front of the wall face.
      const lx = cam.x + rdx * (dist - 0.02), ly = cam.y + rdy * (dist - 0.02);
      const base = this.lightAt(light, lx, ly) * this.fog(dist) * (side ? 0.82 : 1);
      const tint = this.tintAt(light, lx, ly);
      const tBase = tint * LV;

      const lineH = projDist / dist;
      const top = horizon - lineH * (1 - CAM_HEIGHT);
      const y0 = Math.max(0, Math.ceil(top));
      const y1 = Math.min(vh, Math.ceil(top + lineH));
      wallBottom[col] = y1;
      const step = th / lineH;
      let texPos = (y0 - top) * step;
      const glow = t.glow;
      for (let y = y0; y < y1; y++) {
        let ty = texPos | 0;
        if (ty > th - 1) ty = th - 1;
        texPos += step;
        const c = t.data[ty * tw + texX];
        if (glow && glow[c]) { out[(vy + y) * FW + vx + col] = c; continue; }
        // Ambient occlusion: darker toward floor and ceiling.
        const v = ty / th;
        const ao = !useAo ? 1 : v > 0.86 ? 0.62 + 0.38 * ((1 - v) / 0.14) : v < 0.08 ? 0.78 + 0.22 * (v / 0.08) : 1;
        const l = this.level(base * ao, col, y);
        out[(vy + y) * FW + vx + col] = T[(tBase + l) * PALETTE_SIZE + c];
      }
    }
  }

  drawFlats(fb, scene, cam) {
    const { vx, vy, vw, vh, wallBottom } = this;
    const { dx, dy, px, py } = this.basis(cam);
    const { floor: floorIds, ceil: ceilIds, ao: aoMask, map } = this.prepared;
    const MW = map.w, MH = map.h;
    const flats = scene.flats, light = this.light;
    const out = fb.pixels, FW = fb.width;
    const horizon = vh / 2;
    const T = this.tables.table, LV = this.tables.levels, maxB = this.tables.maxBright;
    const dither = this.dither, useAo = this.ao;
    const aoCurve = (d) => (d >= 0.32 ? 1 : 0.55 + 0.45 * (d / 0.32));

    for (let row = Math.floor(horizon); row < vh; row++) {
      const p = row - horizon + 0.5;
      const rowDist = (CAM_HEIGHT * this.projDist) / p;
      const fog = this.fog(rowDist);
      let wx = cam.x + rowDist * (dx - px);
      let wy = cam.y + rowDist * (dy - py);
      const sx = (rowDist * 2 * px) / vw;
      const sy = (rowDist * 2 * py) / vw;
      const fOff = (vy + row) * FW + vx;
      const cRow = vh - 1 - row;
      const cOff = (vy + cRow) * FW + vx;
      for (let col = 0; col < vw; col++, wx += sx, wy += sy) {
        if (row < wallBottom[col]) continue;
        if (wx < 0 || wy < 0 || wx >= MW || wy >= MH || fog <= 0) {
          out[fOff + col] = 0; out[cOff + col] = 0; continue;
        }
        const cx = wx | 0, cy = wy | 0, cell = cy * MW + cx;
        const fx = wx - cx, fy = wy - cy;
        const ft = flats[floorIds[cell]], ct = flats[ceilIds[cell]];

        let ao = 1;
        const m = useAo ? aoMask[cell] : 0;
        if (m) {
          if (m & 1) ao = Math.min(ao, aoCurve(fx));
          if (m & 2) ao = Math.min(ao, aoCurve(1 - fx));
          if (m & 4) ao = Math.min(ao, aoCurve(fy));
          if (m & 8) ao = Math.min(ao, aoCurve(1 - fy));
          if (m & 16) ao = Math.min(ao, aoCurve(Math.hypot(fx, fy)));
          if (m & 32) ao = Math.min(ao, aoCurve(Math.hypot(1 - fx, fy)));
          if (m & 64) ao = Math.min(ao, aoCurve(Math.hypot(fx, 1 - fy)));
          if (m & 128) ao = Math.min(ao, aoCurve(Math.hypot(1 - fx, 1 - fy)));
        }

        let b = fog * ao, tint = 0;
        const d = BAYER4[((row & 3) << 2) | (col & 3)];
        if (light) {
          b *= this.lightAt(light, wx, wy);
          // Dithered pick of the light color across cell borders.
          const tx = (wx + (dither ? d - 0.5 : 0)) | 0, ty = (wy + (dither ? BAYER4[((col & 3) << 2) | (row & 3)] - 0.5 : 0)) | 0;
          tint = tx >= 0 && ty >= 0 && tx < MW && ty < MH ? light.tint[ty * MW + tx] : 0;
        }
        let lf = (1 - b / maxB) * (LV - 1) + (dither ? d : 0.5);
        let l = lf | 0;
        if (l > LV - 1) l = LV - 1;
        const rowBase = (tint * LV + l) * PALETTE_SIZE;

        const fw = ft.w, cw = ct.w;
        const fc = ft.data[((((wy * fw) | 0) & (fw - 1)) * fw) + (((wx * fw) | 0) & (fw - 1))];
        const cc = ct.data[((((wy * cw) | 0) & (cw - 1)) * cw) + (((wx * cw) | 0) & (cw - 1))];
        out[fOff + col] = ft.glow && ft.glow[fc] ? fc : T[rowBase + fc];
        // Ceilings get a bit less light than floors.
        let lc = (lf + (LV * 0.06)) | 0;
        if (lc > LV - 1) lc = LV - 1;
        out[cOff + col] = ct.glow && ct.glow[cc] ? cc : T[(tint * LV + lc) * PALETTE_SIZE + cc];
      }
    }
  }

  drawSprites(fb, scene, cam) {
    const { vx, vy, vw, vh, projDist, zbuf } = this;
    const { dx, dy, px, py } = this.basis(cam);
    const out = fb.pixels, FW = fb.width;
    const horizon = vh / 2;
    const invDet = 1 / (px * dy - dx * py);
    const T = this.tables.table, LV = this.tables.levels;
    const light = this.light;

    const list = [];
    for (const s of scene.sprites) {
      const rx = s.x - cam.x, ry = s.y - cam.y;
      const depth = invDet * (-py * rx + px * ry);
      if (depth < 0.15) continue;
      const lateral = invDet * (dy * rx - dx * ry);
      list.push({ s, depth, lateral });
    }
    list.sort((a, b) => b.depth - a.depth);

    for (const { s, depth, lateral } of list) {
      const img = s.img;
      const unit = img.unit || 32;
      const scale = projDist / depth / unit;        // screen px per sprite px
      const sw = img.w * scale, sh = img.h * scale;
      const cx = (vw / 2) * (1 + lateral / depth);
      const floorY = horizon + (CAM_HEIGHT * projDist) / depth;
      const left = cx - sw / 2;
      const top = floorY - sh - (s.lift || 0) * (projDist / depth);
      const x0 = Math.max(0, Math.ceil(left)), x1 = Math.min(vw, Math.ceil(left + sw));
      const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(vh, Math.ceil(top + sh));
      const b = s.emissive ? 1 : this.lightAt(light, s.x, s.y) * this.fog(depth);
      const tBase = this.tintAt(light, s.x, s.y) * LV;
      const glow = img.glow;

      for (let col = x0; col < x1; col++) {
        if (zbuf[col] < depth) continue;
        const ix = ((col - left) / scale) | 0;
        if (ix < 0 || ix >= img.w) continue;
        for (let y = y0; y < y1; y++) {
          const iy = ((y - top) / scale) | 0;
          if (iy < 0 || iy >= img.h) continue;
          const c = img.data[iy * img.w + ix];
          if (c === TRANSPARENT) continue;
          out[(vy + y) * FW + vx + col] = glow && glow[c] ? c : T[(tBase + this.level(b, col, y)) * PALETTE_SIZE + c];
        }
      }
    }
  }
}
