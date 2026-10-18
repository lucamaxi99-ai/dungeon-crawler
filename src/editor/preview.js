// In-game preview: renders the sprite with the real raycaster in a small
// room, at three distances, so distance shading and glow look exactly like
// they will in the dungeon.

import { FrameBuffer } from '../engine/framebuffer.js';
import { Raycaster } from '../engine/raycaster.js';
import { buildTextures, TEX } from '../game/assets.js';

const W = 192, H = 108;

// 7 wide, 9 deep room. Camera stands at the back, looking south.
const ROOM = [
  '1111111',
  '1.....1',
  '1.....1',
  '1.....1',
  '1.....1',
  '1.....1',
  '1.....1',
  '1.....1',
  '1115111',
];

export class Preview {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d');
    this.fb = new FrameBuffer(W, H);
    this.caster = new Raycaster({ x: 0, y: 0, w: W, h: H, fov: 66, fog: 1.55, texSize: TEX });
    this.tex = buildTextures();
    this.map = {
      w: ROOM[0].length,
      h: ROOM.length,
      wall: (x, y) => (x < 0 || y < 0 || x >= 7 || y >= ROOM.length ? 1 : Number(ROOM[y][x]) || 0),
    };
    this.cam = { x: 3.5, y: 0.6, angle: Math.PI / 2 };
  }

  // frame: engine sprite. Copies stand at near, middle and far distance.
  render(frame) {
    const sprites = [
      { x: 2.3, y: 2.0, img: frame },
      { x: 3.6, y: 3.9, img: frame },
      { x: 4.6, y: 7.3, img: frame },
    ];
    this.fb.clear(0);
    this.caster.render(this.fb, {
      map: this.map,
      walls: this.tex.walls,
      floor: this.tex.floor,
      ceiling: this.tex.ceiling,
      sprites,
    }, this.cam);
    this.fb.present(this.ctx);
  }
}
