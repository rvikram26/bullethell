/** Offscreen canvases used for sprite caches. */
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function context2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('This browser does not support the 2D canvas.');
  return ctx;
}

/**
 * Render something once into a cached canvas at `res` pixels per logical pixel.
 * The callback draws in logical units with the origin at the canvas centre.
 */
export function prerender(w: number, h: number, res: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = makeCanvas(w * res, h * res);
  const ctx = context2d(c);
  ctx.setTransform(res, 0, 0, res, (w * res) / 2, (h * res) / 2);
  draw(ctx);
  return c;
}
