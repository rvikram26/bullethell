import { AudioEngine } from './audio/engine';
import { SCREEN_H, SCREEN_W } from './core/constants';
import { loadScores, saveScores, type ScoreTable } from './core/highscores';
import { Input } from './core/input';
import { GameLoop } from './core/loop';
import { loadSettings, saveSettings, type Settings } from './core/settings';
import { UI } from './render/palette';
import { drawText, FONT_MONO } from './render/text';
import { View } from './render/view';

export interface Scene {
  /** Stable name for tests and debugging (class names are minified in builds). */
  readonly id: string;
  /** Called when the scene becomes the active one. */
  enter?(app: App): void;
  /** Called when the scene is replaced. */
  exit?(app: App): void;
  update(app: App): void;
  render(ctx: CanvasRenderingContext2D, app: App): void;
  /** The window lost focus or the tab was hidden (gameplay scenes pause here). */
  onBlur?(app: App): void;
  /** True if the scene draws its own fps counter (the in-game HUD does). */
  readonly drawsFps?: boolean;
}

const FADE_FRAMES = 14;

/** Top-level application: canvas, input, audio, persistent data and the active scene. */
export class App {
  readonly view: View;
  readonly input = new Input();
  readonly audio = new AudioEngine();
  readonly loop: GameLoop;
  settings: Settings;
  scores: ScoreTable;
  frame = 0;

  private scene: Scene | null = null;
  private pending: Scene | null = null;
  private fade = 1;
  private fadeDir = -1;

  constructor(
    canvas: HTMLCanvasElement,
    readonly debug: boolean,
  ) {
    this.view = new View(canvas);
    this.settings = loadSettings();
    this.scores = loadScores();
    this.input.attach(window);
    this.input.onGesture(() => this.audio.unlock());
    this.applySettings(false);
    this.loop = new GameLoop(
      () => this.update(),
      () => this.render(),
    );

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.scene?.onBlur?.(this);
        this.audio.suspend();
      } else {
        this.audio.resume();
        this.loop.resetClock();
      }
    });
    window.addEventListener('blur', () => this.scene?.onBlur?.(this));
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) this.scene?.onBlur?.(this);
      this.loop.resetClock();
    });
  }

  get current(): Scene | null {
    return this.scene;
  }

  start(first: Scene): void {
    this.scene = first;
    first.enter?.(this);
    this.fade = 1;
    this.fadeDir = -1;
    this.loop.start();
  }

  /** Fade to black, switch scenes, fade back in. */
  goto(next: Scene): void {
    if (this.pending) return;
    this.pending = next;
    this.fadeDir = 1;
  }

  private update(): void {
    this.frame++;
    this.input.tick();
    if (this.fadeDir > 0) {
      this.fade = Math.min(1, this.fade + 1 / FADE_FRAMES);
      if (this.fade >= 1 && this.pending) {
        this.scene?.exit?.(this);
        this.scene = this.pending;
        this.pending = null;
        this.input.flush();
        this.scene.enter?.(this);
        this.fadeDir = -1;
      }
    } else if (this.fadeDir < 0) {
      this.fade = Math.max(0, this.fade - 1 / FADE_FRAMES);
      if (this.fade <= 0) this.fadeDir = 0;
    }
    if (!this.pending && this.scene) this.scene.update(this);
    this.audio.update();
  }

  private render(): void {
    const ctx = this.view.begin();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    this.scene?.render(ctx, this);
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.fade})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
    if (this.settings.showFps && !this.scene?.drawsFps) {
      drawText(ctx, `${this.loop.stats.fps.toFixed(1)} fps`, SCREEN_W - 8, SCREEN_H - 6, { size: 10, font: FONT_MONO, color: UI.dim, align: 'right' });
    }
  }

  applySettings(save = true): void {
    const s = this.settings;
    this.audio.setVolumes(s.master, s.music, s.sfx);
    this.view.setQuality(s.quality);
    this.input.setBindings(s.bindings);
    if (save) saveSettings(s);
  }

  saveScores(): void {
    saveScores(this.scores);
  }

  get fullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    const el = document.documentElement;
    if (!el.requestFullscreen) return;
    el.requestFullscreen()
      .then(() => {
        // Chrome: let Esc reach the game (hold Esc to leave fullscreen) instead of exiting at once
        const kb = (navigator as Navigator & { keyboard?: { lock?: (keys: string[]) => Promise<void> } }).keyboard;
        void kb?.lock?.(['Escape']).catch(() => undefined);
      })
      .catch(() => undefined);
  }
}
