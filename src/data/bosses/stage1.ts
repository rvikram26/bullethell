import type { BossDef } from '../types';

export const STAGE1_BOSSES: Record<string, BossDef> = {
  tamsin: {
    id: 'tamsin',
    character: 'tamsin',
    name: 'Tamsin',
    title: 'Moth of the Lower Lamps',
    midboss: true,
    radius: 16,
    entry: { x: 192, y: 96 },
    color: 'pink',
    phases: [
      {
        hp: 4200,
        time: 28,
        pattern: 'tamsin-1',
        at: { x: 192, y: 96 },
        move: {
          loop: true,
          steps: [
            { type: 'rand', dur: 2.2, x: [110, 274], y: [70, 130] },
            { type: 'wait', dur: 0.8 },
          ],
        },
      },
      {
        name: 'Dust Rite: Scale Snowfall',
        hp: 6000,
        time: 36,
        bonus: 300_000,
        pattern: 'tamsin-spell',
        at: { x: 192, y: 84 },
        move: {
          loop: true,
          steps: [
            { type: 'to', dur: 3, x: 110, y: 84 },
            { type: 'to', dur: 6, x: 274, y: 84 },
            { type: 'to', dur: 3, x: 192, y: 84 },
          ],
        },
      },
    ],
  },

  odalys: {
    id: 'odalys',
    character: 'odalys',
    name: 'Odalys',
    title: 'Warden of the Marsh Lights',
    radius: 18,
    entry: { x: 192, y: 110 },
    color: 'green',
    phases: [
      {
        hp: 4800,
        time: 32,
        pattern: 'odalys-1',
        at: { x: 192, y: 100 },
        move: {
          loop: true,
          steps: [
            { type: 'to', dur: 3.2, x: 130, y: 100 },
            { type: 'to', dur: 3.2, x: 254, y: 100 },
          ],
        },
      },
      {
        name: 'Wick Rite: Procession of Lights',
        hp: 7200,
        time: 44,
        bonus: 500_000,
        pattern: 'odalys-wicks',
        at: { x: 192, y: 120 },
      },
      {
        hp: 5100,
        time: 34,
        pattern: 'odalys-reed',
        at: { x: 192, y: 90 },
        move: {
          loop: true,
          steps: [
            { type: 'to', dur: 4, x: 150, y: 90 },
            { type: 'to', dur: 4, x: 234, y: 90 },
          ],
        },
      },
      {
        name: 'Marsh Rite: Hundred Wicks Waltz',
        hp: 9900,
        time: 60,
        bonus: 800_000,
        pattern: 'odalys-waltz',
        at: { x: 192, y: 140 },
        drop: { point: 16, bigPower: 3, bomb: 1 },
      },
    ],
  },
};
