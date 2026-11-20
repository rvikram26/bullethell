import { TAU } from '../core/math';
import { ITEM_BIG_POWER, ITEM_BOMB, ITEM_LIFE, ITEM_POINT, ITEM_POWER } from '../game/items';
import { roundRect } from './text';
import { prerender } from './surface';

const RES = 3;

interface ItemLook {
  size: number;
  fill: string;
  edge: string;
  draw: (ctx: CanvasRenderingContext2D, s: number) => void;
}

function letter(ch: string) {
  return (ctx: CanvasRenderingContext2D, s: number): void => {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${s * 0.72}px "Trebuchet MS", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, 0, s * 0.04);
  };
}

function starGlyph(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s * 0.34 : s * 0.15;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function heartGlyph(ctx: CanvasRenderingContext2D, s: number): void {
  const k = s * 0.3;
  ctx.beginPath();
  ctx.moveTo(0, k * 0.9);
  ctx.bezierCurveTo(-k * 1.4, -k * 0.1, -k * 0.7, -k * 1.1, 0, -k * 0.4);
  ctx.bezierCurveTo(k * 0.7, -k * 1.1, k * 1.4, -k * 0.1, 0, k * 0.9);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

const LOOKS: Record<number, ItemLook> = {
  [ITEM_POWER]: { size: 11, fill: '#e8402e', edge: '#ffb08a', draw: letter('P') },
  [ITEM_BIG_POWER]: { size: 17, fill: '#e8402e', edge: '#ffd0a8', draw: letter('P') },
  [ITEM_POINT]: { size: 12, fill: '#3168e8', edge: '#a8c4ff', draw: starGlyph },
  [ITEM_BOMB]: { size: 12, fill: '#22a85a', edge: '#a8ffc8', draw: letter('B') },
  [ITEM_LIFE]: { size: 16, fill: '#e83aa8', edge: '#ffc0ea', draw: heartGlyph },
};

/** Pre-rendered item sprites indexed by item type. Logical size is `size * 1.4` (glow margin). */
export class ItemSprites {
  readonly sprites: HTMLCanvasElement[] = [];
  readonly sizes: number[] = [];
  /** Small upward arrow used for items above the top of the field. */
  readonly markers: HTMLCanvasElement[] = [];

  constructor() {
    for (const type of [ITEM_POWER, ITEM_BIG_POWER, ITEM_POINT, ITEM_BOMB, ITEM_LIFE]) {
      const L = LOOKS[type];
      const box = L.size * 1.4;
      this.sizes[type] = box;
      this.sprites[type] = prerender(box, box, RES, (ctx) => {
        const s = L.size;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, box / 2);
        g.addColorStop(0, L.edge);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, box / 2, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.22);
        const body = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
        body.addColorStop(0, L.edge);
        body.addColorStop(0.35, L.fill);
        body.addColorStop(1, L.fill);
        ctx.fillStyle = body;
        ctx.fill();
        ctx.lineWidth = s * 0.08;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.stroke();
        L.draw(ctx, s);
      });
      this.markers[type] = prerender(10, 8, RES, (ctx) => {
        ctx.beginPath();
        ctx.moveTo(0, -3.5);
        ctx.lineTo(4.5, 3.5);
        ctx.lineTo(-4.5, 3.5);
        ctx.closePath();
        ctx.fillStyle = L.fill;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
  }
}
