import { TAU } from '../core/math';
import { fxRng } from '../core/rng';

export const P_SPARK = 0; // small additive glow dot with velocity and fade
export const P_RING = 1; // expanding outline circle
export const P_TEXT = 2; // floating score text
export const P_BLAST = 3; // large soft flash

export class Particle {
  active = false;
  kind = P_SPARK;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  life = 0;
  maxLife = 1;
  size = 4;
  grow = 0;
  /** Index into COLOR_NAMES. */
  color = 9;
  text = '';
}

/** Cosmetic particles. Uses its own RNG so it can never influence the simulation. */
export class Particles {
  readonly list: Particle[] = [];
  private cursor = 0;

  constructor(cap = 900) {
    for (let i = 0; i < cap; i++) this.list.push(new Particle());
  }

  private alloc(): Particle {
    const n = this.list.length;
    for (let k = 0; k < n; k++) {
      const p = this.list[(this.cursor + k) % n];
      if (!p.active) {
        this.cursor = (this.cursor + k + 1) % n;
        p.active = true;
        return p;
      }
    }
    // pool exhausted: recycle the oldest-looking slot
    const p = this.list[this.cursor];
    this.cursor = (this.cursor + 1) % n;
    p.active = true;
    return p;
  }

  spark(x: number, y: number, color: number, speed = 2, life = 24, size = 5): void {
    const p = this.alloc();
    const a = fxRng.range(0, TAU);
    const s = fxRng.range(0.3, 1) * speed;
    p.kind = P_SPARK;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * s;
    p.vy = Math.sin(a) * s;
    p.life = p.maxLife = life * fxRng.range(0.7, 1.2);
    p.size = size * fxRng.range(0.7, 1.2);
    p.grow = -p.size / p.maxLife;
    p.color = color;
  }

  burst(x: number, y: number, color: number, count: number, speed = 3, life = 30, size = 6): void {
    for (let i = 0; i < count; i++) this.spark(x, y, color, speed, life, size);
  }

  ring(x: number, y: number, color: number, size = 4, grow = 3, life = 24): void {
    const p = this.alloc();
    p.kind = P_RING;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.life = p.maxLife = life;
    p.size = size;
    p.grow = grow;
    p.color = color;
  }

  blast(x: number, y: number, color: number, size = 30, life = 18): void {
    const p = this.alloc();
    p.kind = P_BLAST;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.life = p.maxLife = life;
    p.size = size;
    p.grow = size * 0.06;
    p.color = color;
  }

  text(x: number, y: number, text: string, color = 9, life = 50): void {
    const p = this.alloc();
    p.kind = P_TEXT;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = -0.55;
    p.life = p.maxLife = life;
    p.size = 10;
    p.grow = 0;
    p.color = color;
    p.text = text;
  }

  update(): void {
    for (const p of this.list) {
      if (!p.active) continue;
      if (--p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.kind === P_SPARK) {
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
      p.size += p.grow;
      if (p.size < 0) p.size = 0;
    }
  }

  clear(): void {
    for (const p of this.list) p.active = false;
  }
}
