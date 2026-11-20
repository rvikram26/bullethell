import { FIELD_W } from '../core/constants';
import { easeIn, easeInOut, easeOut } from '../core/math';
import type { Rng } from '../core/rng';
import type { Ease } from '../data/types';
import { type CPath, MV_ARC, MV_REL, MV_RAND, MV_SINE, MV_TO, MV_VEL, MV_WAIT } from './compile';

function ease(kind: Ease, u: number): number {
  switch (kind) {
    case 'in':
      return easeIn(u);
    case 'out':
      return easeOut(u);
    case 'inout':
      return easeInOut(u);
    default:
      return u;
  }
}

export interface Positioned {
  x: number;
  y: number;
}

/** Walks an entity along a compiled movement path, one frame at a time. */
export class Mover {
  path: CPath | null = null;
  done = true;
  /** Current velocity in px/frame (also used to keep drifting after the last step). */
  vx = 0;
  vy = 0;

  private idx = 0;
  private t = 0;
  private sx = 0;
  private sy = 0;
  private tx = 0;
  private ty = 0;
  private heading = 0;
  private turn = 0;
  private flip = false;
  private drift = false;

  start(path: CPath | null, x: number, y: number, flip: boolean, rng: Rng): void {
    this.path = path;
    this.flip = flip;
    this.idx = 0;
    this.t = 0;
    this.vx = 0;
    this.vy = 0;
    this.drift = false;
    this.done = !path || path.steps.length === 0;
    if (!this.done) this.begin(x, y, rng);
  }

  private begin(x: number, y: number, rng: Rng): void {
    const path = this.path;
    if (!path) return;
    const s = path.steps[this.idx];
    const f = this.flip ? -1 : 1;
    this.sx = x;
    this.sy = y;
    this.t = 0;
    switch (s.type) {
      case MV_VEL:
        this.vx = s.vx * f;
        this.vy = s.vy;
        break;
      case MV_TO:
        this.tx = this.flip ? FIELD_W - s.x : s.x;
        this.ty = s.y;
        break;
      case MV_REL:
        this.tx = x + s.x * f;
        this.ty = y + s.y;
        break;
      case MV_RAND: {
        const a = rng.range(s.x, s.x2);
        this.tx = this.flip ? FIELD_W - a : a;
        this.ty = rng.range(s.y, s.y2);
        break;
      }
      case MV_SINE:
        this.vx = 0;
        this.vy = 0;
        break;
      case MV_ARC:
        this.heading = this.flip ? Math.PI - s.heading : s.heading;
        this.turn = s.turn * f;
        break;
      default:
        this.vx = 0;
        this.vy = 0;
    }
  }

  /** Advance one frame and write the new position into `pos`. */
  step(pos: Positioned, rng: Rng): void {
    const path = this.path;
    if (!path) return;
    if (this.done) {
      if (this.drift) {
        pos.x += this.vx;
        pos.y += this.vy;
      }
      return;
    }

    const s = path.steps[this.idx];
    const f = this.flip ? -1 : 1;
    this.t++;

    switch (s.type) {
      case MV_VEL:
        this.vx += s.ax * f;
        this.vy += s.ay;
        pos.x += this.vx;
        pos.y += this.vy;
        break;
      case MV_TO:
      case MV_REL:
      case MV_RAND: {
        const e = ease(s.ease, Math.min(1, this.t / s.dur));
        const nx = this.sx + (this.tx - this.sx) * e;
        const ny = this.sy + (this.ty - this.sy) * e;
        this.vx = nx - pos.x;
        this.vy = ny - pos.y;
        pos.x = nx;
        pos.y = ny;
        break;
      }
      case MV_SINE: {
        const nx = this.sx + s.x * f * Math.sin(s.turn * this.t);
        const ny = this.sy + s.vy * this.t;
        this.vx = nx - pos.x;
        this.vy = ny - pos.y;
        pos.x = nx;
        pos.y = ny;
        break;
      }
      case MV_ARC:
        this.heading += this.turn;
        this.vx = Math.cos(this.heading) * s.speed;
        this.vy = Math.sin(this.heading) * s.speed;
        pos.x += this.vx;
        pos.y += this.vy;
        break;
      case MV_WAIT:
        this.vx = 0;
        this.vy = 0;
        break;
    }

    if (this.t >= s.dur) {
      this.drift = s.type === MV_VEL || s.type === MV_ARC;
      this.idx++;
      if (this.idx >= path.steps.length) {
        if (path.loop) this.idx = 0;
        else {
          this.done = true;
          if (!this.drift) {
            this.vx = 0;
            this.vy = 0;
          }
          return;
        }
      }
      this.begin(pos.x, pos.y, rng);
    }
  }
}
