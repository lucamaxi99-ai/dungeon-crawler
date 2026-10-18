// Indexed-color framebuffer. Drawing writes palette indices; present() converts
// to RGBA once per frame and blits to a canvas scaled with nearest-neighbor.

import { RGBA32 } from './palette.js';

export const TRANSPARENT = 255;

export class FrameBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height);
    this.image = new ImageData(width, height);
    this.image32 = new Uint32Array(this.image.data.buffer);
  }

  clear(color = 0) {
    this.pixels.fill(color);
  }

  set(x, y, color) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.pixels[y * this.width + x] = color;
  }

  rect(x, y, w, h, color) {
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(this.width, x + w), y1 = Math.min(this.height, y + h);
    for (let yy = y0; yy < y1; yy++) {
      this.pixels.fill(color, yy * this.width + x0, yy * this.width + x1);
    }
  }

  // Bevelled panel like old DOS game UIs.
  bevel(x, y, w, h, fill, light, dark) {
    this.rect(x, y, w, h, fill);
    this.rect(x, y, w, 1, light);
    this.rect(x, y, 1, h, light);
    this.rect(x, y + h - 1, w, 1, dark);
    this.rect(x + w - 1, y, 1, h, dark);
  }

  // Draws an image ({w, h, data} of palette indices) with optional remap.
  blit(img, x, y, remap = null) {
    for (let sy = 0; sy < img.h; sy++) {
      const dy = y + sy;
      if (dy < 0 || dy >= this.height) continue;
      for (let sx = 0; sx < img.w; sx++) {
        const dx = x + sx;
        if (dx < 0 || dx >= this.width) continue;
        let c = img.data[sy * img.w + sx];
        if (c === TRANSPARENT) continue;
        if (remap) c = remap[c];
        this.pixels[dy * this.width + dx] = c;
      }
    }
  }

  present(ctx) {
    const px = this.pixels, out = this.image32;
    for (let i = 0; i < px.length; i++) out[i] = RGBA32[px[i]];
    ctx.putImageData(this.image, 0, 0);
  }
}
