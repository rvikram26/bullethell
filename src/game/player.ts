import {
  FIELD_H,
  FIELD_W,
  PLAYER_FOCUS_SPEED,
  PLAYER_SPEED,
} from '../core/constants';
import type { PlayerInput } from '../core/input';
import { clamp } from '../core/math';
import { SHOT_LEVELS, type ShotSpec, shotLevelForPower } from '../data/playerShots';
import type { SfxName } from '../data/types';
import type { RunState } from './state';
import { SHOT_AMULET, SHOT_NEEDLE, type ShotPool } from './shots';

export const MODE_ALIVE = 0;
export const MODE_DYING = 1;
export const MODE_DEAD = 2;

/** Frames after being hit during which a bomb still saves the player ("deathbomb"). */
export const DEATHBOMB_FRAMES = 9;
export const RESPAWN_DELAY = 50;
export const RESPAWN_INVULN = 200;
export const BOMB_FRAMES = 150;
export const BOMB_INVULN = BOMB_FRAMES + 50;

/** The parts of the world the player needs. Keeping this narrow avoids a circular dependency. */
export interface PlayerHost {
  readonly run: RunState;
  readonly shots: ShotPool;
  /** True while a dialogue is on screen: movement is allowed, shooting and bombing are not. */
  readonly talking: boolean;
  startBomb(): boolean;
  killPlayer(): void;
  sfx(name: SfxName): void;
}

export interface OptionPos {
  x: number;
  y: number;
}

export class Player {
  x = FIELD_W / 2;
  y = FIELD_H - 56;
  focus = false;
  mode = MODE_ALIVE;
  modeT = 0;
  invuln = 90;
  bombT = 0;
  shotT = 0;
  /** -1..1, leaning with horizontal movement. */
  tilt = 0;
  anim = 0;
  /** 0..1 fade used to show the hitbox only while focusing. */
  focusFade = 0;
  /** Frames of the rising entrance after a respawn (movement locked while > 0). */
  enter = 0;
  readonly options: OptionPos[] = [
    { x: FIELD_W / 2, y: FIELD_H - 56 },
    { x: FIELD_W / 2, y: FIELD_H - 56 },
    { x: FIELD_W / 2, y: FIELD_H - 56 },
    { x: FIELD_W / 2, y: FIELD_H - 56 },
  ];

  get alive(): boolean {
    return this.mode === MODE_ALIVE;
  }

  /** Can the player be damaged right now? */
  get vulnerable(): boolean {
    return this.mode === MODE_ALIVE && this.invuln <= 0;
  }

  respawn(): void {
    this.mode = MODE_ALIVE;
    this.modeT = 0;
    this.x = FIELD_W / 2;
    this.y = FIELD_H + 24;
    this.enter = 34;
    this.invuln = RESPAWN_INVULN;
    this.bombT = 0;
    this.shotT = 0;
    this.tilt = 0;
  }

  update(host: PlayerHost, inp: PlayerInput): void {
    this.anim++;
    if (this.invuln > 0) this.invuln--;
    if (this.bombT > 0) this.bombT--;
    if (this.shotT > 0) this.shotT--;

    if (this.mode === MODE_DEAD) {
      if (--this.modeT <= 0) this.respawn();
      this.focusFade = Math.max(0, this.focusFade - 0.2);
      return;
    }

    // --- movement -------------------------------------------------------------------------
    this.focus = inp.focus;
    this.focusFade = clamp(this.focusFade + (this.focus ? 0.25 : -0.2), 0, 1);

    if (this.enter > 0) {
      this.enter--;
      this.y -= (FIELD_H + 24 - (FIELD_H - 56)) / 34;
    } else {
      let dx = inp.dx;
      let dy = inp.dy;
      if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }
      const sp = this.focus ? PLAYER_FOCUS_SPEED : PLAYER_SPEED;
      this.x = clamp(this.x + dx * sp, 7, FIELD_W - 7);
      this.y = clamp(this.y + dy * sp, 10, FIELD_H - 10);
    }
    this.tilt += (clamp(inp.dx, -1, 1) - this.tilt) * 0.22;

    // --- being hit ------------------------------------------------------------------------
    if (this.mode === MODE_DYING) {
      if (inp.bomb && host.startBomb()) {
        this.mode = MODE_ALIVE; // saved by a deathbomb
      } else if (--this.modeT <= 0) {
        host.killPlayer();
      }
      this.updateOptions(host);
      return;
    }

    // --- bombing and shooting ---------------------------------------------------------------
    if (inp.bomb && !host.talking && this.bombT <= 0) host.startBomb();

    if (inp.shoot && !host.talking && this.enter <= 0 && this.shotT <= 0) {
      this.fire(host);
      this.shotT = SHOT_LEVELS[shotLevelForPower(host.run.power)].interval;
    }
    this.updateOptions(host);
  }

  private updateOptions(host: PlayerHost): void {
    const lvl = SHOT_LEVELS[shotLevelForPower(host.run.power)];
    for (let k = 0; k < this.options.length; k++) {
      const pos = this.options[k];
      const spec = lvl.options[k];
      const tx = this.x + (spec ? (this.focus ? spec.focus[0] : spec.spread[0]) : 0);
      const ty = this.y + (spec ? (this.focus ? spec.focus[1] : spec.spread[1]) : 0);
      pos.x += (tx - pos.x) * 0.3;
      pos.y += (ty - pos.y) * 0.3;
    }
  }

  private fire(host: PlayerHost): void {
    const lvl = SHOT_LEVELS[shotLevelForPower(host.run.power)];
    const f = this.focus;
    for (const s of lvl.main) this.spawn(host, this.x + s.dx * (f ? 0.55 : 1), this.y + s.dy, s, f);
    for (let k = 0; k < lvl.options.length; k++) {
      const o = lvl.options[k];
      const pos = this.options[k];
      for (const s of f ? o.focusShots : o.shots) this.spawn(host, pos.x + s.dx, pos.y + s.dy, s, f);
    }
    host.sfx('player-shot');
  }

  private spawn(host: PlayerHost, x: number, y: number, s: ShotSpec, focus: boolean): void {
    const angle = focus ? (s.focusAngle ?? s.angle * 0.3) : s.angle;
    host.shots.spawn(x, y, angle, s.speed, s.dmg, s.sprite === 'amulet' ? SHOT_AMULET : SHOT_NEEDLE, s.homing ?? 0);
  }
}
