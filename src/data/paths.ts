import type { PathDef } from './types';

/**
 * Named enemy movement scripts. Spawns that set `flip: true` get the mirror image of these.
 * Positions are playfield pixels (384 x 448), speeds px/s, durations seconds.
 */
export const PATHS: Record<string, PathDef> = {
  // --- straight and diagonal drifts ---------------------------------------------------------
  down: { steps: [{ type: 'vel', dur: 14, vx: 0, vy: 90 }] },
  'down-slow': { steps: [{ type: 'vel', dur: 18, vx: 0, vy: 55 }] },
  'down-fast': { steps: [{ type: 'vel', dur: 9, vx: 0, vy: 175 }] },
  'diag-in': { steps: [{ type: 'vel', dur: 12, vx: 60, vy: 95 }] },
  'diag-steep': { steps: [{ type: 'vel', dur: 10, vx: 35, vy: 140 }] },
  'cross-right': { steps: [{ type: 'vel', dur: 9, vx: 130, vy: 38 }] },
  'rise-up': { steps: [{ type: 'vel', dur: 9, vx: 0, vy: -120 }] },

  // --- weaving ----------------------------------------------------------------------------
  'sine-down': { steps: [{ type: 'sine', dur: 12, vy: 85, amp: 55, period: 2.6 }] },
  'sine-fast': { steps: [{ type: 'sine', dur: 9, vy: 135, amp: 70, period: 2 }] },
  'sine-wide': { steps: [{ type: 'sine', dur: 12, vy: 70, amp: 100, period: 3.4 }] },

  // --- curved swoops ------------------------------------------------------------------------
  swoop: {
    steps: [
      { type: 'arc', dur: 2.2, speed: 150, heading: 100, turn: -52 },
      { type: 'vel', dur: 8, vx: 145, vy: -36 },
    ],
  },
  'swoop-low': {
    steps: [
      { type: 'arc', dur: 2.8, speed: 160, heading: 95, turn: -62 },
      { type: 'vel', dur: 8, vx: 150, vy: -30 },
    ],
  },
  'u-turn': {
    steps: [
      { type: 'vel', dur: 1.4, vx: 0, vy: 150 },
      { type: 'arc', dur: 1.8, speed: 150, heading: 90, turn: -100 },
      { type: 'vel', dur: 8, vx: -30, vy: -150 },
    ],
  },

  // --- stop-and-shoot (relative to the spawn point, so they work anywhere) --------------------
  'hover-short': {
    steps: [
      { type: 'rel', dur: 1.4, x: 0, y: 150, ease: 'out' },
      { type: 'wait', dur: 3.2 },
      { type: 'vel', dur: 8, vx: 0, vy: -140 },
    ],
  },
  'hover-mid': {
    steps: [
      { type: 'rel', dur: 1.6, x: 0, y: 130, ease: 'out' },
      { type: 'wait', dur: 6 },
      { type: 'vel', dur: 8, vx: 0, vy: -120 },
    ],
  },
  'hover-long': {
    steps: [
      { type: 'rel', dur: 1.8, x: 0, y: 110, ease: 'out' },
      { type: 'wait', dur: 9 },
      { type: 'vel', dur: 8, vx: 0, vy: -110 },
    ],
  },
  'hover-drift': {
    steps: [
      { type: 'rel', dur: 1.6, x: 0, y: 120, ease: 'out' },
      { type: 'rel', dur: 6, x: 70, y: 20, ease: 'inout' },
      { type: 'vel', dur: 8, vx: 70, vy: -120 },
    ],
  },
};
