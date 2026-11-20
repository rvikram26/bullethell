import type { App, Scene } from '../app';
import { SCREEN_W } from '../core/constants';
import { cleanName, insertScore, NAME_MAX, TABLE_SIZE, today } from '../core/highscores';
import { grouped } from '../core/math';
import { store } from '../core/storage';
import { DIFFICULTIES, DIFFICULTY_LIST, difficultyIndex } from '../data/difficulty';
import type { DifficultyId } from '../data/types';
import type { RunState } from '../game/state';
import { drawGlow, glowHex } from '../render/glow';
import { UI } from '../render/palette';
import { drawText, FONT_MONO, FONT_TITLE, FONT_UI, panel } from '../render/text';
import { footer, heading, menuBackdrop, tickBackdrop } from './common';
import { TitleScene } from './title';

export class ScoresScene implements Scene {
  readonly id = 'scores';
  private diff: number;
  private t = 0;

  constructor(
    private readonly app: App,
    diff: DifficultyId,
    private readonly highlight = -1,
    private readonly then: (() => Scene) | null = null,
  ) {
    this.diff = difficultyIndex(diff);
  }

  update(app: App): void {
    this.t++;
    tickBackdrop();
    const nav = app.input.nav;
    if (nav.left || nav.right) {
      const n = DIFFICULTY_LIST.length;
      this.diff = (this.diff + (nav.left ? n - 1 : 1)) % n;
      app.audio.play('menu-move');
    } else if (nav.confirm || nav.cancel) {
      app.audio.play(nav.confirm ? 'menu-ok' : 'menu-cancel');
      app.goto(this.then ? this.then() : new TitleScene(this.app));
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackdrop(ctx, 0.6);
    const d = DIFFICULTY_LIST[this.diff];
    heading(ctx, 'High Scores');
    drawText(ctx, `<   ${d.name}   >`, SCREEN_W / 2, 104, { size: 16, font: FONT_TITLE, bold: true, italic: true, color: d.color, align: 'center' });
    panel(ctx, 70, 118, SCREEN_W - 140, 316, 1);
    const list = this.app.scores[d.id];
    const cols = { rank: 100, name: 122, score: 368, stage: 436, date: 518 };
    const hdr = { size: 10, font: FONT_UI, color: UI.faint };
    drawText(ctx, 'NAME', cols.name, 140, hdr);
    drawText(ctx, 'SCORE', cols.score, 140, { ...hdr, align: 'right' });
    drawText(ctx, 'REACHED', cols.stage, 140, { ...hdr, align: 'center' });
    drawText(ctx, 'DATE', cols.date, 140, { ...hdr, align: 'center' });
    for (let i = 0; i < TABLE_SIZE; i++) {
      const e = list[i];
      const y = 166 + i * 26;
      const hi = i === this.highlight && d.id === DIFFICULTY_LIST[this.diff].id;
      if (hi) drawGlow(ctx, glowHex('#ffb84a'), SCREEN_W / 2, y - 4, 220, 0.15 + 0.08 * Math.sin(this.t * 0.15));
      const color = hi ? UI.gold : i < 3 ? '#ffffff' : UI.ink;
      drawText(ctx, `${i + 1}.`, cols.rank, y, { size: 13, font: FONT_MONO, color: UI.dim, align: 'right' });
      if (!e) continue;
      drawText(ctx, e.name, cols.name, y, { size: 14, font: FONT_TITLE, bold: hi, color });
      drawText(ctx, grouped(e.score), cols.score, y, { size: 14, font: FONT_MONO, color, align: 'right' });
      drawText(ctx, e.cleared ? (e.continues > 0 ? 'Clear*' : 'All Clear') : `Stage ${e.stage}`, cols.stage, y, {
        size: 11,
        font: FONT_UI,
        color: e.cleared ? UI.good : UI.dim,
        align: 'center',
      });
      drawText(ctx, e.date, cols.date, y, { size: 10, font: FONT_MONO, color: UI.faint, align: 'center' });
    }
    footer(ctx, 'Left/Right: difficulty   Z or X: back      * cleared with continues');
  }
}

const LAST_NAME_KEY = 'lastName';

/** Type a name for the high score table. */
export class NameEntryScene implements Scene {
  readonly id = 'name-entry';
  private name: string;
  private t = 0;

  constructor(
    private readonly app: App,
    private readonly run: RunState,
    private readonly cleared: boolean,
  ) {
    this.name = cleanName(store.read<string>(LAST_NAME_KEY, ''));
  }

  enter(app: App): void {
    if (!this.cleared) app.audio.playMusic('title');
    app.input.textMode = true;
    app.input.takeTyped();
  }

  exit(app: App): void {
    app.input.textMode = false;
  }

  update(app: App): void {
    this.t++;
    tickBackdrop();
    for (const key of app.input.takeTyped()) {
      if (key === 'Backspace') this.name = this.name.slice(0, -1);
      else if (key === 'Enter' || key === 'Escape') {
        this.submit();
        return;
      } else if (key.length === 1 && this.name.length < NAME_MAX) {
        if (key === ' ' ? this.name.length === 0 || this.name.endsWith(' ') : cleanName(key) === '') continue;
        this.name += key;
        app.audio.play('menu-move');
      }
    }
  }

  private submit(): void {
    const app = this.app;
    const run = this.run;
    const name = cleanName(this.name) || 'Lamplighter';
    store.write(LAST_NAME_KEY, name);
    const rank = insertScore(app.scores, run.difficulty, {
      name,
      score: run.score,
      stage: run.stage + 1,
      cleared: this.cleared,
      continues: run.continues,
      date: today(),
    });
    app.saveScores();
    app.audio.play('menu-ok');
    app.input.textMode = false;
    app.goto(new ScoresScene(app, run.difficulty, rank, () => new TitleScene(app)));
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackdrop(ctx, 0.6);
    const run = this.run;
    heading(ctx, 'A New High Score!', `${DIFFICULTIES[run.difficulty].name}  -  ${this.cleared ? 'All stages cleared' : `Reached stage ${run.stage + 1}`}`);
    drawText(ctx, grouped(run.score), SCREEN_W / 2, 170, { size: 34, font: FONT_MONO, bold: true, color: '#ffffff', align: 'center', glow: '#7fd8ff', glowBlur: 12 });
    drawText(ctx, 'Enter your name', SCREEN_W / 2, 230, { size: 16, font: FONT_TITLE, italic: true, color: UI.dim, align: 'center' });
    panel(ctx, SCREEN_W / 2 - 150, 248, 300, 50, 1);
    const cursor = (this.t >> 4) % 2 === 0 ? '_' : ' ';
    drawText(ctx, this.name + cursor, SCREEN_W / 2, 282, { size: 24, font: FONT_TITLE, bold: true, color: UI.gold, align: 'center' });
    drawText(ctx, `${this.name.length}/${NAME_MAX}`, SCREEN_W / 2 + 140, 292, { size: 9, font: FONT_MONO, color: UI.faint, align: 'right' });
    footer(ctx, 'Type with the keyboard   Backspace: delete   Enter: confirm');
  }
}
