import { FPS } from '../core/constants';
import type { StageDef, TimelineStep } from '../data/types';
import type { World } from './world';

export type SpawnStep = Extract<TimelineStep, { type: 'spawn' }>;

export interface ExpandedStep {
  /** Timeline frame at which the step fires. */
  t: number;
  step: TimelineStep;
}

/** Turn authoring macros (waves) into plain spawns and sort everything by time. */
export function expandTimeline(steps: readonly TimelineStep[]): ExpandedStep[] {
  const out: ExpandedStep[] = [];
  for (const s of steps) {
    if (s.type === 'wave') {
      const { count, every, dx, alternate, ...rest } = s;
      for (let i = 0; i < count; i++) {
        const flipped = alternate ? i % 2 === 1 : false;
        const spawn: SpawnStep = {
          ...rest,
          type: 'spawn',
          t: s.t + i * every,
          x: s.x + i * (dx ?? 0),
          flip: flipped !== (s.flip === true),
        };
        out.push({ t: Math.round(spawn.t * FPS), step: spawn });
      }
    } else {
      out.push({ t: Math.round(s.t * FPS), step: s });
    }
  }
  // Array.prototype.sort is stable, so steps with equal times keep their authored order.
  return out.sort((a, b) => a.t - b.t);
}

type Block = 'none' | 'boss' | 'dialogue' | 'clear' | 'end';

/**
 * Plays a stage timeline. The clock only advances while nothing blocks it: a boss step holds the
 * timeline until the boss is gone, a dialogue until it is dismissed, and so on.
 */
export class StageRunner {
  readonly steps: ExpandedStep[];
  idx = 0;
  clock = 0;
  blocked: Block = 'none';
  private clearLimit = 0;

  constructor(readonly def: StageDef) {
    this.steps = expandTimeline(def.steps);
  }

  /** Index into `steps` of the n-th boss step (0 = mid-boss when the stage has one), or -1. */
  bossStepIndex(n: number): number {
    let seen = 0;
    for (let i = 0; i < this.steps.length; i++) {
      if (this.steps[i].step.type === 'boss') {
        if (seen === n) return i;
        seen++;
      }
    }
    return -1;
  }

  /** Debug: jump so the n-th boss entry is next. */
  skipToBoss(n: number): void {
    const i = this.bossStepIndex(n);
    if (i < 0) return;
    this.idx = i;
    this.clock = this.steps[i].t;
  }

  get finished(): boolean {
    return this.blocked === 'end';
  }

  update(w: World): void {
    switch (this.blocked) {
      case 'end':
        return;
      case 'boss':
        if (w.boss === null && w.dialogue === null) this.blocked = 'none';
        else return;
        break;
      case 'dialogue':
        if (w.dialogue === null) this.blocked = 'none';
        else return;
        break;
      case 'clear':
        if (w.activeEnemyCount() === 0 || --this.clearLimit <= 0) this.blocked = 'none';
        else return;
        break;
      default:
        break;
    }

    this.clock++;
    while (this.idx < this.steps.length && this.steps[this.idx].t <= this.clock) {
      const { step } = this.steps[this.idx++];
      this.run(step, w);
      if (this.blocked !== 'none') break;
    }
  }

  private run(step: TimelineStep, w: World): void {
    switch (step.type) {
      case 'spawn':
        w.spawnEnemy(step);
        break;
      case 'wave':
        break; // expanded at load
      case 'boss':
        w.startBoss(step.boss, step.before ?? null, step.after ?? null);
        this.blocked = 'boss';
        break;
      case 'dialogue':
        w.startDialogue(step.id);
        this.blocked = 'dialogue';
        break;
      case 'banner':
        w.showBanner(step.text, step.sub ?? '');
        break;
      case 'music':
        w.host.music(step.track);
        break;
      case 'waitClear':
        this.blocked = 'clear';
        this.clearLimit = Math.round((step.max ?? 12) * FPS);
        break;
      case 'end':
        w.beginStageEnd();
        this.blocked = 'end';
        break;
    }
  }
}
