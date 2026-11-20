const TAU = Math.PI * 2;

export type Wave = 'sine' | 'square' | 'tri' | 'saw';

function wave(kind: Wave, phase: number): number {
  const p = phase - Math.floor(phase);
  switch (kind) {
    case 'sine':
      return Math.sin(p * TAU);
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'tri':
      return 1 - 4 * Math.abs(p - 0.5);
    case 'saw':
      return 2 * p - 1;
  }
}

export interface ToneOpts {
  start?: number;
  dur: number;
  f0: number;
  /** End frequency of an exponential sweep (defaults to f0). */
  f1?: number;
  wave?: Wave;
  amp?: number;
  attack?: number;
  /** Exponential decay rate per second (0 = sustain). */
  decay?: number;
}

export interface NoiseOpts {
  start?: number;
  dur: number;
  amp?: number;
  attack?: number;
  decay?: number;
  /** One-pole low-pass cutoff in Hz, optionally sweeping to lpEnd. */
  lp?: number;
  lpEnd?: number;
  /** One-pole high-pass cutoff in Hz. */
  hp?: number;
}

/**
 * Offline sample builder for sound effects and drums: sums oscillators and filtered noise with
 * simple envelopes into a Float32Array. Deterministic (fixed noise seed).
 */
export class SampleBuilder {
  readonly data: Float32Array;
  private seed = 22222;

  constructor(
    readonly sr: number,
    seconds: number,
  ) {
    this.data = new Float32Array(Math.max(1, Math.ceil(sr * seconds)));
  }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 2147483648 - 1;
  }

  private envAt(t: number, dur: number, attack: number, decay: number): number {
    if (t < 0 || t > dur) return 0;
    const a = attack > 0 ? Math.min(1, t / attack) : 1;
    const d = decay > 0 ? Math.exp(-decay * t) : 1;
    const tail = Math.min(1, (dur - t) / 0.004);
    return a * d * tail;
  }

  tone(o: ToneOpts): this {
    const { sr, data } = this;
    const start = Math.floor((o.start ?? 0) * sr);
    const n = Math.min(data.length - start, Math.floor(o.dur * sr));
    const f1 = o.f1 ?? o.f0;
    const amp = o.amp ?? 1;
    const kind = o.wave ?? 'sine';
    const ratio = f1 / o.f0;
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const u = i / Math.max(1, n);
      const f = o.f0 * Math.pow(ratio, u);
      phase += f / sr;
      data[start + i] += wave(kind, phase) * amp * this.envAt(t, o.dur, o.attack ?? 0.002, o.decay ?? 0);
    }
    return this;
  }

  noise(o: NoiseOpts): this {
    const { sr, data } = this;
    const start = Math.floor((o.start ?? 0) * sr);
    const n = Math.min(data.length - start, Math.floor(o.dur * sr));
    const amp = o.amp ?? 1;
    let lp = 0;
    let hpLow = 0;
    const lp0 = o.lp ?? 20000;
    const lp1 = o.lpEnd ?? lp0;
    const hpA = o.hp ? 1 - Math.exp((-TAU * o.hp) / sr) : 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const u = i / Math.max(1, n);
      const fc = lp0 * Math.pow(lp1 / lp0, u);
      const a = 1 - Math.exp((-TAU * Math.min(fc, sr * 0.45)) / sr);
      const x = this.rand();
      lp += a * (x - lp);
      let y = lp;
      if (hpA > 0) {
        hpLow += hpA * (y - hpLow);
        y -= hpLow;
      }
      data[start + i] += y * amp * this.envAt(t, o.dur, o.attack ?? 0.001, o.decay ?? 0);
    }
    return this;
  }

  /** Scale so the loudest sample has magnitude `peak`. */
  normalize(peak = 0.9): Float32Array {
    let m = 0;
    for (const v of this.data) m = Math.max(m, Math.abs(v));
    if (m > 0) {
      const k = peak / m;
      for (let i = 0; i < this.data.length; i++) this.data[i] *= k;
    }
    return this.data;
  }
}

export function toBuffer(ctx: BaseAudioContext, data: Float32Array): AudioBuffer {
  const buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
  buf.getChannelData(0).set(data);
  return buf;
}

export function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}
