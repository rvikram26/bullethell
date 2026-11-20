/**
 * Data-format types. Everything in src/data is plain, JSON-serialisable data described by these
 * interfaces: bullets, emitters, patterns, movement paths, enemies, bosses and stage timelines.
 * Units used by authors: seconds, pixels, pixels/second, degrees and degrees/second.
 * Angles follow canvas conventions: 0 = right, 90 = down.
 */

export type DifficultyId = 'easy' | 'normal' | 'hard' | 'lunatic';
export const DIFFICULTY_IDS: readonly DifficultyId[] = ['easy', 'normal', 'hard', 'lunatic'];

/**
 * A value that can be given per difficulty as [easy, normal, hard, lunatic].
 * A plain value is scaled by the difficulty's global multipliers instead.
 */
export type Tier<T> = T | readonly [T, T, T, T];

export type SpriteKind = 'pellet' | 'orb' | 'big' | 'rice' | 'dart' | 'needle' | 'star' | 'ring' | 'gem';
export const SPRITE_KINDS: readonly SpriteKind[] = ['pellet', 'orb', 'big', 'rice', 'dart', 'needle', 'star', 'ring', 'gem'];

export type ColorName = 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'cyan' | 'blue' | 'purple' | 'pink' | 'white';
export const COLOR_NAMES: readonly ColorName[] = ['red', 'orange', 'yellow', 'lime', 'green', 'cyan', 'blue', 'purple', 'pink', 'white'];

export type SfxName =
  | 'shot-small'
  | 'shot-mid'
  | 'shot-big'
  | 'player-shot'
  | 'hit'
  | 'hit-boss'
  | 'enemy-die'
  | 'boss-die'
  | 'player-die'
  | 'bomb'
  | 'graze'
  | 'item'
  | 'power'
  | 'extend'
  | 'spell'
  | 'capture'
  | 'tick'
  | 'menu-move'
  | 'menu-ok'
  | 'menu-cancel'
  | 'pause'
  | 'phase-break'
  | 'stage-clear'
  | 'warning';

// ---------------------------------------------------------------------------------------------
// Bullets
// ---------------------------------------------------------------------------------------------

export interface BulletDef {
  sprite: SpriteKind;
  color: ColorName;
  /** Initial speed, px/s. */
  speed: Tier<number>;
  /** Acceleration, px/s^2 (negative = decelerate). */
  accel?: number;
  /** Speed clamps, px/s (min defaults to 0 so a decelerating bullet stops instead of reversing). */
  minSpeed?: number;
  maxSpeed?: number;
  /** Continuous turning, deg/s (positive = clockwise on screen). */
  curve?: number;
  /** Seconds until the bullet disappears (default: until it leaves the field). */
  life?: number;
  /** Number of times it reflects off the left/right/top walls. */
  bounce?: number;
  /** Size multiplier for sprite and hit radius. */
  scale?: number;
  /** Timed behaviour changes, measured in seconds since the bullet was created. */
  events?: BulletEvent[];
}

export type BulletEvent =
  | { at: number; do: 'speed'; value: number; accel?: number; min?: number; max?: number }
  | { at: number; do: 'turn'; to?: number; by?: number; aim?: boolean; jitter?: number }
  | { at: number; do: 'curve'; value: number }
  | {
      at: number;
      do: 'split';
      count: Tier<number>;
      /** Fan width in degrees; 360 (default) spreads the children evenly around a circle. */
      spread?: number;
      /** What angle 0 of the children is relative to. */
      base?: 'heading' | 'aim' | 'abs';
      offset?: number;
      /** Keep the parent alive (default: the parent is replaced by its children). */
      keep?: boolean;
      bullet: BulletDef;
    }
  | { at: number; do: 'morph'; bullet: BulletDef; keepSpeed?: boolean };

// ---------------------------------------------------------------------------------------------
// Emitters and patterns
// ---------------------------------------------------------------------------------------------

export interface EmitterDef {
  /** Seconds before the first volley of each cycle. */
  delay?: number;
  /** Seconds between volleys. */
  interval: Tier<number>;
  /** Volleys per cycle (omit = endless). */
  volleys?: Tier<number>;
  /** If set, the emitter's schedule restarts every `cycle` seconds (use it to sequence attacks). */
  cycle?: number;

  /** 'owner' (default): offsets are relative to the shooter. 'field': absolute playfield position. */
  origin?: 'owner' | 'field';
  x?: number;
  y?: number;
  /** Random +/- position jitter, px. */
  xRand?: number;
  yRand?: number;
  /** The emission point circles around its origin. Speed in deg/s. */
  orbit?: { radius: number; speed: number; phase?: number };

  /** 'player' aims at the player, 'random' picks any direction, 'fixed' (default) uses `angle` as is. */
  aim?: 'fixed' | 'player' | 'random';
  /** Degrees added to the aim direction. */
  angle?: number;
  /** Degrees added after every volley (spirals, rotating arms). */
  angleStep?: number;
  /** +/- random degrees per volley. */
  angleRand?: number;
  /** +/- random degrees per bullet. */
  bulletRand?: number;
  /** Sinusoidal sweep of the base angle. */
  sway?: { amp: number; period: number };

  /** Bullets per layer per arm. */
  count: Tier<number>;
  /** Fan width in degrees. >= 360 (default) distributes the bullets evenly around a circle. */
  spread?: number;
  /** Rotationally symmetric copies of the volley. */
  arms?: Tier<number>;
  /** Stacked bullets per direction, each `layerSpeed` px/s faster than the previous. */
  layers?: number;
  layerSpeed?: number;
  /** +/- random px/s per bullet. */
  speedRand?: number;
  /** Extra px/s added per volley within a cycle. */
  speedStep?: number;

  bullet: BulletDef;
  sfx?: SfxName;
}

export interface PatternDef {
  emitters: EmitterDef[];
}

// ---------------------------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------------------------

export type Ease = 'linear' | 'in' | 'out' | 'inout';

export type MoveStep =
  /** Constant velocity (px/s) with optional acceleration (px/s^2). */
  | { type: 'vel'; dur: number; vx: number; vy: number; ax?: number; ay?: number }
  /** Glide to an absolute field position. */
  | { type: 'to'; dur: number; x: number; y: number; ease?: Ease }
  /** Glide by an offset. */
  | { type: 'rel'; dur: number; x: number; y: number; ease?: Ease }
  /** Glide to a random position inside the given ranges (re-rolled each time the step runs). */
  | { type: 'rand'; dur: number; x: readonly [number, number]; y: readonly [number, number]; ease?: Ease }
  /** Descend at vy px/s while weaving sideways: x offset = amp * sin(2*pi*t/period). */
  | { type: 'sine'; dur: number; vy: number; amp: number; period: number }
  /** Move along a curved path: speed px/s, initial heading and turn rate in degrees. */
  | { type: 'arc'; dur: number; speed: number; heading: number; turn: number }
  | { type: 'wait'; dur: number };

export interface PathDef {
  steps: MoveStep[];
  loop?: boolean;
}

// ---------------------------------------------------------------------------------------------
// Enemies, bosses, stages
// ---------------------------------------------------------------------------------------------

export type EnemySpriteId = 'wisp' | 'moth' | 'glowcap' | 'cog' | 'sparrow' | 'orrery' | 'stormling' | 'shade' | 'crystal';

export interface DropDef {
  /** Small power items. */
  power?: number;
  /** Large power items. */
  bigPower?: number;
  /** Point (score) items. */
  point?: number;
  /** Bomb fragments. */
  bomb?: number;
  /** One-ups. */
  life?: number;
}

export interface EnemyDef {
  sprite: EnemySpriteId;
  tint?: ColorName;
  hp: number;
  /** Collision radius, px. */
  radius: number;
  score: number;
  path?: string;
  pattern?: string;
  /** Seconds after entering the field before the pattern starts. */
  patternDelay?: number;
  drop?: DropDef;
}

export type CharacterId = 'wren' | 'tamsin' | 'odalys' | 'brindle' | 'vesper' | 'kessra' | 'auriel';

export interface PhaseDef {
  /** Name of the rite (a named attack with a cut-in and a capture bonus). Omit it for a plain attack. */
  name?: string;
  hp: number;
  /** Time limit in seconds. */
  time: number;
  pattern: string;
  /** Looping movement script used while the phase is active. */
  move?: PathDef;
  /** Where the boss settles before the phase begins. */
  at?: { x: number; y: number };
  /** Base bonus for defeating the rite without dying or bombing. */
  bonus?: number;
  /** Seconds of invulnerable declaration before the attack starts. */
  warmup?: number;
  /** Items released when the phase ends. */
  drop?: DropDef;
}

export interface BossDef {
  id: string;
  character: CharacterId;
  name: string;
  title: string;
  midboss?: boolean;
  radius: number;
  /** Position the boss flies to when it arrives. */
  entry: { x: number; y: number };
  color: ColorName;
  phases: PhaseDef[];
}

interface SpawnOverrides {
  path?: string;
  pattern?: string;
  patternDelay?: number;
  hp?: number;
  drop?: DropDef;
  tint?: ColorName;
  /** Mirror the path and pattern left/right. */
  flip?: boolean;
}

export type TimelineStep =
  | ({ t: number; type: 'spawn'; enemy: string; x: number; y?: number } & SpawnOverrides)
  | ({
      t: number;
      type: 'wave';
      enemy: string;
      count: number;
      /** Seconds between members. */
      every: number;
      x: number;
      /** x shift per member. */
      dx?: number;
      y?: number;
      /** Mirror every second member. */
      alternate?: boolean;
    } & SpawnOverrides)
  | { t: number; type: 'boss'; boss: string; before?: string; after?: string }
  | { t: number; type: 'dialogue'; id: string }
  | { t: number; type: 'banner'; text: string; sub?: string }
  | { t: number; type: 'music'; track: string | null }
  /** Pause the timeline until the field is clear of enemies (or `max` seconds passed). */
  | { t: number; type: 'waitClear'; max?: number }
  | { t: number; type: 'end' };

export type BackgroundId = 'marsh' | 'cloudway' | 'spire';

export interface StageDef {
  id: string;
  number: number;
  name: string;
  subtitle: string;
  background: BackgroundId;
  stageMusic: string;
  bossMusic: string;
  steps: TimelineStep[];
}

export interface DialogueLine {
  who: CharacterId;
  text: string;
}

export interface DialogueDef {
  lines: DialogueLine[];
}
