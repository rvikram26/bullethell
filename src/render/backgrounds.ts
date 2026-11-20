import { FIELD_H, FIELD_W } from '../core/constants';
import { TAU } from '../core/math';
import { Rng } from '../core/rng';
import type { BackgroundId } from '../data/types';
import { drawGlow, glowHex } from './glow';
import { context2d, makeCanvas } from './surface';

const RES = 2;
const TILE_H = 512;

/** A vertically tileable layer that scrolls at its own speed (parallax). */
class Layer {
  readonly canvas: HTMLCanvasElement;
  constructor(
    readonly speed: number,
    paint: (ctx: CanvasRenderingContext2D, rng: Rng, w: number, h: number) => void,
    seed: number,
    readonly alpha = 1,
  ) {
    this.canvas = makeCanvas(FIELD_W * RES, TILE_H * RES);
    const ctx = context2d(this.canvas);
    ctx.scale(RES, RES);
    paint(ctx, new Rng(seed), FIELD_W, TILE_H);
  }

  draw(ctx: CanvasRenderingContext2D, scroll: number): void {
    const off = (scroll * this.speed) % TILE_H;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * this.alpha;
    // draw the two tiles that cover the field
    ctx.drawImage(this.canvas, 0, off - TILE_H, FIELD_W, TILE_H);
    ctx.drawImage(this.canvas, 0, off, FIELD_W, TILE_H);
    ctx.globalAlpha = prev;
  }
}

/** Draw `fn` at y and at y +/- h so shapes that cross the tile edge wrap seamlessly. */
function wrapped(h: number, y: number, extent: number, fn: (y: number) => void): void {
  fn(y);
  if (y - extent < 0) fn(y + h);
  if (y + extent > h) fn(y - h);
}

export interface Background {
  update(): void;
  /** Draw in field coordinates. `mood` (0..1) rises while a boss is present. */
  draw(ctx: CanvasRenderingContext2D, mood: number): void;
}

function baseGradient(ctx: CanvasRenderingContext2D, stops: [number, string][]): void {
  const g = ctx.createLinearGradient(0, 0, 0, FIELD_H);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
}

// ---------------------------------------------------------------------------------------------
// Stage 1: the Marsh of Wicks
// ---------------------------------------------------------------------------------------------

function lilyPad(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, rot + 0.35, rot + TAU - 0.05);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 200, 140, 0.25)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

class Marsh implements Background {
  private scroll = 0;
  private t = 0;
  private readonly water: Layer;
  private readonly pads: Layer;
  private readonly flies: { x: number; y: number; p: number; s: number }[] = [];

  constructor() {
    this.water = new Layer(
      0.45,
      (ctx, rng, w, h) => {
        for (let i = 0; i < 70; i++) {
          const x = rng.range(0, w);
          const y = rng.range(0, h);
          const rx = rng.range(10, 46);
          const a = rng.range(0.05, 0.14);
          wrapped(h, y, 10, (yy) => {
            ctx.beginPath();
            ctx.ellipse(x, yy, rx, rx * 0.22, 0, 0, TAU);
            ctx.strokeStyle = `rgba(140, 220, 210, ${a})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          });
        }
        for (let i = 0; i < 16; i++) {
          const x = rng.range(0, w);
          const y = rng.range(0, h);
          const r = rng.range(5, 12);
          const rot = rng.range(0, TAU);
          wrapped(h, y, r, (yy) => lilyPad(ctx, x, yy, r, rot, 'rgba(20, 70, 50, 0.7)'));
        }
        for (let i = 0; i < 10; i++) {
          const x = rng.range(20, w - 20);
          const y = rng.range(0, h);
          const r = rng.range(14, 26);
          wrapped(h, y, r, (yy) => drawGlow(ctx, glowHex('#ffb84a'), x, yy, r, 0.18));
        }
      },
      11,
    );
    this.pads = new Layer(
      1.1,
      (ctx, rng, w, h) => {
        for (let i = 0; i < 12; i++) {
          const left = i % 2 === 0;
          const x = left ? rng.range(-10, 60) : rng.range(w - 60, w + 10);
          const y = rng.range(0, h);
          const r = rng.range(14, 26);
          const rot = rng.range(0, TAU);
          const flower = rng.chance(0.5);
          wrapped(h, y, r + 4, (yy) => {
            lilyPad(ctx, x, yy, r, rot, 'rgba(28, 96, 62, 0.9)');
            if (flower) {
              for (let k = 0; k < 6; k++) {
                const a = (k / 6) * TAU;
                ctx.beginPath();
                ctx.ellipse(x + Math.cos(a) * 4, yy + Math.sin(a) * 4, 4.5, 2, a, 0, TAU);
                ctx.fillStyle = k % 2 ? 'rgba(255, 220, 236, 0.85)' : 'rgba(255, 255, 255, 0.85)';
                ctx.fill();
              }
            }
          });
        }
        // reed clumps
        for (let i = 0; i < 10; i++) {
          const left = i % 2 === 0;
          const x0 = left ? rng.range(0, 30) : rng.range(w - 30, w);
          const y0 = rng.range(0, h);
          const blades = Array.from({ length: 7 }, () => ({
            x: x0 + rng.spread(10),
            len: rng.range(30, 60),
            a: rng.range(0.7, 0.95),
            lw: rng.range(1.5, 3),
            b1: rng.spread(8),
            b2: rng.spread(14),
          }));
          wrapped(h, y0, 60, (yy) => {
            for (const b of blades) {
              ctx.strokeStyle = `rgba(10, 40, 30, ${b.a})`;
              ctx.lineWidth = b.lw;
              ctx.beginPath();
              ctx.moveTo(b.x, yy + 20);
              ctx.quadraticCurveTo(b.x + b.b1, yy - b.len * 0.5, b.x + b.b2, yy - b.len);
              ctx.stroke();
            }
          });
        }
      },
      12,
    );
    const rng = new Rng(13);
    for (let i = 0; i < 28; i++) this.flies.push({ x: rng.range(0, FIELD_W), y: rng.range(0, FIELD_H), p: rng.range(0, TAU), s: rng.range(0.4, 1) });
  }

  update(): void {
    this.scroll += 1;
    this.t++;
    for (const f of this.flies) {
      f.y += 0.35 * f.s;
      f.x += Math.sin(this.t * 0.02 * f.s + f.p) * 0.4;
      if (f.y > FIELD_H + 10) {
        f.y = -10;
        f.x = (f.x + 137) % FIELD_W;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, mood: number): void {
    baseGradient(ctx, [
      [0, '#03111a'],
      [0.6, '#06262a'],
      [1, '#0a342e'],
    ]);
    this.water.draw(ctx, this.scroll);
    // drifting mist
    const mist = glowHex('#8fd8c8');
    for (let i = 0; i < 3; i++) {
      const x = ((this.t * (0.15 + i * 0.05) + i * 160) % (FIELD_W + 300)) - 150;
      const y = 80 + i * 140 + Math.sin(this.t * 0.004 + i) * 20;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(2.6, 0.7);
      drawGlow(ctx, mist, 0, 0, 70, 0.07);
      ctx.restore();
    }
    this.pads.draw(ctx, this.scroll);
    const fly = glowHex('#d8ff7a', true);
    for (const f of this.flies) {
      const tw = 0.5 + 0.5 * Math.sin(this.t * 0.08 * f.s + f.p);
      drawGlow(ctx, fly, f.x, f.y, 3 + tw * 3, 0.35 + tw * 0.5);
    }
    if (mood > 0) {
      ctx.fillStyle = `rgba(0, 10, 20, ${0.3 * mood})`;
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Stage 2: the Cloudway Observatory
// ---------------------------------------------------------------------------------------------

class Cloudway implements Background {
  private scroll = 0;
  private t = 0;
  private readonly stars: Layer;
  private readonly cloudsFar: Layer;
  private readonly bridge: Layer;
  private readonly cloudsNear: Layer;
  private shooting: { x: number; y: number; t: number } | null = null;

  constructor() {
    this.stars = new Layer(
      0.12,
      (ctx, rng, w, h) => {
        for (let i = 0; i < 160; i++) {
          const x = rng.range(0, w);
          const y = rng.range(0, h);
          const b = rng.range(0.3, 1);
          ctx.fillStyle = `rgba(${200 + b * 55}, ${200 + b * 40}, 255, ${b})`;
          ctx.fillRect(x, y, b > 0.85 ? 1.6 : 1, b > 0.85 ? 1.6 : 1);
        }
      },
      21,
    );
    const clouds = (count: number, minR: number, maxR: number, color: string, alpha: [number, number]) =>
      (ctx: CanvasRenderingContext2D, rng: Rng, w: number, h: number): void => {
        const img = glowHex(color);
        for (let i = 0; i < count; i++) {
          const x = rng.range(-20, w + 20);
          const y = rng.range(0, h);
          const r = rng.range(minR, maxR);
          const a = rng.range(alpha[0], alpha[1]);
          wrapped(h, y, r, (yy) => {
            ctx.save();
            ctx.translate(x, yy);
            ctx.scale(1.8, 0.75);
            drawGlow(ctx, img, 0, 0, r, a);
            ctx.restore();
          });
        }
      };
    this.cloudsFar = new Layer(0.55, clouds(26, 40, 90, '#8a9ae8', [0.12, 0.25]), 22);
    this.bridge = new Layer(
      1.3,
      (ctx, _rng, _w, h) => {
        for (const x of [96, 288]) {
          ctx.strokeStyle = 'rgba(150, 110, 60, 0.55)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(220, 180, 110, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x - 2, 0);
          ctx.lineTo(x - 2, h);
          ctx.stroke();
          for (let y = 0; y < h; y += 64) {
            ctx.fillStyle = 'rgba(120, 85, 45, 0.7)';
            ctx.fillRect(x - 4, y, 8, 5);
            if (y % 128 === 0) wrapped(h, y + 2, 9, (yy) => drawGlow(ctx, glowHex('#ffd27a', true), x, yy, 9, 0.6));
          }
        }
        // cross beams
        ctx.strokeStyle = 'rgba(150, 110, 60, 0.28)';
        ctx.lineWidth = 2;
        for (let y = 32; y < h; y += 128) {
          ctx.beginPath();
          ctx.moveTo(96, y);
          ctx.lineTo(288, y + 40);
          ctx.moveTo(288, y);
          ctx.lineTo(96, y + 40);
          ctx.stroke();
        }
      },
      23,
    );
    this.cloudsNear = new Layer(2.1, clouds(8, 60, 110, '#d8dcff', [0.1, 0.18]), 24);
  }

  update(): void {
    this.scroll += 1;
    this.t++;
    if (!this.shooting && this.t % 240 === 0) this.shooting = { x: 40 + ((this.t * 7) % 300), y: 30 + ((this.t * 3) % 120), t: 0 };
    if (this.shooting && ++this.shooting.t > 40) this.shooting = null;
  }

  draw(ctx: CanvasRenderingContext2D, mood: number): void {
    baseGradient(ctx, [
      [0, '#060821'],
      [0.55, '#151038'],
      [1, '#2a1846'],
    ]);
    this.stars.draw(ctx, this.scroll);
    // twinkles
    for (let i = 0; i < 10; i++) {
      const x = (i * 97 + 31) % FIELD_W;
      const y = (i * 61 + ((this.scroll * 0.12) | 0)) % FIELD_H;
      const tw = 0.5 + 0.5 * Math.sin(this.t * 0.05 + i * 1.7);
      drawGlow(ctx, glowHex('#e6e0ff', true), x, y, 2 + tw * 3, tw * 0.8);
    }
    if (this.shooting) {
      const s = this.shooting;
      const u = s.t / 40;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - u)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x + u * 120, s.y + u * 50);
      ctx.lineTo(s.x + u * 120 - 30, s.y + u * 50 - 12);
      ctx.stroke();
    }
    this.cloudsFar.draw(ctx, this.scroll);
    this.bridge.draw(ctx, this.scroll);
    this.cloudsNear.draw(ctx, this.scroll);
    if (mood > 0) {
      ctx.fillStyle = `rgba(20, 0, 40, ${0.3 * mood})`;
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Stage 3: the Beacon Spire
// ---------------------------------------------------------------------------------------------

class Spire implements Background {
  private scroll = 0;
  private t = 0;
  private readonly clouds: Layer;
  private readonly walls: Layer;
  private readonly rain: { x: number; y: number; s: number }[] = [];
  private lightning = 0;
  private bolt: number[] = [];
  private readonly rng = new Rng(31);

  constructor() {
    this.clouds = new Layer(
      0.4,
      (ctx, rng, w, h) => {
        const img = glowHex('#2a3460');
        for (let i = 0; i < 30; i++) {
          const x = rng.range(-30, w + 30);
          const y = rng.range(0, h);
          const r = rng.range(50, 110);
          wrapped(h, y, r, (yy) => {
            ctx.save();
            ctx.translate(x, yy);
            ctx.scale(1.5, 0.8);
            drawGlow(ctx, img, 0, 0, r, 0.5);
            ctx.restore();
          });
        }
      },
      32,
    );
    this.walls = new Layer(
      1.6,
      (ctx, rng, w, h) => {
        for (const side of [0, 1]) {
          const x0 = side === 0 ? 0 : w - 54;
          const g = ctx.createLinearGradient(x0, 0, x0 + 54, 0);
          g.addColorStop(side === 0 ? 0 : 1, '#141a2c');
          g.addColorStop(side === 0 ? 1 : 0, '#232a40');
          ctx.fillStyle = g;
          ctx.fillRect(x0, 0, 54, h);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.lineWidth = 1;
          for (let y = 0; y < h; y += 16) {
            ctx.beginPath();
            ctx.moveTo(x0, y);
            ctx.lineTo(x0 + 54, y);
            ctx.stroke();
            const off = (y / 16) % 2 === 0 ? 0 : 13;
            for (let x = x0 + off; x < x0 + 54; x += 26) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x, y + 16);
              ctx.stroke();
            }
          }
          for (let y = 40; y < h; y += 128) {
            const wx = side === 0 ? 16 : w - 38;
            ctx.fillStyle = '#05060c';
            ctx.fillRect(wx, y, 22, 34);
            if (rng.chance(0.7)) {
              ctx.fillStyle = 'rgba(255, 190, 90, 0.75)';
              ctx.fillRect(wx + 3, y + 3, 16, 28);
              drawGlow(ctx, glowHex('#ffb84a'), wx + 11, y + 17, 26, 0.35);
            }
          }
          ctx.fillStyle = side === 0 ? 'rgba(255, 210, 122, 0.12)' : 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(side === 0 ? x0 + 52 : x0, 0, 2, h);
        }
      },
      33,
    );
    for (let i = 0; i < 70; i++) this.rain.push({ x: this.rng.range(0, FIELD_W), y: this.rng.range(0, FIELD_H), s: this.rng.range(6, 10) });
  }

  update(): void {
    this.scroll += 1;
    this.t++;
    for (const d of this.rain) {
      d.y += d.s;
      d.x -= d.s * 0.18;
      if (d.y > FIELD_H) {
        d.y -= FIELD_H + 20;
        d.x = this.rng.range(0, FIELD_W + 60);
      }
    }
    if (this.lightning > 0) this.lightning--;
    if (this.t % 300 === 150 || (this.t % 300 === 170 && this.rng.chance(0.5))) {
      this.lightning = 14;
      this.bolt = [];
      let x = this.rng.range(90, 290);
      for (let y = 0; y < 260; y += 26) {
        this.bolt.push(x, y);
        x += this.rng.spread(28);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, mood: number): void {
    baseGradient(ctx, [
      [0, '#04060e'],
      [0.6, '#0c1224'],
      [1, '#171230'],
    ]);
    if (mood > 0) {
      const pulse = 0.75 + 0.25 * Math.sin(this.t * 0.03);
      drawGlow(ctx, glowHex('#ffcf5a'), FIELD_W / 2, -30, 260, 0.35 * mood * pulse);
    }
    this.clouds.draw(ctx, this.scroll);
    if (this.lightning > 0 && this.bolt.length > 2) {
      const a = this.lightning / 14;
      ctx.strokeStyle = `rgba(220, 235, 255, ${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.bolt[0], this.bolt[1]);
      for (let i = 2; i < this.bolt.length; i += 2) ctx.lineTo(this.bolt[i], this.bolt[i + 1]);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(160, 190, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of this.rain) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.s * 0.35, d.y - d.s * 1.8);
    }
    ctx.stroke();
    this.walls.draw(ctx, this.scroll);
    if (this.lightning > 0) {
      ctx.fillStyle = `rgba(200, 220, 255, ${(this.lightning / 14) * 0.18})`;
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    }
  }
}

export function makeBackground(id: BackgroundId): Background {
  switch (id) {
    case 'marsh':
      return new Marsh();
    case 'cloudway':
      return new Cloudway();
    case 'spire':
      return new Spire();
  }
}
