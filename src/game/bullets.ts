import { FIELD_H, FIELD_W, MAX_BULLETS } from '../core/constants';
import { TAU } from '../core/math';
import type { Rng } from '../core/rng';
import {
  BASE_ABS,
  BASE_AIM,
  type CBullet,
  type CEvent,
  EV_CURVE,
  EV_MORPH,
  EV_SPEED,
  EV_SPLIT,
  EV_TURN,
} from './compile';

export const F_GRAZED = 1;
export const F_MIRROR = 2;

const CULL_MARGIN = 28;
/** Larger than the biggest scaled bullet radius; lets the player test skip far bullets cheaply. */
const MAX_BULLET_RADIUS = 40;

export type ClearCallback = (x: number, y: number, color: number) => void;

/**
 * Pooled enemy bullets stored as a structure of typed arrays. The active bullets always occupy
 * indices [0, count) in spawn order (compaction is stable), so draw order stays consistent and no
 * allocation happens while the game runs.
 */
export class BulletPool {
  readonly cap: number;
  count = 0;
  /** Bullets that could not be spawned because the pool was full. */
  overflow = 0;
  /** Number of fresh grazes found by the last `testPlayer` call. */
  grazed = 0;

  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly ang: Float32Array;
  readonly spd: Float32Array;
  readonly acc: Float32Array;
  readonly crv: Float32Array;
  readonly minS: Float32Array;
  readonly maxS: Float32Array;
  readonly rad: Float32Array;
  readonly age: Int32Array;
  readonly evi: Uint8Array;
  readonly flags: Uint8Array;
  readonly bnc: Uint8Array;
  readonly spec: (CBullet | null)[];

  constructor(
    private readonly rng: Rng,
    cap = MAX_BULLETS,
  ) {
    this.cap = cap;
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.ang = new Float32Array(cap);
    this.spd = new Float32Array(cap);
    this.acc = new Float32Array(cap);
    this.crv = new Float32Array(cap);
    this.minS = new Float32Array(cap);
    this.maxS = new Float32Array(cap);
    this.rad = new Float32Array(cap);
    this.age = new Int32Array(cap);
    this.evi = new Uint8Array(cap);
    this.flags = new Uint8Array(cap);
    this.bnc = new Uint8Array(cap);
    this.spec = new Array<CBullet | null>(cap).fill(null);
  }

  /** Create a bullet. `speed` is in px/frame, `angle` in radians. Returns false when the pool is full. */
  spawn(x: number, y: number, angle: number, speed: number, spec: CBullet, mirror = false): boolean {
    const i = this.count;
    if (i >= this.cap) {
      this.overflow++;
      return false;
    }
    this.count = i + 1;
    this.x[i] = x;
    this.y[i] = y;
    this.ang[i] = angle;
    this.spd[i] = speed;
    this.vx[i] = Math.cos(angle) * speed;
    this.vy[i] = Math.sin(angle) * speed;
    this.acc[i] = spec.accel;
    this.crv[i] = mirror ? -spec.curve : spec.curve;
    this.minS[i] = spec.minSpeed;
    this.maxS[i] = spec.maxSpeed;
    this.rad[i] = spec.radius;
    this.age[i] = 0;
    this.evi[i] = 0;
    this.flags[i] = mirror ? F_MIRROR : 0;
    this.bnc[i] = spec.bounce;
    this.spec[i] = spec;
    return true;
  }

  private refreshVelocity(i: number): void {
    const a = this.ang[i];
    const s = this.spd[i];
    this.vx[i] = Math.cos(a) * s;
    this.vy[i] = Math.sin(a) * s;
  }

  private applyEvent(i: number, ev: CEvent, px: number, py: number): boolean {
    const mirror = (this.flags[i] & F_MIRROR) !== 0;
    switch (ev.kind) {
      case EV_SPEED: {
        this.spd[i] = ev.value;
        if (ev.hasAccel) this.acc[i] = ev.accel;
        if (ev.hasMin) this.minS[i] = ev.min;
        if (ev.hasMax) this.maxS[i] = ev.max;
        this.refreshVelocity(i);
        return true;
      }
      case EV_TURN: {
        const by = mirror ? -ev.by : ev.by;
        let a: number;
        if (ev.aim) a = Math.atan2(py - this.y[i], px - this.x[i]) + by;
        else if (ev.hasTo) a = (mirror ? Math.PI - ev.to : ev.to) + by;
        else a = this.ang[i] + by;
        if (ev.jitter > 0) a += this.rng.spread(ev.jitter);
        this.ang[i] = a;
        this.refreshVelocity(i);
        return true;
      }
      case EV_CURVE: {
        this.crv[i] = mirror ? -ev.value : ev.value;
        return true;
      }
      case EV_SPLIT: {
        const child = ev.bullet as CBullet;
        const x = this.x[i];
        const y = this.y[i];
        let base: number;
        if (ev.base === BASE_AIM) base = Math.atan2(py - y, px - x) + (mirror ? -ev.offset : ev.offset);
        else if (ev.base === BASE_ABS) base = mirror ? Math.PI - ev.offset : ev.offset;
        else base = this.ang[i] + ev.offset;
        const n = ev.count;
        const ring = ev.spread >= TAU - 1e-6;
        for (let k = 0; k < n; k++) {
          const a = ring ? base + (k * TAU) / n : base + (n > 1 ? (k - (n - 1) / 2) * (ev.spread / (n - 1)) : 0);
          this.spawn(x, y, a, child.speed, child, mirror);
        }
        return ev.keep;
      }
      case EV_MORPH: {
        const nb = ev.bullet as CBullet;
        this.spec[i] = nb;
        this.age[i] = 0;
        this.evi[i] = 0;
        this.acc[i] = nb.accel;
        this.crv[i] = mirror ? -nb.curve : nb.curve;
        this.minS[i] = nb.minSpeed;
        this.maxS[i] = nb.maxSpeed;
        this.rad[i] = nb.radius;
        if (nb.bounce > 0) this.bnc[i] = nb.bounce;
        if (!ev.keepSpeed) this.spd[i] = nb.speed;
        this.refreshVelocity(i);
        return true;
      }
    }
    return true;
  }

  /** Copy bullet `from` over slot `to` (used by stable compaction). */
  private move(from: number, to: number): void {
    this.x[to] = this.x[from];
    this.y[to] = this.y[from];
    this.vx[to] = this.vx[from];
    this.vy[to] = this.vy[from];
    this.ang[to] = this.ang[from];
    this.spd[to] = this.spd[from];
    this.acc[to] = this.acc[from];
    this.crv[to] = this.crv[from];
    this.minS[to] = this.minS[from];
    this.maxS[to] = this.maxS[from];
    this.rad[to] = this.rad[from];
    this.age[to] = this.age[from];
    this.evi[to] = this.evi[from];
    this.flags[to] = this.flags[from];
    this.bnc[to] = this.bnc[from];
    this.spec[to] = this.spec[from];
  }

  /** Advance every bullet one frame: events, motion, wall bounces, lifetime and culling. */
  update(px: number, py: number): void {
    const n = this.count;
    const x = this.x;
    const y = this.y;
    const vx = this.vx;
    const vy = this.vy;
    let w = 0;

    for (let i = 0; i < n; i++) {
      let sp = this.spec[i] as CBullet;
      const age = ++this.age[i];
      let alive = true;

      const evs = sp.events;
      if (evs.length !== 0) {
        let k = this.evi[i];
        while (k < evs.length && evs[k].at <= age) {
          const ev = evs[k++];
          this.evi[i] = k;
          alive = this.applyEvent(i, ev, px, py);
          if (!alive) break;
          if (ev.kind === EV_MORPH) {
            sp = this.spec[i] as CBullet;
            break; // the new spec's events are evaluated from the next frame on
          }
        }
      }

      if (alive) {
        const a = this.acc[i];
        const c = this.crv[i];
        if (a !== 0 || c !== 0) {
          let s = this.spd[i] + a;
          const lo = this.minS[i];
          const hi = this.maxS[i];
          if (s < lo) s = lo;
          else if (s > hi) s = hi;
          const ang = this.ang[i] + c;
          this.spd[i] = s;
          this.ang[i] = ang;
          vx[i] = Math.cos(ang) * s;
          vy[i] = Math.sin(ang) * s;
        }
        let nx = x[i] + vx[i];
        let ny = y[i] + vy[i];

        if (this.bnc[i] > 0) {
          if ((nx < 0 && vx[i] < 0) || (nx > FIELD_W && vx[i] > 0)) {
            this.ang[i] = Math.PI - this.ang[i];
            this.bnc[i]--;
            this.refreshVelocity(i);
            nx = nx < 0 ? 0 : FIELD_W;
          } else if (ny < 0 && vy[i] < 0) {
            this.ang[i] = -this.ang[i];
            this.bnc[i]--;
            this.refreshVelocity(i);
            ny = 0;
          }
        }
        x[i] = nx;
        y[i] = ny;

        if (nx < -CULL_MARGIN || nx > FIELD_W + CULL_MARGIN || ny < -CULL_MARGIN || ny > FIELD_H + CULL_MARGIN) alive = false;
        else if (sp.life > 0 && age >= sp.life) alive = false;
      }

      if (alive) {
        if (w !== i) this.move(i, w);
        w++;
      }
    }

    // Bullets spawned during this pass (splits) sit after index n; slide them down behind the survivors.
    const added = this.count - n;
    if (added > 0 && w !== n) {
      for (let k = 0; k < added; k++) this.move(n + k, w + k);
    }
    this.count = w + added;
  }

  /** Check all bullets against the player's hitbox. Returns the index of a bullet that hit, or -1. */
  testPlayer(px: number, py: number, hitR: number, grazeR: number): number {
    this.grazed = 0;
    const lim = grazeR + MAX_BULLET_RADIUS;
    const x = this.x;
    const y = this.y;
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - px;
      if (dx > lim || dx < -lim) continue;
      const dy = y[i] - py;
      if (dy > lim || dy < -lim) continue;
      const d2 = dx * dx + dy * dy;
      const r = this.rad[i];
      const hr = r + hitR;
      if (d2 <= hr * hr) return i;
      if ((this.flags[i] & F_GRAZED) === 0) {
        const gr = r + grazeR;
        if (d2 <= gr * gr) {
          this.flags[i] |= F_GRAZED;
          this.grazed++;
        }
      }
    }
    return -1;
  }

  /** Remove every bullet. Returns how many were removed. */
  clearAll(onClear?: ClearCallback): number {
    const n = this.count;
    if (onClear) for (let i = 0; i < n; i++) onClear(this.x[i], this.y[i], (this.spec[i] as CBullet).color);
    this.count = 0;
    return n;
  }

  /** Remove bullets whose centre is inside the circle. Returns how many were removed. */
  clearRadius(cx: number, cy: number, r: number, onClear?: ClearCallback): number {
    const r2 = r * r;
    const n = this.count;
    let w = 0;
    let removed = 0;
    for (let i = 0; i < n; i++) {
      const dx = this.x[i] - cx;
      const dy = this.y[i] - cy;
      if (dx * dx + dy * dy <= r2) {
        removed++;
        if (onClear) onClear(this.x[i], this.y[i], (this.spec[i] as CBullet).color);
        continue;
      }
      if (w !== i) this.move(i, w);
      w++;
    }
    this.count = w;
    return removed;
  }
}
