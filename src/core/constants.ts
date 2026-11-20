/** Logical (design) resolution of the whole window. The canvas is scaled from this. */
export const SCREEN_W = 640;
export const SCREEN_H = 480;

/** Playfield rectangle inside the window (portrait, left side). */
export const FIELD_X = 32;
export const FIELD_Y = 16;
export const FIELD_W = 384;
export const FIELD_H = 448;

/** Fixed simulation rate. */
export const FPS = 60;
export const STEP_MS = 1000 / FPS;

/** Capacity of the enemy bullet pool. Comfortably above the 2000+ requirement. */
export const MAX_BULLETS = 6144;

/** Player tuning (pixels per frame, pixels). */
export const PLAYER_SPEED = 4.1;
export const PLAYER_FOCUS_SPEED = 1.85;
export const PLAYER_HIT_RADIUS = 2;
export const PLAYER_GRAZE_RADIUS = 15;
export const PLAYER_PICKUP_RADIUS = 22;
/** Above this y the player auto-collects every item (the "point of collection"). */
export const AUTO_COLLECT_Y = 110;

export const MAX_POWER = 128;
export const MAX_BOMBS = 8;
export const MAX_LIVES = 8;
export const BOMB_FRAGMENTS_PER_BOMB = 5;
