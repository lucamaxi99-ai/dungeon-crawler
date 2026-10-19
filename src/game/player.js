// Grid movement: the player always stands on a cell center and faces one of
// four directions. Moves and turns animate smoothly; one input is buffered so
// held keys and quick taps feel responsive.

export const DIRS = [
  { x: 1, y: 0, name: 'E' },
  { x: 0, y: 1, name: 'S' },
  { x: -1, y: 0, name: 'W' },
  { x: 0, y: -1, name: 'N' },
];

const MOVE_MS = 170;
const TURN_MS = 140;
const BUMP_MS = 160;

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.dir = start.dir;
    this.anim = null;
    this.queued = null;
    this.steps = 0;
  }

  get facing() {
    return DIRS[this.dir];
  }

  // The cell the player looks at.
  front() {
    const d = this.facing;
    return { x: this.x + d.x, y: this.y + d.y };
  }

  busy() {
    return this.anim !== null;
  }

  // action: 'forward' | 'back' | 'left' | 'right' | 'turnLeft' | 'turnRight'
  // canEnter(x, y) -> true | false. onBlocked(x, y) is called on bumps.
  // Returns true if the action started.
  act(action, world) {
    if (this.busy()) { this.queued = action; return false; }

    if (action === 'turnLeft' || action === 'turnRight') {
      const delta = action === 'turnLeft' ? -1 : 1;
      const fromA = this.dir * (Math.PI / 2);
      this.dir = (this.dir + delta + 4) % 4;
      this.anim = { kind: 'turn', t: 0, dur: TURN_MS, fromA, toA: fromA + delta * (Math.PI / 2) };
      return true;
    }

    const rel = { forward: 0, right: 1, back: 2, left: 3 }[action];
    if (rel === undefined) return false;
    const d = DIRS[(this.dir + rel) % 4];
    const nx = this.x + d.x, ny = this.y + d.y;
    if (!world.canEnter(nx, ny)) {
      this.anim = { kind: 'bump', t: 0, dur: BUMP_MS, dx: d.x, dy: d.y };
      world.onBlocked?.(nx, ny, action);
      return false;
    }
    this.anim = { kind: 'move', t: 0, dur: MOVE_MS, fx: this.x, fy: this.y };
    this.x = nx;
    this.y = ny;
    this.steps++;
    world.onEnter?.(nx, ny);
    return true;
  }

  // Moves to a neighbouring cell without turning (stumbling away from a
  // fight). The caller checks that the cell is free.
  shove(nx, ny) {
    this.anim = { kind: 'move', t: 0, dur: MOVE_MS, fx: this.x, fy: this.y };
    this.x = nx;
    this.y = ny;
    this.steps++;
  }

  // Advances animations; returns a queued action that is now ready to run.
  update(dt) {
    if (!this.anim) return null;
    this.anim.t += dt;
    if (this.anim.t >= this.anim.dur) {
      this.anim = null;
      const q = this.queued;
      this.queued = null;
      return q;
    }
    return null;
  }

  // Interpolated camera for rendering (cell centers are at +0.5).
  camera() {
    const a = this.anim;
    let x = this.x + 0.5, y = this.y + 0.5, angle = this.dir * (Math.PI / 2);
    if (a) {
      const k = ease(Math.min(1, a.t / a.dur));
      if (a.kind === 'move') {
        x = a.fx + 0.5 + (this.x - a.fx) * k;
        y = a.fy + 0.5 + (this.y - a.fy) * k;
      } else if (a.kind === 'turn') {
        angle = a.fromA + (a.toA - a.fromA) * k;
      } else if (a.kind === 'bump') {
        const push = Math.sin(k * Math.PI) * 0.12;
        x += a.dx * push;
        y += a.dy * push;
      }
    }
    return { x, y, angle };
  }
}
