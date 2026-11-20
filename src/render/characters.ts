import { TAU } from '../core/math';
import type { CharacterId } from '../data/types';
import { drawGlow, glowHex } from './glow';
import { prerender } from './surface';

export type HairStyle = 'hood' | 'bob' | 'long' | 'twin' | 'spiky';
export type Accessory = 'none' | 'antennae' | 'lily' | 'ears' | 'hat' | 'horns' | 'wick';
export type Wings = 'none' | 'moth' | 'willow' | 'gears' | 'stars' | 'storm' | 'rays';
export type Mouth = 'smile' | 'flat' | 'grin' | 'smirk';

/** Everything the painter needs to draw one character. All characters are original designs. */
export interface Look {
  id: CharacterId;
  name: string;
  skin: string;
  blush: string;
  hair: string;
  hairShade: string;
  hairLight: string;
  eye: string;
  eyeDark: string;
  outfit: string;
  outfitShade: string;
  trim: string;
  accent: string;
  hairStyle: HairStyle;
  accessory: Accessory;
  wings: Wings;
  mouth: Mouth;
}

export const LOOKS: Record<CharacterId, Look> = {
  wren: {
    id: 'wren',
    name: 'Wren',
    skin: '#ffe3cf',
    blush: '#ff9a9a',
    hair: '#c25e2e',
    hairShade: '#7c3416',
    hairLight: '#ffa877',
    eye: '#4f8fe8',
    eyeDark: '#1d3a78',
    outfit: '#2e4384',
    outfitShade: '#18224d',
    trim: '#ffcf5a',
    accent: '#ffd27a',
    hairStyle: 'hood',
    accessory: 'none',
    wings: 'none',
    mouth: 'smile',
  },
  tamsin: {
    id: 'tamsin',
    name: 'Tamsin',
    skin: '#fbe9df',
    blush: '#ff8fc0',
    hair: '#f1e7d6',
    hairShade: '#bfae93',
    hairLight: '#ffffff',
    eye: '#e8559e',
    eyeDark: '#7a1f4f',
    outfit: '#c96a9d',
    outfitShade: '#7a3361',
    trim: '#ffe7a6',
    accent: '#ff7ccf',
    hairStyle: 'bob',
    accessory: 'antennae',
    wings: 'moth',
    mouth: 'grin',
  },
  odalys: {
    id: 'odalys',
    name: 'Odalys',
    skin: '#ecd9c4',
    blush: '#f0a08a',
    hair: '#2f7d5c',
    hairShade: '#164633',
    hairLight: '#7fe0b0',
    eye: '#6cf7c4',
    eyeDark: '#0f5a44',
    outfit: '#2b6b6c',
    outfitShade: '#133b3c',
    trim: '#b8ff7a',
    accent: '#5fffa8',
    hairStyle: 'long',
    accessory: 'lily',
    wings: 'willow',
    mouth: 'flat',
  },
  brindle: {
    id: 'brindle',
    name: 'Brindle',
    skin: '#ffe4c8',
    blush: '#ff9f86',
    hair: '#8c6a50',
    hairShade: '#563e2d',
    hairLight: '#c9a487',
    eye: '#ffb13d',
    eyeDark: '#8a4a00',
    outfit: '#e5852b',
    outfitShade: '#8a4513',
    trim: '#ffd66a',
    accent: '#ffb84a',
    hairStyle: 'twin',
    accessory: 'ears',
    wings: 'gears',
    mouth: 'grin',
  },
  vesper: {
    id: 'vesper',
    name: 'Vesper',
    skin: '#f2e2da',
    blush: '#f0a0c0',
    hair: '#4b3b8c',
    hairShade: '#291e57',
    hairLight: '#9a8ae8',
    eye: '#c9a6ff',
    eyeDark: '#4a2690',
    outfit: '#5b3b9b',
    outfitShade: '#2e1d5b',
    trim: '#dde4ff',
    accent: '#b58cff',
    hairStyle: 'long',
    accessory: 'hat',
    wings: 'stars',
    mouth: 'smirk',
  },
  kessra: {
    id: 'kessra',
    name: 'Kessra',
    skin: '#ebdfdb',
    blush: '#f39aa8',
    hair: '#9cbbeb',
    hairShade: '#5878aa',
    hairLight: '#e2edff',
    eye: '#4fd8ff',
    eyeDark: '#0c5a8a',
    outfit: '#2b5bc9',
    outfitShade: '#14307b',
    trim: '#ffe95a',
    accent: '#7fd0ff',
    hairStyle: 'spiky',
    accessory: 'horns',
    wings: 'storm',
    mouth: 'grin',
  },
  auriel: {
    id: 'auriel',
    name: 'Auriel',
    skin: '#fff1e2',
    blush: '#ffb0a0',
    hair: '#ffe6a3',
    hairShade: '#c7a15a',
    hairLight: '#fffbe6',
    eye: '#ffad38',
    eyeDark: '#8a4c00',
    outfit: '#f3e8cf',
    outfitShade: '#b39c6c',
    trim: '#ffcc3a',
    accent: '#ffd84a',
    hairStyle: 'long',
    accessory: 'wick',
    wings: 'rays',
    mouth: 'flat',
  },
};

// ---------------------------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------------------------

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

function fillEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, rot = 0): void {
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = color;
  ctx.fill();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, points = 5, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function gear(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, teeth: number, rot: number, color: string, hole: string): void {
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = rot + (i * Math.PI) / teeth;
    const a1 = rot + ((i + 1) * Math.PI) / teeth;
    const rr = i % 2 === 0 ? r : r * 0.78;
    ctx.lineTo(x + Math.cos(a0) * rr, y + Math.sin(a0) * rr);
    ctx.lineTo(x + Math.cos(a1) * rr, y + Math.sin(a1) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  fillEllipse(ctx, x, y, r * 0.32, r * 0.32, hole);
}

/** A teardrop flame pointing up, base at (x, y). */
export function flame(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, flicker: number, outer: string, inner: string): void {
  const w = h * 0.42;
  const tip = y - h * (1 + flicker * 0.08);
  ctx.beginPath();
  ctx.moveTo(x, tip);
  ctx.bezierCurveTo(x + w * 0.4, y - h * 0.55, x + w, y - h * 0.25, x, y);
  ctx.bezierCurveTo(x - w, y - h * 0.25, x - w * 0.4, y - h * 0.55, x, tip);
  ctx.fillStyle = outer;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.6);
  ctx.bezierCurveTo(x + w * 0.45, y - h * 0.3, x + w * 0.45, y - h * 0.08, x, y - h * 0.02);
  ctx.bezierCurveTo(x - w * 0.45, y - h * 0.08, x - w * 0.45, y - h * 0.3, x, y - h * 0.6);
  ctx.fillStyle = inner;
  ctx.fill();
}

/** Wren's hand lantern, centred at (x, y); `s` is the body height. */
export function lantern(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, glowAlpha = 1): void {
  const flick = Math.sin(t * 0.31) * 0.5 + Math.sin(t * 0.77) * 0.5;
  if (glowAlpha > 0) drawGlow(ctx, glowHex('#ffc95a', true), x, y, s * (2.1 + flick * 0.1), 0.55 * glowAlpha);
  ctx.strokeStyle = '#3a2a18';
  ctx.lineWidth = s * 0.06;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.62);
  ctx.lineTo(x, y - s * 0.95);
  ctx.stroke();
  // cap and base
  ctx.fillStyle = '#2b1d10';
  ctx.fillRect(x - s * 0.34, y - s * 0.62, s * 0.68, s * 0.14);
  ctx.fillRect(x - s * 0.3, y + s * 0.42, s * 0.6, s * 0.12);
  // glass
  ctx.fillStyle = '#ffe59a';
  ctx.fillRect(x - s * 0.26, y - s * 0.48, s * 0.52, s * 0.9);
  flame(ctx, x, y + s * 0.3, s * 0.62, flick, '#ff9a2a', '#fff6c8');
  ctx.strokeStyle = '#5a3d1c';
  ctx.lineWidth = s * 0.05;
  ctx.strokeRect(x - s * 0.26, y - s * 0.48, s * 0.52, s * 0.9);
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.48);
  ctx.lineTo(x, y + s * 0.42);
  ctx.stroke();
}

// ---------------------------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------------------------

function backHair(ctx: CanvasRenderingContext2D, L: Look, r: number): void {
  ctx.fillStyle = L.hair;
  switch (L.hairStyle) {
    case 'hood': {
      // the hood, behind the head
      ctx.beginPath();
      ctx.moveTo(-r * 1.32, r * 1.25);
      ctx.bezierCurveTo(-r * 1.55, -r * 0.4, -r * 0.9, -r * 1.45, 0, -r * 1.42);
      ctx.bezierCurveTo(r * 0.9, -r * 1.45, r * 1.55, -r * 0.4, r * 1.32, r * 1.25);
      ctx.closePath();
      ctx.fillStyle = L.outfit;
      ctx.fill();
      ctx.fillStyle = L.hair;
      fillEllipse(ctx, 0, r * 0.2, r * 1.08, r * 1.1, L.hair);
      break;
    }
    case 'bob': {
      ctx.beginPath();
      ctx.moveTo(-r * 1.18, r * 0.95);
      ctx.bezierCurveTo(-r * 1.45, -r * 0.6, -r * 0.8, -r * 1.35, 0, -r * 1.3);
      ctx.bezierCurveTo(r * 0.8, -r * 1.35, r * 1.45, -r * 0.6, r * 1.18, r * 0.95);
      ctx.quadraticCurveTo(0, r * 1.25, -r * 1.18, r * 0.95);
      ctx.fill();
      break;
    }
    case 'long': {
      ctx.beginPath();
      ctx.moveTo(-r * 1.0, -r * 0.6);
      ctx.bezierCurveTo(-r * 1.5, r * 0.6, -r * 1.55, r * 2.0, -r * 1.25, r * 3.0);
      ctx.lineTo(r * 1.25, r * 3.0);
      ctx.bezierCurveTo(r * 1.55, r * 2.0, r * 1.5, r * 0.6, r * 1.0, -r * 0.6);
      ctx.bezierCurveTo(r * 0.8, -r * 1.4, -r * 0.8, -r * 1.4, -r * 1.0, -r * 0.6);
      ctx.fill();
      ctx.fillStyle = L.hairShade;
      ctx.globalAlpha *= 0.35;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 1.0);
      ctx.quadraticCurveTo(-r * 0.7, r * 2.2, -r * 0.5, r * 3.0);
      ctx.lineTo(r * 0.5, r * 3.0);
      ctx.quadraticCurveTo(r * 0.7, r * 2.2, r * 0.6, r * 1.0);
      ctx.fill();
      ctx.globalAlpha /= 0.35;
      break;
    }
    case 'twin': {
      fillEllipse(ctx, 0, -r * 0.1, r * 1.15, r * 1.2, L.hair);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.9, -r * 0.5);
        ctx.bezierCurveTo(s * r * 1.9, -r * 0.2, s * r * 1.9, r * 1.4, s * r * 1.35, r * 2.1);
        ctx.bezierCurveTo(s * r * 1.25, r * 1.3, s * r * 1.0, r * 0.4, s * r * 0.8, r * 0.1);
        ctx.closePath();
        ctx.fillStyle = L.hair;
        ctx.fill();
        fillEllipse(ctx, s * r * 1.02, -r * 0.45, r * 0.2, r * 0.16, L.trim);
      }
      break;
    }
    case 'spiky': {
      ctx.beginPath();
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * 0.85 + (i / n) * Math.PI * 1.3;
        const rr = i % 2 === 0 ? r * 1.55 : r * 1.1;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr - r * 0.1);
      }
      ctx.lineTo(r * 1.15, r * 1.2);
      ctx.lineTo(-r * 1.15, r * 1.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

function face(ctx: CanvasRenderingContext2D, L: Look, r: number, blink: boolean): void {
  fillEllipse(ctx, 0, 0, r, r * 1.04, L.skin);
  // soft jaw shading
  ctx.globalAlpha *= 0.18;
  fillEllipse(ctx, 0, r * 0.62, r * 0.7, r * 0.34, L.hairShade);
  ctx.globalAlpha /= 0.18;

  // blush
  ctx.globalAlpha *= 0.35;
  fillEllipse(ctx, -r * 0.55, r * 0.42, r * 0.2, r * 0.1, L.blush);
  fillEllipse(ctx, r * 0.55, r * 0.42, r * 0.2, r * 0.1, L.blush);
  ctx.globalAlpha /= 0.35;

  const ex = r * 0.4;
  const ey = r * 0.12;
  const ew = r * 0.22;
  const eh = r * 0.32;
  for (const s of [-1, 1]) {
    const x = ex * s;
    if (blink) {
      ctx.strokeStyle = L.eyeDark;
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.arc(x, ey, ew, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      continue;
    }
    fillEllipse(ctx, x, ey, ew, eh, L.eyeDark);
    fillEllipse(ctx, x, ey + eh * 0.18, ew * 0.8, eh * 0.72, L.eye);
    fillEllipse(ctx, x, ey + eh * 0.22, ew * 0.42, eh * 0.44, L.eyeDark);
    fillEllipse(ctx, x - ew * 0.32, ey - eh * 0.3, ew * 0.3, ew * 0.3, '#ffffff');
    fillEllipse(ctx, x + ew * 0.32, ey + eh * 0.42, ew * 0.14, ew * 0.14, 'rgba(255,255,255,0.8)');
    // upper lash
    ctx.strokeStyle = '#2a1820';
    ctx.lineWidth = r * 0.075;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(x, ey + eh * 0.05, ew * 1.08, eh * 1.0, 0, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    // brow
    ctx.strokeStyle = L.hairShade;
    ctx.lineWidth = r * 0.05;
    ctx.beginPath();
    ctx.moveTo(x - ew * 0.9, ey - eh * 1.35 + s * eh * 0.08);
    ctx.quadraticCurveTo(x, ey - eh * 1.6, x + ew * 0.9, ey - eh * 1.35 - s * eh * 0.08);
    ctx.stroke();
  }

  // mouth
  ctx.strokeStyle = '#a0505a';
  ctx.lineWidth = r * 0.055;
  ctx.lineCap = 'round';
  const my = r * 0.58;
  ctx.beginPath();
  switch (L.mouth) {
    case 'smile':
      ctx.arc(0, my - r * 0.08, r * 0.14, Math.PI * 0.2, Math.PI * 0.8);
      break;
    case 'grin':
      ctx.arc(0, my - r * 0.1, r * 0.17, Math.PI * 0.1, Math.PI * 0.9);
      ctx.closePath();
      ctx.fillStyle = '#c0606a';
      ctx.fill();
      break;
    case 'flat':
      ctx.moveTo(-r * 0.09, my);
      ctx.lineTo(r * 0.09, my);
      break;
    case 'smirk':
      ctx.moveTo(-r * 0.1, my + r * 0.01);
      ctx.quadraticCurveTo(r * 0.04, my + r * 0.05, r * 0.14, my - r * 0.04);
      break;
  }
  ctx.stroke();
}

function bangs(ctx: CanvasRenderingContext2D, L: Look, r: number): void {
  ctx.fillStyle = L.hair;
  const spiky = L.hairStyle === 'spiky';
  ctx.beginPath();
  ctx.moveTo(-r * 1.06, r * 0.1);
  ctx.bezierCurveTo(-r * 1.15, -r * 0.9, -r * 0.6, -r * 1.22, 0, -r * 1.2);
  ctx.bezierCurveTo(r * 0.6, -r * 1.22, r * 1.15, -r * 0.9, r * 1.06, r * 0.1);
  // fringe lobes, right to left
  const lobes = spiky ? 6 : 5;
  for (let i = 0; i <= lobes; i++) {
    const u = 1 - i / lobes;
    const x = -r * 1.0 + u * r * 2.0;
    const tipY = (i % 2 === 0 ? -r * 0.12 : -r * 0.3) + (spiky ? r * 0.05 : 0);
    const valY = -r * 0.62;
    if (i === 0) ctx.lineTo(x, tipY);
    else {
      const px = x + r / lobes;
      if (spiky) {
        ctx.lineTo(px, valY);
        ctx.lineTo(x, tipY);
      } else ctx.quadraticCurveTo(px, valY, x, tipY);
    }
  }
  ctx.closePath();
  ctx.fill();

  // side locks
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.98, -r * 0.35);
    ctx.quadraticCurveTo(s * r * 1.12, r * 0.5, s * r * 0.86, r * 1.05);
    ctx.quadraticCurveTo(s * r * 0.82, r * 0.4, s * r * 0.74, -r * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  // shine
  ctx.strokeStyle = L.hairLight;
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(-r * 0.05, -r * 0.35, r * 0.72, Math.PI * 1.15, Math.PI * 1.55);
  ctx.stroke();
  ctx.globalAlpha /= 0.55;
}

function hoodFront(ctx: CanvasRenderingContext2D, L: Look, r: number): void {
  ctx.strokeStyle = L.outfitShade;
  ctx.lineWidth = r * 0.28;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.05, r * 1.2, r * 1.26, 0, Math.PI * 0.92, Math.PI * 2.08);
  ctx.stroke();
  ctx.strokeStyle = L.trim;
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.05, r * 1.33, r * 1.39, 0, Math.PI * 0.95, Math.PI * 2.05);
  ctx.stroke();
}

function accessory(ctx: CanvasRenderingContext2D, L: Look, r: number, t: number): void {
  switch (L.accessory) {
    case 'antennae':
      for (const s of [-1, 1]) {
        ctx.strokeStyle = L.hairShade;
        ctx.lineWidth = r * 0.06;
        ctx.beginPath();
        ctx.moveTo(s * r * 0.3, -r * 1.0);
        ctx.quadraticCurveTo(s * r * 0.5, -r * 1.8, s * r * 1.05, -r * 1.95 + Math.sin(t * 0.1 + s) * r * 0.05);
        ctx.stroke();
        for (let k = 0; k < 4; k++) {
          fillEllipse(ctx, s * (r * 0.62 + k * r * 0.13), -r * (1.62 + k * 0.09), r * 0.13, r * 0.06, L.hairLight, s * -0.6);
        }
      }
      break;
    case 'lily': {
      const x = r * 0.85;
      const y = -r * 0.7;
      fillEllipse(ctx, x + r * 0.08, y + r * 0.12, r * 0.42, r * 0.26, '#2c8a4a', 0.4);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        fillEllipse(ctx, x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, r * 0.22, r * 0.1, i % 2 ? '#ffd6ea' : '#ffffff', a);
      }
      fillEllipse(ctx, x, y, r * 0.1, r * 0.1, '#ffe14a');
      break;
    }
    case 'ears':
      for (const s of [-1, 1]) {
        fillEllipse(ctx, s * r * 0.85, -r * 0.95, r * 0.48, r * 0.46, L.hair);
        fillEllipse(ctx, s * r * 0.85, -r * 0.93, r * 0.3, r * 0.28, '#ffb7b0');
      }
      break;
    case 'hat': {
      ctx.fillStyle = L.outfitShade;
      ctx.beginPath();
      ctx.moveTo(-r * 0.82, -r * 0.82);
      ctx.quadraticCurveTo(-r * 0.2, -r * 1.6, r * 0.35, -r * 2.45);
      ctx.quadraticCurveTo(r * 0.55, -r * 1.5, r * 0.85, -r * 0.82);
      ctx.closePath();
      ctx.fill();
      fillEllipse(ctx, 0, -r * 0.82, r * 1.65, r * 0.3, L.outfit);
      ctx.strokeStyle = L.trim;
      ctx.lineWidth = r * 0.06;
      ellipse(ctx, 0, -r * 0.82, r * 1.65, r * 0.3);
      ctx.stroke();
      star(ctx, r * 0.15, -r * 1.3, r * 0.22, r * 0.09);
      ctx.fillStyle = '#ffe98a';
      ctx.fill();
      // cracked glass monocle
      ctx.strokeStyle = 'rgba(220,230,255,0.9)';
      ctx.lineWidth = r * 0.045;
      ellipse(ctx, r * 0.4, r * 0.14, r * 0.3, r * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.28, -r * 0.02);
      ctx.lineTo(r * 0.42, r * 0.12);
      ctx.lineTo(r * 0.36, r * 0.3);
      ctx.stroke();
      break;
    }
    case 'horns':
      for (const s of [-1, 1]) {
        ctx.fillStyle = L.trim;
        ctx.beginPath();
        ctx.moveTo(s * r * 0.45, -r * 0.9);
        ctx.lineTo(s * r * 0.82, -r * 1.35);
        ctx.lineTo(s * r * 0.66, -r * 1.38);
        ctx.lineTo(s * r * 0.98, -r * 1.85);
        ctx.lineTo(s * r * 0.55, -r * 1.42);
        ctx.lineTo(s * r * 0.7, -r * 1.4);
        ctx.lineTo(s * r * 0.3, -r * 0.98);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'wick': {
      const fl = Math.sin(t * 0.2) * 0.6 + Math.sin(t * 0.53) * 0.4;
      drawGlow(ctx, glowHex('#ffcf5a', true), 0, -r * 1.85, r * 1.1, 0.7);
      flame(ctx, 0, -r * 1.45, r * 0.85, fl, '#ffb43a', '#fff8d8');
      ctx.strokeStyle = 'rgba(255, 220, 140, 0.8)';
      ctx.lineWidth = r * 0.05;
      ellipse(ctx, 0, -r * 1.3, r * 0.75, r * 0.18);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
}

/** Draw the front of a head (face, fringe, accessory) centred at the origin; `r` is the head radius. */
function drawHeadFront(ctx: CanvasRenderingContext2D, L: Look, r: number, t: number, blink = false): void {
  face(ctx, L, r, blink);
  bangs(ctx, L, r);
  if (L.hairStyle === 'hood') hoodFront(ctx, L, r);
  accessory(ctx, L, r, t);
}

// ---------------------------------------------------------------------------------------------
// Wings and auras (drawn behind the body); `s` is a size unit, roughly the torso height
// ---------------------------------------------------------------------------------------------

export function drawWings(ctx: CanvasRenderingContext2D, L: Look, s: number, t: number): void {
  switch (L.wings) {
    case 'moth': {
      const flap = 0.78 + 0.22 * Math.sin(t * 0.22);
      for (const d of [-1, 1]) {
        ctx.save();
        ctx.scale(d * flap, 1);
        const g = ctx.createLinearGradient(0, -s, s * 1.8, s * 0.5);
        g.addColorStop(0, L.outfit);
        g.addColorStop(1, L.trim);
        ctx.fillStyle = g;
        ctx.globalAlpha *= 0.92;
        ellipse(ctx, s * 0.95, -s * 0.35, s * 0.95, s * 0.58, -0.45);
        ctx.fill();
        ellipse(ctx, s * 0.7, s * 0.42, s * 0.55, s * 0.38, 0.5);
        ctx.fill();
        fillEllipse(ctx, s * 1.15, -s * 0.45, s * 0.24, s * 0.24, L.outfitShade);
        fillEllipse(ctx, s * 1.15, -s * 0.45, s * 0.12, s * 0.12, L.trim);
        fillEllipse(ctx, s * 0.8, s * 0.45, s * 0.13, s * 0.13, L.outfitShade);
        ctx.restore();
      }
      break;
    }
    case 'willow':
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const d = i < 4 ? -1 : 1;
        const k = i % 4;
        const sway = Math.sin(t * 0.04 + i) * s * 0.12;
        const x0 = d * s * (0.3 + k * 0.18);
        ctx.strokeStyle = k % 2 ? L.trim : L.accent;
        ctx.globalAlpha *= 0.75;
        ctx.lineWidth = s * 0.07;
        ctx.beginPath();
        ctx.moveTo(x0, -s * 0.5);
        ctx.bezierCurveTo(x0 + d * s * 0.9, -s * 0.3, x0 + d * s * 0.6 + sway, s * 0.6, x0 + d * s * (0.9 + k * 0.12) + sway, s * (1.1 + k * 0.1));
        ctx.stroke();
        ctx.globalAlpha /= 0.75;
        fillEllipse(ctx, x0 + d * s * (0.9 + k * 0.12) + sway, s * (1.1 + k * 0.1), s * 0.1, s * 0.05, '#7fffb0', 0.8 * d);
      }
      break;
    case 'gears':
      gear(ctx, -s * 0.75, -s * 0.35, s * 0.42, 9, t * 0.03, '#c89b4a', '#5a3d1c');
      gear(ctx, s * 0.78, -s * 0.2, s * 0.32, 7, -t * 0.04, '#e0b860', '#5a3d1c');
      gear(ctx, s * 0.45, -s * 0.72, s * 0.2, 6, t * 0.06, '#b07f34', '#5a3d1c');
      break;
    case 'stars': {
      ctx.strokeStyle = 'rgba(200, 180, 255, 0.55)';
      ctx.lineWidth = s * 0.05;
      ellipse(ctx, 0, -s * 0.1, s * 1.5, s * 0.42, -0.25);
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = t * 0.02 + (i / 5) * TAU;
        const x = Math.cos(a) * s * 1.5;
        const y = Math.sin(a) * s * 0.42;
        const rx = x * Math.cos(-0.25) - y * Math.sin(-0.25);
        const ry = x * Math.sin(-0.25) + y * Math.cos(-0.25) - s * 0.1;
        drawGlow(ctx, glowHex('#c9a6ff'), rx, ry, s * 0.32, 0.8);
        star(ctx, rx, ry, s * 0.14, s * 0.06, 5, a);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      break;
    }
    case 'storm':
      for (const d of [-1, 1]) {
        for (let k = 0; k < 4; k++) {
          const a = -0.9 + k * 0.42 + Math.sin(t * 0.08) * 0.05;
          ctx.save();
          ctx.scale(d, 1);
          ctx.rotate(a);
          ctx.fillStyle = k % 2 ? '#1c2c5a' : '#2a3f7a';
          ctx.beginPath();
          ctx.moveTo(s * 0.2, 0);
          ctx.lineTo(s * 1.55 - k * s * 0.12, -s * 0.12);
          ctx.lineTo(s * 1.45 - k * s * 0.12, s * 0.1);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.strokeStyle = L.trim;
        ctx.lineWidth = s * 0.05;
        ctx.beginPath();
        ctx.moveTo(d * s * 0.5, -s * 0.6);
        ctx.lineTo(d * s * 0.9, -s * 0.3);
        ctx.lineTo(d * s * 0.75, -s * 0.2);
        ctx.lineTo(d * s * 1.15, s * 0.1);
        ctx.stroke();
      }
      break;
    case 'rays': {
      const n = 12;
      ctx.globalAlpha *= 0.45;
      for (let i = 0; i < n; i++) {
        const a = t * 0.006 + (i / n) * TAU;
        const len = s * (1.7 + (i % 2) * 0.35);
        ctx.fillStyle = i % 2 ? '#ffe9a0' : '#ffd24a';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.07) * s * 0.4, -s * 0.5 + Math.sin(a - 0.07) * s * 0.4);
        ctx.lineTo(Math.cos(a) * len, -s * 0.5 + Math.sin(a) * len);
        ctx.lineTo(Math.cos(a + 0.07) * s * 0.4, -s * 0.5 + Math.sin(a + 0.07) * s * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha /= 0.45;
      ctx.strokeStyle = 'rgba(255, 230, 150, 0.7)';
      ctx.lineWidth = s * 0.06;
      ellipse(ctx, 0, -s * 0.5, s * 1.05, s * 1.05);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------------------------
// Bodies
// ---------------------------------------------------------------------------------------------

function bustBody(ctx: CanvasRenderingContext2D, L: Look, t: number): void {
  // torso, with the bottom edge at y = 0 and the neck around y = -100
  ctx.fillStyle = L.skin;
  ctx.fillRect(-9, -112, 18, 22);

  const g = ctx.createLinearGradient(0, -100, 0, 0);
  g.addColorStop(0, L.outfit);
  g.addColorStop(1, L.outfitShade);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-70, 0);
  ctx.bezierCurveTo(-70, -52, -58, -84, -30, -94);
  ctx.quadraticCurveTo(0, -102, 30, -94);
  ctx.bezierCurveTo(58, -84, 70, -52, 70, 0);
  ctx.closePath();
  ctx.fill();

  // collar
  ctx.fillStyle = L.outfitShade;
  ctx.beginPath();
  ctx.moveTo(-30, -94);
  ctx.lineTo(0, -62);
  ctx.lineTo(30, -94);
  ctx.quadraticCurveTo(0, -84, -30, -94);
  ctx.fill();
  ctx.strokeStyle = L.trim;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-32, -93);
  ctx.lineTo(0, -60);
  ctx.lineTo(32, -93);
  ctx.stroke();

  switch (L.id) {
    case 'wren':
      // cloak clasp and a scarf
      fillEllipse(ctx, 0, -62, 6, 6, L.trim);
      fillEllipse(ctx, 0, -62, 3, 3, '#fff3c0');
      ctx.strokeStyle = L.trim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-62, -20);
      ctx.quadraticCurveTo(-40, -40, -22, -40);
      ctx.moveTo(62, -20);
      ctx.quadraticCurveTo(40, -40, 22, -40);
      ctx.stroke();
      lantern(ctx, 50, -34, 26, t);
      break;
    case 'tamsin':
      for (let i = 0; i < 7; i++) fillEllipse(ctx, -36 + i * 12, -90 + Math.abs(i - 3) * 2.5, 9, 7, i % 2 ? L.trim : '#fff4dc');
      break;
    case 'odalys':
      fillEllipse(ctx, 0, -52, 11, 8, '#2c8a4a');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        fillEllipse(ctx, Math.cos(a) * 5, -54 + Math.sin(a) * 5, 6, 3, '#ffffff', a);
      }
      fillEllipse(ctx, 0, -54, 3, 3, '#ffe14a');
      ctx.strokeStyle = L.trim;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-60 + i * 8, 0);
        ctx.quadraticCurveTo(-50 + i * 8, -30, -42 + i * 6, -70);
        ctx.stroke();
      }
      break;
    case 'brindle':
      ctx.strokeStyle = '#5a3d1c';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-50, -84);
      ctx.lineTo(48, -6);
      ctx.stroke();
      ctx.fillStyle = '#7a5530';
      ctx.fillRect(28, -26, 34, 24);
      ctx.fillStyle = L.trim;
      ctx.fillRect(41, -22, 8, 6);
      break;
    case 'vesper':
      for (let i = 0; i < 18; i++) {
        const x = -60 + ((i * 37) % 120);
        const y = -80 + ((i * 53) % 78);
        star(ctx, x, y, 2.6, 1.1);
        ctx.fillStyle = 'rgba(230, 225, 255, 0.85)';
        ctx.fill();
      }
      break;
    case 'kessra':
      ctx.strokeStyle = L.trim;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-44, -70);
      ctx.lineTo(-30, -48);
      ctx.lineTo(-38, -44);
      ctx.lineTo(-22, -18);
      ctx.moveTo(44, -70);
      ctx.lineTo(30, -48);
      ctx.lineTo(38, -44);
      ctx.lineTo(22, -18);
      ctx.stroke();
      break;
    case 'auriel':
      ctx.strokeStyle = L.trim;
      ctx.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-70 + i * 4, -i * 22);
        ctx.quadraticCurveTo(0, -i * 22 + 10, 70 - i * 4, -i * 22);
        ctx.stroke();
      }
      fillEllipse(ctx, 0, -62, 7, 9, L.trim);
      fillEllipse(ctx, 0, -63, 3.5, 5, '#fffbe0');
      break;
  }
}

/** Portrait canvas size in logical pixels. */
export const PORTRAIT_W = 200;
export const PORTRAIT_H = 250;

const portraits = new Map<string, HTMLCanvasElement>();

/** Large bust portrait used for dialogue and spell cut-ins (cached). Bottom-centre anchored. */
export function portrait(id: CharacterId): HTMLCanvasElement {
  const key = id;
  let c = portraits.get(key);
  if (c) return c;
  const L = LOOKS[id];
  c = prerender(PORTRAIT_W, PORTRAIT_H, 2, (ctx) => {
    ctx.translate(0, PORTRAIT_H / 2);
    ctx.save();
    ctx.translate(0, -120);
    drawWings(ctx, L, 62, 30);
    ctx.restore();
    if (L.hairStyle === 'long') {
      ctx.save();
      ctx.translate(0, -150);
      backHair(ctx, L, 42);
      ctx.restore();
    }
    bustBody(ctx, L, 30);
    ctx.save();
    ctx.translate(0, -150);
    if (L.hairStyle !== 'long') backHair(ctx, L, 42);
    drawHeadFront(ctx, L, 42, 30);
    ctx.restore();
  });
  portraits.set(key, c);
  return c;
}

/**
 * Small full-body sprite for the playfield, centred on the character's hitbox. `k` scales it,
 * `lean` (-1..1) tilts it, `t` drives idle animation.
 */
export function drawFieldCharacter(ctx: CanvasRenderingContext2D, L: Look, x: number, y: number, k: number, t: number, lean: number): void {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.07) * 1.4 * k);
  ctx.rotate(lean * 0.16);
  drawWings(ctx, L, 15 * k, t);

  // hair that hangs behind the body
  ctx.save();
  ctx.translate(0, -13 * k);
  if (L.hairStyle === 'long') ctx.scale(1, 0.72);
  backHair(ctx, L, 8.6 * k);
  ctx.restore();

  // legs
  fillEllipse(ctx, -3.2 * k, 17 * k, 2.2 * k, 3.4 * k, '#2a2030');
  fillEllipse(ctx, 3.2 * k, 17 * k, 2.2 * k, 3.4 * k, '#2a2030');

  // dress
  const g = ctx.createLinearGradient(0, -6 * k, 0, 16 * k);
  g.addColorStop(0, L.outfit);
  g.addColorStop(1, L.outfitShade);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-5.5 * k, -5 * k);
  ctx.lineTo(5.5 * k, -5 * k);
  ctx.quadraticCurveTo(10 * k + lean * 2 * k, 6 * k, 12.5 * k - lean * 3 * k, 15.5 * k);
  ctx.quadraticCurveTo(0, 17.5 * k, -12.5 * k - lean * 3 * k, 15.5 * k);
  ctx.quadraticCurveTo(-10 * k + lean * 2 * k, 6 * k, -5.5 * k, -5 * k);
  ctx.fill();
  ctx.strokeStyle = L.trim;
  ctx.lineWidth = 1.2 * k;
  ctx.beginPath();
  ctx.moveTo(-12 * k - lean * 3 * k, 15 * k);
  ctx.quadraticCurveTo(0, 17 * k, 12 * k - lean * 3 * k, 15 * k);
  ctx.stroke();

  // arms
  fillEllipse(ctx, -7.5 * k, 1.5 * k, 2.6 * k, 5.5 * k, L.outfit, 0.35);
  fillEllipse(ctx, 7.5 * k, 1.5 * k, 2.6 * k, 5.5 * k, L.outfit, -0.35);
  fillEllipse(ctx, -9 * k, 6 * k, 1.9 * k, 1.9 * k, L.skin);
  fillEllipse(ctx, 9 * k, 6 * k, 1.9 * k, 1.9 * k, L.skin);

  ctx.save();
  ctx.translate(0, -13 * k);
  const blink = t % 200 < 7;
  drawHeadFront(ctx, L, 8.6 * k, t, blink);
  ctx.restore();
  ctx.restore();
}
