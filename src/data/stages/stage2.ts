import type { StageDef } from '../types';

export const STAGE2: StageDef = {
  id: 'stage2',
  number: 2,
  name: 'The Cloudway Observatory',
  subtitle: 'Where the stars are counted',
  background: 'cloudway',
  stageMusic: 'cloudway',
  bossMusic: 'astronomer',
  steps: [
    // --- wave section one ------------------------------------------------------------------
    { t: 1.5, type: 'wave', enemy: 'sparrow', count: 6, every: 0.4, x: 60, dx: 50 },
    { t: 6, type: 'wave', enemy: 'cog', count: 5, every: 0.5, x: 30, path: 'diag-in' },
    { t: 10, type: 'wave', enemy: 'cog', count: 5, every: 0.5, x: 30, path: 'diag-in', flip: true },
    { t: 15, type: 'spawn', enemy: 'orrery', x: 192 },
    { t: 17, type: 'wave', enemy: 'sparrowShot', count: 6, every: 0.5, x: 50, dx: 56, alternate: true },
    { t: 23, type: 'wave', enemy: 'cogShot', count: 4, every: 0.8, x: 90, dx: 70 },
    { t: 28, type: 'spawn', enemy: 'orrery', x: 100 },
    { t: 28, type: 'spawn', enemy: 'orrery', x: 100, flip: true },
    { t: 33, type: 'wave', enemy: 'sparrow', count: 8, every: 0.3, x: 40, path: 'swoop', alternate: true },
    { t: 38, type: 'wave', enemy: 'cogShot', count: 6, every: 0.5, x: 40, dx: 60, path: 'down' },
    { t: 44, type: 'wave', enemy: 'sparrowShot', count: 5, every: 0.35, x: -20, y: 80, path: 'cross-right' },
    { t: 48, type: 'waitClear', max: 8 },

    // --- mid-boss ----------------------------------------------------------------------------
    { t: 49, type: 'boss', boss: 'brindle', before: 's2-mid' },

    // --- wave section two --------------------------------------------------------------------
    { t: 52, type: 'wave', enemy: 'sparrow', count: 8, every: 0.3, x: 40, dx: 40, path: 'down-fast' },
    { t: 56, type: 'wave', enemy: 'cogShot', count: 5, every: 0.6, x: 60, dx: 66, path: 'sine-wide', alternate: true },
    { t: 61, type: 'spawn', enemy: 'orrery', x: 192 },
    { t: 62, type: 'wave', enemy: 'sparrowShot', count: 6, every: 0.4, x: -20, y: 70, path: 'cross-right', flip: true },
    { t: 67, type: 'wave', enemy: 'cog', count: 10, every: 0.3, x: 40, dx: 30, path: 'down' },
    { t: 70, type: 'spawn', enemy: 'orrery', x: 100 },
    { t: 70, type: 'spawn', enemy: 'orrery', x: 100, flip: true },
    { t: 76, type: 'waitClear', max: 10 },

    // --- boss --------------------------------------------------------------------------------
    { t: 77, type: 'boss', boss: 'vesper', before: 's2-boss', after: 's2-after' },
    { t: 78, type: 'end' },
  ],
};
