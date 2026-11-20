import type { BossDef } from '../types';

export const STAGE2_BOSSES: Record<string, BossDef> = {
  brindle: {
    id: 'brindle',
    character: 'brindle',
    name: 'Brindle',
    title: 'Gearmouse Courier',
    midboss: true,
    radius: 14,
    entry: { x: 192, y: 100 },
    color: 'orange',
    phases: [
      {
        name: 'Courier Rite: Express Route',
        hp: 3000,
        time: 34,
        bonus: 300_000,
        pattern: 'brindle-1',
        at: { x: 70, y: 110 },
        move: {
          loop: true,
          steps: [
            { type: 'to', dur: 3.6, x: 314, y: 110, ease: 'linear' },
            { type: 'to', dur: 3.6, x: 70, y: 110, ease: 'linear' },
          ],
        },
      },
      {
        name: 'Parcel Rite: Special Delivery',
        hp: 6300,
        time: 38,
        bonus: 450_000,
        pattern: 'brindle-spell',
        at: { x: 192, y: 100 },
        move: {
          loop: true,
          steps: [
            { type: 'to', dur: 4, x: 130, y: 100 },
            { type: 'to', dur: 4, x: 254, y: 100 },
          ],
        },
      },
    ],
  },

  vesper: {
    id: 'vesper',
    character: 'vesper',
    name: 'Vesper Quillon',
    title: 'Astronomer of Cracked Glass',
    radius: 18,
    entry: { x: 192, y: 100 },
    color: 'purple',
    phases: [
      {
        name: 'Star Rite: Meteor Census',
        hp: 5100,
        time: 34,
        bonus: 500_000,
        pattern: 'vesper-1',
        at: { x: 192, y: 100 },
        move: {
          loop: true,
          steps: [
            { type: 'to', dur: 3.5, x: 120, y: 95 },
            { type: 'to', dur: 3.5, x: 264, y: 105 },
          ],
        },
      },
      {
        name: 'Constellation Rite: Orrery Spin',
        hp: 7800,
        time: 48,
        bonus: 700_000,
        pattern: 'vesper-orrery',
        at: { x: 192, y: 130 },
      },
      {
        name: 'Comet Rite: Tails of Glass',
        hp: 5100,
        time: 34,
        bonus: 750_000,
        pattern: 'vesper-comets',
        at: { x: 192, y: 90 },
        move: {
          loop: true,
          steps: [
            { type: 'to', dur: 4, x: 140, y: 90 },
            { type: 'to', dur: 4, x: 244, y: 90 },
          ],
        },
      },
      {
        name: 'Lens Rite: Refraction Rain',
        hp: 8400,
        time: 52,
        bonus: 800_000,
        pattern: 'vesper-lens',
        at: { x: 192, y: 110 },
      },
      {
        name: 'Eclipse Rite: Umbral Clockwork',
        hp: 10800,
        time: 66,
        bonus: 1_000_000,
        pattern: 'vesper-eclipse',
        at: { x: 192, y: 140 },
        drop: { point: 18, bigPower: 3, bomb: 1 },
      },
    ],
  },
};
