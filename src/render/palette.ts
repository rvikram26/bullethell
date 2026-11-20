import { COLOR_NAMES, type ColorName } from '../data/types';

export interface Swatch {
  main: string;
  light: string;
  dark: string;
  r: number;
  g: number;
  b: number;
}

const DEFS: Record<ColorName, readonly [main: string, light: string, dark: string]> = {
  red: ['#ff3b52', '#ffc0c7', '#8a0b1f'],
  orange: ['#ff8a2a', '#ffd6b0', '#8a3a05'],
  yellow: ['#ffd83b', '#fff6c0', '#8a6c00'],
  lime: ['#a8ff3b', '#e6ffc2', '#417a00'],
  green: ['#2fe07a', '#bfffdc', '#05683a'],
  cyan: ['#36e6ff', '#c4faff', '#00667a'],
  blue: ['#4a74ff', '#c4d2ff', '#0d2c8a'],
  purple: ['#a75cff', '#e0c8ff', '#46118a'],
  pink: ['#ff5cd2', '#ffc8f0', '#8a0f68'],
  white: ['#dfe7ff', '#ffffff', '#626c8c'],
};

function rgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Swatches indexed like COLOR_NAMES (the simulation stores colours as indices). */
export const SWATCHES: readonly Swatch[] = COLOR_NAMES.map((name) => {
  const [main, light, dark] = DEFS[name];
  const [r, g, b] = rgb(main);
  return { main, light, dark, r, g, b };
});

export function swatch(name: ColorName): Swatch {
  return SWATCHES[COLOR_NAMES.indexOf(name)];
}

export function rgba(s: Swatch, a: number): string {
  return `rgba(${s.r},${s.g},${s.b},${a})`;
}

export function hexA(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** UI colours shared by menus, HUD and overlays. */
export const UI = {
  ink: '#e9ecff',
  dim: '#8a93b8',
  faint: '#4a5276',
  gold: '#ffd27a',
  goldDeep: '#c8913a',
  accent: '#7fd8ff',
  danger: '#ff6b7f',
  good: '#9dffb0',
  panel: 'rgba(8, 10, 24, 0.82)',
  panelEdge: 'rgba(255, 210, 122, 0.35)',
};
