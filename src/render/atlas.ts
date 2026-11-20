import { TAU } from '../core/math';
import { BULLET_KINDS } from '../data/bulletKinds';
import { COLOR_NAMES, SPRITE_KINDS, type SpriteKind } from '../data/types';
import { rgba, SWATCHES, type Swatch } from './palette';
import { context2d, makeCanvas } from './surface';

/** Atlas pixels per logical pixel; sprites stay crisp up to this display scale. */
export const ATLAS_RES = 3;
/** Extra room around each sprite for its glow. */
const MARGIN = 1.32;

export interface AtlasCell {
  sx: number;
  sy: number;
  /** Side of the square source rectangle in atlas pixels. */
  sw: number;
  /** Logical size of the cell when the bullet has scale 1. */
  size: number;
}

/** Base sprite size per kind index, used to derive a bullet's scale from its compiled size. */
export const KIND_BASE_SIZE: number[] = SPRITE_KINDS.map((k) => BULLET_KINDS[k].size);

function circle(ctx: CanvasRenderingContext2D, r: number, color: string): void {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

function halo(ctx: CanvasRenderingContext2D, s: Swatch, r: number, a: number): void {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(s, a));
  g.addColorStop(0.55, rgba(s, a * 0.45));
  g.addColorStop(1, rgba(s, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
}

function poly(ctx: CanvasRenderingContext2D, pts: number[], color: string): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function starPath(ctx: CanvasRenderingContext2D, outer: number, inner: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

/**
 * Draw one bullet sprite centred at the origin. Sprites that rotate with their heading point
 * along +x. The look is the genre's classic one: a coloured rim around a bright core, so bullets
 * read clearly against any background.
 */
function drawBullet(ctx: CanvasRenderingContext2D, kind: SpriteKind, S: number, s: Swatch): void {
  switch (kind) {
    case 'pellet':
      halo(ctx, s, S * 0.62, 0.65);
      circle(ctx, S * 0.36, s.main);
      circle(ctx, S * 0.24, s.light);
      circle(ctx, S * 0.13, '#ffffff');
      break;
    case 'orb':
      halo(ctx, s, S * 0.64, 0.5);
      circle(ctx, S * 0.42, s.dark);
      circle(ctx, S * 0.38, s.main);
      circle(ctx, S * 0.28, s.light);
      circle(ctx, S * 0.21, '#ffffff');
      break;
    case 'big': {
      halo(ctx, s, S * 0.64, 0.55);
      circle(ctx, S * 0.46, rgba(s, 0.9));
      const g = ctx.createRadialGradient(-S * 0.08, -S * 0.08, 0, 0, 0, S * 0.36);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.6, s.light);
      g.addColorStop(1, s.main);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, S * 0.36, 0, TAU);
      ctx.fill();
      break;
    }
    case 'rice':
      ctx.save();
      ctx.scale(1, 0.6);
      halo(ctx, s, S * 0.62, 0.55);
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(0, 0, S * 0.46, S * 0.25, 0, 0, TAU);
      ctx.fillStyle = s.main;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, S * 0.32, S * 0.13, 0, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      break;
    case 'dart':
      ctx.save();
      ctx.scale(1, 0.55);
      halo(ctx, s, S * 0.6, 0.5);
      ctx.restore();
      poly(ctx, [S * 0.5, 0, -S * 0.1, -S * 0.23, -S * 0.44, -S * 0.1, -S * 0.44, S * 0.1, -S * 0.1, S * 0.23], s.main);
      poly(ctx, [S * 0.36, 0, -S * 0.06, -S * 0.1, -S * 0.3, 0, -S * 0.06, S * 0.1], '#ffffff');
      break;
    case 'needle':
      ctx.save();
      ctx.scale(1, 0.24);
      halo(ctx, s, S * 0.62, 0.65);
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(0, 0, S * 0.47, S * 0.075, 0, 0, TAU);
      ctx.fillStyle = s.main;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, S * 0.38, S * 0.03, 0, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      break;
    case 'star':
      halo(ctx, s, S * 0.6, 0.45);
      starPath(ctx, S * 0.47, S * 0.21);
      ctx.fillStyle = s.main;
      ctx.fill();
      starPath(ctx, S * 0.3, S * 0.13);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      break;
    case 'ring':
      halo(ctx, s, S * 0.62, 0.42);
      ctx.beginPath();
      ctx.arc(0, 0, S * 0.36, 0, TAU);
      ctx.strokeStyle = s.main;
      ctx.lineWidth = S * 0.15;
      ctx.stroke();
      ctx.lineWidth = S * 0.05;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      break;
    case 'gem':
      ctx.save();
      ctx.scale(1, 0.7);
      halo(ctx, s, S * 0.6, 0.5);
      ctx.restore();
      poly(ctx, [S * 0.48, 0, 0, -S * 0.28, -S * 0.48, 0, 0, S * 0.28], s.main);
      ctx.strokeStyle = s.dark;
      ctx.lineWidth = S * 0.04;
      ctx.stroke();
      poly(ctx, [S * 0.3, 0, 0, -S * 0.15, -S * 0.12, 0, 0, S * 0.15], s.light);
      poly(ctx, [S * 0.16, 0, 0, -S * 0.06, -S * 0.04, 0, 0, S * 0.06], '#ffffff');
      break;
  }
}

/**
 * Every bullet kind in every colour, pre-rendered into one canvas so the renderer can draw
 * thousands of bullets with plain drawImage calls from a single source image.
 */
export class BulletAtlas {
  readonly canvas: HTMLCanvasElement;
  readonly cells: AtlasCell[] = [];

  constructor() {
    const rows = SPRITE_KINDS.map((kind) => {
      const size = BULLET_KINDS[kind].size * MARGIN;
      return { kind, size, px: Math.ceil(size * ATLAS_RES) + 2, y: 0 };
    });
    let y = 0;
    let width = 0;
    for (const r of rows) {
      r.y = y;
      y += r.px;
      width = Math.max(width, r.px * COLOR_NAMES.length);
    }
    this.canvas = makeCanvas(width, y);
    const ctx = context2d(this.canvas);
    rows.forEach((row, k) => {
      for (let c = 0; c < COLOR_NAMES.length; c++) {
        const sx = c * row.px;
        ctx.setTransform(ATLAS_RES, 0, 0, ATLAS_RES, sx + row.px / 2, row.y + row.px / 2);
        drawBullet(ctx, row.kind, BULLET_KINDS[row.kind].size, SWATCHES[c]);
        this.cells[k * COLOR_NAMES.length + c] = { sx: sx + 1, sy: row.y + 1, sw: row.px - 2, size: (row.px - 2) / ATLAS_RES };
      }
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
