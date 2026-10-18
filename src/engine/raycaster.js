// Grid raycaster in the style of early-90s first-person RPGs.
// Renders textured walls, floor and ceiling and billboard sprites into an
// indexed FrameBuffer, with distance shading through the palette's SHADE table.
//
// World units: one map cell = 1.0. Textures are TEX x TEX pixels per cell,
// so a sprite that is TEX pixels tall stands exactly one wall high.

import { SHADE, PALETTE_SIZE, SHADE_LEVELS } from './palette.js';
import { TRANSPARENT } from './framebuffer.js';

const CAM_HEIGHT = 0.5;

export class Raycaster {
  constructor({ x, y, w, h, fov = 66, fog = 1.6, texSize = 32 }) {
    this.vx = x; this.vy = y; this.vw = w; this.vh = h;
    this.fov = (fov * Math.PI) / 180;
    this.planeLen = Math.tan(this.fov / 2);
    this.projDist = w / 2 / this.planeLen;
    this.fog = fog;                 // shade levels per world unit
    this.sightRange = (SHADE_LEVELS - 3) / fog; // beyond this it's too dark to map
    this.tex = texSize;
    this.zbuf = new Float32Array(w);
  }

  shadeLevel(dist, bias = 0) {
    const l = Math.floor(dist * this.fog + bias);
    return l < 0 ? 0 : l > SHADE_LEVELS - 1 ? SHADE_LEVELS - 1 : l;
  }

  // scene: { map: {w, h, wall(x, y) -> texture index (0 = empty)},
  //          walls: [tex...] (index 1..n), floor: tex, ceiling: tex,
  //          sprites: [{x, y, img, emissive?}] }
  // cam: { x, y, angle }
  render(fb, scene, cam) {
    this.drawFloorCeiling(fb, scene, cam);
    this.drawWalls(fb, scene, cam);
    this.drawSprites(fb, scene, cam);
  }

  basis(cam) {
    const dx = Math.cos(cam.angle), dy = Math.sin(cam.angle);
    // Plane is perpendicular to dir (to the right on screen).
    return { dx, dy, px: -dy * this.planeLen, py: dx * this.planeLen };
  }

  drawFloorCeiling(fb, scene, cam) {
    const { vx, vy, vw, vh, tex } = this;
    const { dx, dy, px, py } = this.basis(cam);
    const horizon = vh / 2;
    const out = fb.pixels, W = fb.width;
    const floor = scene.floor, ceil = scene.ceiling;
    const mask = tex - 1;

    for (let row = Math.floor(horizon); row < vh; row++) {
      const p = row - horizon + 0.5;
      const rowDist = (CAM_HEIGHT * this.projDist) / p;
      const level = this.shadeLevel(rowDist, 0.5) * PALETTE_SIZE;
      // World position at the left screen edge and step per column.
      let wx = cam.x + rowDist * (dx - px);
      let wy = cam.y + rowDist * (dy - py);
      const sx = (rowDist * 2 * px) / vw;
      const sy = (rowDist * 2 * py) / vw;
      const fOff = (vy + row) * W + vx;
      const cOff = (vy + vh - 1 - row) * W + vx;
      for (let col = 0; col < vw; col++) {
        const tx = Math.floor(wx * tex) & mask;
        const ty = Math.floor(wy * tex) & mask;
        out[fOff + col] = SHADE[level + floor.data[ty * tex + tx]];
        out[cOff + col] = SHADE[level + ceil.data[ty * tex + tx]];
        wx += sx; wy += sy;
      }
    }
  }

  drawWalls(fb, scene, cam) {
    const { vx, vy, vw, vh, tex, projDist, zbuf } = this;
    const { dx, dy, px, py } = this.basis(cam);
    const map = scene.map;
    const out = fb.pixels, W = fb.width;
    const horizon = vh / 2;

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

      const seen = scene.seen;
      if (seen) seen[my * map.w + mx] = 1;
      for (let i = 0; i < 64; i++) {
        if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; }
        else { sdy += ddy; my += stepY; side = 1; }
        hit = map.wall(mx, my);
        // Fog of war: remember cells within sight range.
        if (seen && mx >= 0 && my >= 0 && mx < map.w && my < map.h &&
            Math.min(sdx, sdy) < this.sightRange) seen[my * map.w + mx] = 1;
        if (hit) break;
      }
      if (!hit) { zbuf[col] = 1e30; continue; }

      const dist = side === 0 ? sdx - ddx : sdy - ddy;
      zbuf[col] = dist;
      let wallX = side === 0 ? cam.y + dist * rdy : cam.x + dist * rdx;
      wallX -= Math.floor(wallX);
      let texX = Math.floor(wallX * tex);
      // Keep textures un-mirrored on every face.
      if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) texX = tex - 1 - texX;

      const t = scene.walls[hit];
      const lineH = projDist / dist;
      const top = horizon - lineH * (1 - CAM_HEIGHT);
      const y0 = Math.max(0, Math.ceil(top));
      const y1 = Math.min(vh, Math.ceil(top + lineH));
      const level = this.shadeLevel(dist, side ? 1.5 : 0) * PALETTE_SIZE;
      const step = tex / lineH;
      let texPos = (y0 - top) * step;
      for (let y = y0; y < y1; y++) {
        const ty = Math.min(tex - 1, Math.floor(texPos));
        texPos += step;
        out[(vy + y) * W + vx + col] = SHADE[level + t.data[ty * tex + texX]];
      }
    }
  }

  drawSprites(fb, scene, cam) {
    const { vx, vy, vw, vh, tex, projDist, zbuf } = this;
    const { dx, dy, px, py } = this.basis(cam);
    const out = fb.pixels, W = fb.width;
    const horizon = vh / 2;
    const invDet = 1 / (px * dy - dx * py);

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
      const scale = projDist / depth / tex;          // screen px per sprite px
      const sw = img.w * scale, sh = img.h * scale;
      const cx = (vw / 2) * (1 + lateral / depth);
      const floorY = horizon + (CAM_HEIGHT * projDist) / depth;
      const left = cx - sw / 2;
      const top = floorY - sh - (s.lift || 0) * scale;
      const x0 = Math.max(0, Math.ceil(left)), x1 = Math.min(vw, Math.ceil(left + sw));
      const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(vh, Math.ceil(top + sh));
      const level = (s.emissive ? 0 : this.shadeLevel(depth, 0.5)) * PALETTE_SIZE;
      const glow = img.glow;

      for (let col = x0; col < x1; col++) {
        if (zbuf[col] < depth) continue;
        const ix = Math.floor((col - left) / scale);
        if (ix < 0 || ix >= img.w) continue;
        for (let y = y0; y < y1; y++) {
          const iy = Math.floor((y - top) / scale);
          if (iy < 0 || iy >= img.h) continue;
          const c = img.data[iy * img.w + ix];
          if (c === TRANSPARENT) continue;
          out[(vy + y) * W + vx + col] = glow && glow[c] ? c : SHADE[level + c];
        }
      }
    }
  }
}
