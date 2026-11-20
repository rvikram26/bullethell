import type { App, Scene } from '../app';
import { SCREEN_H, SCREEN_W } from '../core/constants';
import { bindingLabel } from '../core/input';
import { drawGlow, glowHex } from '../render/glow';
import { UI } from '../render/palette';
import { drawText, FONT_TITLE, FONT_UI } from '../render/text';
import { Menu } from '../ui/menu';
import { menuBackdrop, tickBackdrop } from './common';
import { OptionsScene } from './options';
import { ScoresScene } from './scores';
import { DifficultyScene } from './select';

let lastIndex = 0;

export class TitleScene implements Scene {
  readonly id = 'title';
  private readonly menu: Menu;
  private t = 0;

  constructor(private readonly app: App) {
    this.menu = new Menu([
      { label: 'Start Game', hint: 'Fly through all three stages in a single run.', onConfirm: () => this.go(new DifficultyScene(app, 'game')) },
      { label: 'Practice', hint: 'Play any stage on its own, starting at full power.', onConfirm: () => this.go(new DifficultyScene(app, 'practice')) },
      { label: 'High Scores', hint: 'The best runs recorded on this computer.', onConfirm: () => this.go(new ScoresScene(app, 'normal')) },
      { label: 'Options', hint: 'Volume, controls and display.', onConfirm: () => this.go(new OptionsScene(app, () => new TitleScene(app))) },
      { label: 'Quit', hint: 'Leave the game.', onConfirm: () => this.go(new QuitScene(app)) },
    ]);
    this.menu.index = lastIndex;
  }

  private go(next: Scene): void {
    lastIndex = this.menu.index;
    this.app.goto(next);
  }

  enter(app: App): void {
    app.audio.playMusic('title');
  }

  update(app: App): void {
    this.t++;
    tickBackdrop();
    this.menu.update(app);
  }

  render(ctx: CanvasRenderingContext2D, app: App): void {
    menuBackdrop(ctx, 0.12);
    const t = this.t;
    const a = Math.min(1, t / 40);

    // logo
    drawGlow(ctx, glowHex('#ffb84a'), 190, 150, 170, 0.18 * a);
    drawText(ctx, 'Lantern', 70, 150, { size: 64, font: FONT_TITLE, italic: true, bold: true, color: '#ffd27a', alpha: a, glow: '#ff8a2a', glowBlur: 22 });
    drawText(ctx, 'Tide', 196, 210, { size: 64, font: FONT_TITLE, italic: true, bold: true, color: '#a8dcff', alpha: a, glow: '#3a7aff', glowBlur: 22 });
    drawText(ctx, 'a danmaku of drifting lights', 92, 238, { size: 15, font: FONT_TITLE, italic: true, color: UI.dim, alpha: a, spacing: 1 });

    this.menu.draw(ctx, { x: 120, y: 290, spacing: 27, size: 19, align: 'left' }, a);

    const keys = app.settings.bindings;
    drawText(ctx, `Move: arrows   Shoot/OK: ${bindingLabel(keys.shoot)}   Bomb/Back: ${bindingLabel(keys.bomb)}   Focus: ${bindingLabel(keys.focus)}`, 16, SCREEN_H - 14, {
      size: 10,
      font: FONT_UI,
      color: UI.faint,
    });
    drawText(ctx, 'v1.0', SCREEN_W - 12, SCREEN_H - 14, { size: 10, font: FONT_UI, color: UI.faint, align: 'right' });
    if (!app.audio.ready && (t >> 5) % 2 === 0) {
      drawText(ctx, 'Press any key to enable sound', SCREEN_W - 12, 24, { size: 11, font: FONT_UI, italic: true, color: UI.dim, align: 'right' });
    }
  }
}

/** Browsers only let a page close windows it opened itself, so Quit falls back to a farewell screen. */
export class QuitScene implements Scene {
  readonly id = 'quit';
  private t = 0;

  constructor(private readonly app: App) {}

  enter(app: App): void {
    app.audio.playMusic(null);
    try {
      window.close();
    } catch {
      /* not allowed: show the message instead */
    }
  }

  update(app: App): void {
    this.t++;
    tickBackdrop();
    if (this.t > 30 && (app.input.nav.confirm || app.input.nav.cancel)) app.goto(new TitleScene(this.app));
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackdrop(ctx, 0.6);
    drawText(ctx, 'Thank you for playing.', SCREEN_W / 2, 210, { size: 28, font: FONT_TITLE, italic: true, bold: true, color: UI.gold, align: 'center', glow: '#ff9a3a', glowBlur: 12 });
    drawText(ctx, 'You can close this tab now.', SCREEN_W / 2, 246, { size: 15, font: FONT_TITLE, italic: true, color: UI.ink, align: 'center' });
    drawText(ctx, 'Press Z to return to the title screen.', SCREEN_W / 2, 290, { size: 12, font: FONT_UI, color: UI.dim, align: 'center' });
  }
}
