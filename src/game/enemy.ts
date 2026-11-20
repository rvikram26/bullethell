import type { DropDef, EnemySpriteId } from '../data/types';
import type { CPattern } from './compile';
import { Mover, type Positioned } from './mover';
import type { PatternRunner } from './runner';

/** A regular (non-boss) enemy. Instances are pooled by the world and reused. */
export class Enemy implements Positioned {
  active = false;
  id = '';
  sprite: EnemySpriteId = 'wisp';
  /** Index into COLOR_NAMES used by the sprite renderer to tint the creature. */
  tint = 5;
  x = 0;
  y = 0;
  hp = 1;
  maxHp = 1;
  radius = 8;
  score = 0;
  age = 0;
  flip = false;
  hitFlash = 0;
  /** Has been inside the playfield at least once (then leaving it removes the enemy). */
  entered = false;
  /** Frames spent inside the playfield. */
  fieldTime = 0;
  mover = new Mover();
  pattern: CPattern | null = null;
  patternDelay = 0;
  runner: PatternRunner | null = null;
  drop: DropDef = {};
}
