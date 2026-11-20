/** Small seedable PRNG (mulberry32). Deterministic simulation makes tests and bots reproducible. */
export class Rng {
  private s: number;

  constructor(seed = (Math.random() * 0xffffffff) >>> 0) {
    this.s = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  /** Symmetric range [-a, a]. */
  spread(a: number): number {
    return (this.next() * 2 - 1) * a;
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  sign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }
}

/** Shared RNG for purely cosmetic effects (never affects the simulation). */
export const fxRng = new Rng(0x1badf00d);
