import type { App, Scene } from '../app';
import { SCREEN_H, SCREEN_W } from '../core/constants';
import { topScore } from '../core/highscores';
import { DIFFICULTY_LIST } from '../data/difficulty';
import { GAME_DATA } from '../data/registry';
import type { DifficultyId } from '../data/types';
import { newRun } from '../game/state';
import { drawGlow, glowHex } from '../render/glow';
import { UI } from '../render/palette';
import { drawText, FONT_TITLE, FONT_UI, panel } from '../render/text';
import { Menu } from '../ui/menu';
import { footer, heading, menuBackdrop, tickBackdrop } from './common';
import { GameScene } from './game';
import { TitleScene } from './title';

let lastDifficulty = 1;
let lastStage = 0;

export class DifficultyScene implements Scene {
  readonly id = 'difficulty';
  private readonly menu: Menu;
  private t = 0;

  constructor(
    private readonly app: App,
    private readonly mode: 'game' | 'practice',
  ) {
    this.menu = new Menu(
      DIFFICULTY_LIST.map((d) => ({
        label: d.name,
        onConfirm: () => this.choose(d.id),
      })),
      () => app.goto(new TitleScene(app)),
    );
    this.menu.index = lastDifficulty;
  }

  enter(app: App): void {
    app.audio.playMusic('title');
  }

  private choose(id: DifficultyId): void {
    lastDifficulty = this.menu.index;
    const app = this.app;
    if (this.mode === 'practice') app.goto(new StageSelectScene(app, id));
    else app.goto(new GameScene(app, newRun(id, false, 0, topScore(app.scores, id))));
  }

  update(app: App): void {
    this.t++;
    tickBackdrop();
    this.menu.update(app);
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackdrop(ctx, 0.55);
    heading(ctx, 'Select Difficulty', this.mode === 'practice' ? 'Practice' : 'New Game');
    DIFFICULTY_LIST.forEach((d, i) => {
      const sel = i === this.menu.index;
      const y = 150 + i * 72;
      const x = SCREEN_W / 2;
      ctx.save();
      ctx.globalAlpha = sel ? 1 : 0.55;
      panel(ctx, x - 190, y - 30, 380, 58, 1);
      ctx.restore();
      if (sel) {
        drawGlow(ctx, glowHex(d.color), x, y - 4, 150, 0.2 + 0.05 * Math.sin(this.t * 0.1));
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 189.5, y - 29.5, 379, 57);
      }
      drawText(ctx, d.name, x, y - 2, { size: sel ? 26 : 22, font: FONT_TITLE, bold: true, italic: true, color: sel ? d.color : UI.dim, align: 'center', shadow: 'rgba(0,0,0,0.8)' });
      drawText(ctx, d.blurb, x, y + 18, { size: 11, font: FONT_UI, color: sel ? UI.ink : UI.faint, align: 'center' });
    });
    footer(ctx, 'Up/Down: choose   Z: confirm   X: back');
  }
}

export class StageSelectScene implements Scene {
  readonly id = 'stage-select';
  private readonly menu: Menu;
  private t = 0;

  constructor(
    app: App,
    private readonly diff: DifficultyId,
  ) {
    this.menu = new Menu(
      GAME_DATA.stages.map((s, i) => ({
        label: `Stage ${s.number}`,
        onConfirm: () => {
          lastStage = i;
          app.goto(new GameScene(app, newRun(diff, true, i, topScore(app.scores, diff))));
        },
      })),
      () => app.goto(new DifficultyScene(app, 'practice')),
    );
    this.menu.index = Math.min(lastStage, GAME_DATA.stages.length - 1);
  }

  enter(app: App): void {
    app.audio.playMusic('title');
  }

  update(app: App): void {
    this.t++;
    tickBackdrop();
    this.menu.update(app);
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackdrop(ctx, 0.55);
    const d = DIFFICULTY_LIST.find((x) => x.id === this.diff);
    heading(ctx, 'Practice', `Choose a stage  -  ${d?.name ?? ''}`);
    GAME_DATA.stages.forEach((s, i) => {
      const sel = i === this.menu.index;
      const y = 170 + i * 86;
      const x = SCREEN_W / 2;
      ctx.save();
      ctx.globalAlpha = sel ? 1 : 0.55;
      panel(ctx, x - 210, y - 36, 420, 70, 1);
      ctx.restore();
      if (sel) drawGlow(ctx, glowHex('#ffb84a'), x, y, 170, 0.16);
      drawText(ctx, `Stage ${s.number}`, x - 190, y - 10, { size: 13, font: FONT_UI, bold: true, color: sel ? UI.gold : UI.faint });
      drawText(ctx, s.name, x - 190, y + 12, { size: sel ? 22 : 19, font: FONT_TITLE, bold: true, italic: true, color: sel ? '#ffffff' : UI.dim, shadow: 'rgba(0,0,0,0.8)' });
      drawText(ctx, s.subtitle, x + 190, y + 12, { size: 11, font: FONT_TITLE, italic: true, color: sel ? UI.dim : UI.faint, align: 'right' });
    });
    drawText(ctx, 'Practice starts at full power with the stage\'s mid-boss and boss included.', SCREEN_W / 2, SCREEN_H - 44, {
      size: 11,
      font: FONT_UI,
      italic: true,
      color: UI.dim,
      align: 'center',
    });
    footer(ctx, 'Up/Down: choose   Z: start   X: back');
  }
}
