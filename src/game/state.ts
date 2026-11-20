import { DIFFICULTIES } from '../data/difficulty';
import type { DifficultyId } from '../data/types';

/** Score thresholds that award an extra life; after the table the interval repeats. */
const EXTEND_SCORES = [2_000_000, 5_000_000, 10_000_000, 18_000_000];
const EXTEND_REPEAT = 10_000_000;

export function extendThreshold(n: number): number {
  if (n < EXTEND_SCORES.length) return EXTEND_SCORES[n];
  return EXTEND_SCORES[EXTEND_SCORES.length - 1] + (n - EXTEND_SCORES.length + 1) * EXTEND_REPEAT;
}

export interface StageStats {
  misses: number;
  bombs: number;
  spellsSeen: number;
  spellsCaptured: number;
  grazeAtStart: number;
  scoreAtStart: number;
}

/** State that survives from one stage to the next within a run. */
export interface RunState {
  difficulty: DifficultyId;
  practice: boolean;
  /** Index of the stage currently being played (0-based). */
  stage: number;
  score: number;
  hiScore: number;
  /** Extra lives. Dying with 0 left ends the run. */
  lives: number;
  bombs: number;
  fragments: number;
  power: number;
  graze: number;
  extendsGiven: number;
  continues: number;
  stats: StageStats;
  totals: { misses: number; bombs: number; spellsSeen: number; spellsCaptured: number };
}

export function freshStageStats(run: Pick<RunState, 'graze' | 'score'>): StageStats {
  return { misses: 0, bombs: 0, spellsSeen: 0, spellsCaptured: 0, grazeAtStart: run.graze, scoreAtStart: run.score };
}

export function newRun(difficulty: DifficultyId, practice: boolean, stage: number, hiScore: number): RunState {
  const run: RunState = {
    difficulty,
    practice,
    stage,
    score: 0,
    hiScore,
    lives: DIFFICULTIES[difficulty].lives,
    bombs: 3,
    fragments: 0,
    power: practice ? 100 : 0,
    graze: 0,
    extendsGiven: 0,
    continues: 0,
    stats: { misses: 0, bombs: 0, spellsSeen: 0, spellsCaptured: 0, grazeAtStart: 0, scoreAtStart: 0 },
    totals: { misses: 0, bombs: 0, spellsSeen: 0, spellsCaptured: 0 },
  };
  return run;
}

/** Debug switches, set from the URL (see main.ts). All optional. */
export interface DebugOptions {
  /** Cannot be hit. */
  god?: boolean;
  /** Jump the timeline to the n-th boss entry (0 = mid-boss, 1 = boss). */
  skipToBoss?: number;
  /** Start the boss at this phase index. */
  phase?: number;
  power?: number;
}
