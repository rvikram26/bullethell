import type { StageDef } from '../types';

export const STAGE3: StageDef = {
  id: 'stage3',
  number: 3,
  name: 'The Beacon Spire',
  subtitle: 'Where the last light waits',
  background: 'spire',
  stageMusic: 'spire',
  bossMusic: 'keeper',
  steps: [
    // --- wave section one ------------------------------------------------------------------
    { t: 1.5, type: 'wave', enemy: 'stormling', count: 6, every: 0.5, x: 60, dx: 52 },
    { t: 6.5, type: 'wave', enemy: 'shade', count: 5, every: 0.5, x: 40, path: 'swoop' },
    { t: 11, type: 'wave', enemy: 'shade', count: 5, every: 0.5, x: 40, path: 'swoop', flip: true },
    { t: 16, type: 'spawn', enemy: 'crystal', x: 192 },
    { t: 18, type: 'wave', enemy: 'stormlingShot', count: 5, every: 0.7, x: 50, dx: 70, alternate: true },
    { t: 24, type: 'wave', enemy: 'shade', count: 6, every: 0.4, x: 30, path: 'u-turn', alternate: true },
    { t: 29, type: 'spawn', enemy: 'crystal', x: 90 },
    { t: 29, type: 'spawn', enemy: 'crystal', x: 90, flip: true },
    { t: 35, type: 'wave', enemy: 'stormling', count: 10, every: 0.3, x: 40, dx: 30, path: 'sine-fast' },
    { t: 40, type: 'wave', enemy: 'shade', count: 6, every: 0.45, x: -20, y: 70, path: 'cross-right', alternate: true },
    { t: 46, type: 'spawn', enemy: 'crystal', x: 192 },
    { t: 47, type: 'wave', enemy: 'stormlingShot', count: 6, every: 0.5, x: 40, dx: 60, path: 'down' },
    { t: 52, type: 'waitClear', max: 8 },

    // --- mid-boss ----------------------------------------------------------------------------
    { t: 53, type: 'boss', boss: 'kessra', before: 's3-mid' },

    // --- wave section two --------------------------------------------------------------------
    { t: 56, type: 'wave', enemy: 'stormling', count: 10, every: 0.3, x: 40, dx: 30, path: 'down-fast' },
    { t: 60, type: 'wave', enemy: 'shade', count: 8, every: 0.35, x: 40, path: 'swoop-low', alternate: true },
    { t: 65, type: 'spawn', enemy: 'crystal', x: 100 },
    { t: 65, type: 'spawn', enemy: 'crystal', x: 100, flip: true },
    { t: 70, type: 'wave', enemy: 'stormlingShot', count: 6, every: 0.45, x: 50, dx: 56, path: 'sine-wide', alternate: true },
    { t: 75, type: 'wave', enemy: 'shade', count: 6, every: 0.4, x: -20, y: 80, path: 'cross-right' },
    { t: 80, type: 'waitClear', max: 10 },

    // --- boss --------------------------------------------------------------------------------
    { t: 81, type: 'boss', boss: 'auriel', before: 's3-boss', after: 's3-after' },
    { t: 82, type: 'end' },
  ],
};
