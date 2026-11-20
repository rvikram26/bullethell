export const FONT_TITLE = 'Georgia, "Palatino Linotype", "Book Antiqua", Palatino, serif';
export const FONT_UI = '"Trebuchet MS", "Segoe UI", Tahoma, Verdana, sans-serif';
export const FONT_MONO = 'Consolas, "Lucida Console", Menlo, "Courier New", monospace';

export interface TextOpts {
  size?: number;
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  bold?: boolean;
  italic?: boolean;
  /** Offset drop shadow colour (cheap). */
  shadow?: string | null;
  /** Blurred glow colour (costly; use for titles only). */
  glow?: string | null;
  glowBlur?: number;
  stroke?: string | null;
  strokeWidth?: number;
  alpha?: number;
  /** Letter spacing in px (where supported). */
  spacing?: number;
}

export function fontString(o: TextOpts): string {
  return `${o.italic ? 'italic ' : ''}${o.bold ? 'bold ' : ''}${o.size ?? 14}px ${o.font ?? FONT_UI}`;
}

type SpacingCtx = CanvasRenderingContext2D & { letterSpacing?: string };

export function drawText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts = {}): void {
  ctx.save();
  ctx.font = fontString(o);
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'alphabetic';
  if (o.spacing !== undefined && 'letterSpacing' in ctx) (ctx as SpacingCtx).letterSpacing = `${o.spacing}px`;
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.shadow) {
    ctx.fillStyle = o.shadow;
    ctx.fillText(s, x + 1, y + 1.5);
  }
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = o.glowBlur ?? 10;
  }
  if (o.stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = o.strokeWidth ?? 3;
    ctx.strokeStyle = o.stroke;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = o.color ?? '#fff';
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function measure(ctx: CanvasRenderingContext2D, s: string, o: TextOpts = {}): number {
  ctx.save();
  ctx.font = fontString(o);
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

/** Greedy word wrap. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, o: TextOpts = {}): string[] {
  ctx.save();
  ctx.font = fontString(o);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  ctx.restore();
  return lines;
}

/** Rounded rectangle path (polyfill for older canvases without roundRect). */
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

/** A translucent panel with a thin gold edge, used by menus, dialogue and pause screens. */
export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fillStyle = 'rgba(8, 10, 26, 0.84)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 210, 122, 0.4)';
  ctx.stroke();
  roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 4);
  ctx.strokeStyle = 'rgba(127, 216, 255, 0.12)';
  ctx.stroke();
  ctx.restore();
}
