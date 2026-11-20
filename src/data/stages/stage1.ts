import type { StageDef } from '../types';

/**
 * Stage 1 timeline. Times are seconds on the stage clock; the clock stops while a boss fight or
 * dialogue is running, so everything after a boss step is relative to the moment it ended.
 * `wave` steps expand into one spawn per member; `flip: true` mirrors path, pattern and spawn x.
 */
export const STAGE1: StageDef = {
  id: 'stage1',
  number: 1,
  name: 'The Marsh of Wicks',
  subtitle: 'Where unlit lanterns drift',
  background: 'marsh',
  stageMusic: 'marsh',
  bossMusic: 'warden',
  steps: [
    // --- wave section one ------------------------------------------------------------------
    { t: 1.5, type: 'wave', enemy: 'wisp', count: 6, every: 0.5, x: 40, path: 'swoop' },
    { t: 6.5, type: 'wave', enemy: 'wisp', count: 6, every: 0.5, x: 40, path: 'swoop', flip: true },
    { t: 12, type: 'wave', enemy: 'wispShot', count: 4, every: 0.8, x: 90, dx: 70 },
    { t: 17, type: 'spawn', enemy: 'moth', x: 192 },
    { t: 18, type: 'wave', enemy: 'wisp', count: 5, every: 0.45, x: 30, path: 'diag-in' },
    { t: 22, type: 'wave', enemy: 'wisp', count: 5, every: 0.45, x: 30, path: 'diag-in', flip: true },
    { t: 27, type: 'spawn', enemy: 'glowcap', x: 90 },
    { t: 27, type: 'spawn', enemy: 'glowcap', x: 90, flip: true },
    { t: 31, type: 'wave', enemy: 'wispShot', count: 6, every: 0.55, x: 50, dx: 56, path: 'down' },
    { t: 37, type: 'wave', enemy: 'wisp', count: 8, every: 0.35, x: 40, path: 'swoop', alternate: true },
    { t: 42, type: 'spawn', enemy: 'moth', x: 110 },
    { t: 42.6, type: 'spawn', enemy: 'moth', x: 274 },
    { t: 48, type: 'waitClear', max: 8 },

    // --- mid-boss ----------------------------------------------------------------------------
    { t: 49, type: 'boss', boss: 'tamsin', before: 's1-mid' },

    // --- wave section two --------------------------------------------------------------------
    { t: 52, type: 'wave', enemy: 'wispShot', count: 5, every: 0.6, x: 60, dx: 66, path: 'down' },
    { t: 56, type: 'spawn', enemy: 'glowcap', x: 192 },
    { t: 58, type: 'wave', enemy: 'wisp', count: 6, every: 0.4, x: -20, y: 70, path: 'cross-right' },
    { t: 63, type: 'wave', enemy: 'wisp', count: 6, every: 0.4, x: -20, y: 100, path: 'cross-right', flip: true },
    { t: 68, type: 'spawn', enemy: 'moth', x: 192 },
    { t: 69, type: 'wave', enemy: 'wispShot', count: 4, every: 0.7, x: 50, dx: 94, path: 'sine-down', alternate: true },
    { t: 75, type: 'waitClear', max: 10 },

    // --- boss --------------------------------------------------------------------------------
    { t: 76, type: 'boss', boss: 'odalys', before: 's1-boss', after: 's1-after' },
    { t: 77, type: 'end' },
  ],
};
