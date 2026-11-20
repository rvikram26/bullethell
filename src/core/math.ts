export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeIn(t: number): number {
  return t * t;
}

export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function wrapAngle(a: number): number {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/** Format a score with a fixed number of digits, e.g. 0000012345. */
export function pad(n: number, digits = 10): string {
  const s = Math.max(0, Math.floor(n)).toString();
  return s.length >= digits ? s : '0'.repeat(digits - s.length) + s;
}

/** Group digits with thin separators for readability, e.g. 12,345,678. */
export function grouped(n: number): string {
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
