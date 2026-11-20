import { BOMB_FRAGMENTS_PER_BOMB, FIELD_H, FIELD_W, FIELD_X, FIELD_Y, MAX_POWER, SCREEN_H, SCREEN_W } from '../core/constants';
import { grouped, TAU } from '../core/math';
import { DIFFICULTIES } from '../data/difficulty';
import { SHOT_LEVELS } from '../data/playerShots';
import type { World } from '../game/world';
import { lantern } from './characters';
import { drawGlow, glowHex } from './glow';
import { UI } from './palette';
import { context2d, makeCanvas, prerender } from './surface';
import { drawText, FONT_MONO, FONT_TITLE, FONT_UI, roundRect } from './text';

const RES = 2;
const X0 = FIELD_X + FIELD_W + 18;
const X1 = SCREEN_W - 16;

function buildFrame(): HTMLCanvasElement {
  const c = makeCanvas(SCREEN_W * RES, SCREEN_H * RES);
  const ctx = context2d(c);
  ctx.scale(RES, RES);
  const g = ctx.createLinearGradient(0, 0, SCREEN_W, SCREEN_H);
  g.addColorStop(0, '#0b0f26');
  g.addColorStop(0.6, '#120f2c');
  g.addColorStop(1, '#1a1030');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // faint wave pattern
  ctx.strokeStyle = 'rgba(127, 216, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let y = -20; y < SCREEN_H + 20; y += 14) {
    ctx.beginPath();
    for (let x = 0; x <= SCREEN_W; x += 8) {
      const yy = y + Math.sin(x * 0.05 + y * 0.3) * 3;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // sidebar panel
  roundRect(ctx, X0 - 8, FIELD_Y, X1 - X0 + 16, FIELD_H, 6);
  ctx.fillStyle = 'rgba(4, 6, 18, 0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 210, 122, 0.18)';
  ctx.stroke();

  // logo
  const ly = SCREEN_H - 78;
  drawGlow(ctx, glowHex('#ffb84a'), X0 + 20, ly + 10, 34, 0.5);
  lantern(ctx, X0 + 20, ly + 12, 16, 10, 0);
  drawText(ctx, 'Lantern', X0 + 44, ly + 6, { size: 22, font: FONT_TITLE, italic: true, bold: true, color: UI.gold, shadow: 'rgba(0,0,0,0.7)' });
  drawText(ctx, 'Tide', X0 + 100, ly + 30, { size: 22, font: FONT_TITLE, italic: true, bold: true, color: '#9fd8ff', shadow: 'rgba(0,0,0,0.7)' });

  // field border, then punch out the field so the playfield shows through
  ctx.strokeStyle = 'rgba(255, 210, 122, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(FIELD_X - 2, FIELD_Y - 2, FIELD_W + 4, FIELD_H + 4);
  ctx.strokeStyle = 'rgba(127, 216, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(FIELD_X - 5.5, FIELD_Y - 5.5, FIELD_W + 11, FIELD_H + 11);
  ctx.clearRect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H);
  return c;
}

function icon(color: string, kind: 'life' | 'bomb'): HTMLCanvasElement {
  return prerender(14, 14, 3, (ctx) => {
    if (kind === 'life') {
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-7, 0, -4, -6, 0, -2.5);
      ctx.bezierCurveTo(4, -6, 7, 0, 0, 5);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 6 : 2.6;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
  });
}

/** The sidebar: scores, resources, power and graze, plus the decorative frame around the field. */
export class Hud {
  private readonly frame = buildFrame();
  private readonly lifeIcon = icon('#ff6fb8', 'life');
  private readonly bombIcon = icon('#5fe08a', 'bomb');
  private readonly emptyLife = icon('rgba(255,255,255,0.12)', 'life');
  private readonly emptyBomb = icon('rgba(255,255,255,0.12)', 'bomb');

  draw(ctx: CanvasRenderingContext2D, w: World, fps: number | null): void {
    ctx.drawImage(this.frame, 0, 0, SCREEN_W, SCREEN_H);
    const run = w.run;
    const diff = DIFFICULTIES[run.difficulty];

    // difficulty and mode
    roundRect(ctx, X0, 22, 86, 17, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();
    ctx.strokeStyle = diff.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    drawText(ctx, diff.name.toUpperCase(), X0 + 43, 34.5, { size: 10, font: FONT_UI, bold: true, color: diff.color, align: 'center', spacing: 1.5 });
    if (run.practice) drawText(ctx, 'PRACTICE', X1, 34.5, { size: 10, font: FONT_UI, bold: true, color: UI.accent, align: 'right', spacing: 1 });
    else drawText(ctx, `Stage ${w.stage.number}/3`, X1, 34.5, { size: 10, font: FONT_UI, color: UI.dim, align: 'right' });

    const row = (label: string, y: number) => drawText(ctx, label, X0, y, { size: 12, font: FONT_UI, color: UI.dim, shadow: 'rgba(0,0,0,0.6)' });
    const value = (v: string, y: number, color = UI.ink) => drawText(ctx, v, X1, y, { size: 14, font: FONT_MONO, color, align: 'right', shadow: 'rgba(0,0,0,0.6)' });

    row('Hi-Score', 68);
    value(grouped(Math.max(run.hiScore, run.score)), 68, '#c8d0ff');
    row('Score', 90);
    value(grouped(run.score), 90, '#ffffff');

    row('Lives', 126);
    this.icons(ctx, run.lives, this.lifeIcon, this.emptyLife, 116);
    row('Bombs', 150);
    this.icons(ctx, run.bombs, this.bombIcon, this.emptyBomb, 140);
    drawText(ctx, `fragments ${run.fragments}/${BOMB_FRAGMENTS_PER_BOMB}`, X1, 166, { size: 9, font: FONT_UI, color: UI.faint, align: 'right' });

    row('Power', 194);
    const max = run.power >= MAX_POWER;
    value(max ? 'MAX' : `${run.power} / ${MAX_POWER}`, 194, max ? UI.gold : '#ffb08a');
    const bx = X0;
    const bw = X1 - X0;
    const by = 201;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, bw, 6);
    const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    pg.addColorStop(0, '#ff6a3a');
    pg.addColorStop(1, '#ffd27a');
    ctx.fillStyle = pg;
    ctx.fillRect(bx, by, (bw * run.power) / MAX_POWER, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const lvl of SHOT_LEVELS) if (lvl.power > 0) ctx.fillRect(bx + (bw * lvl.power) / MAX_POWER, by - 1, 1, 8);

    row('Graze', 230);
    value(String(run.graze), 230, '#d8c8ff');

    if (w.boss && w.boss.spell && (w.boss.mode === 'fight' || w.boss.mode === 'warmup')) {
      drawText(ctx, 'Rite in progress', X0, 262, { size: 10, font: FONT_TITLE, italic: true, color: UI.gold });
    }
    if (run.continues > 0) drawText(ctx, `Continues used: ${run.continues}`, X0, 280, { size: 9, font: FONT_UI, color: UI.faint });

    if (fps !== null) drawText(ctx, `${fps.toFixed(1)} fps`, SCREEN_W - 8, SCREEN_H - 6, { size: 10, font: FONT_MONO, color: UI.dim, align: 'right' });
  }

  private icons(ctx: CanvasRenderingContext2D, n: number, full: HTMLCanvasElement, empty: HTMLCanvasElement, y: number): void {
    const slots = 8;
    const size = 13;
    const x0 = X1 - slots * (size + 1);
    for (let i = 0; i < slots; i++) ctx.drawImage(i < n ? full : empty, x0 + i * (size + 1), y, size, size);
  }
}

/** Decorative spinning lantern ring used on menu screens. */
export function drawLanternRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = 'rgba(255, 210, 122, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = t * 0.01 + (i / 8) * TAU;
    drawGlow(ctx, glowHex('#ffc95a', true), x + Math.cos(a) * r, y + Math.sin(a) * r, 5, 0.9);
  }
  ctx.restore();
}
