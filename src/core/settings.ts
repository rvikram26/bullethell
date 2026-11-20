import { type Bindings, cloneBindings, DEFAULT_BINDINGS, sanitizeBindings } from './input';
import { clamp } from './math';
import { store } from './storage';

export interface Settings {
  /** Volumes in [0, 1], edited in steps of 0.1. */
  master: number;
  music: number;
  sfx: number;
  /** Backing-store resolution multiplier. */
  quality: 1 | 2;
  showFps: boolean;
  screenShake: boolean;
  bindings: Bindings;
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.7,
  sfx: 0.8,
  quality: 2,
  showFps: false,
  screenShake: true,
  bindings: cloneBindings(DEFAULT_BINDINGS),
};

const KEY = 'settings.v1';

function vol(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v * 10) / 10, 0, 1) : fallback;
}

export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    master: vol(r.master, DEFAULT_SETTINGS.master),
    music: vol(r.music, DEFAULT_SETTINGS.music),
    sfx: vol(r.sfx, DEFAULT_SETTINGS.sfx),
    quality: r.quality === 1 ? 1 : 2,
    showFps: r.showFps === true,
    screenShake: r.screenShake !== false,
    bindings: sanitizeBindings(r.bindings),
  };
}

export function loadSettings(): Settings {
  return sanitizeSettings(store.read<unknown>(KEY, null));
}

export function saveSettings(s: Settings): void {
  store.write(KEY, s);
}
