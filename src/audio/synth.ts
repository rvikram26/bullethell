import { midiToHz, SampleBuilder, toBuffer } from './dsp';

export type InstId = 'square' | 'pulse' | 'tri' | 'lead' | 'bell' | 'pluck' | 'pad' | 'organ' | 'bass' | 'sawbass';
export type DrumKind = 'k' | 's' | 'h' | 'o' | 'c';
export const DRUM_KINDS: readonly DrumKind[] = ['k', 's', 'h', 'o', 'c'];

/** Attack, decay-to-sustain, release envelope on a gain parameter. */
function adsr(g: AudioParam, t: number, peak: number, a: number, d: number, s: number, hold: number, r: number): number {
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, t + a);
  g.setTargetAtTime(peak * s, t + a, Math.max(0.001, d / 3));
  const end = t + Math.max(hold, a + 0.005);
  g.setTargetAtTime(0, end, Math.max(0.001, r / 3));
  return end + r * 1.5 + 0.02;
}

/**
 * Real-time instruments built from oscillators, filters and gain envelopes, plus sampled drums
 * synthesised once at start-up. Works with both live and offline audio contexts.
 */
export class Synth {
  private readonly pulseWave: PeriodicWave;
  private readonly organWave: PeriodicWave;
  private readonly drums = new Map<DrumKind, AudioBuffer>();
  /** Highest safe filter cutoff for this context's sample rate. */
  private readonly nyquist: number;

  constructor(private readonly ctx: BaseAudioContext) {
    this.nyquist = Math.min(16000, ctx.sampleRate * 0.45);
    const n = 32;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    const duty = 0.25;
    for (let k = 1; k < n; k++) {
      re[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
      im[k] = (2 * Math.pow(Math.sin(Math.PI * k * duty), 2)) / (Math.PI * k);
    }
    this.pulseWave = ctx.createPeriodicWave(re, im);

    const ore = new Float32Array(9);
    const oim = new Float32Array(9);
    oim[1] = 1;
    oim[2] = 0.55;
    oim[3] = 0.35;
    oim[4] = 0.22;
    oim[6] = 0.14;
    oim[8] = 0.08;
    this.organWave = ctx.createPeriodicWave(ore, oim);

    const sr = ctx.sampleRate;
    const kick = new SampleBuilder(sr, 0.35);
    kick.tone({ dur: 0.35, f0: 150, f1: 42, amp: 1, decay: 9 }).noise({ dur: 0.012, amp: 0.4, decay: 300, lp: 4000 });
    const snare = new SampleBuilder(sr, 0.25);
    snare.noise({ dur: 0.25, amp: 0.9, decay: 16, lp: 7000, hp: 900 }).tone({ dur: 0.1, f0: 200, f1: 160, amp: 0.6, decay: 28 });
    const hat = new SampleBuilder(sr, 0.06);
    hat.noise({ dur: 0.06, amp: 1, decay: 70, hp: 7000 });
    const open = new SampleBuilder(sr, 0.3);
    open.noise({ dur: 0.3, amp: 1, decay: 12, hp: 6500 });
    const crash = new SampleBuilder(sr, 1.4);
    crash.noise({ dur: 1.4, amp: 1, decay: 2.6, hp: 4200, lp: 14000 });
    this.drums.set('k', toBuffer(ctx, kick.normalize(0.95)));
    this.drums.set('s', toBuffer(ctx, snare.normalize(0.8)));
    this.drums.set('h', toBuffer(ctx, hat.normalize(0.45)));
    this.drums.set('o', toBuffer(ctx, open.normalize(0.4)));
    this.drums.set('c', toBuffer(ctx, crash.normalize(0.45)));
  }

  drum(out: AudioNode, kind: DrumKind, t: number, vel: number): void {
    const buf = this.drums.get(kind);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vel;
    src.connect(g).connect(out);
    src.start(t);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
    };
  }

  private osc(type: OscillatorType | 'pulse' | 'organ', f: number): OscillatorNode {
    const o = this.ctx.createOscillator();
    if (type === 'pulse') o.setPeriodicWave(this.pulseWave);
    else if (type === 'organ') o.setPeriodicWave(this.organWave);
    else o.type = type;
    o.frequency.value = f;
    return o;
  }

  /** Play one note. `dur` is the held length in seconds; the release tail is added on top. */
  note(out: AudioNode, inst: InstId, midi: number, t: number, dur: number, vel: number): void {
    const ctx = this.ctx;
    const f = midiToHz(midi);
    const g = ctx.createGain();
    g.connect(out);
    const nodes: AudioNode[] = [g];
    const oscs: OscillatorNode[] = [];
    let stopAt = t + dur + 0.3;

    const filter = (cut: number, q = 0.7): BiquadFilterNode => {
      const bq = ctx.createBiquadFilter();
      bq.type = 'lowpass';
      bq.frequency.value = Math.min(this.nyquist, cut);
      bq.Q.value = q;
      bq.connect(g);
      nodes.push(bq);
      return bq;
    };

    switch (inst) {
      case 'square':
      case 'pulse': {
        const o = this.osc(inst === 'pulse' ? 'pulse' : 'square', f);
        o.connect(filter(f * 6));
        oscs.push(o);
        stopAt = adsr(g.gain, t, vel, 0.005, 0.12, 0.55, dur, 0.07);
        break;
      }
      case 'tri': {
        const o = this.osc('triangle', f);
        o.connect(g);
        oscs.push(o);
        stopAt = adsr(g.gain, t, vel, 0.005, 0.1, 0.8, dur, 0.08);
        break;
      }
      case 'lead': {
        const bq = filter(f * 8, 1.2);
        bq.frequency.setValueAtTime(Math.min(this.nyquist, f * 9), t);
        bq.frequency.setTargetAtTime(Math.min(this.nyquist, f * 3.5), t, 0.12);
        const a = this.osc('sawtooth', f);
        const b = this.osc('square', f * 1.004);
        const mix = ctx.createGain();
        mix.gain.value = 0.5;
        a.connect(mix);
        b.connect(mix);
        mix.connect(bq);
        nodes.push(mix);
        // delayed vibrato
        const lfo = this.osc('sine', 5.6);
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(0, t);
        depth.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.35, dur));
        lfo.connect(depth);
        depth.connect(a.frequency);
        depth.connect(b.frequency);
        nodes.push(depth);
        oscs.push(a, b, lfo);
        stopAt = adsr(g.gain, t, vel, 0.008, 0.15, 0.7, dur, 0.09);
        break;
      }
      case 'bell': {
        const car = this.osc('sine', f);
        const mod = this.osc('sine', f * 3.5);
        const idx = ctx.createGain();
        idx.gain.setValueAtTime(f * 2.2, t);
        idx.gain.setTargetAtTime(f * 0.25, t, 0.15);
        mod.connect(idx);
        idx.connect(car.frequency);
        car.connect(g);
        nodes.push(idx);
        oscs.push(car, mod);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vel, t + 0.003);
        g.gain.setTargetAtTime(vel * 0.25, t + 0.003, 0.25);
        g.gain.setTargetAtTime(0, t + Math.max(dur, 0.05), 0.12);
        stopAt = t + Math.max(dur, 0.05) + 0.6;
        break;
      }
      case 'pluck': {
        const bq = filter(f * 10, 2);
        bq.frequency.setValueAtTime(Math.min(this.nyquist, f * 10), t);
        bq.frequency.setTargetAtTime(Math.min(this.nyquist, f * 1.6), t, 0.06);
        const o = this.osc('sawtooth', f);
        o.connect(bq);
        oscs.push(o);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vel, t + 0.003);
        g.gain.setTargetAtTime(0, t + 0.003, 0.12);
        stopAt = t + 0.6;
        break;
      }
      case 'pad': {
        const bq = filter(1500, 0.5);
        for (const d of [0.996, 1.004]) {
          const o = this.osc('sawtooth', f * d);
          o.connect(bq);
          oscs.push(o);
        }
        stopAt = adsr(g.gain, t, vel, 0.28, 0.4, 0.85, dur, 0.5);
        break;
      }
      case 'organ': {
        const o = this.osc('organ', f);
        o.connect(filter(4000, 0.5));
        oscs.push(o);
        stopAt = adsr(g.gain, t, vel, 0.02, 0.2, 0.9, dur, 0.15);
        break;
      }
      case 'bass': {
        const bq = filter(f * 5, 0.8);
        const a = this.osc('triangle', f);
        const b = this.osc('square', f);
        const mix = ctx.createGain();
        mix.gain.value = 0.25;
        b.connect(mix);
        mix.connect(bq);
        a.connect(bq);
        nodes.push(mix);
        oscs.push(a, b);
        stopAt = adsr(g.gain, t, vel, 0.004, 0.1, 0.7, dur, 0.05);
        break;
      }
      case 'sawbass': {
        const bq = filter(f * 6, 3);
        bq.frequency.setValueAtTime(Math.min(this.nyquist, f * 8), t);
        bq.frequency.setTargetAtTime(Math.min(this.nyquist, f * 2.5), t, 0.08);
        const o = this.osc('sawtooth', f);
        o.connect(bq);
        oscs.push(o);
        stopAt = adsr(g.gain, t, vel, 0.004, 0.1, 0.65, dur, 0.05);
        break;
      }
    }

    for (const o of oscs) {
      o.start(t);
      o.stop(stopAt);
    }
    const first = oscs[0];
    if (first) {
      first.onended = () => {
        for (const o of oscs) o.disconnect();
        for (const n of nodes) n.disconnect();
      };
    }
  }
}
