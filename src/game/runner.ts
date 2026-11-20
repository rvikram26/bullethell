import { TAU } from '../core/math';
import type { Rng } from '../core/rng';
import type { SfxName } from '../data/types';
import type { BulletPool } from './bullets';
import { AIM_PLAYER, AIM_RANDOM, type CEmitter, type CPattern } from './compile';

/** What a pattern runner needs from the world to fire bullets. */
export interface FireHost {
  readonly bullets: BulletPool;
  readonly rng: Rng;
  playerX: number;
  playerY: number;
  sfx(name: SfxName): void;
}

interface EmitterState {
  /** Frame (pattern time) of the next volley. */
  next: number;
  fired: number;
  cycleStart: number;
  done: boolean;
}

/**
 * Executes a compiled pattern: a set of emitters that each fire volleys on their own schedule.
 * One runner belongs to one shooter (enemy or boss phase); it holds no references to bullets.
 */
export class PatternRunner {
  /** Frames since the pattern started. */
  t = 0;
  private readonly states: EmitterState[];

  constructor(
    readonly pattern: CPattern,
    private readonly mirror = false,
  ) {
    this.states = pattern.emitters.map((e) => ({ next: e.delay, fired: 0, cycleStart: 0, done: false }));
  }

  get finished(): boolean {
    return this.states.every((s) => s.done);
  }

  /** Advance one frame, firing any volleys that are due from the shooter at (ox, oy). */
  update(host: FireHost, ox: number, oy: number): void {
    const t = this.t;
    const ems = this.pattern.emitters;
    for (let k = 0; k < ems.length; k++) {
      const e = ems[k];
      const s = this.states[k];
      if (s.done) continue;

      if (e.cycle > 0 && t - s.cycleStart >= e.cycle) {
        s.cycleStart += e.cycle;
        s.fired = 0;
        s.next = s.cycleStart + e.delay;
      }

      let guard = 8; // an emitter faster than one volley per frame still fires a bounded number
      while (t >= s.next && guard-- > 0) {
        if (e.volleys > 0 && s.fired >= e.volleys) break;
        this.fire(e, s, host, ox, oy);
        s.fired++;
        s.next += e.interval;
        if (e.volleys > 0 && s.fired >= e.volleys && e.cycle <= 0) {
          s.done = true;
          break;
        }
      }
    }
    this.t++;
  }

  private fire(e: CEmitter, s: EmitterState, host: FireHost, ox: number, oy: number): void {
    const rng = host.rng;
    const mir = this.mirror;
    const sgn = mir ? -1 : 1;

    let x: number;
    let y: number;
    if (e.field) {
      x = e.x;
      y = e.y;
    } else {
      x = ox + e.x * sgn;
      y = oy + e.y;
      if (e.orbitR > 0) {
        const a = e.orbitPhase * sgn + e.orbitW * sgn * this.t;
        x += Math.cos(a) * e.orbitR;
        y += Math.sin(a) * e.orbitR;
      }
    }
    if (e.xRand > 0) x += rng.spread(e.xRand);
    if (e.yRand > 0) y += rng.spread(e.yRand);

    let base: number;
    if (e.aim === AIM_PLAYER) base = Math.atan2(host.playerY - y, host.playerX - x) + e.angle * sgn;
    else if (e.aim === AIM_RANDOM) base = rng.range(0, TAU) + e.angle;
    else base = mir ? Math.PI - e.angle : e.angle;

    base += e.angleStep * sgn * s.fired;
    if (e.swayAmp !== 0) base += Math.sin(this.t * e.swayW) * e.swayAmp * sgn;
    if (e.angleRand > 0) base += rng.spread(e.angleRand);

    const n = e.count;
    const armStep = TAU / e.arms;
    const speed0 = e.bullet.speed + e.speedStep * s.fired;
    const pool = host.bullets;
    const fanStep = n > 1 ? e.spread / (n - 1) : 0;

    for (let arm = 0; arm < e.arms; arm++) {
      const armBase = base + arm * armStep;
      for (let k = 0; k < n; k++) {
        let a = e.ring ? armBase + (k * TAU) / n : armBase + (k - (n - 1) / 2) * fanStep;
        if (e.bulletRand > 0) a += rng.spread(e.bulletRand);
        for (let l = 0; l < e.layers; l++) {
          let sp = speed0 + l * e.layerSpeed;
          if (e.speedRand > 0) sp += rng.spread(e.speedRand);
          if (sp < 0.05) sp = 0.05;
          pool.spawn(x, y, a, sp, e.bullet, mir);
        }
      }
    }
    if (e.sfx) host.sfx(e.sfx);
  }
}
