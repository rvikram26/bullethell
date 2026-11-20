import { SWATCHES } from './palette';
import { context2d, makeCanvas } from './surface';

const SIZE = 64;
const cache = new Map<string, HTMLCanvasElement>();

/** A soft radial glow sprite, cached per colour. Drawn scaled, it replaces costly shadowBlur. */
export function glowSprite(r: number, g: number, b: number, hot = false): HTMLCanvasElement {
  const key = `${r},${g},${b},${hot ? 1 : 0}`;
  let c = cache.get(key);
  if (c) return c;
  c = makeCanvas(SIZE, SIZE);
  const ctx = context2d(c);
  const grad = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  if (hot) {
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, `rgba(${r},${g},${b},0.95)`);
  } else {
    grad.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
  }
  grad.addColorStop(0.45, `rgba(${r},${g},${b},0.35)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  cache.set(key, c);
  return c;
}

export function glowFor(colorIdx: number, hot = false): HTMLCanvasElement {
  const s = SWATCHES[colorIdx] ?? SWATCHES[SWATCHES.length - 1];
  return glowSprite(s.r, s.g, s.b, hot);
}

export function glowHex(hex: string, hot = false): HTMLCanvasElement {
  const v = parseInt(hex.slice(1), 16);
  return glowSprite((v >> 16) & 255, (v >> 8) & 255, v & 255, hot);
}

/** Draw a glow sprite centred at (x, y) with the given radius. */
export function drawGlow(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, radius: number, alpha = 1): void {
  if (radius <= 0 || alpha <= 0) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = prev;
}
