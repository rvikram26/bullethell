import { FIELD_H, FIELD_W } from '../core/constants';
import { DEG } from '../core/math';

export const SHOT_BOLT = 0;
export const SHOT_SPARK = 1;

export class Shot {
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  dmg = 1;
  sprite = SHOT_BOLT;
  /** Max turn rate in radians per frame (0 = straight). */
  homing = 0;
  age = 0;
}

export interface Target {
  x: number;
  y: number;
}

/** Pooled player bullets. */
export class ShotPool {
  readonly shots: Shot[] = [];
  active = 0;

  constructor(cap = 240) {
    for (let i = 0; i < cap; i++) this.shots.push(new Shot());
  }

  /** `angle` is degrees from straight up (positive = right); `speed` is px/frame. */
  spawn(x: number, y: number, angle: number, speed: number, dmg: number, sprite: number, homingDeg: number): void {
    for (const s of this.shots) {
      if (s.active) continue;
      const a = (angle - 90) * DEG;
      s.active = true;
      s.x = x;
      s.y = y;
      s.vx = Math.cos(a) * speed;
      s.vy = Math.sin(a) * speed;
      s.dmg = dmg;
      s.sprite = sprite;
      s.homing = homingDeg * DEG;
      s.age = 0;
      return;
    }
  }

  clear(): void {
    for (const s of this.shots) s.active = false;
  }

  /** Move shots; homing shots steer toward the closest target. */
  update(targets: readonly Target[]): void {
    let active = 0;
    for (const s of this.shots) {
      if (!s.active) continue;
      s.age++;
      if (s.homing > 0 && targets.length > 0 && s.age > 3) {
        let best: Target | null = null;
        let bestD = 360 * 360;
        for (const t of targets) {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const d = dx * dx + dy * dy;
          if (d < bestD && t.y < s.y + 20) {
            bestD = d;
            best = t;
          }
        }
        if (best) {
          const speed = Math.hypot(s.vx, s.vy);
          const cur = Math.atan2(s.vy, s.vx);
          const want = Math.atan2(best.y - s.y, best.x - s.x);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = Math.max(-s.homing, Math.min(s.homing, diff));
          const na = cur + turn;
          s.vx = Math.cos(na) * speed;
          s.vy = Math.sin(na) * speed;
        }
      }
      s.x += s.vx;
      s.y += s.vy;
      if (s.y < -14 || s.y > FIELD_H + 14 || s.x < -14 || s.x > FIELD_W + 14) {
        s.active = false;
        continue;
      }
      active++;
    }
    this.active = active;
  }
}
