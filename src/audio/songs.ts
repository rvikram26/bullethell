import type { InstId } from './synth';

/**
 * Original music for Lantern Tide, written in a compact text format.
 *
 * A song is a list of 8-bar sections in 4/4, one step per sixteenth note:
 * - `chords`: one chord per bar ("Am", "F#m7", "Bb", "Dsus4"); "C/2" lasts half a bar, "C*2" two.
 * - `melody`: tokens `note:len` with len in sixteenths ("e5:4" = quarter note E5). A length
 *   carries over to following tokens until changed. "r" is a rest, "-" extends the previous
 *   note. Bar lines "|" are ignored but help reading. The total must equal the chords' length.
 * - `bass`: per-bar rhythm: R = root, O = octave, F = fifth, T = third, "." = nothing.
 * - `arp`: per-bar rhythm of chord-tone indices (0 = root, 1 = third, 2 = fifth, 3 = root+8va...).
 * - `drums`: per-bar lines for k(ick) s(nare) h(at) o(pen hat): "x" hit, "X" accent, "." rest.
 */
export interface DrumLines {
  k?: string;
  s?: string;
  h?: string;
  o?: string;
}

export interface SectionDef {
  chords: string;
  melody?: string;
  bass?: string;
  arp?: string;
  pad?: boolean;
  drums?: DrumLines;
  /** Crash cymbal on the first step. */
  crash?: boolean;
}

export interface Mix {
  lead: number;
  bass: number;
  arp: number;
  pad: number;
  drums: number;
}

export interface SongDef {
  id: string;
  title: string;
  bpm: number;
  lead: InstId;
  bass: InstId;
  arp: InstId;
  pad: InstId;
  mix?: Partial<Mix>;
  bassOctave?: number;
  arpOctave?: number;
  padOctave?: number;
  sections: Record<string, SectionDef>;
  intro: string[];
  loop: string[];
}

const ROCK: DrumLines = { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' };
const DRIVE: DrumLines = { k: 'x...x...x...x...', s: '....X.......X...', h: '.xx..xx..xx..xx.' };
const SOFT: DrumLines = { k: 'x.......x.......', h: '..x...x...x...x.' };

export const SONGS: SongDef[] = [
  {
    id: 'title',
    title: 'Lanterns on Still Water',
    bpm: 92,
    lead: 'bell',
    bass: 'tri',
    arp: 'pluck',
    pad: 'pad',
    mix: { lead: 0.2, arp: 0.05, drums: 0.18 },
    sections: {
      I: { chords: 'D A', pad: true, arp: '0.2.1.2.3.2.1.2.' },
      A: {
        chords: 'D A Bm G D A G A',
        melody:
          'f#5:4 a5 d6:6 c#6:2 | e5:8 a5:4 c#6 | d6:4 c#6:2 b5 f#5:8 | g5:4 b5 d6 b5 | a5:6 f#5:2 d5:4 f#5 | e5:4 c#5 e5 a5 | b5:6 a5:2 g5:4 b5 | a5:12 r:4',
        bass: 'R.......F.......',
        arp: '0.2.1.2.3.2.1.2.',
        pad: true,
        drums: SOFT,
      },
      B: {
        chords: 'Bm G D A Bm G Em A',
        melody:
          'b5:4 d6 f#6:6 e6:2 | d6:8 b5:4 g5 | a5:4 f#5 a5 d6 | c#6:8 e6 | f#6:6 e6:2 d6:4 b5 | d6:6 b5:2 g5:8 | g5:4 b5 e6 d6 | c#6:4 e6 a5:8',
        bass: 'R.......F...R...',
        arp: '0.2.1.2.3.2.1.2.',
        pad: true,
        drums: { ...SOFT, s: '........x.......' },
      },
    },
    intro: ['I'],
    loop: ['A', 'B'],
  },
  {
    id: 'marsh',
    title: 'Wicklight Marsh',
    bpm: 150,
    lead: 'pulse',
    bass: 'bass',
    arp: 'square',
    pad: 'pad',
    sections: {
      I: { chords: 'Am Am', bass: 'R.R.R.R.R.R.R.R.', drums: { k: 'x...x...x...x...', h: '..x...x...x...x.' } },
      A: {
        chords: 'Am F G Em Am F Dm E',
        melody:
          'e5:4 a4:2 c5 e5:4 d5:2 c5 | f5:6 e5:2 c5:4 a4 | d5:4 b4:2 g4 b4:4 d5 | e5:8 b4:4 g4 | a5:4 g5:2 e5 c5:4 e5 | f5:4 e5:2 f5 a5:4 c6 | a5:4 f5:2 d5 f5:4 a5 | g#5:6 e5:2 b4:4 e5',
        bass: 'R.R.O.R.R.R.O.R.',
        arp: '0.1.2.1.0.1.2.1.',
        pad: true,
        drums: ROCK,
        crash: true,
      },
      B: {
        chords: 'F G C Am F G Am E',
        melody:
          'c6:6 a5:2 f5:4 a5 | b5:6 g5:2 d5:4 g5 | e5:2 g5 c6:4 b5:2 c6 g5:4 | a5:8 e5:4 c5 | a5:4 c6 a5:2 g5 f5:4 | g5:4 b5 d6 b5 | c6:6 b5:2 a5:4 e5 | g#5:4 b5 e6:8',
        bass: 'R.R.O.R.R.R.O.R.',
        arp: '0.2.1.2.0.2.1.2.',
        pad: true,
        drums: { ...ROCK, o: '......x.......x.' },
        crash: true,
      },
    },
    intro: ['I'],
    loop: ['A', 'B'],
  },
  {
    id: 'warden',
    title: 'Warden of the Low Lights',
    bpm: 165,
    lead: 'lead',
    bass: 'sawbass',
    arp: 'pulse',
    pad: 'pad',
    mix: { lead: 0.15 },
    sections: {
      I: { chords: 'Em Em', bass: 'R.O.R.O.R.O.R.O.', drums: DRIVE, crash: true },
      A: {
        chords: 'Em C D Bm Em C Am B',
        melody:
          'e5:2 g5 b5:4 a5:2 g5 e5:4 | c6:4 b5:2 g5 e5:4 g5 | f#5:2 a5 d6:4 c6:2 a5 f#5:4 | b5:6 a5:2 f#5:4 d5 | e6:4 d6:2 b5 g5:4 b5 | c6:4 e6 g6 e6 | a5:2 c6 e6:4 d6:2 c6 a5:4 | d#6:6 b5:2 f#5:4 b5',
        bass: 'R.O.R.O.R.O.R.O.',
        arp: '0121012101210121',
        pad: true,
        drums: DRIVE,
        crash: true,
      },
      B: {
        chords: 'C D Em Em C D B B',
        melody:
          'g5:4 c6 e6 g6 | f#6:6 e6:2 d6:4 a5 | b5:6 a5:2 g5 a5 b5:4 | e5:12 r:4 | e6:2 d6 c6 b5 c6:4 g5 | a5:2 b5 c6 d6 f#6:4 a6 | b6:8 a6:4 f#6 | d#6:4 f#6 b6:8',
        bass: 'R.O.R.O.R.O.F.O.',
        arp: '0121012101210121',
        pad: true,
        drums: { ...DRIVE, o: '..............x.' },
        crash: true,
      },
    },
    intro: ['I'],
    loop: ['A', 'B'],
  },
  {
    id: 'cloudway',
    title: 'Starward Cloudway',
    bpm: 138,
    lead: 'bell',
    bass: 'tri',
    arp: 'pluck',
    pad: 'pad',
    mix: { lead: 0.2, arp: 0.065 },
    sections: {
      I: { chords: 'F C', pad: true, arp: '0.1.2.3.2.1.0.1.' },
      A: {
        chords: 'F C Dm Bb F C Bb C',
        melody:
          'a5:4 c6 f6:6 e6:2 | g6:8 e6:4 c6 | d6:4 f6 a6:6 g6:2 | f6:8 d6:4 bb5 | c6:2 d6 f6:4 a6 f6 | e6:4 g6 c7 g6 | f6:6 d6:2 bb5:4 d6 | e6:8 g6',
        bass: 'R...R.F.R...R.F.',
        arp: '0.1.2.3.2.1.0.1.',
        pad: true,
        drums: { k: 'x.......x.x.....', s: '....x.......x...', h: '..x...x...x...x.' },
      },
      B: {
        chords: 'Dm Bb F C Dm Bb Gm C',
        melody:
          'f6:4 e6:2 d6 a5:8 | bb5:4 d6 f6 d6 | c6:6 a5:2 f5:4 a5 | g5:8 c6:4 e6 | a6:6 g6:2 f6:4 d6 | d6:4 f6 bb6 a6 | g6:6 f6:2 d6:4 bb5 | c6:4 e6 g6:8',
        bass: 'R...R.F.R...R.O.',
        arp: '0.2.1.2.3.2.1.2.',
        pad: true,
        drums: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        crash: true,
      },
    },
    intro: ['I'],
    loop: ['A', 'B'],
  },
  {
    id: 'astronomer',
    title: 'Cracked-Glass Constellations',
    bpm: 172,
    lead: 'square',
    bass: 'sawbass',
    arp: 'pulse',
    pad: 'pad',
    mix: { lead: 0.13 },
    sections: {
      I: { chords: 'Cm Cm', bass: 'R.R.O.R.R.R.O.R.', drums: DRIVE, crash: true },
      A: {
        chords: 'Cm Ab Bb G Cm Ab Fm G',
        melody:
          'c6:2 eb6 g6:4 f6:2 eb6 c6:4 | ab5:4 c6 eb6 c6 | d6:2 f6 bb6:4 ab6:2 f6 d6:4 | b5:6 d6:2 g6:8 | g6:4 f6:2 eb6 d6:4 eb6 | c6:4 eb6 ab6 g6 | f6:2 g6 ab6:4 g6:2 f6 c6:4 | d6:4 b5 g5:8',
        bass: 'R.R.O.R.R.R.O.R.',
        arp: '0121012101210121',
        pad: true,
        drums: DRIVE,
        crash: true,
      },
      B: {
        chords: 'Ab Bb Cm Cm Ab Bb G G',
        melody:
          'eb6:6 c6:2 ab5:4 c6 | d6:6 bb5:2 f5:4 bb5 | c6:2 d6 eb6 f6 g6:8 | c7:8 g6:4 eb6 | ab6:4 g6:2 f6 eb6:4 c6 | bb6:4 ab6:2 g6 f6:4 d6 | g6:8 f6:4 d6 | b6:8 d7',
        bass: 'R.R.O.R.R.R.O.F.',
        arp: '0212021202120212',
        pad: true,
        drums: { ...DRIVE, o: '......x.......x.' },
        crash: true,
      },
    },
    intro: ['I'],
    loop: ['A', 'B'],
  },
  {
    id: 'spire',
    title: 'Ascent of the Beacon Spire',
    bpm: 158,
    lead: 'lead',
    bass: 'bass',
    arp: 'pulse',
    pad: 'organ',
    mix: { lead: 0.15, pad: 0.04 },
    sections: {
      I: { chords: 'Gm Gm', pad: true, bass: 'R.......R.R.....', drums: { k: 'x.......x.x.....', s: '....x.......x...' } },
      A: {
        chords: 'Gm Eb F D Gm Eb Cm D',
        melody:
          'd6:4 bb5:2 g5 d6:4 g6 | g6:6 f6:2 eb6:4 bb5 | a5:2 c6 f6:4 eb6:2 c6 a5:4 | f#6:8 d6:4 a5 | g6:4 a6:2 bb6 a6:4 g6 | bb6:6 g6:2 eb6:4 g6 | c7:4 bb6:2 g6 eb6:4 c6 | d6:4 f#6 a6:8',
        bass: 'R.R.O.R.R.R.O.R.',
        arp: '0.1.2.1.0.1.2.1.',
        pad: true,
        drums: ROCK,
        crash: true,
      },
      B: {
        chords: 'Eb F Gm Gm Eb F D D',
        melody:
          'bb5:4 eb6 g6 f6 | a6:6 g6:2 f6:4 c6 | d6:2 g6 bb6:4 a6:2 g6 d6:4 | g6:12 r:4 | eb7:4 d7:2 bb6 g6:4 bb6 | c7:4 a6:2 f6 a6:4 c7 | d7:8 c7:4 a6 | f#6:4 a6 d7:8',
        bass: 'R.R.O.R.R.R.O.F.',
        arp: '0121012101210121',
        pad: true,
        drums: { ...DRIVE, o: '..............x.' },
        crash: true,
      },
    },
    intro: ['I'],
    loop: ['A', 'B'],
  },
  {
    id: 'keeper',
    title: 'Dimmed Beacon, Burning Wick',
    bpm: 176,
    lead: 'lead',
    bass: 'sawbass',
    arp: 'square',
    pad: 'organ',
    mix: { lead: 0.15, arp: 0.05, pad: 0.04 },
    sections: {
      I: { chords: 'Dm Dm', pad: true, bass: 'R.O.R.O.R.O.R.O.', drums: DRIVE, crash: true },
      A: {
        chords: 'Dm Bb C A Dm Bb Gm A',
        melody:
          'd6:2 f6 a6:4 g6:2 f6 d6:4 | bb5:4 d6 f6 d6 | e6:2 g6 c7:4 bb6:2 g6 e6:4 | c#7:6 a6:2 e6:8 | a6:4 g6:2 f6 e6:4 f6 | d7:4 c7:2 bb6 f6:4 bb6 | g6:2 a6 bb6:4 a6:2 g6 d6:4 | e6:4 c#6 a5:8',
        bass: 'R.O.R.O.R.O.R.O.',
        arp: '0121012101210121',
        pad: true,
        drums: DRIVE,
        crash: true,
      },
      B: {
        chords: 'Bb C Dm Dm Bb C A A',
        melody:
          'f6:6 d6:2 bb5:4 d6 | g6:6 e6:2 c6:4 e6 | a6:2 bb6 a6 g6 f6:4 a6 | d7:12 r:4 | bb6:4 a6:2 g6 f6:4 d6 | c7:4 bb6:2 a6 g6:4 e6 | a6:8 g6:4 e6 | c#7:4 e7 a7:8',
        bass: 'R.O.R.O.R.O.F.O.',
        arp: '0212021202120212',
        pad: true,
        drums: { ...DRIVE, o: '......x.......x.' },
        crash: true,
      },
      C: {
        chords: 'Gm Dm Bb A Gm Dm Eb A',
        melody: 'd6:8 bb5 | a5:8 f5 | f6:8 d6 | e6:8 c#6 | g6:6 f6:2 d6:8 | f6:6 e6:2 d6:8 | g6:6 bb6:2 eb7:8 | c#7:8 e7',
        bass: 'R.......R...O...',
        arp: '0.1.2.3.2.1.0.1.',
        pad: true,
        drums: { k: 'x.......x.......', s: '........X.......', h: 'x.x.x.x.x.x.x.x.' },
        crash: true,
      },
    },
    intro: ['I'],
    loop: ['A', 'B', 'C'],
  },
  {
    id: 'ending',
    title: 'The Tide Recedes',
    bpm: 88,
    lead: 'bell',
    bass: 'tri',
    arp: 'pluck',
    pad: 'pad',
    mix: { lead: 0.2, arp: 0.05, drums: 0.15 },
    sections: {
      I: { chords: 'C C', pad: true },
      A: {
        chords: 'C G Am F C G F G',
        melody:
          'e5:4 g5 c6:8 | b5:4 d6 g5:8 | c6:6 b5:2 a5:4 e5 | f5:4 a5 c6:8 | g5:6 e5:2 c5:4 e5 | d5:4 g5 b5 d6 | c6:6 a5:2 f5:4 a5 | g5:16',
        bass: 'R.......F.......',
        arp: '0.1.2.3.2.1.2.1.',
        pad: true,
        drums: SOFT,
      },
      B: {
        chords: 'Am F C G Am F G C',
        melody:
          'a5:4 c6 e6:8 | f6:6 e6:2 c6:8 | e6:4 d6 c6 g5 | b5:8 d6 | c6:4 e6 a6:8 | a6:6 g6:2 f6:4 c6 | d6:4 g6 f6 d6 | c6:16',
        bass: 'R.......F...R...',
        arp: '0.1.2.3.2.1.2.1.',
        pad: true,
        drums: SOFT,
      },
    },
    intro: ['I'],
    loop: ['A', 'B'],
  },
];
