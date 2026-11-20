import { type DrumLines, type Mix, type SectionDef, type SongDef, SONGS } from './songs';
import { type DrumKind, type InstId, Synth } from './synth';

export interface NoteEvent {
  inst: InstId;
  midi: number;
  steps: number;
  vel: number;
}

export interface DrumEvent {
  kind: DrumKind;
  vel: number;
}

export interface StepEvents {
  notes: NoteEvent[];
  drums: DrumEvent[];
}

export interface CompiledSong {
  id: string;
  title: string;
  /** Seconds per sixteenth-note step. */
  stepDur: number;
  intro: StepEvents[];
  loop: StepEvents[];
}

const DEFAULT_MIX: Mix = { lead: 0.17, bass: 0.2, arp: 0.06, pad: 0.05, drums: 0.3 };

const PITCH: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

export function parseNote(tok: string): number | null {
  const m = /^([a-g])(#|b)?(\d)$/.exec(tok);
  if (!m) return null;
  const pc = PITCH[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return (Number(m[3]) + 1) * 12 + pc;
}

const CHORD_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  add9: [0, 4, 7, 14],
};

export interface Chord {
  root: number;
  intervals: number[];
  steps: number;
}

export function parseChord(tok: string): Chord {
  const m = /^([A-G])(#|b)?(maj7|m7|sus2|sus4|dim|aug|add9|m|7)?(?:([/*])(\d+))?$/.exec(tok);
  if (!m) throw new Error(`Bad chord "${tok}"`);
  const root = PITCH[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  let steps = 16;
  if (m[4] === '/') steps = 16 / Number(m[5]);
  else if (m[4] === '*') steps = 16 * Number(m[5]);
  return { root: (root + 12) % 12, intervals: CHORD_INTERVALS[m[3] ?? ''], steps };
}

export interface MelodyNote {
  start: number;
  steps: number;
  midi: number;
}

/** Parse a melody line; returns the notes and the total length in steps. */
export function parseMelody(src: string): { notes: MelodyNote[]; length: number } {
  const notes: MelodyNote[] = [];
  let pos = 0;
  let len = 4;
  for (const raw of src.split(/\s+/)) {
    if (!raw || raw === '|') continue;
    const [name, l] = raw.split(':');
    if (l !== undefined) {
      len = Number(l);
      if (!Number.isInteger(len) || len <= 0) throw new Error(`Bad note length in "${raw}"`);
    }
    if (name === 'r') {
      pos += len;
      continue;
    }
    if (name === '-') {
      const last = notes[notes.length - 1];
      if (!last) throw new Error('Tie "-" without a previous note');
      last.steps += len;
      pos += len;
      continue;
    }
    const midi = parseNote(name);
    if (midi === null) throw new Error(`Bad note "${raw}"`);
    notes.push({ start: pos, steps: len, midi });
    pos += len;
  }
  return { notes, length: pos };
}

function emptySteps(n: number): StepEvents[] {
  return Array.from({ length: n }, () => ({ notes: [], drums: [] }));
}

function compileSection(song: SongDef, sec: SectionDef, mix: Mix): StepEvents[] {
  const chords = sec.chords.split(/\s+/).filter(Boolean).map(parseChord);
  const total = chords.reduce((s, c) => s + c.steps, 0);
  const out = emptySteps(total);
  const bassBase = ((song.bassOctave ?? 2) + 1) * 12;
  const arpBase = ((song.arpOctave ?? 4) + 1) * 12;
  const padBase = ((song.padOctave ?? 4) + 1) * 12;

  if (sec.melody) {
    const mel = parseMelody(sec.melody);
    if (mel.length !== total) throw new Error(`Song ${song.id}: melody is ${mel.length} steps but chords are ${total}`);
    for (const n of mel.notes) out[n.start].notes.push({ inst: song.lead, midi: n.midi, steps: n.steps, vel: mix.lead });
  }

  let start = 0;
  for (const ch of chords) {
    const tones = (k: number): number => ch.intervals[k % ch.intervals.length] + 12 * Math.floor(k / ch.intervals.length);
    if (sec.pad) {
      for (const iv of ch.intervals.slice(0, 3)) out[start].notes.push({ inst: song.pad, midi: padBase + ch.root + iv, steps: ch.steps, vel: mix.pad });
    }
    for (let s = start; s < start + ch.steps; s++) {
      const barStep = s % 16;
      if (sec.bass) {
        const c = sec.bass[barStep % sec.bass.length];
        const offset = c === 'R' ? 0 : c === 'O' ? 12 : c === 'F' ? 7 : c === 'T' ? ch.intervals[1] : -1;
        if (offset >= 0) {
          let len = 1;
          while (len < 4 && s + len < start + ch.steps && sec.bass[(barStep + len) % sec.bass.length] === '.') len++;
          out[s].notes.push({ inst: song.bass, midi: bassBase + ch.root + offset, steps: len, vel: mix.bass });
        }
      }
      if (sec.arp) {
        const c = sec.arp[barStep % sec.arp.length];
        if (c >= '0' && c <= '9') out[s].notes.push({ inst: song.arp, midi: arpBase + ch.root + tones(Number(c)), steps: 1, vel: mix.arp });
      }
    }
    start += ch.steps;
  }

  if (sec.drums) {
    const lines = sec.drums as DrumLines;
    const level: Record<DrumKind, number> = { k: 1, s: 0.8, h: 0.45, o: 0.45, c: 0.6 };
    for (const kind of ['k', 's', 'h', 'o'] as DrumKind[]) {
      const line = lines[kind as keyof DrumLines];
      if (!line) continue;
      for (let s = 0; s < total; s++) {
        const c = line[s % line.length];
        if (c === 'x' || c === 'X') out[s].drums.push({ kind, vel: mix.drums * level[kind] * (c === 'X' ? 1.25 : 1) });
      }
    }
  }
  if (sec.crash) out[0].drums.push({ kind: 'c', vel: mix.drums * 0.6 });
  return out;
}

export function compileSong(song: SongDef): CompiledSong {
  const mix: Mix = { ...DEFAULT_MIX, ...song.mix };
  const build = (names: string[]): StepEvents[] =>
    names.flatMap((n) => {
      const sec = song.sections[n];
      if (!sec) throw new Error(`Song ${song.id}: unknown section "${n}"`);
      return compileSection(song, sec, mix);
    });
  return { id: song.id, title: song.title, stepDur: 60 / song.bpm / 4, intro: build(song.intro), loop: build(song.loop) };
}

const compiled = new Map<string, CompiledSong>();

export function getSong(id: string): CompiledSong | null {
  let c = compiled.get(id);
  if (!c) {
    const def = SONGS.find((s) => s.id === id);
    if (!def) return null;
    c = compileSong(def);
    compiled.set(id, c);
  }
  return c;
}

export const SONG_IDS: ReadonlySet<string> = new Set(SONGS.map((s) => s.id));

interface Playing {
  song: CompiledSong;
  gain: GainNode;
  intro: boolean;
  pos: number;
  next: number;
}

/** Look-ahead step sequencer: schedules notes slightly ahead of the audio clock. */
export class MusicPlayer {
  private ctx: BaseAudioContext | null = null;
  private bus: AudioNode | null = null;
  private synth: Synth | null = null;
  private playing: Playing | null = null;
  current: string | null = null;

  init(ctx: BaseAudioContext, bus: AudioNode, synth = new Synth(ctx)): void {
    this.ctx = ctx;
    this.bus = bus;
    this.synth = synth;
  }

  play(id: string | null, fade = 0.35): void {
    if (id === this.current && (id === null || this.playing)) return;
    this.current = id;
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    const now = ctx.currentTime;
    const old = this.playing;
    if (old) {
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.setTargetAtTime(0, now, fade / 3);
      const g = old.gain;
      setTimeout(() => g.disconnect(), (fade * 3 + 1) * 1000);
    }
    this.playing = null;
    if (id === null) return;
    const song = getSong(id);
    if (!song) return;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    gain.connect(this.bus);
    this.playing = { song, gain, intro: song.intro.length > 0, pos: 0, next: now + 0.08 };
  }

  /** Schedule every step that starts before `until` (audio-clock seconds). */
  scheduleUntil(until: number): void {
    const p = this.playing;
    const synth = this.synth;
    if (!p || !synth) return;
    while (p.next < until) {
      const steps = p.intro ? p.song.intro : p.song.loop;
      const ev = steps[p.pos];
      const t = p.next;
      for (const n of ev.notes) synth.note(p.gain, n.inst, n.midi, t, n.steps * p.song.stepDur * 0.92, n.vel);
      for (const d of ev.drums) synth.drum(p.gain, d.kind, t, d.vel);
      p.next += p.song.stepDur;
      p.pos++;
      if (p.pos >= steps.length) {
        p.pos = 0;
        p.intro = false;
      }
    }
  }

  /** Call every frame. */
  update(): void {
    const ctx = this.ctx;
    const p = this.playing;
    if (!ctx || !p) return;
    const now = ctx.currentTime;
    if (p.next < now - 0.25) p.next = now + 0.05; // the tab was suspended: resync instead of bursting
    this.scheduleUntil(now + 0.18);
  }
}
