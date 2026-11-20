import type { SfxName } from '../data/types';
import { SampleBuilder, toBuffer } from './dsp';

interface SfxDef {
  /** Length in seconds. */
  dur: number;
  /** Playback gain after normalisation. */
  gain: number;
  /** Minimum seconds between two plays (rate limit for rapid-fire sounds). */
  gap: number;
  make: (b: SampleBuilder) => void;
}

const notes = (b: SampleBuilder, freqs: number[], step: number, dur: number, decay: number, amp: number, wave: 'sine' | 'tri' = 'tri'): void => {
  freqs.forEach((f, i) => {
    b.tone({ start: i * step, dur, f0: f, wave, amp, decay });
    b.tone({ start: i * step, dur, f0: f / 2, wave: 'sine', amp: amp * 0.35, decay });
  });
};

const bell = (b: SampleBuilder, f: number, start: number, dur: number, decay: number, amp: number): void => {
  b.tone({ start, dur, f0: f, amp, decay });
  b.tone({ start, dur, f0: f * 2.76, amp: amp * 0.3, decay: decay * 2 });
  b.tone({ start, dur, f0: f * 5.4, amp: amp * 0.12, decay: decay * 3.5 });
};

/** Every sound effect is synthesised here at start-up; there are no audio files. */
const DEFS: Record<SfxName, SfxDef> = {
  'player-shot': {
    dur: 0.06,
    gain: 0.075,
    gap: 0.07,
    make: (b) => b.noise({ dur: 0.05, amp: 0.6, decay: 70, hp: 2500, lp: 9000 }).tone({ dur: 0.05, f0: 1500, f1: 700, wave: 'tri', amp: 0.4, decay: 60 }),
  },
  'shot-small': {
    dur: 0.09,
    gain: 0.08,
    gap: 0.05,
    make: (b) => b.tone({ dur: 0.09, f0: 1300, f1: 650, amp: 0.85, decay: 35 }).tone({ dur: 0.09, f0: 1300, f1: 650, wave: 'square', amp: 0.08, decay: 35 }),
  },
  'shot-mid': {
    dur: 0.14,
    gain: 0.1,
    gap: 0.06,
    make: (b) => b.tone({ dur: 0.14, f0: 820, f1: 330, wave: 'tri', amp: 0.9, decay: 25 }).noise({ dur: 0.1, amp: 0.15, decay: 40, lp: 3000 }),
  },
  'shot-big': {
    dur: 0.32,
    gain: 0.18,
    gap: 0.1,
    make: (b) => b.tone({ dur: 0.32, f0: 300, f1: 90, amp: 1, decay: 9 }).noise({ dur: 0.3, amp: 0.4, attack: 0.02, decay: 10, lp: 1800, hp: 300 }),
  },
  hit: {
    dur: 0.035,
    gain: 0.04,
    gap: 0.05,
    make: (b) => b.noise({ dur: 0.035, amp: 1, decay: 120, hp: 3000 }),
  },
  'hit-boss': {
    dur: 0.05,
    gain: 0.045,
    gap: 0.06,
    make: (b) => b.noise({ dur: 0.05, amp: 1, decay: 90, hp: 1800, lp: 7000 }).tone({ dur: 0.05, f0: 420, f1: 300, amp: 0.5, decay: 80 }),
  },
  'enemy-die': {
    dur: 0.3,
    gain: 0.2,
    gap: 0.03,
    make: (b) => b.noise({ dur: 0.3, amp: 1, decay: 12, lp: 2600, lpEnd: 400 }).tone({ dur: 0.3, f0: 520, f1: 60, amp: 0.8, decay: 14 }),
  },
  'boss-die': {
    dur: 2.0,
    gain: 0.4,
    gap: 0.5,
    make: (b) => {
      b.noise({ dur: 2.0, amp: 1, decay: 2, lp: 5000, lpEnd: 200 });
      b.tone({ dur: 2.0, f0: 110, f1: 28, amp: 1, decay: 2.5 });
      for (let i = 0; i < 9; i++) b.noise({ start: 0.1 + i * 0.13, dur: 0.12, amp: 0.5, decay: 30, lp: 6000, hp: 800 });
    },
  },
  'player-die': {
    dur: 0.8,
    gain: 0.34,
    gap: 0.3,
    make: (b) => {
      b.noise({ dur: 0.25, amp: 0.6, decay: 18, lp: 6000 });
      [1760, 1319, 1047, 784, 659].forEach((f, i) => {
        b.tone({ start: i * 0.07, dur: 0.45, f0: f, amp: 0.5, decay: 8 });
        b.tone({ start: i * 0.07, dur: 0.45, f0: f * 2.01, amp: 0.15, decay: 12 });
      });
    },
  },
  bomb: {
    dur: 1.5,
    gain: 0.32,
    gap: 0.5,
    make: (b) => {
      b.noise({ dur: 1.5, amp: 0.6, attack: 0.3, decay: 1.8, lp: 400, lpEnd: 6000, hp: 200 });
      for (const f of [523.25, 659.25, 783.99, 1046.5]) b.tone({ dur: 1.5, f0: f, amp: 0.25, attack: 0.15, decay: 1.6 });
      b.tone({ dur: 1.5, f0: 80, f1: 160, amp: 0.5, attack: 0.1, decay: 2 });
    },
  },
  graze: {
    dur: 0.04,
    gain: 0.045,
    gap: 0.045,
    make: (b) => b.noise({ dur: 0.04, amp: 1, decay: 110, hp: 5000, lp: 11000 }),
  },
  item: {
    dur: 0.07,
    gain: 0.06,
    gap: 0.04,
    make: (b) => b.tone({ dur: 0.07, f0: 1568, amp: 0.7, decay: 45 }).tone({ start: 0.02, dur: 0.05, f0: 2349, amp: 0.5, decay: 50 }),
  },
  power: {
    dur: 0.35,
    gain: 0.18,
    gap: 0.2,
    make: (b) => b.tone({ dur: 0.1, f0: 880, wave: 'tri', amp: 0.6, decay: 12 }).tone({ start: 0.09, dur: 0.26, f0: 1318.5, wave: 'tri', amp: 0.6, decay: 9 }),
  },
  extend: {
    dur: 0.8,
    gain: 0.28,
    gap: 0.3,
    make: (b) => notes(b, [1046.5, 1318.5, 1568, 2093], 0.08, 0.5, 5, 0.6),
  },
  spell: {
    dur: 1.1,
    gain: 0.3,
    gap: 0.5,
    make: (b) => {
      [-4, -2, 0, 2, 4, 7].forEach((d, i) => b.tone({ dur: 1.1, f0: 880 + d * 1.5 + i * 110, f1: (880 + d * 1.5 + i * 110) * 1.06, amp: 0.22, attack: 0.2, decay: 2.5 }));
      b.tone({ dur: 0.6, f0: 120, f1: 60, amp: 0.8, decay: 5 });
      b.noise({ dur: 1.0, amp: 0.2, attack: 0.3, decay: 3, hp: 4000 });
    },
  },
  capture: {
    dur: 1.1,
    gain: 0.3,
    gap: 0.5,
    make: (b) => [783.99, 1046.5, 1318.5, 1568].forEach((f, i) => bell(b, f, i * 0.09, 0.9, 4, 0.5)),
  },
  tick: {
    dur: 0.07,
    gain: 0.14,
    gap: 0.2,
    make: (b) => b.tone({ dur: 0.07, f0: 1900, f1: 1700, amp: 0.8, decay: 60 }).noise({ dur: 0.02, amp: 0.3, decay: 200, hp: 2000 }),
  },
  'menu-move': {
    dur: 0.06,
    gain: 0.11,
    gap: 0.03,
    make: (b) => b.tone({ dur: 0.06, f0: 988, wave: 'tri', amp: 0.8, decay: 45 }),
  },
  'menu-ok': {
    dur: 0.16,
    gain: 0.14,
    gap: 0.05,
    make: (b) => b.tone({ dur: 0.06, f0: 784, wave: 'tri', amp: 0.8, decay: 25 }).tone({ start: 0.05, dur: 0.11, f0: 1175, wave: 'tri', amp: 0.8, decay: 18 }),
  },
  'menu-cancel': {
    dur: 0.16,
    gain: 0.12,
    gap: 0.05,
    make: (b) => b.tone({ dur: 0.06, f0: 784, wave: 'tri', amp: 0.8, decay: 25 }).tone({ start: 0.05, dur: 0.11, f0: 523, wave: 'tri', amp: 0.8, decay: 18 }),
  },
  pause: {
    dur: 0.4,
    gain: 0.14,
    gap: 0.1,
    make: (b) => [659.25, 830.6, 987.8].forEach((f) => bell(b, f, 0, 0.4, 7, 0.4)),
  },
  'phase-break': {
    dur: 0.9,
    gain: 0.32,
    gap: 0.2,
    make: (b) => b.noise({ dur: 0.9, amp: 1, decay: 5, lp: 7000, lpEnd: 500 }).tone({ dur: 0.9, f0: 190, f1: 40, amp: 0.9, decay: 6 }).tone({ dur: 0.9, f0: 2093, amp: 0.15, decay: 6 }),
  },
  'stage-clear': {
    dur: 1.8,
    gain: 0.3,
    gap: 1,
    make: (b) => {
      const fs = [523.25, 659.25, 783.99, 1046.5];
      fs.forEach((f, i) => {
        const last = i === fs.length - 1;
        b.tone({ start: i * 0.12, dur: last ? 1.4 : 0.14, f0: f, wave: 'tri', amp: 0.55, decay: last ? 2.2 : 12 });
        b.tone({ start: i * 0.12, dur: last ? 1.4 : 0.14, f0: f / 2, amp: 0.25, decay: last ? 2.2 : 12 });
      });
      for (const f of [523.25, 659.25, 783.99]) b.tone({ start: 0.36, dur: 1.4, f0: f, amp: 0.18, attack: 0.05, decay: 2 });
    },
  },
  warning: {
    dur: 1.6,
    gain: 0.32,
    gap: 1,
    make: (b) => {
      for (const [start, f] of [
        [0, 110],
        [0.55, 98],
      ]) {
        b.tone({ start, dur: 1.05, f0: f, amp: 0.8, decay: 2.2 });
        b.tone({ start, dur: 1.05, f0: f * 1.48, amp: 0.4, decay: 3 });
        b.tone({ start, dur: 1.05, f0: f * 2.3, amp: 0.25, decay: 4 });
      }
    },
  },
};

export const SFX_NAMES = Object.keys(DEFS) as SfxName[];

const MAX_VOICES = 28;

/** Synthesised sound effects with per-sound rate limiting and a global voice cap. */
export class SfxBank {
  private ctx: BaseAudioContext | null = null;
  private out: AudioNode | null = null;
  private readonly buffers = new Map<SfxName, AudioBuffer>();
  private readonly last = new Map<SfxName, number>();
  private voices = 0;

  init(ctx: BaseAudioContext, out: AudioNode): void {
    this.ctx = ctx;
    this.out = out;
    for (const name of SFX_NAMES) {
      const def = DEFS[name];
      const b = new SampleBuilder(ctx.sampleRate, def.dur);
      def.make(b);
      this.buffers.set(name, toBuffer(ctx, b.normalize(0.9)));
    }
  }

  gainOf(name: SfxName): number {
    return DEFS[name].gain;
  }

  buffer(name: SfxName): AudioBuffer | undefined {
    return this.buffers.get(name);
  }

  play(name: SfxName, volume = 1): void {
    const ctx = this.ctx;
    const out = this.out;
    const buf = this.buffers.get(name);
    if (!ctx || !out || !buf) return;
    const now = ctx.currentTime;
    const def = DEFS[name];
    const prev = this.last.get(name);
    if (prev !== undefined && now - prev < def.gap) return;
    if (this.voices >= MAX_VOICES) return;
    this.last.set(name, now);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = def.gain * volume;
    src.connect(g).connect(out);
    this.voices++;
    src.onended = () => {
      this.voices--;
      src.disconnect();
      g.disconnect();
    };
    src.start(now);
  }
}
