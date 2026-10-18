// In-game preview: renders the sprite with the game's lit raycaster in a
// small room, at three distances, so lighting, dithering and glow look
// exactly like they will in the dungeon.

import { FrameBuffer } from '../engine/framebuffer.js';
import { LitRaycaster } from '../engine/raycaster-lit.js';
import { buildLitTables, LightMap } from '../engine/lighting.js';
import { buildTextures, WALL, FLAT } from '../game/textures.js';
import { TINTS, TINT, LANTERN } from '../game/lights.js';

const W = 320, H = 140;

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
  '1114111',
];

export class Preview {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d');
    this.fb = new FrameBuffer(W, H);
    const tables = buildLitTables({ tints: TINTS, levels: 32, maxBright: 1.5 });
    this.caster = new LitRaycaster({ w: W, h: H, fov: 66, tables, fogFar: 16 });
    this.tex = buildTextures();
    const rh = ROOM.length, rw = ROOM[0].length;
    const wall = (x, y) => (x < 0 || y < 0 || x >= rw || y >= rh ? WALL.STONE : Number(ROOM[y][x]) || 0);
    this.map = { w: rw, h: rh, wall, floorAt: () => FLAT.COBBLE, ceilAt: () => FLAT.BEAMS };
    this.cam = { x: 3.5, y: 0.6, angle: Math.PI / 2 };
    // Dim warm room, the "player's" lantern and a torch by the stairs.
    this.light = new LightMap(rw, rh, (x, y) => wall(x, y) !== 0, TINTS.length);
    this.light.setAmbient(0, 0, rw - 1, rh - 1, 0.16, TINT.TORCH);
    this.light.addLight({ x: 3.5, y: 7.6, radius: 4.5, intensity: 0.8, tint: TINT.TORCH });
    this.light.update(0, [{ ...LANTERN, x: this.cam.x, y: this.cam.y + 0.5 }]);
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
      flats: this.tex.flats,
      sprites,
      light: this.light,
    }, this.cam);
    this.fb.present(this.ctx);
  }
}
