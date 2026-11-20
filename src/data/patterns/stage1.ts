import type { PatternDef } from '../types';
import { big, needle, orb, pattern, pellet, rice } from './helpers';

/**
 * Stage 1 - the Marsh of Wicks. Gentle introduction: aimed shots, rings, simple spirals,
 * then curving arms and bullets that split in two stages.
 */
export const STAGE1_PATTERNS: Record<string, PatternDef> = {
  // --- ordinary enemies ----------------------------------------------------------------------
  'wisp-aimed': pattern({ delay: 0.15, interval: 1.2, volleys: 2, aim: 'player', count: 1, bullet: pellet('red', 140), sfx: 'shot-small' }),

  'moth-fan': pattern(
    { delay: 0.4, interval: 1.7, aim: 'player', count: 5, spread: 56, bullet: rice('pink', 150), sfx: 'shot-mid' },
    { delay: 1.2, interval: 3.4, count: 12, angleStep: 13, bullet: orb('cyan', 85), sfx: 'shot-small' },
  ),

  'glowcap-spiral': pattern({
    delay: 0.3,
    interval: 0.14,
    cycle: 7,
    volleys: 34,
    count: 2,
    angleStep: 19,
    bullet: orb('green', 100),
    sfx: 'shot-small',
  }),

  // --- mid-boss: Tamsin, Moth of the Lower Lamps ----------------------------------------------
  'tamsin-1': pattern(
    { delay: 0.6, interval: 1.0, aim: 'player', count: 3, spread: 34, bullet: rice('cyan', 175), sfx: 'shot-mid' },
    { delay: 0.9, interval: 1.8, count: 16, angleStep: 11, bullet: orb('pink', 95), sfx: 'shot-small' },
  ),

  // Spell card: Dust Rite "Scale Snowfall".
  'tamsin-spell': pattern(
    // wing scales drifting down from the top edge, half curving each way
    { origin: 'field', x: 192, xRand: 192, y: -6, interval: 0.07, aim: 'fixed', angle: 90, count: 1, speedRand: 25, bullet: pellet('white', 95, { curve: 14 }) },
    { origin: 'field', x: 192, xRand: 192, y: -6, interval: 0.07, aim: 'fixed', angle: 90, count: 1, speedRand: 25, bullet: pellet('yellow', 95, { curve: -14 }) },
    // heavy lantern-moths that burst into a ring
    {
      delay: 1.5,
      interval: 3.0,
      count: 9,
      angleStep: 17,
      bullet: big('pink', 80, { events: [{ at: 1.0, do: 'split', count: 8, bullet: orb('orange', 100) }] }),
      sfx: 'shot-big',
    },
  ),

  // --- boss: Odalys, Warden of the Marsh Lights -------------------------------------------------
  // Non-spell: two counter-rotating three-arm spirals, taking turns, plus aimed fans.
  'odalys-1': pattern(
    { delay: 0.2, interval: 0.09, cycle: 12, volleys: 55, arms: 4, count: 1, angle: 90, angleStep: 8, bullet: orb('green', 115), sfx: 'shot-small' },
    { delay: 6.2, interval: 0.09, cycle: 12, volleys: 55, arms: 4, count: 1, angle: 90, angleStep: -8, bullet: orb('cyan', 115), sfx: 'shot-small' },
    { delay: 1.0, interval: 1.6, aim: 'player', count: 5, spread: 60, bullet: rice('pink', 175), sfx: 'shot-mid' },
  ),

  // Spell card: Wick Rite "Procession of Lights".
  // Rings of lights drift out, hang motionless, then all turn towards the player and speed up.
  'odalys-wicks': pattern(
    {
      delay: 0.5,
      interval: 2.3,
      count: 24,
      angleStep: 9,
      bullet: orb('yellow', 170, {
        accel: -180,
        events: [
          { at: 1.4, do: 'turn', aim: true, jitter: 6 },
          { at: 1.4, do: 'speed', value: 30, accel: 120, max: 240 },
        ],
      }),
      sfx: 'shot-big',
    },
    {
      delay: 1.65,
      interval: 2.3,
      count: 24,
      angleStep: -9,
      bullet: orb('orange', 170, {
        accel: -180,
        events: [
          { at: 1.4, do: 'turn', aim: true, jitter: 6 },
          { at: 1.4, do: 'speed', value: 30, accel: 120, max: 240 },
        ],
      }),
    },
    { delay: 1.0, interval: 1.7, aim: 'player', count: 3, spread: 30, bullet: needle('cyan', 220), sfx: 'shot-mid' },
  ),

  // Non-spell: sweeping needle fans, reed rain and slow blue rings.
  'odalys-reed': pattern(
    { delay: 0.3, interval: 0.08, aim: 'fixed', angle: 90, sway: { amp: 50, period: 5 }, count: 3, spread: 36, bullet: needle('cyan', 200), sfx: 'shot-small' },
    { origin: 'field', x: 192, xRand: 192, y: -6, interval: 0.16, aim: 'fixed', angle: 90, count: 1, speedRand: 30, bullet: pellet('lime', 110) },
    { delay: 1.5, interval: 3.0, count: 18, angleStep: 12, bullet: rice('blue', 120), sfx: 'shot-mid' },
  ),

  // Spell card: Marsh Rite "Hundred Wicks Waltz".
  // Curving four-arm spirals take turns in opposite directions while heavy lamps split twice.
  'odalys-waltz': pattern(
    { delay: 0.4, interval: 0.07, cycle: 12, volleys: 80, arms: 5, count: 1, angle: 45, angleStep: 5.5, bullet: orb('red', 105, { curve: 22 }), sfx: 'shot-small' },
    { delay: 6.4, interval: 0.07, cycle: 12, volleys: 80, arms: 5, count: 1, angle: 0, angleStep: -5.5, bullet: orb('blue', 105, { curve: -22 }), sfx: 'shot-small' },
    {
      delay: 2.0,
      interval: 4.2,
      aim: 'player',
      count: 1,
      bullet: big('pink', 85, {
        events: [
          {
            at: 0.9,
            do: 'split',
            count: 10,
            bullet: rice('pink', 120, {
              events: [{ at: 0.9, do: 'split', count: 3, spread: 36, base: 'aim', bullet: pellet('white', 140) }],
            }),
          },
        ],
      }),
      sfx: 'shot-big',
    },
  ),
};
