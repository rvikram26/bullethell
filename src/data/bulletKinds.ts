import type { SpriteKind } from './types';

/** How a bullet sprite is rotated when drawn. */
export const ROT_NONE = 0;
export const ROT_HEADING = 1;
export const ROT_SPIN = 2;

export interface BulletKindInfo {
  /** Collision radius in px (slightly smaller than the drawing so hits feel fair). */
  radius: number;
  /** Side length of the drawn sprite in px. */
  size: number;
  rotation: number;
}

/** Shared by the simulation (hit radius) and the renderer (sprite atlas). */
export const BULLET_KINDS: Record<SpriteKind, BulletKindInfo> = {
  pellet: { radius: 2.2, size: 9, rotation: ROT_NONE },
  orb: { radius: 3.8, size: 14, rotation: ROT_NONE },
  big: { radius: 8.5, size: 28, rotation: ROT_NONE },
  rice: { radius: 3.0, size: 14, rotation: ROT_HEADING },
  dart: { radius: 3.2, size: 18, rotation: ROT_HEADING },
  needle: { radius: 2.4, size: 22, rotation: ROT_HEADING },
  star: { radius: 4.4, size: 16, rotation: ROT_SPIN },
  ring: { radius: 5.0, size: 16, rotation: ROT_NONE },
  gem: { radius: 3.8, size: 16, rotation: ROT_HEADING },
};
