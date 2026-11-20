import { TAU } from '../core/math';
import type { EnemySpriteId } from '../data/types';
import { flame } from './characters';
import { drawGlow, glowSprite } from './glow';
import { rgba, type Swatch } from './palette';

type Painter = (ctx: CanvasRenderingContext2D, r: number, s: Swatch, t: number) => void;

function eyes(ctx: CanvasRenderingContext2D, r: number, y: number, gap: number, color = '#1a1030'): void {
  ctx.fillStyle = color;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(d * gap, y, r * 0.12, r * 0.18, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(d * gap - r * 0.04, y - r * 0.07, r * 0.05, 0, TAU);
    ctx.fill();
  }
}

const wisp: Painter = (ctx, r, s, t) => {
  const fl = Math.sin(t * 0.3) * 0.5 + Math.sin(t * 0.71) * 0.5;
  flame(ctx, 0, r * 0.9, r * 2.3, fl, s.main, s.light);
  ctx.fillStyle = rgba(s, 0.9);
  ctx.beginPath();
  ctx.arc(0, r * 0.25, r * 0.62, 0, TAU);
  ctx.fill();
  eyes(ctx, r, r * 0.2, r * 0.26);
};

const moth: Painter = (ctx, r, s, t) => {
  const flap = 0.65 + 0.35 * Math.abs(Math.sin(t * 0.2));
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.scale(d * flap, 1);
    ctx.fillStyle = s.main;
    ctx.beginPath();
    ctx.ellipse(r * 0.9, -r * 0.35, r * 0.95, r * 0.62, -0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = s.dark;
    ctx.beginPath();
    ctx.ellipse(r * 0.65, r * 0.45, r * 0.55, r * 0.4, 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = s.light;
    ctx.beginPath();
    ctx.arc(r * 1.1, -r * 0.45, r * 0.25, 0, TAU);
    ctx.fill();
    ctx.fillStyle = s.dark;
    ctx.beginPath();
    ctx.arc(r * 1.1, -r * 0.45, r * 0.12, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#f4e8d8';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.1, r * 0.3, r * 0.75, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#f4e8d8';
  ctx.lineWidth = r * 0.08;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(d * r * 0.1, -r * 0.55);
    ctx.quadraticCurveTo(d * r * 0.3, -r * 1.1, d * r * 0.6, -r * 1.2);
    ctx.stroke();
  }
  eyes(ctx, r, -r * 0.3, r * 0.14);
};

const glowcap: Painter = (ctx, r, s, t) => {
  const bob = Math.sin(t * 0.1) * r * 0.05;
  ctx.fillStyle = '#e8e0c8';
  ctx.fillRect(-r * 0.3, -r * 0.1 + bob, r * 0.6, r * 1.0);
  ctx.fillStyle = s.main;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.1 + bob, r * 1.25, r * 0.85, 0, Math.PI, TAU);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = s.light;
  for (const [x, y, rr] of [
    [-0.6, -0.45, 0.18],
    [0.15, -0.7, 0.14],
    [0.7, -0.35, 0.2],
    [-0.15, -0.3, 0.1],
  ]) {
    ctx.beginPath();
    ctx.arc(x * r, y * r + bob, rr * r, 0, TAU);
    ctx.fill();
  }
  eyes(ctx, r, r * 0.35 + bob, r * 0.16, '#3a2a10');
};

const cog: Painter = (ctx, r, s, t) => {
  const teeth = 8;
  ctx.save();
  ctx.rotate(t * 0.05);
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i * Math.PI) / teeth;
    const a1 = ((i + 1) * Math.PI) / teeth;
    const rr = i % 2 === 0 ? r * 1.15 : r * 0.88;
    ctx.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    ctx.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#c99a48';
  ctx.fill();
  ctx.strokeStyle = '#7a5520';
  ctx.lineWidth = r * 0.1;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = s.main;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a1030';
  ctx.beginPath();
  ctx.arc(0, r * 0.03, r * 0.16, 0, TAU);
  ctx.fill();
};

const sparrow: Painter = (ctx, r, s, t) => {
  const flap = Math.sin(t * 0.45);
  ctx.fillStyle = s.dark;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(d * r * 0.2, -r * 0.1);
    ctx.quadraticCurveTo(d * r * 1.1, -r * (0.6 + flap * 0.6), d * r * 1.6, -r * (0.2 + flap * 0.7));
    ctx.quadraticCurveTo(d * r * 1.0, r * 0.25, d * r * 0.2, r * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = s.main;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.45, r * 0.8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = s.light;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.2, r * 0.25, r * 0.45, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffcc4a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, r * 0.65);
  ctx.lineTo(r * 0.12, r * 0.65);
  ctx.lineTo(0, r * 0.95);
  ctx.closePath();
  ctx.fill();
  eyes(ctx, r, r * 0.35, r * 0.18);
};

const orrery: Painter = (ctx, r, s, t) => {
  ctx.strokeStyle = 'rgba(255, 220, 150, 0.75)';
  ctx.lineWidth = r * 0.08;
  for (const [rx, ry, rot] of [
    [1.35, 0.45, 0.4],
    [1.2, 0.4, -0.7],
  ]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * r, ry * r, rot, 0, TAU);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.65);
  g.addColorStop(0, s.light);
  g.addColorStop(1, s.main);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.65, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const a = t * (0.04 + i * 0.015) + i * 2;
    const rx = (1.35 - i * 0.15) * r;
    const ry = (0.45 - i * 0.05) * r;
    const rot = i % 2 ? -0.7 : 0.4;
    const px = Math.cos(a) * rx;
    const py = Math.sin(a) * ry;
    const x = px * Math.cos(rot) - py * Math.sin(rot);
    const y = px * Math.sin(rot) + py * Math.cos(rot);
    ctx.fillStyle = i === 0 ? '#ffd27a' : i === 1 ? '#7fd8ff' : '#ff9ac8';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.2, 0, TAU);
    ctx.fill();
  }
  eyes(ctx, r, 0, r * 0.2);
};

const stormling: Painter = (ctx, r, s, t) => {
  const puff = Math.sin(t * 0.12) * r * 0.05;
  ctx.fillStyle = '#ffe95a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, r * 0.4);
  ctx.lineTo(r * 0.2, r * 0.4);
  ctx.lineTo(0, r * 0.85);
  ctx.lineTo(r * 0.25, r * 0.85);
  ctx.lineTo(-r * 0.2, r * 1.5);
  ctx.lineTo(-r * 0.05, r * 0.95);
  ctx.lineTo(-r * 0.3, r * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = s.dark;
  for (const [x, y, rr] of [
    [-0.65, 0.15, 0.55],
    [0.65, 0.15, 0.55],
    [0, -0.2, 0.75],
    [-0.3, 0.3, 0.5],
    [0.3, 0.3, 0.5],
  ]) {
    ctx.beginPath();
    ctx.arc(x * r, y * r + puff, rr * r, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = s.main;
  ctx.beginPath();
  ctx.arc(-r * 0.2, -r * 0.35 + puff, r * 0.42, 0, TAU);
  ctx.arc(r * 0.35, -r * 0.15 + puff, r * 0.3, 0, TAU);
  ctx.fill();
  eyes(ctx, r, r * 0.05 + puff, r * 0.25, '#e8f4ff');
};

const shade: Painter = (ctx, r, s, t) => {
  ctx.fillStyle = '#1a1028';
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.1);
  ctx.quadraticCurveTo(r * 1.0, -r * 0.9, r * 0.9, r * 0.4);
  for (let i = 0; i <= 6; i++) {
    const x = r * 0.9 - (i / 6) * r * 1.8;
    const y = r * (i % 2 ? 0.75 : 1.05) + Math.sin(t * 0.2 + i) * r * 0.08;
    ctx.lineTo(x, y);
  }
  ctx.quadraticCurveTo(-r * 1.0, -r * 0.9, 0, -r * 1.1);
  ctx.fill();
  ctx.strokeStyle = s.main;
  ctx.lineWidth = r * 0.1;
  ctx.stroke();
  ctx.fillStyle = s.light;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(d * r * 0.3, -r * 0.2, r * 0.16, r * 0.1, d * 0.3, 0, TAU);
    ctx.fill();
  }
};

const crystal: Painter = (ctx, r, s, t) => {
  ctx.save();
  ctx.rotate(Math.sin(t * 0.03) * 0.3);
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * TAU;
    const rr = i % 3 === 0 ? r * 1.35 : r * 0.9;
    pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, s.light);
  g.addColorStop(1, s.main);
  ctx.fillStyle = g;
  ctx.globalAlpha *= 0.9;
  ctx.fill();
  ctx.globalAlpha /= 0.9;
  ctx.strokeStyle = s.dark;
  ctx.lineWidth = r * 0.07;
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    ctx.moveTo(0, 0);
    ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = s.dark;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-r * 0.06, -r * 0.06, r * 0.09, 0, TAU);
  ctx.fill();
};

const PAINTERS: Record<EnemySpriteId, Painter> = { wisp, moth, glowcap, cog, sparrow, orrery, stormling, shade, crystal };

/** Draw an enemy centred at (x, y). `flash` > 0 briefly whitens it when hit. */
export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  sprite: EnemySpriteId,
  x: number,
  y: number,
  r: number,
  s: Swatch,
  t: number,
  flash: number,
): void {
  drawGlow(ctx, glowSprite(s.r, s.g, s.b), x, y, r * 2.6, 0.45);
  ctx.save();
  ctx.translate(x, y);
  PAINTERS[sprite](ctx, r, s, t);
  ctx.restore();
  if (flash > 0) {
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, glowSprite(255, 255, 255), x, y, r * 1.6, 0.6);
    ctx.globalCompositeOperation = prev;
  }
}
