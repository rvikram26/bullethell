import type { EnemyDef } from './types';

/**
 * Enemy archetypes. A timeline step may override the path, pattern, hit points, drops and tint of
 * any of these when it spawns one.
 */
export const ENEMIES: Record<string, EnemyDef> = {
  // --- Stage 1: the Marsh of Wicks ---------------------------------------------------------
  wisp: { sprite: 'wisp', tint: 'cyan', hp: 14, radius: 9, score: 200, path: 'down', drop: { point: 1 } },
  wispShot: {
    sprite: 'wisp',
    tint: 'orange',
    hp: 20,
    radius: 9,
    score: 300,
    path: 'sine-down',
    pattern: 'wisp-aimed',
    patternDelay: 0.3,
    drop: { power: 1 },
  },
  moth: {
    sprite: 'moth',
    tint: 'pink',
    hp: 130,
    radius: 13,
    score: 1500,
    path: 'hover-mid',
    pattern: 'moth-fan',
    drop: { bigPower: 1, point: 3 },
  },
  glowcap: {
    sprite: 'glowcap',
    tint: 'green',
    hp: 170,
    radius: 14,
    score: 2500,
    path: 'hover-long',
    pattern: 'glowcap-spiral',
    drop: { bigPower: 1, point: 4 },
  },

  // --- Stage 2: the Cloudway Observatory ------------------------------------------------------
  cog: { sprite: 'cog', tint: 'yellow', hp: 18, radius: 9, score: 250, path: 'down', drop: { point: 1 } },
  cogShot: {
    sprite: 'cog',
    tint: 'orange',
    hp: 26,
    radius: 9,
    score: 350,
    path: 'sine-down',
    pattern: 'cog-pair',
    patternDelay: 0.3,
    drop: { power: 1 },
  },
  sparrow: { sprite: 'sparrow', tint: 'cyan', hp: 14, radius: 8, score: 250, path: 'down-fast', drop: { point: 1 } },
  sparrowShot: {
    sprite: 'sparrow',
    tint: 'pink',
    hp: 18,
    radius: 8,
    score: 350,
    path: 'diag-steep',
    pattern: 'sparrow-burst',
    patternDelay: 0.2,
    drop: { power: 1 },
  },
  orrery: {
    sprite: 'orrery',
    tint: 'purple',
    hp: 240,
    radius: 15,
    score: 3000,
    path: 'hover-mid',
    pattern: 'orrery-rings',
    drop: { bigPower: 1, point: 4 },
  },

  // --- Stage 3: the Beacon Spire --------------------------------------------------------------
  stormling: { sprite: 'stormling', tint: 'blue', hp: 22, radius: 10, score: 300, path: 'sine-fast', drop: { point: 1 } },
  stormlingShot: {
    sprite: 'stormling',
    tint: 'cyan',
    hp: 30,
    radius: 10,
    score: 400,
    path: 'sine-wide',
    pattern: 'storm-fan',
    patternDelay: 0.3,
    drop: { power: 1 },
  },
  shade: {
    sprite: 'shade',
    tint: 'purple',
    hp: 34,
    radius: 9,
    score: 450,
    path: 'swoop',
    pattern: 'shade-trio',
    patternDelay: 0.2,
    drop: { power: 1, point: 1 },
  },
  crystal: {
    sprite: 'crystal',
    tint: 'white',
    hp: 300,
    radius: 15,
    score: 3500,
    path: 'hover-long',
    pattern: 'crystal-lattice',
    drop: { bigPower: 1, point: 5 },
  },
};
