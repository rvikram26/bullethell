import { PLAYER_FOCUS_SPEED, PLAYER_SPEED } from '../../src/core/constants';
import type { PlayerInput } from '../../src/core/input';
import type { World } from '../../src/game/world';

const DIRS: Array<[number, number]> = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

interface Near {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

/**
 * A simple dodging bot used by the tests. It always holds fire, looks a few frames ahead for each
 * of nine candidate moves and picks the one with the lowest danger, with a mild preference for
 * staying under the boss and low on the screen. Not clever, but good enough to tell "very hard"
 * from "impossible".
 */
export class Bot {
  private near: Near[] = [];

  constructor(private readonly useBombs = true) {}

  decide(w: World, out: PlayerInput): PlayerInput {
    const p = w.player;
    const b = w.bullets;
    this.near.length = 0;
    for (let i = 0; i < b.count; i++) {
      const dx = b.x[i] - p.x;
      const dy = b.y[i] - p.y;
      if (dx > 80 || dx < -80 || dy > 90 || dy < -90) continue;
      this.near.push({ x: b.x[i], y: b.y[i], vx: b.vx[i], vy: b.vy[i], r: b.rad[i] });
    }
    // enemy bodies count as slow bullets
    for (const e of w.enemies) {
      if (e.active) this.near.push({ x: e.x, y: e.y, vx: e.mover.vx, vy: e.mover.vy, r: e.radius });
    }
    if (w.boss) this.near.push({ x: w.boss.x, y: w.boss.y, vx: 0, vy: 0, r: w.boss.radius * 0.8 });

    const focus = this.near.length > 0 && this.near.some((n) => Math.abs(n.x - p.x) < 40 && Math.abs(n.y - p.y) < 40);
    const speed = focus ? PLAYER_FOCUS_SPEED : PLAYER_SPEED;

    // chase pickups when it is safe (power items, points)
    let tx = w.boss ? w.boss.x : 192;
    let ty = 380;
    let bestItem = Infinity;
    for (const it of w.items.items) {
      if (!it.active) continue;
      const d = Math.abs(it.x - p.x) + Math.abs(it.y - p.y);
      if (it.y > 150 && d < bestItem && d < 160) {
        bestItem = d;
        tx = it.x;
        ty = it.y;
      }
    }
    let target = tx;
    if (w.enemies.some((e) => e.active)) {
      let best = Infinity;
      for (const e of w.enemies) {
        if (!e.active) continue;
        const d = Math.abs(e.x - p.x);
        if (d < best && e.y < p.y) {
          best = d;
          target = e.x;
        }
      }
    }
    tx = bestItem < Infinity ? tx : target;

    let bestScore = Infinity;
    let bestDir = DIRS[0];
    for (const dir of DIRS) {
      const norm = dir[0] !== 0 && dir[1] !== 0 ? Math.SQRT1_2 : 1;
      let danger = 0;
      for (let k = 1; k <= 7; k++) {
        const px = Math.min(377, Math.max(7, p.x + dir[0] * norm * speed * k));
        const py = Math.min(438, Math.max(10, p.y + dir[1] * norm * speed * k));
        for (const n of this.near) {
          const dx = n.x + n.vx * k - px;
          const dy = n.y + n.vy * k - py;
          const d2 = dx * dx + dy * dy;
          const lim = (n.r + 9) * (n.r + 9);
          if (d2 < lim) danger += (lim - d2) * (1 + (8 - k) * 0.4);
        }
      }
      const nx = Math.min(377, Math.max(7, p.x + dir[0] * norm * speed * 6));
      const ny = Math.min(438, Math.max(10, p.y + dir[1] * norm * speed * 6));
      const wall = (nx < 28 ? 28 - nx : 0) + (nx > 356 ? nx - 356 : 0) + (ny > 425 ? ny - 425 : 0) + (ny < 120 ? 120 - ny : 0);
      const pull = Math.abs(nx - tx) * 0.05 + Math.abs(ny - ty) * 0.01;
      const s = danger * 3 + wall * 0.5 + pull;
      if (s < bestScore) {
        bestScore = s;
        bestDir = dir;
      }
    }

    out.dx = bestDir[0];
    out.dy = bestDir[1];
    out.focus = focus;
    out.shoot = true;
    out.bomb = false;

    // emergency bomb when something is about to hit and no safe move exists
    if (this.useBombs && bestScore > 4000 && p.vulnerable && w.run.bombs > 0 && p.bombT <= 0) out.bomb = true;
    if (p.mode === 1 && w.run.bombs > 0 && this.useBombs) out.bomb = true; // deathbomb
    return out;
  }
}
