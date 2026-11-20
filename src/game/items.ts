import { FIELD_H, FIELD_W } from '../core/constants';
import type { Rng } from '../core/rng';

export const ITEM_POWER = 0;
export const ITEM_BIG_POWER = 1;
export const ITEM_POINT = 2;
export const ITEM_BOMB = 3;
export const ITEM_LIFE = 4;

export const ITEM_RADIUS = [7, 10, 7, 8, 9];

export class Item {
  active = false;
  type = ITEM_POWER;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  age = 0;
  /** Flying towards the player (auto-collect or inside the magnet radius). */
  attracted = false;
  /** True when collected by auto-collect: point items then pay their full value. */
  full = false;
}

const GRAVITY = 0.07;
const TERMINAL = 2.7;
const MAGNET_RADIUS = 48;
const ATTRACT_SPEED = 9.5;

export class ItemPool {
  readonly items: Item[] = [];
  active = 0;

  constructor(cap = 400) {
    for (let i = 0; i < cap; i++) this.items.push(new Item());
  }

  spawn(type: number, x: number, y: number, rng: Rng, scatter = 1.2): Item | null {
    for (const it of this.items) {
      if (it.active) continue;
      it.active = true;
      it.type = type;
      it.x = x;
      it.y = y;
      it.vx = rng.spread(scatter);
      it.vy = -2.6 + rng.spread(0.6);
      it.age = 0;
      it.attracted = false;
      it.full = false;
      return it;
    }
    return null;
  }

  /** Make every item fly to the player (boss phase ends, bombs, point of collection). */
  attractAll(): void {
    for (const it of this.items) {
      if (it.active) {
        it.attracted = true;
        it.full = true;
      }
    }
  }

  clear(): void {
    for (const it of this.items) it.active = false;
  }

  /**
   * Move items and report collected ones through `collect`.
   * `canCollect` is false while the player is dead so items do not vanish into thin air.
   */
  update(
    px: number,
    py: number,
    pickupRadius: number,
    autoCollect: boolean,
    canCollect: boolean,
    collect: (it: Item) => void,
  ): void {
    let active = 0;
    for (const it of this.items) {
      if (!it.active) continue;
      it.age++;

      if (canCollect && !it.attracted) {
        if (autoCollect) {
          it.attracted = true;
          it.full = true;
        } else {
          const dx = px - it.x;
          const dy = py - it.y;
          if (dx * dx + dy * dy < MAGNET_RADIUS * MAGNET_RADIUS && it.age > 14) it.attracted = true;
        }
      }

      if (it.attracted && canCollect) {
        const dx = px - it.x;
        const dy = py - it.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = Math.min(ATTRACT_SPEED, d);
        it.x += (dx / d) * sp;
        it.y += (dy / d) * sp;
      } else {
        it.vy = Math.min(TERMINAL, it.vy + GRAVITY);
        it.vx *= 0.97;
        it.x += it.vx;
        it.y += it.vy;
        if (it.attracted && !canCollect) it.attracted = false;
      }

      if (canCollect) {
        const dx = px - it.x;
        const dy = py - it.y;
        const r = pickupRadius + ITEM_RADIUS[it.type];
        if (dx * dx + dy * dy <= r * r && it.age > 6) {
          it.active = false;
          collect(it);
          continue;
        }
      }

      if (it.y > FIELD_H + 24 || it.x < -30 || it.x > FIELD_W + 30) {
        it.active = false;
        continue;
      }
      active++;
    }
    this.active = active;
  }
}
