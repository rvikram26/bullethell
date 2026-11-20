import { SCREEN_H, SCREEN_W } from '../core/constants';
import { sharedBackdrop } from '../render/backdrop';
import { UI } from '../render/palette';
import { drawText, FONT_TITLE, FONT_UI } from '../render/text';

/** Draw the shared animated backdrop with a dark veil so menu text stays readable. */
export function menuBackdrop(ctx: CanvasRenderingContext2D, veil = 0.45, lit = 0): void {
  sharedBackdrop().draw(ctx, lit);
  if (veil > 0) {
    ctx.fillStyle = `rgba(3, 4, 14, ${veil})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
}

export function tickBackdrop(): void {
  sharedBackdrop().update();
}

export function heading(ctx: CanvasRenderingContext2D, title: string, sub?: string): void {
  drawText(ctx, title, SCREEN_W / 2, 64, { size: 30, font: FONT_TITLE, bold: true, italic: true, color: UI.gold, align: 'center', glow: '#ff9a3a', glowBlur: 12 });
  if (sub) drawText(ctx, sub, SCREEN_W / 2, 88, { size: 13, font: FONT_TITLE, italic: true, color: UI.dim, align: 'center' });
  const g = ctx.createLinearGradient(SCREEN_W / 2 - 160, 0, SCREEN_W / 2 + 160, 0);
  g.addColorStop(0, 'rgba(255,210,122,0)');
  g.addColorStop(0.5, 'rgba(255,210,122,0.6)');
  g.addColorStop(1, 'rgba(255,210,122,0)');
  ctx.fillStyle = g;
  ctx.fillRect(SCREEN_W / 2 - 160, sub ? 98 : 76, 320, 1);
}

export function footer(ctx: CanvasRenderingContext2D, text: string): void {
  drawText(ctx, text, SCREEN_W / 2, SCREEN_H - 16, { size: 11, font: FONT_UI, color: UI.dim, align: 'center' });
}
