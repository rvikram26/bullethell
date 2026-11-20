import {
  AUTO_COLLECT_Y,
  BOMB_FRAGMENTS_PER_BOMB,
  FIELD_H,
  FIELD_W,
  MAX_BOMBS,
  MAX_LIVES,
  MAX_POWER,
  PLAYER_GRAZE_RADIUS,
  PLAYER_HIT_RADIUS,
  PLAYER_PICKUP_RADIUS,
} from '../core/constants';
import type { PlayerInput } from '../core/input';
import { clamp, grouped, TAU } from '../core/math';
import { fxRng, Rng } from '../core/rng';
import { type DifficultyDef, DIFFICULTIES, difficultyIndex } from '../data/difficulty';
import { shotLevelForPower } from '../data/playerShots';
import { GAME_DATA, type GameData } from '../data/registry';
import {
  type BossDef,
  COLOR_NAMES,
  type DialogueDef,
  type DropDef,
  type PhaseDef,
  type SfxName,
  type SpriteKind,
  type StageDef,
} from '../data/types';
import { Boss } from './boss';
import { BulletPool } from './bullets';
import { type CBullet, PatternBank } from './compile';
import { Enemy } from './enemy';
import {
  ITEM_BIG_POWER,
  ITEM_BOMB,
  ITEM_LIFE,
  ITEM_POINT,
  ITEM_POWER,
  type Item,
  ItemPool,
} from './items';
import { Particles } from './particles';
import { BOMB_FRAMES, BOMB_INVULN, DEATHBOMB_FRAMES, MODE_ALIVE, MODE_DEAD, MODE_DYING, Player, type PlayerHost, RESPAWN_DELAY } from './player';
import { type FireHost, PatternRunner } from './runner';
import { ShotPool, type Target } from './shots';
import { type DebugOptions, extendThreshold, freshStageStats, type RunState } from './state';
import { type SpawnStep, StageRunner } from './stageRunner';

/** Callbacks the world uses to reach audio and presentation. Tests use the no-op host. */
export interface WorldHost {
  sfx(name: SfxName): void;
  /** Start a music track by id, or fade out with null. */
  music(track: string | null): void;
  /** Request a screen shake of `amount` pixels lasting `frames`. */
  shake(amount: number, frames: number): void;
}

export const NULL_HOST: WorldHost = {
  sfx() {},
  music() {},
  shake() {},
};

export interface Banner {
  text: string;
  sub: string;
  t: number;
}

export type MessageTone = 'good' | 'bad' | 'info';

export interface FloatMessage {
  text: string;
  tone: MessageTone;
  t: number;
}

export interface DialogueState {
  id: string;
  def: DialogueDef;
  line: number;
  /** Frames since the current line appeared (drives the typewriter effect). */
  t: number;
}

export interface CutIn {
  boss: BossDef;
  name: string;
  t: number;
}

export interface WorldOptions {
  stage: number;
  run: RunState;
  host?: WorldHost;
  seed?: number;
  data?: GameData;
  debug?: DebugOptions;
}

const ENEMY_POOL = 96;
const DEATH_CLEAR_RADIUS = 120;
const BOMB_DMG_ENEMY = 5;
const BOMB_DMG_BOSS = 1.15;
const POWER_LOSS = 24;
export const CUT_IN_FRAMES = 120;
export const BANNER_FRAMES = 190;
export const MESSAGE_FRAMES = 110;

/**
 * The complete game simulation for one stage. It owns every entity pool and knows nothing about
 * canvases, audio devices or the DOM, so it can be driven by tests and bots as easily as by the UI.
 */
export class World implements FireHost, PlayerHost {
  readonly data: GameData;
  readonly run: RunState;
  readonly host: WorldHost;
  readonly diff: DifficultyDef;
  readonly rng: Rng;
  readonly bank: PatternBank;
  readonly stage: StageDef;
  readonly debug: DebugOptions;

  readonly bullets: BulletPool;
  readonly shots = new ShotPool();
  readonly items = new ItemPool();
  readonly particles = new Particles();
  readonly player = new Player();
  readonly enemies: Enemy[] = [];
  readonly runner: StageRunner;

  boss: Boss | null = null;
  dialogue: DialogueState | null = null;
  banner: Banner | null = null;
  cutIn: CutIn | null = null;
  readonly messages: FloatMessage[] = [];

  tick = 0;
  /** Set when the stage timeline finished and the clear delay elapsed. */
  stageCleared = false;
  /** Set when the last life is lost; the scene decides between continue and game over. */
  gameOver = false;
  /** Frames of white screen flash left. */
  flash = 0;
  /** Expanding "bullets cleared" ring drawn by the renderer. */
  clearFx: { x: number; y: number; t: number } | null = null;
  endTimer = 0;
  /** Score bonus awarded when the stage timeline finished (shown on the clear tally). */
  clearBonus = 0;
  /** Aim point for patterns (FireHost). */
  get playerX(): number {
    return this.player.x;
  }
  get playerY(): number {
    return this.player.y;
  }
  /** True while a dialogue is open and for a few frames afterwards, so the key that closed it cannot bomb or shoot. */
  get talking(): boolean {
    return this.dialogue !== null || this.talkLock > 0;
  }

  private prevShoot = false;
  private talkLock = 0;
  private readonly targets: Target[] = [];
  private fxBudget = 0;
  private readonly fxClear = (x: number, y: number, color: number): void => {
    if (this.fxBudget-- > 0) this.particles.spark(x, y, color, 1.4, 22, 4);
  };

  constructor(opts: WorldOptions) {
    this.data = opts.data ?? GAME_DATA;
    this.run = opts.run;
    this.host = opts.host ?? NULL_HOST;
    this.debug = opts.debug ?? {};
    this.diff = DIFFICULTIES[this.run.difficulty];
    this.rng = new Rng(opts.seed);
    this.bullets = new BulletPool(this.rng);
    this.bank = new PatternBank(this.data.patterns, this.data.paths, this.diff, difficultyIndex(this.run.difficulty));
    this.stage = this.data.stages[opts.stage];
    if (!this.stage) throw new Error(`No stage with index ${opts.stage}`);
    this.runner = new StageRunner(this.stage);
    for (let i = 0; i < ENEMY_POOL; i++) this.enemies.push(new Enemy());

    this.run.stage = opts.stage;
    this.run.stats = freshStageStats(this.run);
    if (this.debug.power !== undefined) this.run.power = clamp(this.debug.power, 0, MAX_POWER);
    if (this.run.bombs < 3) this.run.bombs = 3;
    if (this.debug.lives !== undefined) this.run.lives = clamp(Math.round(this.debug.lives), 0, MAX_LIVES);
    this.player.invuln = 120;

    this.host.music(this.stage.stageMusic);
    if (this.debug.skipToBoss !== undefined) this.runner.skipToBoss(this.debug.skipToBoss);
    else this.showBanner(`Stage ${this.stage.number}`, this.stage.name);
  }

  // ------------------------------------------------------------------------------------------
  // Main step
  // ------------------------------------------------------------------------------------------

  update(inp: PlayerInput): void {
    this.tick++;
    if (this.gameOver) return;

    if (this.talkLock > 0) this.talkLock--;
    this.updateDialogue(inp);
    this.player.update(this, inp);
    this.runner.update(this);
    this.updateEnemies();
    if (this.boss) this.boss.update(this);
    this.updateBomb();
    this.updateShots();
    this.bullets.update(this.player.x, this.player.y);
    this.collidePlayer();
    this.updateItems();
    this.particles.update();
    this.updateOverlays();
    if (this.debug.stress) this.stressFill(this.debug.stress);

    if (this.endTimer > 0 && --this.endTimer === 0) this.stageCleared = true;
  }

  sfx(name: SfxName): void {
    this.host.sfx(name);
  }

  // ------------------------------------------------------------------------------------------
  // Dialogue, banners and messages
  // ------------------------------------------------------------------------------------------

  startDialogue(id: string): void {
    const def = this.data.dialogues[id];
    if (!def) throw new Error(`Unknown dialogue "${id}"`);
    this.dialogue = { id, def, line: 0, t: 0 };
    this.bullets.clearAll(this.fxClear);
    this.prevShoot = true; // ignore the key that may still be held
  }

  private updateDialogue(inp: PlayerInput): void {
    const d = this.dialogue;
    const edge = inp.shoot && !this.prevShoot;
    this.prevShoot = inp.shoot;
    if (!d) return;
    d.t++;
    if (inp.bomb) {
      this.closeDialogue(); // skip everything
      this.host.sfx('menu-cancel');
      return;
    }
    const text = d.def.lines[d.line].text;
    const shown = d.t * 1.6 >= text.length;
    if (edge && d.t > 6) {
      if (!shown) {
        d.t = Math.ceil(text.length / 1.6) + 1;
      } else {
        d.line++;
        d.t = 0;
        this.host.sfx('menu-ok');
        if (d.line >= d.def.lines.length) this.closeDialogue();
      }
    }
  }

  private closeDialogue(): void {
    this.dialogue = null;
    this.talkLock = 12;
  }

  showBanner(text: string, sub: string): void {
    this.banner = { text, sub, t: 0 };
  }

  pushMessage(text: string, tone: MessageTone = 'info'): void {
    this.messages.push({ text, tone, t: 0 });
    if (this.messages.length > 3) this.messages.shift();
  }

  private updateOverlays(): void {
    if (this.banner && ++this.banner.t > BANNER_FRAMES) this.banner = null;
    if (this.cutIn && ++this.cutIn.t > CUT_IN_FRAMES) this.cutIn = null;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (++this.messages[i].t > MESSAGE_FRAMES) this.messages.splice(i, 1);
    }
    if (this.flash > 0) this.flash--;
    if (this.clearFx && ++this.clearFx.t > 40) this.clearFx = null;
  }

  // ------------------------------------------------------------------------------------------
  // Score, power and items
  // ------------------------------------------------------------------------------------------

  addScore(n: number): void {
    if (n <= 0) return;
    const run = this.run;
    run.score += Math.round(n);
    if (run.score > run.hiScore) run.hiScore = run.score;
    while (run.score >= extendThreshold(run.extendsGiven)) {
      run.extendsGiven++;
      this.extraLife();
    }
  }

  private extraLife(): void {
    if (this.run.lives < MAX_LIVES) this.run.lives++;
    this.host.sfx('extend');
    this.pushMessage('Extend!', 'good');
  }

  addPower(n: number): void {
    const run = this.run;
    const before = run.power;
    run.power = Math.min(MAX_POWER, before + n);
    if (before >= MAX_POWER) {
      this.addScore(300 * Math.min(n, 4));
    } else if (run.power >= MAX_POWER) {
      this.pushMessage('MAX POWER', 'good');
      this.host.sfx('power');
    } else if (shotLevelForPower(run.power) > shotLevelForPower(before)) {
      this.pushMessage('Power Up', 'good');
      this.host.sfx('power');
    }
  }

  dropItems(x: number, y: number, d: DropDef): void {
    const spawn = (type: number, n: number | undefined): void => {
      for (let i = 0; i < (n ?? 0); i++) this.items.spawn(type, x + fxRng.spread(10), y + fxRng.spread(8), fxRng, 1.6);
    };
    spawn(ITEM_POWER, d.power);
    spawn(ITEM_BIG_POWER, d.bigPower);
    spawn(ITEM_POINT, d.point);
    spawn(ITEM_BOMB, d.bomb);
    spawn(ITEM_LIFE, d.life);
  }

  private collectItem(it: Item): void {
    const run = this.run;
    switch (it.type) {
      case ITEM_POWER:
        this.addPower(1);
        this.addScore(10);
        break;
      case ITEM_BIG_POWER:
        this.addPower(8);
        this.addScore(100);
        break;
      case ITEM_POINT: {
        const base = it.full ? 1 : 1 - 0.55 * clamp(this.player.y / FIELD_H, 0, 1);
        const value = Math.round((6000 * base * this.diff.score) / 10) * 10;
        this.addScore(value);
        this.particles.text(it.x, it.y - 6, grouped(value), it.full ? 5 : 9, 36);
        break;
      }
      case ITEM_BOMB:
        run.fragments++;
        if (run.fragments >= BOMB_FRAGMENTS_PER_BOMB) {
          run.fragments -= BOMB_FRAGMENTS_PER_BOMB;
          if (run.bombs < MAX_BOMBS) run.bombs++;
          this.host.sfx('extend');
          this.pushMessage('Bomb +1', 'good');
        }
        this.addScore(500);
        break;
      case ITEM_LIFE:
        this.extraLife();
        break;
    }
    this.host.sfx('item');
  }

  private updateItems(): void {
    const p = this.player;
    const auto = p.mode === MODE_ALIVE && p.y < AUTO_COLLECT_Y;
    this.items.update(p.x, p.y, PLAYER_PICKUP_RADIUS, auto, p.mode === MODE_ALIVE, (it) => this.collectItem(it));
  }

  // ------------------------------------------------------------------------------------------
  // Enemies
  // ------------------------------------------------------------------------------------------

  activeEnemyCount(): number {
    let n = 0;
    for (const e of this.enemies) if (e.active) n++;
    return n;
  }

  spawnEnemy(step: SpawnStep): Enemy | null {
    const def = this.data.enemies[step.enemy];
    if (!def) throw new Error(`Unknown enemy "${step.enemy}"`);
    let e: Enemy | null = null;
    for (const cand of this.enemies) {
      if (!cand.active) {
        e = cand;
        break;
      }
    }
    if (!e) return null;

    const flip = step.flip === true;
    e.active = true;
    e.id = step.enemy;
    e.sprite = def.sprite;
    e.tint = COLOR_NAMES.indexOf(step.tint ?? def.tint ?? 'cyan');
    e.flip = flip;
    e.x = flip ? FIELD_W - step.x : step.x;
    e.y = step.y ?? -24;
    e.maxHp = e.hp = Math.max(1, Math.round((step.hp ?? def.hp) * this.diff.hp));
    e.radius = def.radius;
    e.score = def.score;
    e.age = 0;
    e.hitFlash = 0;
    e.entered = false;
    e.fieldTime = 0;
    e.runner = null;
    const patternId = step.pattern ?? def.pattern;
    e.pattern = patternId ? this.bank.pattern(patternId) : null;
    e.patternDelay = Math.round((step.patternDelay ?? def.patternDelay ?? 0.4) * 60);
    e.drop = step.drop ?? def.drop ?? {};
    e.mover.start(this.bank.path(step.path ?? def.path ?? 'down'), e.x, e.y, flip, this.rng);
    return e;
  }

  private updateEnemies(): void {
    const talking = this.dialogue !== null;
    for (const e of this.enemies) {
      if (!e.active) continue;
      e.age++;
      if (e.hitFlash > 0) e.hitFlash--;
      e.mover.step(e, this.rng);

      const inField = e.x > 0 && e.x < FIELD_W && e.y > 0 && e.y < FIELD_H;
      if (inField) {
        e.entered = true;
        e.fieldTime++;
      } else if (
        (e.entered && (e.x < -48 || e.x > FIELD_W + 48 || e.y < -48 || e.y > FIELD_H + 48)) ||
        e.age > 60 * 40
      ) {
        e.active = false;
        continue;
      }

      if (e.pattern && inField && !talking && e.fieldTime > e.patternDelay) {
        if (!e.runner) e.runner = new PatternRunner(e.pattern, e.flip);
        e.runner.update(this, e.x, e.y);
      }
    }
  }

  damageEnemy(e: Enemy, dmg: number): void {
    e.hp -= dmg;
    e.hitFlash = 3;
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    e.active = false;
    this.addScore(e.score * this.diff.score);
    this.particles.burst(e.x, e.y, e.tint, 10, 3, 28, 6);
    this.particles.ring(e.x, e.y, e.tint, 4, 2.2, 20);
    this.host.sfx('enemy-die');
    this.dropItems(e.x, e.y, e.drop);
  }

  // ------------------------------------------------------------------------------------------
  // Player shots
  // ------------------------------------------------------------------------------------------

  private damageable(x: number, y: number): boolean {
    return x > -6 && x < FIELD_W + 6 && y > -6 && y < FIELD_H + 6;
  }

  private updateShots(): void {
    const targets = this.targets;
    targets.length = 0;
    for (const e of this.enemies) if (e.active && this.damageable(e.x, e.y)) targets.push(e);
    const boss = this.boss;
    if (boss && boss.vulnerable) targets.push(boss);

    this.shots.update(targets);

    for (const s of this.shots.shots) {
      if (!s.active) continue;
      for (const e of this.enemies) {
        if (!e.active || !this.damageable(e.x, e.y)) continue;
        const dx = s.x - e.x;
        const dy = s.y - e.y;
        const r = e.radius + 4;
        if (dx * dx + dy * dy <= r * r) {
          s.active = false;
          this.damageEnemy(e, s.dmg);
          this.addScore(10);
          if ((this.tick & 1) === 0) this.particles.spark(s.x, s.y, 5, 1.6, 12, 3);
          this.host.sfx('hit');
          break;
        }
      }
      if (!s.active || !boss) continue;
      if (boss.mode === 'enter' || boss.mode === 'dying') continue;
      const dx = s.x - boss.x;
      const dy = s.y - boss.y;
      const r = boss.radius + 6;
      if (dx * dx + dy * dy <= r * r) {
        s.active = false;
        if (boss.damage(s.dmg)) {
          this.addScore(10);
          this.host.sfx('hit-boss');
          if ((this.tick & 1) === 0) this.particles.spark(s.x, s.y, 9, 1.8, 12, 3);
        } else if ((this.tick & 3) === 0) {
          this.particles.spark(s.x, s.y, 9, 1, 8, 2.5);
        }
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // Player: hits, deaths and bombs
  // ------------------------------------------------------------------------------------------

  private collidePlayer(): void {
    const p = this.player;
    if (p.mode !== MODE_ALIVE) return;

    const hit = this.bullets.testPlayer(p.x, p.y, PLAYER_HIT_RADIUS, PLAYER_GRAZE_RADIUS);
    const grazes = this.bullets.grazed;
    if (grazes > 0) {
      this.run.graze += grazes;
      this.addScore(grazes * 100);
      this.particles.spark(p.x, p.y, 9, 1.8, 10, 3);
      this.host.sfx('graze');
    }
    if (!p.vulnerable) return;

    if (hit >= 0) {
      this.hitPlayer();
      return;
    }
    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const r = e.radius * 0.7 + PLAYER_HIT_RADIUS;
      if (dx * dx + dy * dy <= r * r) {
        this.hitPlayer();
        return;
      }
    }
    const b = this.boss;
    if (b && (b.mode === 'fight' || b.mode === 'warmup')) {
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const r = b.radius * 0.6 + PLAYER_HIT_RADIUS;
      if (dx * dx + dy * dy <= r * r) this.hitPlayer();
    }
  }

  private hitPlayer(): void {
    if (this.debug.god) return;
    const p = this.player;
    p.mode = MODE_DYING;
    p.modeT = DEATHBOMB_FRAMES;
    this.flash = 3;
    this.particles.burst(p.x, p.y, 0, 6, 2.5, 16, 4);
  }

  /** Called by the player once the deathbomb window ran out. */
  killPlayer(): void {
    const p = this.player;
    const run = this.run;
    run.stats.misses++;
    run.totals.misses++;
    if (this.boss) this.boss.missed = true;

    this.host.sfx('player-die');
    this.host.shake(5, 18);
    this.particles.blast(p.x, p.y, 9, 34, 22);
    this.particles.ring(p.x, p.y, 0, 4, 4.5, 26);
    this.particles.burst(p.x, p.y, 0, 18, 4.5, 34, 6);
    this.fxBudget = 40;
    this.bullets.clearRadius(p.x, p.y, DEATH_CLEAR_RADIUS, this.fxClear);
    this.clearFx = { x: p.x, y: p.y, t: 0 };

    const lost = Math.min(run.power, POWER_LOSS);
    run.power -= lost;
    for (let i = 0; i < Math.ceil(lost / 8); i++) {
      this.items.spawn(ITEM_BIG_POWER, p.x + fxRng.spread(30), p.y - 10 + fxRng.spread(10), fxRng, 2.2);
    }
    if (run.bombs < 3) run.bombs = 3;

    if (run.lives <= 0) {
      this.gameOver = true;
      p.mode = MODE_DEAD;
      p.modeT = 1_000_000;
      return;
    }
    run.lives--;
    p.mode = MODE_DEAD;
    p.modeT = RESPAWN_DELAY;
  }

  /** Revive after the player chose to continue. Score is lost, as is customary. */
  continueGame(): void {
    const run = this.run;
    run.continues++;
    run.lives = this.diff.lives;
    run.bombs = 3;
    run.fragments = 0;
    run.score = 0;
    run.extendsGiven = 0;
    run.power = Math.max(run.power, 32);
    this.gameOver = false;
    this.bullets.clearAll();
    this.player.respawn();
  }

  startBomb(): boolean {
    const run = this.run;
    const p = this.player;
    if (run.bombs <= 0 || p.bombT > 0 || this.talking) return false;
    run.bombs--;
    run.stats.bombs++;
    run.totals.bombs++;
    if (this.boss && (this.boss.mode === 'fight' || this.boss.mode === 'warmup')) this.boss.bombed = true;
    p.bombT = BOMB_FRAMES;
    p.invuln = Math.max(p.invuln, BOMB_INVULN);
    if (p.mode === MODE_DYING) p.mode = MODE_ALIVE;
    this.host.sfx('bomb');
    this.host.shake(3, 14);
    this.flash = 6;
    return true;
  }

  private updateBomb(): void {
    const p = this.player;
    if (p.bombT <= 0) return;
    const t = BOMB_FRAMES - p.bombT;
    const radius = Math.min(760, 40 + t * 18);
    this.fxBudget = 14;
    this.bullets.clearRadius(p.x, p.y, radius, this.fxClear);
    for (const e of this.enemies) {
      if (e.active && this.damageable(e.x, e.y)) this.damageEnemy(e, BOMB_DMG_ENEMY);
    }
    if (this.boss && this.boss.vulnerable) this.boss.damage(BOMB_DMG_BOSS);
    if (t % 10 === 0) {
      const a = fxRng.range(0, TAU);
      this.particles.spark(p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 40, fxRng.int(10), 3, 26, 6);
    }
  }

  // ------------------------------------------------------------------------------------------
  // Bosses
  // ------------------------------------------------------------------------------------------

  startBoss(id: string, before: string | null, after: string | null): void {
    const def = this.data.bosses[id];
    if (!def) throw new Error(`Unknown boss "${id}"`);
    const startPhase = this.debug.phase !== undefined ? clamp(this.debug.phase, 0, def.phases.length - 1) : 0;
    const boss = new Boss(def, before, after, startPhase);
    this.boss = boss;
    boss.init(this);
    if (!def.midboss) {
      this.host.music(this.stage.bossMusic);
      this.host.sfx('warning');
    }
  }

  announceSpell(boss: Boss, phase: PhaseDef): void {
    this.run.stats.spellsSeen++;
    this.run.totals.spellsSeen++;
    this.cutIn = { boss: boss.def, name: phase.name ?? '', t: 0 };
    this.host.sfx('spell');
    this.flash = 8;
    this.bullets.clearAll();
  }

  /** The boss finished a phase by damage (`killed`) or by running out of time. */
  phaseEnded(boss: Boss, phase: PhaseDef, killed: boolean, captured: boolean, bonus: number): void {
    this.fxBudget = 50;
    const cleared = this.bullets.clearAll(this.fxClear);
    this.addScore(Math.min(cleared, 600) * 100 * this.diff.score);
    this.items.attractAll();

    if (boss.spell) {
      if (captured) {
        this.run.stats.spellsCaptured++;
        this.run.totals.spellsCaptured++;
        this.addScore(bonus);
        this.pushMessage(`Rite Bonus  +${grouped(bonus)}`, 'good');
        this.host.sfx('capture');
      } else {
        this.pushMessage('Bonus Failed', 'bad');
      }
    }

    const fallback: DropDef = killed ? (boss.spell ? { point: 12, bigPower: 2 } : { point: 6, bigPower: 1 }) : { point: 3 };
    this.dropItems(boss.x, boss.y, phase.drop ?? fallback);

    this.particles.blast(boss.x, boss.y, boss.colorIdx, 50, 26);
    this.particles.ring(boss.x, boss.y, boss.colorIdx, 6, 7, 34);
    this.particles.burst(boss.x, boss.y, boss.colorIdx, 24, 4, 36, 7);
    this.host.sfx('phase-break');
    this.host.shake(4, 14);
    this.flash = 6;
  }

  bossDefeated(boss: Boss): void {
    this.particles.blast(boss.x, boss.y, 9, 90, 34);
    this.particles.ring(boss.x, boss.y, boss.colorIdx, 8, 10, 40);
    this.particles.burst(boss.x, boss.y, boss.colorIdx, 40, 6, 46, 8);
    this.host.sfx('boss-die');
    this.host.shake(8, 34);
    this.flash = 12;
    this.addScore((boss.def.midboss ? 100_000 : 300_000) * this.diff.score);
    this.dropItems(boss.x, boss.y, boss.def.midboss ? { point: 8, bigPower: 2, bomb: 1 } : { point: 20, bigPower: 3, bomb: 2 });
    this.items.attractAll();
    this.bullets.clearAll(this.fxClear);
    this.boss = null;
    if (boss.after) this.startDialogue(boss.after);
  }

  // ------------------------------------------------------------------------------------------
  // Stage end
  // ------------------------------------------------------------------------------------------

  beginStageEnd(): void {
    const graze = this.run.graze - this.run.stats.grazeAtStart;
    this.clearBonus = Math.round(((this.stage.number * 500_000 + graze * 500) * this.diff.score) / 10) * 10;
    this.addScore(this.clearBonus);
    this.endTimer = 160;
    this.bullets.clearAll(this.fxClear);
    this.items.attractAll();
    this.host.music(null);
    this.host.sfx('stage-clear');
    this.player.invuln = Math.max(this.player.invuln, 400);
  }

  // ------------------------------------------------------------------------------------------
  // Debug
  // ------------------------------------------------------------------------------------------

  private stressSpecs: CBullet[] | null = null;

  /** Debug stress test: keep the field topped up with `target` bullets of mixed kinds. */
  private stressFill(target: number): void {
    if (!this.stressSpecs) {
      const kinds: SpriteKind[] = ['pellet', 'orb', 'rice', 'dart', 'star', 'gem', 'needle', 'ring', 'big'];
      this.stressSpecs = kinds.map((sprite, i) => this.bank.compiler.bullet({ sprite, color: COLOR_NAMES[i % COLOR_NAMES.length], speed: 60, curve: i % 2 ? 6 : -6 }));
    }
    const specs = this.stressSpecs;
    let k = 0;
    while (this.bullets.count < target && k++ < 400) {
      const a = this.rng.range(0, TAU);
      const spec = specs[this.rng.int(specs.length)];
      this.bullets.spawn(FIELD_W / 2 + this.rng.spread(150), 90 + this.rng.spread(60), a, this.rng.range(0.4, 1.6), spec);
    }
  }
}