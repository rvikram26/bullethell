import type { PatternDef } from '../types';
import { big, dart, gem, needle, orb, pattern, pellet, rice, ring, star } from './helpers';

/**
 * Stage 3 - the Beacon Spire. The densest curtains in the game: long sequenced spells (each
 * emitter takes a turn within a repeating cycle), nested splits and layered rings.
 */
export const STAGE3_PATTERNS: Record<string, PatternDef> = {
  // --- ordinary enemies ----------------------------------------------------------------------
  'storm-fan': pattern({ delay: 0.3, interval: 1.0, volleys: 3, aim: 'player', count: 3, spread: 40, bullet: dart('cyan', 190), sfx: 'shot-small' }),

  'shade-trio': pattern({ delay: 0.2, interval: 0.9, volleys: 3, aim: 'player', count: 3, spread: 20, bullet: needle('purple', 210), sfx: 'shot-small' }),

  'crystal-lattice': pattern(
    { delay: 0.4, interval: 1.8, count: 16, angleStep: 11.25, bullet: gem('white', 120), sfx: 'shot-mid' },
    { delay: 1.3, interval: 1.8, count: 16, angleStep: -11.25, bullet: gem('cyan', 90) },
    { delay: 0.8, interval: 2.4, aim: 'player', count: 5, spread: 40, bullet: rice('blue', 190) },
  ),

  // --- mid-boss: Kessra, Herald of the Storm ---------------------------------------------------
  // Non-spell: needles streak in from both walls while fans are aimed at the player.
  'kessra-1': pattern(
    { origin: 'field', x: -6, y: 230, yRand: 170, interval: 0.2, aim: 'fixed', angle: 0, count: 1, speedRand: 40, bullet: needle('cyan', 190) },
    { origin: 'field', x: 390, y: 230, yRand: 170, interval: 0.2, aim: 'fixed', angle: 180, count: 1, speedRand: 40, bullet: needle('white', 190) },
    { delay: 0.6, interval: 1.3, aim: 'player', count: 5, spread: 44, bullet: dart('blue', 170), sfx: 'shot-mid' },
  ),

  // Spell card: Thunder Rite "Forked Heralds". Every bolt forks twice, like lightning.
  'kessra-spell': pattern(
    {
      delay: 0.8,
      interval: 1.5,
      aim: 'player',
      count: 5,
      spread: 70,
      bullet: big('yellow', 125, {
        events: [
          {
            at: 0.7,
            do: 'split',
            count: 2,
            spread: 70,
            base: 'heading',
            bullet: dart('yellow', 150, {
              events: [{ at: 0.8, do: 'split', count: 2, spread: 60, base: 'heading', bullet: needle('white', 175) }],
            }),
          },
        ],
      }),
      sfx: 'shot-big',
    },
    { delay: 0.3, interval: 2.0, count: 14, angleStep: 17, bullet: orb('cyan', 100), sfx: 'shot-small' },
  ),

  // --- boss: Auriel Nocturne, the Dimmed Beacon ---------------------------------------------------
  // Non-spell: swaying twin columns of embers, wide red fans and a drizzle of sparks.
  'auriel-1': pattern(
    { delay: 0.3, interval: 0.16, cycle: 9, volleys: 36, aim: 'fixed', angle: 90, sway: { amp: 70, period: 4.2 }, count: 2, spread: 24, bullet: orb('orange', 150), sfx: 'shot-small' },
    { delay: 1.2, interval: 1.8, aim: 'player', count: 7, spread: 90, bullet: rice('red', 160), sfx: 'shot-mid' },
    { origin: 'field', x: 192, xRand: 192, y: -6, interval: 0.25, aim: 'fixed', angle: 90, count: 1, bullet: pellet('yellow', 90) },
  ),

  // Spell card: Unlit Rite "Vigil of Candles". Dripping candle-columns, flame fans and halos.
  'auriel-candles': pattern(
    { origin: 'field', x: 192, xRand: 192, y: -6, interval: 0.3, aim: 'fixed', angle: 90, count: 1, layers: 5, layerSpeed: 16, bullet: orb('yellow', 70) },
    { delay: 1.0, interval: 0.9, aim: 'player', count: 9, spread: 100, bullet: needle('orange', 190), sfx: 'shot-mid' },
    { delay: 0.5, interval: 2.6, count: 30, angleStep: 6, bullet: ring('white', 85), sfx: 'shot-big' },
  ),

  // Spell card: Dim Rite "Falling Halo". Expanding halos with rotating gaps, and star comets.
  'auriel-halo': pattern(
    { delay: 0.5, interval: 0.8, count: 36, angleStep: 5, bullet: ring('cyan', 100, { accel: 8, maxSpeed: 150 }), sfx: 'shot-mid' },
    { delay: 0.9, interval: 0.8, count: 36, angleStep: -5, bullet: ring('pink', 85, { accel: 8, maxSpeed: 140 }) },
    { delay: 2.0, interval: 2.2, aim: 'player', count: 1, layers: 5, layerSpeed: 28, bullet: star('yellow', 150), sfx: 'shot-big' },
  ),

  // Non-spell: curving three-arm sprays that reverse direction every ten seconds.
  'auriel-wind': pattern(
    { delay: 0.3, interval: 0.07, cycle: 10, volleys: 70, aim: 'fixed', angle: 0, angleStep: 4.3, count: 1, arms: 4, bullet: rice('purple', 135, { curve: 18 }), sfx: 'shot-small' },
    { delay: 5.3, interval: 0.07, cycle: 10, volleys: 70, aim: 'fixed', angle: 0, angleStep: -4.3, count: 1, arms: 4, bullet: rice('blue', 135, { curve: -18 }) },
    { delay: 1.0, interval: 2.2, aim: 'player', count: 4, spread: 30, bullet: gem('white', 160), sfx: 'shot-mid' },
  ),

  // Spell card: Last Light Rite "Beacon Requiem". Three movements of eight seconds each, repeated.
  'auriel-requiem': pattern(
    // movement one: counter-turning needle beams
    { delay: 0.5, cycle: 24, interval: 0.06, volleys: 130, arms: 8, count: 1, angle: 0, angleStep: 3.1, bullet: needle('cyan', 150), sfx: 'shot-small' },
    { delay: 0.5, cycle: 24, interval: 0.06, volleys: 130, arms: 8, count: 1, angle: 22, angleStep: -3.1, bullet: needle('pink', 105) },
    // movement two: pulses of heavy white orbs that burst into curving embers, wrapped in stars
    {
      delay: 8.5,
      cycle: 24,
      interval: 1.0,
      volleys: 7,
      count: 14,
      angleStep: 11,
      bullet: big('white', 105, { events: [{ at: 1.1, do: 'split', count: 8, bullet: orb('yellow', 110, { curve: 25 }) }] }),
      sfx: 'shot-big',
    },
    { delay: 8.5, cycle: 24, interval: 0.12, volleys: 60, count: 2, angleStep: 17, bullet: star('orange', 140) },
    // movement three: wide aimed star fans over a downpour
    { delay: 16.5, cycle: 24, interval: 0.7, volleys: 11, aim: 'player', count: 9, spread: 100, bullet: star('red', 150), sfx: 'shot-mid' },
    { delay: 16.5, cycle: 24, interval: 0.07, volleys: 100, origin: 'field', x: 192, xRand: 192, y: -6, aim: 'fixed', angle: 90, count: 1, speedRand: 40, bullet: pellet('white', 125) },
  ),
};
