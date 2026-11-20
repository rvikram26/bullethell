import { FPS } from '../core/constants';
import { clamp, TAU } from '../core/math';
import { type BossDef, COLOR_NAMES, type PhaseDef } from '../data/types';
import { fxRng } from '../core/rng';
import { Mover, type Positioned } from './mover';
import { PatternRunner } from './runner';
import type { World } from './world';

export type BossMode = 'enter' | 'talk' | 'warmup' | 'fight' | 'break' | 'dying';

const ENTER_SECONDS = 1.3;
const BREAK_FRAMES = 55;
const DYING_FRAMES = 100;

/**
 * A boss or mid-boss. It walks through its phases in order; each phase has its own hit points,
 * time limit, attack pattern and movement script (see PhaseDef in data/types.ts).
 */
export class Boss implements Positioned {
  x: number;
  y = -50;
  mode: BossMode = 'enter';
  modeT = 0;
  /** Index of the current phase, -1 before the first one starts. */
  phase = -1;
  hp = 1;
  maxHp = 1;
  /** Frames the current attack has been running. */
  phaseT = 0;
  /** Time limit of the current phase in frames. */
  limit = 1;
  warmup = 0;
  spell = false;
  /** The player died during the current phase (voids the spell bonus). */
  missed = false;
  /** The player bombed during the current phase (voids the spell bonus). */
  bombed = false;
  hitFlash = 0;
  /** Smoothed horizontal velocity, used for the lean/flap animation. */
  lean = 0;
  runner: PatternRunner | null = null;
  readonly mover = new Mover();
  /** Index of the boss colour in COLOR_NAMES (effects and HUD tint). */
  readonly colorIdx: number;
  private lastSecond = -1;

  constructor(
    readonly def: BossDef,
    readonly before: string | null,
    readonly after: string | null,
    private readonly startPhase = 0,
  ) {
    this.x = def.entry.x;
    this.colorIdx = COLOR_NAMES.indexOf(def.color);
  }

  get radius(): number {
    return this.def.radius;
  }

  get currentPhase(): PhaseDef | null {
    return this.phase >= 0 ? this.def.phases[this.phase] : null;
  }

  get vulnerable(): boolean {
    return this.mode === 'fight';
  }

  /** Phases still to come after the current one (for the health-bar pips). */
  get remainingPhases(): number {
    return Math.max(0, this.def.phases.length - 1 - Math.max(0, this.phase));
  }

  get secondsLeft(): number {
    return Math.max(0, Math.ceil((this.limit - this.phaseT) / FPS));
  }

  init(w: World): void {
    this.mover.start(
      w.bank.inlinePath({ steps: [{ type: 'to', dur: ENTER_SECONDS, x: this.def.entry.x, y: this.def.entry.y, ease: 'out' }] }),
      this.x,
      this.y,
      false,
      w.rng,
    );
  }

  /** Apply player damage. Returns false when the boss cannot currently be hurt. */
  damage(amount: number): boolean {
    if (this.mode !== 'fight') return false;
    this.hp -= amount;
    this.hitFlash = 3;
    return true;
  }

  update(w: World): void {
    this.modeT++;
    if (this.hitFlash > 0) this.hitFlash--;
    const px = this.x;

    switch (this.mode) {
      case 'enter':
        this.mover.step(this, w.rng);
        if (this.modeT >= ENTER_SECONDS * FPS) {
          if (this.before) {
            this.mode = 'talk';
            this.modeT = 0;
            w.startDialogue(this.before);
          } else {
            this.beginPhase(w, this.startPhase);
          }
        }
        break;

      case 'talk':
        if (!w.dialogue) this.beginPhase(w, this.startPhase);
        break;

      case 'warmup':
        this.mover.step(this, w.rng);
        if (this.modeT >= this.warmup) this.beginFight(w);
        break;

      case 'fight': {
        this.phaseT++;
        this.mover.step(this, w.rng);
        if (this.runner) this.runner.update(w, this.x, this.y);
        const sec = this.secondsLeft;
        if (sec !== this.lastSecond) {
          this.lastSecond = sec;
          if (sec <= 10 && sec > 0) w.sfx('tick');
        }
        if (this.hp <= 0) this.endPhase(w, true);
        else if (this.phaseT >= this.limit) this.endPhase(w, false);
        break;
      }

      case 'break':
        if (this.modeT >= BREAK_FRAMES) this.beginPhase(w, this.phase + 1);
        break;

      case 'dying':
        if (this.modeT % 7 === 0) {
          const a = fxRng.range(0, TAU);
          const r = fxRng.range(4, 22);
          w.particles.burst(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, this.colorIdx, 6, 3, 26, 6);
          w.particles.ring(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, 9, 3, 2.5, 18);
          w.sfx('enemy-die');
        }
        if (this.modeT >= DYING_FRAMES) w.bossDefeated(this);
        break;
    }

    this.lean += (clamp((this.x - px) * 0.8, -1, 1) - this.lean) * 0.2;
  }

  private beginPhase(w: World, index: number): void {
    const p = this.def.phases[index];
    this.phase = index;
    this.spell = p.name !== undefined;
    this.maxHp = this.hp = Math.max(1, Math.round(p.hp * w.diff.hp));
    this.limit = Math.max(1, p.time * FPS);
    this.warmup = (p.warmup ?? (this.spell ? 1.5 : 0.7)) * FPS;
    this.mode = 'warmup';
    this.modeT = 0;
    this.phaseT = 0;
    this.missed = false;
    this.bombed = false;
    this.runner = null;
    this.lastSecond = -1;

    const dest = p.at ?? { x: this.x, y: this.y };
    this.mover.start(
      w.bank.inlinePath({
        steps: [{ type: 'to', dur: Math.max(0.4, (this.warmup / FPS) * 0.85), x: dest.x, y: dest.y, ease: 'inout' }],
      }),
      this.x,
      this.y,
      false,
      w.rng,
    );
    if (this.spell) w.announceSpell(this, p);
  }

  private beginFight(w: World): void {
    const p = this.def.phases[this.phase];
    this.mode = 'fight';
    this.modeT = 0;
    this.phaseT = 0;
    this.runner = new PatternRunner(w.bank.pattern(p.pattern));
    this.mover.start(p.move ? w.bank.inlinePath(p.move) : null, this.x, this.y, false, w.rng);
  }

  private endPhase(w: World, killed: boolean): void {
    const p = this.def.phases[this.phase];
    let captured = false;
    let bonus = 0;
    if (this.spell) {
      captured = killed && !this.missed && !this.bombed;
      if (captured) {
        const ratio = clamp(1 - this.phaseT / this.limit, 0, 1);
        bonus = Math.round((p.bonus ?? 500_000) * w.diff.score * (0.5 + 0.5 * ratio));
      }
    }
    w.phaseEnded(this, p, killed, captured, bonus);
    this.runner = null;
    this.mover.start(null, this.x, this.y, false, w.rng);
    const last = this.phase >= this.def.phases.length - 1;
    this.mode = last ? 'dying' : 'break';
    this.modeT = 0;
  }
}
