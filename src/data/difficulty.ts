import type { DifficultyId } from './types';

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  color: string;
  blurb: string;
  /** Multiplier for bullets per volley (parity of fans is preserved). */
  density: number;
  /** Multiplier for the number of rotating arms (parallel streams) of an emitter. */
  arms: number;
  /** Multiplier for bullet speeds and accelerations. */
  speed: number;
  /** Multiplier for the time between volleys (smaller = more frequent fire). */
  interval: number;
  /** Multiplier for enemy and boss hit points. */
  hp: number;
  /** Multiplier for score gained from enemies and spell bonuses. */
  score: number;
  /** Extra lives at the start of a run. */
  lives: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  easy: {
    id: 'easy',
    name: 'Easy',
    color: '#7be08a',
    blurb: 'Sparse, slow bullets. A gentle night flight.',
    density: 0.6,
    arms: 0.75,
    speed: 0.85,
    interval: 1.25,
    hp: 0.85,
    score: 0.5,
    lives: 4,
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    color: '#6fc4ff',
    blurb: 'The intended experience.',
    density: 1,
    arms: 1,
    speed: 1,
    interval: 1,
    hp: 1,
    score: 1,
    lives: 3,
  },
  hard: {
    id: 'hard',
    name: 'Hard',
    color: '#ffb35c',
    blurb: 'Denser, faster curtains. Bring your graze.',
    density: 1.3,
    arms: 1.3,
    speed: 1.1,
    interval: 0.9,
    hp: 1.1,
    score: 1.5,
    lives: 3,
  },
  lunatic: {
    id: 'lunatic',
    name: 'Lunatic',
    color: '#ff6b8a',
    blurb: 'A wall of light. Not for the faint of heart.',
    density: 1.6,
    arms: 1.6,
    speed: 1.22,
    interval: 0.82,
    hp: 1.25,
    score: 2,
    lives: 2,
  },
};

export const DIFFICULTY_LIST: DifficultyDef[] = [DIFFICULTIES.easy, DIFFICULTIES.normal, DIFFICULTIES.hard, DIFFICULTIES.lunatic];

export function difficultyIndex(id: DifficultyId): number {
  return DIFFICULTY_LIST.findIndex((d) => d.id === id);
}
