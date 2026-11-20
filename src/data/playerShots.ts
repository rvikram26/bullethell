/**
 * The player's shot patterns, one entry per power level. Edit these tables to rebalance or add
 * levels; the simulation reads nothing else.
 */

export type ShotSprite = 'needle' | 'amulet';

export interface ShotSpec {
  /** Offset from the firing point (the player or an option), px. */
  dx: number;
  dy: number;
  /** Degrees from straight up, positive = right. */
  angle: number;
  /** Replacement angle while focused (default: angle scaled down for a tight stream). */
  focusAngle?: number;
  dmg: number;
  /** px/frame. */
  speed: number;
  /** Maximum turn rate in degrees per frame; omit for straight shots. */
  homing?: number;
  sprite: ShotSprite;
}

export interface OptionSpec {
  /** Position relative to the player when moving freely / when focused. */
  spread: readonly [number, number];
  focus: readonly [number, number];
  shots: ShotSpec[];
  /** Shots used instead of `shots` while focused. */
  focusShots: ShotSpec[];
}

export interface ShotLevel {
  /** Minimum power needed for this level. */
  power: number;
  /** Frames between volleys. */
  interval: number;
  main: ShotSpec[];
  options: OptionSpec[];
}

const needle = (dx: number, angle: number, dmg: number, focusAngle?: number): ShotSpec => ({
  dx,
  dy: -10,
  angle,
  focusAngle,
  dmg,
  speed: 16,
  sprite: 'needle',
});

const homing = (dmg: number, angle = 0): ShotSpec => ({
  dx: 0,
  dy: -6,
  angle,
  dmg,
  speed: 10,
  homing: 5,
  sprite: 'amulet',
});

const straight = (dmg: number): ShotSpec => ({ dx: 0, dy: -8, angle: 0, dmg, speed: 16, sprite: 'needle' });

export const SHOT_LEVELS: ShotLevel[] = [
  // Level 1: single stream
  { power: 0, interval: 5, main: [needle(0, 0, 10)], options: [] },
  // Level 2: double stream
  { power: 16, interval: 5, main: [needle(-6, 0, 8), needle(6, 0, 8)], options: [] },
  // Level 3: three-way spread plus two straight options
  {
    power: 40,
    interval: 5,
    main: [needle(0, 0, 8), needle(-7, -7, 5, -1.5), needle(7, 7, 5, 1.5)],
    options: [
      { spread: [-24, 6], focus: [-13, -8], shots: [straight(3)], focusShots: [straight(4)] },
      { spread: [24, 6], focus: [13, -8], shots: [straight(3)], focusShots: [straight(4)] },
    ],
  },
  // Level 4: spread plus two homing options
  {
    power: 72,
    interval: 5,
    main: [needle(0, 0, 8), needle(-7, -8, 5, -1.5), needle(7, 8, 5, 1.5)],
    options: [
      { spread: [-26, 4], focus: [-13, -8], shots: [homing(5)], focusShots: [straight(6)] },
      { spread: [26, 4], focus: [13, -8], shots: [homing(5)], focusShots: [straight(6)] },
    ],
  },
  // Level 5: five-way spread and four options (inner straight, outer homing)
  {
    power: 100,
    interval: 5,
    main: [
      needle(0, 0, 8),
      needle(-6, -6, 5, -1.2),
      needle(6, 6, 5, 1.2),
      needle(-10, -14, 3, -3),
      needle(10, 14, 3, 3),
    ],
    options: [
      { spread: [-18, -2], focus: [-9, -10], shots: [straight(4)], focusShots: [straight(5)] },
      { spread: [18, -2], focus: [9, -10], shots: [straight(4)], focusShots: [straight(5)] },
      { spread: [-36, 10], focus: [-19, -2], shots: [homing(5)], focusShots: [straight(5)] },
      { spread: [36, 10], focus: [19, -2], shots: [homing(5)], focusShots: [straight(5)] },
    ],
  },
];

export function shotLevelForPower(power: number): number {
  let lvl = 0;
  for (let i = 0; i < SHOT_LEVELS.length; i++) if (power >= SHOT_LEVELS[i].power) lvl = i;
  return lvl;
}
