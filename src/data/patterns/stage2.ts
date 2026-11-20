import type { BulletDef, PatternDef } from '../types';
import { big, dart, gem, needle, orb, pattern, pellet, rice, ring, star } from './helpers';

/** A falling dart that zig-zags: it veers off, swings back across, then veers off again. */
const zigzag = (color: 'cyan' | 'purple', dir: 1 | -1): BulletDef =>
  dart(color, 140, {
    events: [
      { at: 0.8, do: 'turn', by: 55 * dir },
      { at: 1.7, do: 'turn', by: -110 * dir },
      { at: 2.6, do: 'turn', by: 110 * dir },
      { at: 3.5, do: 'turn', by: -110 * dir },
    ],
  });

/**
 * Stage 2 - the Cloudway Observatory. Mechanical rhythm: counter-rotating rings, bouncing
 * parcels, lattice crossings and bullets that change direction on a timer.
 */
export const STAGE2_PATTERNS: Record<string, PatternDef> = {
  // --- ordinary enemies ----------------------------------------------------------------------
  'cog-pair': pattern({ delay: 0.2, interval: 1.1, volleys: 3, aim: 'player', count: 2, spread: 16, bullet: rice('yellow', 165), sfx: 'shot-small' }),

  'sparrow-burst': pattern({ delay: 0.2, interval: 0.11, volleys: 4, aim: 'player', count: 1, bullet: dart('pink', 210), sfx: 'shot-small' }),

  'orrery-rings': pattern(
    { delay: 0.5, interval: 0.28, cycle: 6, volleys: 15, arms: 3, count: 1, angleStep: 14, bullet: orb('purple', 120), sfx: 'shot-small' },
    { delay: 3.4, interval: 0.28, cycle: 6, volleys: 15, arms: 3, count: 1, angleStep: -14, bullet: orb('cyan', 120) },
    { delay: 1.0, interval: 2.4, aim: 'player', count: 7, spread: 70, bullet: gem('yellow', 150), sfx: 'shot-mid' },
  ),

  // --- mid-boss: Brindle, Gearmouse Courier -----------------------------------------------------
  // Non-spell: she dashes across the field, dropping needles behind her.
  'brindle-1': pattern(
    { delay: 0.8, interval: 0.12, aim: 'fixed', angle: 90, count: 1, bullet: needle('yellow', 230), sfx: 'shot-small' },
    { delay: 1.0, interval: 1.4, aim: 'player', count: 5, spread: 50, bullet: gem('orange', 160), sfx: 'shot-mid' },
  ),

  // Spell card: Parcel Rite "Special Delivery". Parcels ricochet off the walls.
  'brindle-spell': pattern(
    { delay: 0.6, interval: 1.5, count: 20, angleStep: 7, bullet: gem('orange', 135, { bounce: 1 }), sfx: 'shot-mid' },
    { delay: 1.2, interval: 2.4, aim: 'player', count: 3, spread: 24, bullet: big('yellow', 110, { bounce: 2 }), sfx: 'shot-big' },
    { delay: 0.8, interval: 0.28, aim: 'random', count: 1, bullet: star('white', 100, { bounce: 1 }) },
  ),

  // --- boss: Vesper Quillon, Astronomer of Cracked Glass ----------------------------------------
  // Non-spell: falling stars, aimed gem fans and slow purple rings.
  'vesper-1': pattern(
    { origin: 'field', x: 192, xRand: 192, y: -6, interval: 0.1, aim: 'fixed', angle: 90, count: 1, speedRand: 35, bullet: star('yellow', 105) },
    { delay: 0.8, interval: 1.3, aim: 'player', count: 3, spread: 30, bullet: gem('cyan', 175), sfx: 'shot-mid' },
    { delay: 2.0, interval: 3.2, count: 22, angleStep: 10, bullet: orb('purple', 100), sfx: 'shot-small' },
  ),

  // Spell card: Constellation Rite "Orrery Spin". Two rings of stars rotate against each other.
  'vesper-orrery': pattern(
    { delay: 0.5, interval: 0.17, cycle: 8, volleys: 33, count: 16, angleStep: 6, bullet: star('cyan', 130), sfx: 'shot-small' },
    { delay: 4.5, interval: 0.17, cycle: 8, volleys: 33, count: 16, angleStep: -6, bullet: star('purple', 95) },
    { delay: 1.0, interval: 2.0, aim: 'player', count: 1, layers: 3, layerSpeed: 40, bullet: dart('white', 170), sfx: 'shot-mid' },
  ),

  // Non-spell: comets (layered needle streaks) and star rain.
  'vesper-comets': pattern(
    { delay: 0.6, interval: 1.2, aim: 'player', count: 5, spread: 34, layers: 5, layerSpeed: 30, bullet: needle('white', 150), sfx: 'shot-mid' },
    { origin: 'field', x: 192, xRand: 192, y: -6, interval: 0.12, aim: 'fixed', angle: 90, count: 1, bullet: star('yellow', 120) },
    { delay: 1.5, interval: 2.6, count: 20, angleStep: 13, bullet: rice('cyan', 110), sfx: 'shot-small' },
  ),

  // Spell card: Lens Rite "Refraction Rain". Rain that bends, again and again, on its way down.
  'vesper-lens': pattern(
    { origin: 'field', x: 192, xRand: 192, y: -6, interval: 0.1, aim: 'fixed', angle: 90, count: 1, bullet: zigzag('cyan', 1) },
    { origin: 'field', x: 192, xRand: 192, y: -6, interval: 0.1, aim: 'fixed', angle: 90, count: 1, bullet: zigzag('purple', -1) },
    { delay: 1.0, interval: 2.2, count: 24, angleStep: 10, bullet: ring('white', 105), sfx: 'shot-big' },
  ),

  // Spell card: Eclipse Rite "Umbral Clockwork". Six gear-teeth arms turn one way, then the other.
  'vesper-eclipse': pattern(
    { delay: 0.4, interval: 0.08, cycle: 14, volleys: 80, arms: 8, count: 1, angle: 20, angleStep: 6.5, bullet: rice('purple', 100, { accel: 25, maxSpeed: 190 }), sfx: 'shot-small' },
    { delay: 7.4, interval: 0.08, cycle: 14, volleys: 80, arms: 8, count: 1, angle: 0, angleStep: -6.5, bullet: rice('orange', 100, { accel: 25, maxSpeed: 190 }) },
    {
      delay: 2.0,
      interval: 3.6,
      aim: 'player',
      count: 1,
      bullet: big('white', 140, { accel: -110, events: [{ at: 1.3, do: 'split', count: 20, bullet: ring('white', 95) }] }),
      sfx: 'shot-big',
    },
    { delay: 3.0, interval: 0.8, aim: 'player', count: 1, bullet: pellet('yellow', 200) },
  ),
};
