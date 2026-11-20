import { SCREEN_H, SCREEN_W } from '../core/constants';
import { TAU } from '../core/math';
import { Rng } from '../core/rng';
import { drawGlow, glowHex } from './glow';
import { context2d, makeCanvas } from './surface';

const RES = 2;
const HORIZON = 312;
const SPIRE_X = 468;
const SPIRE_TOP = 104;

interface Lantern {
  x: number;
  y: number;
  vy: number;
  phase: number;
  size: number;
  hue: string;
}

function buildStatic(): HTMLCanvasElement {
  const c = makeCanvas(SCREEN_W * RES, SCREEN_H * RES);
  const ctx = context2d(c);
  ctx.scale(RES, RES);
  const rng = new Rng(77);

  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, '#04061a');
  sky.addColorStop(0.6, '#0e1238');
  sky.addColorStop(1, '#2a1a44');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCREEN_W, HORIZON);

  for (let i = 0; i < 220; i++) {
    const x = rng.range(0, SCREEN_W);
    const y = rng.range(0, HORIZON - 30);
    const b = rng.range(0.25, 1);
    ctx.fillStyle = `rgba(230, 230, 255, ${b * (1 - y / HORIZON) + 0.1})`;
    const s = b > 0.9 ? 1.6 : 1;
    ctx.fillRect(x, y, s, s);
  }

  // crescent moon, carved on its own canvas so the sky and glow show through the dark side
  drawGlow(ctx, glowHex('#f4ecc8'), 116, 90, 70, 0.3);
  const moon = makeCanvas(48 * RES, 48 * RES);
  const mctx = context2d(moon);
  mctx.scale(RES, RES);
  mctx.fillStyle = '#f4efd6';
  mctx.beginPath();
  mctx.arc(24, 24, 20, 0, TAU);
  mctx.fill();
  mctx.globalCompositeOperation = 'destination-out';
  mctx.beginPath();
  mctx.arc(33, 18, 18, 0, TAU);
  mctx.fill();
  ctx.drawImage(moon, 96, 62, 48, 48);

  // distant hills
  for (const [base, color, amp] of [
    [HORIZON - 24, '#140f2c', 18],
    [HORIZON - 8, '#0b0a1e', 10],
  ] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON);
    for (let x = 0; x <= SCREEN_W; x += 16) ctx.lineTo(x, base - Math.abs(Math.sin(x * 0.011 + base)) * amp - rng.range(0, 4));
    ctx.lineTo(SCREEN_W, HORIZON);
    ctx.closePath();
    ctx.fill();
  }

  // the spire
  const spire = (flip: boolean): void => {
    ctx.save();
    if (flip) {
      ctx.translate(0, HORIZON * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = 0.22;
    }
    ctx.fillStyle = '#07081a';
    ctx.beginPath();
    ctx.moveTo(SPIRE_X - 34, HORIZON);
    ctx.lineTo(SPIRE_X - 20, HORIZON - 90);
    ctx.lineTo(SPIRE_X - 14, SPIRE_TOP + 40);
    ctx.lineTo(SPIRE_X - 22, SPIRE_TOP + 34);
    ctx.lineTo(SPIRE_X, SPIRE_TOP);
    ctx.lineTo(SPIRE_X + 22, SPIRE_TOP + 34);
    ctx.lineTo(SPIRE_X + 14, SPIRE_TOP + 40);
    ctx.lineTo(SPIRE_X + 20, HORIZON - 90);
    ctx.lineTo(SPIRE_X + 34, HORIZON);
    ctx.closePath();
    ctx.fill();
    if (!flip) {
      for (let k = 0; k < 9; k++) {
        const y = SPIRE_TOP + 60 + k * 17;
        if (rng.chance(0.55)) {
          ctx.fillStyle = 'rgba(255, 190, 90, 0.75)';
          ctx.fillRect(SPIRE_X - 4 + rng.spread(6), y, 2.5, 4);
        }
      }
    }
    ctx.restore();
  };
  spire(false);

  // lake
  const lake = ctx.createLinearGradient(0, HORIZON, 0, SCREEN_H);
  lake.addColorStop(0, '#120f30');
  lake.addColorStop(1, '#03040e');
  ctx.fillStyle = lake;
  ctx.fillRect(0, HORIZON, SCREEN_W, SCREEN_H - HORIZON);
  spire(true);
  for (let i = 0; i < 70; i++) {
    const y = rng.range(HORIZON + 4, SCREEN_H);
    const x = rng.range(0, SCREEN_W);
    const w = rng.range(10, 60) * (0.4 + (y - HORIZON) / (SCREEN_H - HORIZON));
    ctx.strokeStyle = `rgba(160, 170, 255, ${rng.range(0.04, 0.12)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
  }
  return c;
}

/**
 * Animated night scene used by the menus: a still lake, a distant spire with the Beacon at its
 * top, and paper lanterns drifting up into the sky. `lit` (0..1) relights the Beacon for the ending.
 */
export class Backdrop {
  private readonly base = buildStatic();
  private readonly lanterns: Lantern[] = [];
  private readonly rng = new Rng(78);
  t = 0;

  constructor(count = 34) {
    for (let i = 0; i < count; i++) this.lanterns.push(this.spawn(true));
  }

  private spawn(anywhere: boolean): Lantern {
    const r = this.rng;
    const size = r.range(0.5, 1.4);
    return {
      x: r.range(10, SCREEN_W - 10),
      y: anywhere ? r.range(40, SCREEN_H) : SCREEN_H + r.range(10, 80),
      vy: (0.18 + size * 0.22) * r.range(0.8, 1.2),
      phase: r.range(0, TAU),
      size,
      hue: r.chance(0.2) ? '#ff9a6a' : '#ffc95a',
    };
  }

  update(): void {
    this.t++;
    for (let i = 0; i < this.lanterns.length; i++) {
      const l = this.lanterns[i];
      l.y -= l.vy;
      l.x += Math.sin(this.t * 0.01 + l.phase) * 0.15;
      if (l.y < -20) this.lanterns[i] = this.spawn(false);
    }
  }

  draw(ctx: CanvasRenderingContext2D, lit = 0): void {
    ctx.drawImage(this.base, 0, 0, SCREEN_W, SCREEN_H);
    const t = this.t;
    const beacon = 0.25 + lit * 0.75;
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.03);
    drawGlow(ctx, glowHex('#ffcf5a', true), SPIRE_X, SPIRE_TOP - 2, 10 + lit * 26, beacon * pulse);
    drawGlow(ctx, glowHex('#ffb84a'), SPIRE_X, SPIRE_TOP, 60 + lit * 200, 0.25 * beacon * pulse);
    if (lit > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++) {
        const a = t * 0.004 + (i / 10) * TAU;
        ctx.fillStyle = `rgba(255, 220, 140, ${0.05 * lit})`;
        ctx.beginPath();
        ctx.moveTo(SPIRE_X, SPIRE_TOP);
        ctx.lineTo(SPIRE_X + Math.cos(a - 0.05) * 520, SPIRE_TOP + Math.sin(a - 0.05) * 520);
        ctx.lineTo(SPIRE_X + Math.cos(a + 0.05) * 520, SPIRE_TOP + Math.sin(a + 0.05) * 520);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // reflection of the beacon on the lake
      ctx.save();
      ctx.translate(SPIRE_X, HORIZON + 60);
      ctx.scale(0.35, 1.6);
      drawGlow(ctx, glowHex('#ffcf5a'), 0, 0, 60, 0.25 * lit);
      ctx.restore();
    }

    for (const l of this.lanterns) {
      const fl = 0.8 + 0.2 * Math.sin(t * 0.2 + l.phase * 3);
      const s = l.size;
      drawGlow(ctx, glowHex(l.hue), l.x, l.y, 16 * s * fl, 0.55);
      ctx.fillStyle = l.hue === '#ffc95a' ? '#ffdf9a' : '#ffb08a';
      ctx.beginPath();
      ctx.moveTo(l.x - 4 * s, l.y - 5 * s);
      ctx.quadraticCurveTo(l.x, l.y - 8 * s, l.x + 4 * s, l.y - 5 * s);
      ctx.lineTo(l.x + 3.2 * s, l.y + 4 * s);
      ctx.lineTo(l.x - 3.2 * s, l.y + 4 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 230, 0.9)';
      ctx.fillRect(l.x - 1 * s, l.y - 1 * s, 2 * s, 3.5 * s);
      if (l.y > HORIZON) continue;
      // reflection on the lake
      const ry = HORIZON + (HORIZON - l.y) * 0.25;
      if (ry < SCREEN_H) drawGlow(ctx, glowHex(l.hue), l.x, ry, 6 * s, 0.18);
    }
  }
}

let shared: Backdrop | null = null;

/** One backdrop shared by all menu screens so the lanterns keep drifting between them. */
export function sharedBackdrop(): Backdrop {
  if (!shared) shared = new Backdrop();
  return shared;
}
