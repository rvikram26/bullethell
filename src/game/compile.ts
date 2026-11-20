import { FPS } from '../core/constants';
import { DEG } from '../core/math';
import { BULLET_KINDS } from '../data/bulletKinds';
import type { DifficultyDef } from '../data/difficulty';
import {
  type BulletDef,
  type BulletEvent,
  COLOR_NAMES,
  type Ease,
  type EmitterDef,
  type MoveStep,
  type PathDef,
  type PatternDef,
  type SfxName,
  SPRITE_KINDS,
  type Tier,
} from '../data/types';

/**
 * Data definitions are authored in friendly units (seconds, px/s, degrees). Before the simulation
 * uses them they are "compiled" for a given difficulty into frames, px/frame and radians, with the
 * difficulty's density / speed / interval multipliers applied. Values given as a per-difficulty
 * tuple are used verbatim and are exempt from the global multipliers.
 */

export const EV_SPEED = 0;
export const EV_TURN = 1;
export const EV_CURVE = 2;
export const EV_SPLIT = 3;
export const EV_MORPH = 4;

export const BASE_HEADING = 0;
export const BASE_AIM = 1;
export const BASE_ABS = 2;

/** A flat event record (one shape for every kind keeps the hot loop monomorphic). */
export interface CEvent {
  at: number;
  kind: number;
  value: number;
  accel: number;
  hasAccel: boolean;
  min: number;
  max: number;
  hasMin: boolean;
  hasMax: boolean;
  to: number;
  hasTo: boolean;
  by: number;
  aim: boolean;
  jitter: number;
  count: number;
  spread: number;
  base: number;
  offset: number;
  keep: boolean;
  keepSpeed: boolean;
  bullet: CBullet | null;
}

export interface CBullet {
  /** Index into the sprite atlas: kind * COLOR_COUNT + color. */
  atlas: number;
  kind: number;
  color: number;
  radius: number;
  size: number;
  rotation: number;
  speed: number;
  accel: number;
  minSpeed: number;
  maxSpeed: number;
  curve: number;
  life: number;
  bounce: number;
  events: CEvent[];
}

export const AIM_FIXED = 0;
export const AIM_PLAYER = 1;
export const AIM_RANDOM = 2;

export interface CEmitter {
  delay: number;
  interval: number;
  volleys: number;
  cycle: number;
  field: boolean;
  x: number;
  y: number;
  xRand: number;
  yRand: number;
  orbitR: number;
  orbitW: number;
  orbitPhase: number;
  aim: number;
  angle: number;
  angleStep: number;
  angleRand: number;
  bulletRand: number;
  swayAmp: number;
  swayW: number;
  count: number;
  spread: number;
  ring: boolean;
  arms: number;
  layers: number;
  layerSpeed: number;
  speedRand: number;
  speedStep: number;
  bullet: CBullet;
  sfx: SfxName | null;
}

export interface CPattern {
  emitters: CEmitter[];
}

export const MV_VEL = 0;
export const MV_TO = 1;
export const MV_REL = 2;
export const MV_RAND = 3;
export const MV_ARC = 4;
export const MV_WAIT = 5;
export const MV_SINE = 6;

export interface CMoveStep {
  type: number;
  dur: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  x: number;
  y: number;
  x2: number;
  y2: number;
  ease: Ease;
  speed: number;
  heading: number;
  turn: number;
}

export interface CPath {
  steps: CMoveStep[];
  loop: boolean;
}

export const COLOR_COUNT = COLOR_NAMES.length;

function isTier<T>(v: Tier<T>): v is readonly [T, T, T, T] {
  return Array.isArray(v);
}

function frames(seconds: number): number {
  return Math.max(0, Math.round(seconds * FPS));
}

/** Round a scaled count while keeping its parity (so aimed fans keep or lack a centre bullet). */
export function scaleCount(count: number, density: number, keepParity: boolean): number {
  if (count <= 1) return count;
  const n = count * density;
  if (!keepParity) return Math.max(1, Math.round(n));
  const par = count % 2; // 1 for odd counts, 0 for even
  const scaled = 2 * Math.round((n - par) / 2) + par;
  return Math.max(par === 1 ? 1 : 2, scaled);
}

export class Compiler {
  private readonly bullets = new Map<BulletDef, CBullet>();

  constructor(
    readonly diff: DifficultyDef,
    readonly diffIdx: number,
  ) {}

  private speedPx(v: Tier<number>): number {
    return isTier(v) ? v[this.diffIdx] / FPS : (v * this.diff.speed) / FPS;
  }

  private scaledPx(v: number): number {
    return (v * this.diff.speed) / FPS;
  }

  bullet(def: BulletDef): CBullet {
    const cached = this.bullets.get(def);
    if (cached) return cached;

    const kind = SPRITE_KINDS.indexOf(def.sprite);
    const color = COLOR_NAMES.indexOf(def.color);
    if (kind < 0) throw new Error(`Unknown bullet sprite "${def.sprite}"`);
    if (color < 0) throw new Error(`Unknown bullet color "${def.color}"`);
    const info = BULLET_KINDS[def.sprite];
    const scale = def.scale ?? 1;

    const out: CBullet = {
      atlas: kind * COLOR_COUNT + color,
      kind,
      color,
      radius: info.radius * scale,
      size: info.size * scale,
      rotation: info.rotation,
      speed: this.speedPx(def.speed),
      accel: def.accel === undefined ? 0 : (def.accel * this.diff.speed) / (FPS * FPS),
      minSpeed: def.minSpeed === undefined ? 0 : this.scaledPx(def.minSpeed),
      maxSpeed: def.maxSpeed === undefined ? Infinity : this.scaledPx(def.maxSpeed),
      curve: ((def.curve ?? 0) * DEG) / FPS,
      life: frames(def.life ?? 0),
      bounce: def.bounce ?? 0,
      events: [],
    };
    this.bullets.set(def, out); // register before events so self-referential data cannot recurse forever
    out.events = (def.events ?? [])
      .map((e) => this.event(e))
      .sort((a, b) => a.at - b.at);
    return out;
  }

  private event(e: BulletEvent): CEvent {
    const out: CEvent = {
      at: frames(e.at),
      kind: 0,
      value: 0,
      accel: 0,
      hasAccel: false,
      min: 0,
      max: 0,
      hasMin: false,
      hasMax: false,
      to: 0,
      hasTo: false,
      by: 0,
      aim: false,
      jitter: 0,
      count: 1,
      spread: 0,
      base: BASE_HEADING,
      offset: 0,
      keep: false,
      keepSpeed: false,
      bullet: null,
    };
    switch (e.do) {
      case 'speed':
        out.kind = EV_SPEED;
        out.value = this.scaledPx(e.value);
        if (e.accel !== undefined) {
          out.hasAccel = true;
          out.accel = (e.accel * this.diff.speed) / (FPS * FPS);
        }
        if (e.min !== undefined) {
          out.hasMin = true;
          out.min = this.scaledPx(e.min);
        }
        if (e.max !== undefined) {
          out.hasMax = true;
          out.max = this.scaledPx(e.max);
        }
        break;
      case 'turn':
        out.kind = EV_TURN;
        if (e.to !== undefined) {
          out.hasTo = true;
          out.to = e.to * DEG;
        }
        out.by = (e.by ?? 0) * DEG;
        out.aim = e.aim === true;
        out.jitter = (e.jitter ?? 0) * DEG;
        break;
      case 'curve':
        out.kind = EV_CURVE;
        out.value = (e.value * DEG) / FPS;
        break;
      case 'split': {
        out.kind = EV_SPLIT;
        const spreadDeg = e.spread ?? 360;
        out.spread = spreadDeg * DEG;
        out.count = isTier(e.count) ? e.count[this.diffIdx] : scaleCount(e.count, this.diff.density, spreadDeg < 360);
        out.base = e.base === 'aim' ? BASE_AIM : e.base === 'abs' ? BASE_ABS : BASE_HEADING;
        out.offset = (e.offset ?? 0) * DEG;
        out.keep = e.keep === true;
        out.bullet = this.bullet(e.bullet);
        break;
      }
      case 'morph':
        out.kind = EV_MORPH;
        out.keepSpeed = e.keepSpeed === true;
        out.bullet = this.bullet(e.bullet);
        break;
    }
    return out;
  }

  private arms(v: Tier<number>): number {
    return Math.max(1, isTier(v) ? v[this.diffIdx] : Math.round(v * this.diff.arms));
  }

  emitter(def: EmitterDef): CEmitter {
    const d = this.diffIdx;
    const spreadDeg = def.spread ?? 360;
    const ring = spreadDeg >= 360;
    const interval = isTier(def.interval) ? def.interval[d] * FPS : def.interval * FPS * this.diff.interval;
    let volleys = 0;
    if (def.volleys !== undefined) {
      volleys = isTier(def.volleys) ? def.volleys[d] : Math.max(1, Math.round(def.volleys / this.diff.interval));
    }
    const count = isTier(def.count) ? def.count[d] : scaleCount(def.count, this.diff.density, !ring);
    return {
      delay: def.delay === undefined ? 0 : def.delay * FPS,
      interval: Math.max(0.25, interval),
      volleys,
      cycle: (def.cycle ?? 0) * FPS,
      field: def.origin === 'field',
      x: def.x ?? 0,
      y: def.y ?? 0,
      xRand: def.xRand ?? 0,
      yRand: def.yRand ?? 0,
      orbitR: def.orbit?.radius ?? 0,
      orbitW: ((def.orbit?.speed ?? 0) * DEG) / FPS,
      orbitPhase: (def.orbit?.phase ?? 0) * DEG,
      aim: def.aim === 'player' ? AIM_PLAYER : def.aim === 'random' ? AIM_RANDOM : AIM_FIXED,
      angle: (def.angle ?? 0) * DEG,
      angleStep: (def.angleStep ?? 0) * DEG,
      angleRand: (def.angleRand ?? 0) * DEG,
      bulletRand: (def.bulletRand ?? 0) * DEG,
      swayAmp: (def.sway?.amp ?? 0) * DEG,
      swayW: def.sway ? (Math.PI * 2) / (def.sway.period * FPS) : 0,
      count: Math.max(1, count),
      spread: spreadDeg * DEG,
      ring,
      arms: this.arms(def.arms ?? 1),
      layers: Math.max(1, def.layers ?? 1),
      layerSpeed: this.scaledPx(def.layerSpeed ?? 0),
      speedRand: this.scaledPx(def.speedRand ?? 0),
      speedStep: this.scaledPx(def.speedStep ?? 0),
      bullet: this.bullet(def.bullet),
      sfx: def.sfx ?? null,
    };
  }

  pattern(def: PatternDef): CPattern {
    return { emitters: def.emitters.map((e) => this.emitter(e)) };
  }

  path(def: PathDef): CPath {
    return { steps: def.steps.map((s) => this.moveStep(s)), loop: def.loop === true };
  }

  private moveStep(s: MoveStep): CMoveStep {
    const out: CMoveStep = {
      type: MV_WAIT,
      dur: Math.max(1, frames(s.dur)),
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      x: 0,
      y: 0,
      x2: 0,
      y2: 0,
      ease: 'linear',
      speed: 0,
      heading: 0,
      turn: 0,
    };
    switch (s.type) {
      case 'vel':
        out.type = MV_VEL;
        out.vx = s.vx / FPS;
        out.vy = s.vy / FPS;
        out.ax = (s.ax ?? 0) / (FPS * FPS);
        out.ay = (s.ay ?? 0) / (FPS * FPS);
        break;
      case 'to':
        out.type = MV_TO;
        out.x = s.x;
        out.y = s.y;
        out.ease = s.ease ?? 'inout';
        break;
      case 'rel':
        out.type = MV_REL;
        out.x = s.x;
        out.y = s.y;
        out.ease = s.ease ?? 'inout';
        break;
      case 'rand':
        out.type = MV_RAND;
        out.x = s.x[0];
        out.x2 = s.x[1];
        out.y = s.y[0];
        out.y2 = s.y[1];
        out.ease = s.ease ?? 'inout';
        break;
      case 'sine':
        out.type = MV_SINE;
        out.vy = s.vy / FPS;
        out.x = s.amp;
        out.turn = (Math.PI * 2) / (s.period * FPS);
        break;
      case 'arc':
        out.type = MV_ARC;
        out.speed = s.speed / FPS;
        out.heading = s.heading * DEG;
        out.turn = (s.turn * DEG) / FPS;
        break;
      case 'wait':
        out.type = MV_WAIT;
        break;
    }
    return out;
  }
}

/** Compiles named patterns/paths lazily and caches the result for one difficulty. */
export class PatternBank {
  readonly compiler: Compiler;
  private readonly patterns = new Map<string, CPattern>();
  private readonly paths = new Map<string, CPath>();

  constructor(
    private readonly patternDefs: Record<string, PatternDef>,
    private readonly pathDefs: Record<string, PathDef>,
    diff: DifficultyDef,
    diffIdx: number,
  ) {
    this.compiler = new Compiler(diff, diffIdx);
  }

  pattern(id: string): CPattern {
    let p = this.patterns.get(id);
    if (!p) {
      const def = this.patternDefs[id];
      if (!def) throw new Error(`Unknown pattern "${id}"`);
      p = this.compiler.pattern(def);
      this.patterns.set(id, p);
    }
    return p;
  }

  path(id: string): CPath {
    let p = this.paths.get(id);
    if (!p) {
      const def = this.pathDefs[id];
      if (!def) throw new Error(`Unknown path "${id}"`);
      p = this.compiler.path(def);
      this.paths.set(id, p);
    }
    return p;
  }

  inlinePath(def: PathDef): CPath {
    return this.compiler.path(def);
  }
}
