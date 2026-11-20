import type { BossDef } from '../types';

export const STAGE3_BOSSES: Record<string, BossDef> = {
  kessra: {
    id: 'kessra',
    character: 'kessra',
    name: 'Kessra',
    title: 'Herald of the Storm',
    midboss: true,
    radius: 15,
    entry: { x: 192, y: 100 },
    color: 'blue',
    phases: [
      {
        hp: 4800,
        time: 30,
        pattern: 'kessra-1',
        at: { x: 192, y: 100 },
        move: {
          loop: true,
          steps: [
            { type: 'rand', dur: 2.0, x: [100, 284], y: [70, 140] },
            { type: 'wait', dur: 0.6 },
          ],
        },
      },
      {
        name: 'Thunder Rite: Forked Heralds',
        hp: 6000,
        time: 40,
        bonus: 600_000,
        pattern: 'kessra-spell',
        at: { x: 192, y: 90 },
        move: {
          loop: true,
          steps: [
            { type: 'to', dur: 3, x: 120, y: 90 },
            { type: 'to', dur: 6, x: 264, y: 90 },
            { type: 'to', dur: 3, x: 192, y: 90 },
          ],
        },
      },
    ],
  },

  auriel: {
    id: 'auriel',
    character: 'auriel',
    name: 'Auriel Nocturne',
    title: 'The Dimmed Beacon',
    radius: 19,
    entry: { x: 192, y: 110 },
    color: 'yellow',
    phases: [
      {
        hp: 5400,
        time: 36,
        pattern: 'auriel-1',
        at: { x: 192, y: 100 },
        move: {
          loop: true,
          steps: [
            { type: 'to', dur: 4, x: 130, y: 100 },
            { type: 'to', dur: 4, x: 254, y: 100 },
          ],
        },
      },
      {
        name: 'Unlit Rite: Vigil of Candles',
        hp: 8700,
        time: 52,
        bonus: 900_000,
        pattern: 'auriel-candles',
        at: { x: 192, y: 100 },
      },
      {
        name: 'Dim Rite: Falling Halo',
        hp: 9000,
        time: 54,
        bonus: 1_000_000,
        pattern: 'auriel-halo',
        at: { x: 192, y: 150 },
      },
      {
        hp: 5400,
        time: 36,
        pattern: 'auriel-wind',
        at: { x: 192, y: 110 },
        move: {
          loop: true,
          steps: [
            { type: 'to', dur: 4, x: 150, y: 110 },
            { type: 'to', dur: 4, x: 234, y: 110 },
          ],
        },
      },
      {
        name: 'Last Light Rite: Beacon Requiem',
        hp: 13500,
        time: 80,
        bonus: 1_500_000,
        warmup: 2.4,
        pattern: 'auriel-requiem',
        at: { x: 192, y: 150 },
        drop: { point: 24, bigPower: 4, bomb: 2, life: 1 },
      },
    ],
  },
};
