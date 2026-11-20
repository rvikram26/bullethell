import { SCREEN_H, SCREEN_W } from '../core/constants';
import { context2d } from './surface';

/**
 * Owns the visible canvas. The game always draws in a fixed 640x480 logical space; the canvas is
 * scaled to fit the window (letterboxed) and its backing store follows the device pixel ratio,
 * capped by the graphics quality setting.
 */
export class View {
  readonly ctx: CanvasRenderingContext2D;
  /** Backing-store pixels per logical pixel. */
  scale = 1;
  private quality: 1 | 2 = 2;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = context2d(canvas);
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('fullscreenchange', () => this.resize());
    this.resize();
  }

  setQuality(q: 1 | 2): void {
    if (q === this.quality) return;
    this.quality = q;
    this.resize();
  }

  resize(): void {
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const fit = Math.max(0.25, Math.min(vw / SCREEN_W, vh / SCREEN_H));
    this.canvas.style.width = `${Math.floor(SCREEN_W * fit)}px`;
    this.canvas.style.height = `${Math.floor(SCREEN_H * fit)}px`;
    const dpr = window.devicePixelRatio || 1;
    const cap = this.quality === 2 ? 3 : 1.25;
    const s = Math.max(1, Math.min(cap, fit * dpr));
    const w = Math.round(SCREEN_W * s);
    const h = Math.round(SCREEN_H * s);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.scale = w / SCREEN_W;
  }

  /** Reset the transform to logical coordinates and return the context. */
  begin(): CanvasRenderingContext2D {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return ctx;
  }
}
