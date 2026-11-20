import type { BulletDef, ColorName, EmitterDef, PatternDef, SpriteKind, Tier } from '../types';

type Extra = Partial<Omit<BulletDef, 'sprite' | 'color' | 'speed'>>;

/**
 * Small constructors that keep pattern files readable. They return plain data objects: the same
 * structures could be written out as JSON.
 */
const make =
  (sprite: SpriteKind) =>
  (color: ColorName, speed: Tier<number>, extra: Extra = {}): BulletDef => ({ sprite, color, speed, ...extra });

export const pellet = make('pellet');
export const orb = make('orb');
export const big = make('big');
export const rice = make('rice');
export const dart = make('dart');
export const needle = make('needle');
export const star = make('star');
export const ring = make('ring');
export const gem = make('gem');

export const pattern = (...emitters: EmitterDef[]): PatternDef => ({ emitters });
