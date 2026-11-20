import type { App, Scene } from '../app';
import { FIELD_H, FIELD_W, FIELD_X, FIELD_Y, SCREEN_W } from '../core/constants';
import { qualifies } from '../core/highscores';
import { bindingLabel, neutralInput, readPlayerInput } from '../core/input';
import { grouped } from '../core/math';
import { fxRng } from '../core/rng';
import { DIFFICULTIES } from '../data/difficulty';
import { GAME_DATA } from '../data/registry';
import { type DebugOptions, newRun, type RunState } from '../game/state';
import { World, type WorldHost } from '../game/world';
import { Hud } from '../render/hud';
import { UI } from '../render/palette';
import { drawText, FONT_MONO, FONT_TITLE, FONT_UI, panel } from '../render/text';
import { WorldRenderer } from '../render/worldRenderer';
import { Menu } from '../ui/menu';
import { EndingScene } from './ending';
import { NameEntryScene } from './scores';
import { StageSelectScene } from './select';
import { TitleScene } from './title';

type Mode = 'play' | 'pause' | 'confirm' | 'continue';

export const MAX_CONTINUES = 3;
const STAGE_FADE = 30;

export interface GameLaunch {
  debug?: DebugOptions;
  seed?: number;
}

/** Runs a World: pause menu, continues, stage-to-stage transitions and the end of a run. */
export class GameScene implements Scene {
  readonly id = 'game';
  readonly drawsFps = true;
  world: World;
  private readonly renderer = new WorldRenderer();
  private readonly hud = new Hud();
  private mode: Mode = 'play';
  private readonly pauseMenu: Menu;
  private readonly continueMenu: Menu;
  private confirmMenu: Menu | null = null;
  private confirmText = '';
  private readonly pin = neutralInput();
  private shakeAmt = 0;
  private shakeFrames = 0;
  private transition = 0;
  private pendingStage = -1;
  private overT = 0;
  private done = false;

  constructor(
    private readonly app: App,
    private readonly run: RunState,
    private readonly launch: GameLaunch = {},
  ) {
    this.world = this.makeWorld(run.stage);
    this.pauseMenu = new Menu(
      [
        { label: 'Resume', onConfirm: () => this.resume() },
        {
          label: run.practice ? 'Retry Stage' : 'Restart Game',
          onConfirm: () => this.ask(run.practice ? 'Restart this stage?' : 'Restart from Stage 1?', () => this.restart()),
        },
        { label: 'Quit to Title', onConfirm: () => this.ask('Quit to the title screen?', () => app.goto(new TitleScene(app))) },
      ],
      () => this.resume(),
    );
    this.continueMenu = run.practice
      ? new Menu([
          { label: 'Retry Stage', onConfirm: () => this.restart() },
          { label: 'Quit to Title', onConfirm: () => app.goto(new TitleScene(app)) },
        ])
      : new Menu([
          {
            label: 'Continue',
            disabled: () => this.run.continues >= MAX_CONTINUES,
            hint: 'Score resets to zero; power is kept.',
            onConfirm: () => this.continueRun(),
          },
          { label: 'Give Up', hint: 'End the run and record your score.', onConfirm: () => this.finish(false) },
        ]);
  }

  private makeWorld(stage: number): World {
    const host: WorldHost = {
      sfx: (n) => this.app.audio.play(n),
      music: (t) => this.app.audio.playMusic(t),
      shake: (amount, frames) => {
        if (!this.app.settings.screenShake) return;
        this.shakeAmt = Math.max(this.shakeAmt, amount);
        this.shakeFrames = Math.max(this.shakeFrames, frames);
      },
    };
    return new World({ stage, run: this.run, host, debug: this.launch.debug, seed: this.launch.seed });
  }

  enter(app: App): void {
    app.audio.duck(false);
  }

  exit(app: App): void {
    app.audio.duck(false);
  }

  onBlur(): void {
    if (this.mode === 'play' && this.transition === 0 && !this.world.gameOver && !this.done) this.pause();
  }

  get paused(): boolean {
    return this.mode !== 'play';
  }

  private pause(): void {
    this.mode = 'pause';
    this.pauseMenu.index = 0;
    this.app.audio.play('pause');
    this.app.audio.duck(true);
  }

  private resume(): void {
    this.mode = 'play';
    this.app.audio.duck(false);
    this.app.input.flush();
  }

  private ask(text: string, yes: () => void): void {
    this.confirmText = text;
    this.confirmMenu = new Menu(
      [
        { label: 'No', onConfirm: () => this.closeConfirm() },
        { label: 'Yes', onConfirm: yes },
      ],
      () => this.closeConfirm(),
    );
    this.mode = 'confirm';
  }

  private closeConfirm(): void {
    this.confirmMenu = null;
    this.mode = 'pause';
  }

  private restart(): void {
    const r = this.run;
    const fresh = newRun(r.difficulty, r.practice, r.practice ? r.stage : 0, r.hiScore);
    this.app.goto(new GameScene(this.app, fresh, this.launch));
  }

  private continueRun(): void {
    this.world.continueGame();
    this.mode = 'play';
    this.app.audio.duck(false);
    this.app.input.flush();
  }

  private finish(cleared: boolean): void {
    if (this.done) return;
    this.done = true;
    const app = this.app;
    const run = this.run;
    if (run.practice) app.goto(new StageSelectScene(app, run.difficulty));
    else if (cleared) app.goto(new EndingScene(app, run));
    else if (qualifies(app.scores, run.difficulty, run.score)) app.goto(new NameEntryScene(app, run, false));
    else app.goto(new TitleScene(app));
  }

  update(app: App): void {
    switch (this.mode) {
      case 'pause':
        this.pauseMenu.update(app);
        return;
      case 'confirm':
        this.confirmMenu?.update(app);
        return;
      case 'continue':
        this.overT++;
        if (this.overT > 45) this.continueMenu.update(app);
        return;
      default:
        break;
    }
    if (this.done) return;
    if (this.transition > 0) {
      this.stepTransition();
      return;
    }
    if (app.input.pressed.pause) {
      this.pause();
      return;
    }

    const w = this.world;
    w.update(readPlayerInput(app.input, this.pin));
    this.renderer.step(w);
    if (this.shakeFrames > 0 && --this.shakeFrames === 0) this.shakeAmt = 0;

    if (w.gameOver) {
      this.mode = 'continue';
      this.overT = 0;
      this.continueMenu.index = this.run.practice || this.run.continues < MAX_CONTINUES ? 0 : 1;
      app.audio.duck(true);
      return;
    }
    if (w.stageCleared) {
      if (this.run.practice || this.run.stage + 1 >= GAME_DATA.stages.length) this.finish(true);
      else {
        this.pendingStage = this.run.stage + 1;
        this.transition = 1;
      }
    }
  }

  private stepTransition(): void {
    this.transition++;
    if (this.transition === STAGE_FADE) {
      this.world = this.makeWorld(this.pendingStage);
      this.renderer.step(this.world);
    }
    if (this.transition >= STAGE_FADE * 2) this.transition = 0;
  }

  render(ctx: CanvasRenderingContext2D, app: App): void {
    const w = this.world;
    let sx = 0;
    let sy = 0;
    if (this.shakeFrames > 0 && this.mode === 'play') {
      sx = fxRng.spread(this.shakeAmt);
      sy = fxRng.spread(this.shakeAmt);
    }
    this.renderer.draw(ctx, w, sx, sy);
    this.hud.draw(ctx, w, app.settings.showFps ? app.loop.stats.fps : null);

    if (this.transition > 0) {
      const t = this.transition;
      const a = t < STAGE_FADE ? t / STAGE_FADE : 1 - (t - STAGE_FADE) / STAGE_FADE;
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, a)})`;
      ctx.fillRect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H);
    }

    if (this.mode === 'pause' || this.mode === 'confirm') this.drawPause(ctx);
    else if (this.mode === 'continue') this.drawContinue(ctx);
    if (app.debug) this.drawDebug(ctx, app);
  }

  private veil(ctx: CanvasRenderingContext2D, a: number): void {
    ctx.fillStyle = `rgba(2, 3, 12, ${a})`;
    ctx.fillRect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H);
  }

  private drawPause(ctx: CanvasRenderingContext2D): void {
    this.veil(ctx, 0.6);
    const cx = FIELD_X + FIELD_W / 2;
    panel(ctx, cx - 120, 140, 240, 170, 1);
    drawText(ctx, 'Paused', cx, 178, { size: 26, font: FONT_TITLE, bold: true, italic: true, color: UI.gold, align: 'center', glow: '#ff9a3a', glowBlur: 10 });
    this.pauseMenu.draw(ctx, { x: cx, y: 216, spacing: 26, size: 16, align: 'center' });
    const b = this.app.settings.bindings;
    drawText(ctx, `${bindingLabel(b.pause)}: resume`, cx, 300, { size: 10, font: FONT_UI, color: UI.faint, align: 'center' });
    if (this.mode === 'confirm' && this.confirmMenu) {
      this.veil(ctx, 0.5);
      panel(ctx, cx - 130, 190, 260, 110, 1);
      drawText(ctx, this.confirmText, cx, 224, { size: 15, font: FONT_TITLE, italic: true, color: '#ffffff', align: 'center' });
      this.confirmMenu.draw(ctx, { x: cx, y: 256, spacing: 24, size: 16, align: 'center' });
    }
  }

  private drawContinue(ctx: CanvasRenderingContext2D): void {
    const a = Math.min(1, this.overT / 30);
    this.veil(ctx, 0.65 * a);
    const cx = FIELD_X + FIELD_W / 2;
    const run = this.run;
    drawText(ctx, run.practice ? 'Practice Failed' : 'Game Over', cx, 150, {
      size: 32,
      font: FONT_TITLE,
      bold: true,
      italic: true,
      color: UI.danger,
      align: 'center',
      alpha: a,
      glow: '#ff3b52',
      glowBlur: 14,
    });
    drawText(ctx, `Score  ${grouped(run.score)}`, cx, 182, { size: 14, font: FONT_MONO, color: '#ffffff', align: 'center', alpha: a });
    drawText(ctx, `${DIFFICULTIES[run.difficulty].name}  -  Stage ${run.stage + 1}`, cx, 202, { size: 11, font: FONT_UI, color: UI.dim, align: 'center', alpha: a });
    if (this.overT > 45) {
      panel(ctx, cx - 140, 222, 280, 140, 1);
      if (!run.practice) {
        const left = MAX_CONTINUES - run.continues;
        drawText(ctx, left > 0 ? `Continue?   Credits left: ${left}` : 'No credits left', cx, 248, { size: 13, font: FONT_TITLE, italic: true, color: UI.ink, align: 'center' });
      }
      this.continueMenu.draw(ctx, { x: cx, y: run.practice ? 258 : 280, spacing: 26, size: 17, align: 'center' });
    }
  }

  private drawDebug(ctx: CanvasRenderingContext2D, app: App): void {
    const s = app.loop.stats;
    const w = this.world;
    const lines = [
      `bullets ${w.bullets.count}  (overflow ${w.bullets.overflow})`,
      `update ${s.updateMs.toFixed(2)}ms  render ${s.renderMs.toFixed(2)}ms`,
      `ups ${s.updatesPerSecond.toFixed(1)}  fps ${s.fps.toFixed(1)}`,
    ];
    lines.forEach((l, i) => drawText(ctx, l, SCREEN_W - 214, 330 + i * 12, { size: 9, font: FONT_MONO, color: '#9dffb0' }));
  }
}
