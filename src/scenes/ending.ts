import type { App, Scene } from '../app';
import { SCREEN_H, SCREEN_W } from '../core/constants';
import { qualifies } from '../core/highscores';
import { clamp, grouped } from '../core/math';
import { DIFFICULTIES } from '../data/difficulty';
import type { RunState } from '../game/state';
import { UI } from '../render/palette';
import { drawText, FONT_MONO, FONT_TITLE, FONT_UI, wrapText } from '../render/text';
import { menuBackdrop, tickBackdrop } from './common';
import { NameEntryScene, ScoresScene } from './scores';
import { TitleScene } from './title';

interface Page {
  title?: string;
  lines: string[];
}

const GOOD: Page[] = [
  { lines: ["Wren's lantern touched the old wick, and the Beacon of Halcyra breathed light again."] },
  { lines: ['It did not roar as it once had. It glowed, warm and steady, like a hearth seen through a window.'] },
  { lines: ['Far below, the Tide that had been climbing the city\'s lamps slowed, sighed, and slid back into the sea.'] },
  { lines: ['Auriel slept for the first time in two hundred years. Wren kept watch beside her, trimming the flame.'] },
  {
    lines: ['In the morning the marsh-lights were dancing again, and the stars were still bright overhead. For once, both had room in the sky.'],
  },
  { title: 'The Good Ending', lines: ['A Light That Does Not Consume'] },
];

const NORMAL: Page[] = [
  { lines: ['Wren reached the top of the Spire, singed and tired, and lit the Beacon with the last of her flame.'] },
  { lines: ["The Tide drew back from the city. But the light flickered, and Auriel's eyes did not close."] },
  { lines: ['"Again tomorrow, then," the Keeper said softly. "And the night after that."'] },
  { lines: ['Perhaps there is a way to keep a light without burning its keeper. Clear the game without continuing to find it.'] },
  { title: 'The Long Night Ending', lines: ['Again Tomorrow'] },
];

const CREDITS: Page = {
  title: 'Lantern Tide',
  lines: [
    'An original danmaku shooter.',
    'Every character, story, sprite and tune was made for this game.',
    'All art is drawn in code; all music and sound is synthesised in your browser.',
    'Thank you for playing!',
  ],
};

export class EndingScene implements Scene {
  readonly id = 'ending';
  private readonly pages: Page[];
  private page = 0;
  private t = 0;
  private lit = 0;
  private leaving = false;

  constructor(
    private readonly app: App,
    private readonly run: RunState,
  ) {
    this.pages = [...(run.continues === 0 ? GOOD : NORMAL), CREDITS, this.summary()];
  }

  private summary(): Page {
    const r = this.run;
    return {
      title: 'Final Score',
      lines: [
        grouped(r.score),
        `${DIFFICULTIES[r.difficulty].name}   -   Continues ${r.continues}`,
        `Rites captured ${r.totals.spellsCaptured}/${r.totals.spellsSeen}   Misses ${r.totals.misses}   Bombs ${r.totals.bombs}`,
        `Graze ${r.graze}`,
      ],
    };
  }

  enter(app: App): void {
    app.audio.playMusic('ending');
  }

  update(app: App): void {
    this.t++;
    tickBackdrop();
    this.lit = clamp(this.lit + 0.004, 0, 1);
    if (this.leaving || this.t < 50) return;
    if (app.input.nav.confirm || app.input.nav.cancel) {
      app.audio.play('menu-ok');
      this.page++;
      this.t = 0;
      if (this.page >= this.pages.length) this.leave();
    }
  }

  private leave(): void {
    this.leaving = true;
    this.page = this.pages.length - 1;
    const app = this.app;
    const run = this.run;
    if (qualifies(app.scores, run.difficulty, run.score)) app.goto(new NameEntryScene(app, run, true));
    else app.goto(new ScoresScene(app, run.difficulty, -1, () => new TitleScene(app)));
  }

  render(ctx: CanvasRenderingContext2D): void {
    menuBackdrop(ctx, 0.15, this.lit);
    const p = this.pages[Math.min(this.page, this.pages.length - 1)];
    const a = clamp(this.t / 40, 0, 1);
    const g = ctx.createLinearGradient(0, SCREEN_H - 200, 0, SCREEN_H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.4, 'rgba(2,3,12,0.75)');
    g.addColorStop(1, 'rgba(2,3,12,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, SCREEN_H - 200, SCREEN_W, 200);

    let y = SCREEN_H - 120;
    if (p.title) {
      drawText(ctx, p.title, SCREEN_W / 2, y - 18, { size: 24, font: FONT_TITLE, bold: true, italic: true, color: UI.gold, align: 'center', alpha: a, glow: '#ff9a3a', glowBlur: 12 });
      y += 14;
    }
    const isScore = p.title === 'Final Score';
    p.lines.forEach((line, i) => {
      const wrapped = wrapText(ctx, line, SCREEN_W - 140, { size: 15, font: FONT_TITLE });
      for (const w of wrapped) {
        const big = isScore && i === 0;
        drawText(ctx, w, SCREEN_W / 2, y, {
          size: big ? 26 : p.title && !isScore && p.lines.length === 1 ? 20 : 15,
          font: big ? FONT_MONO : FONT_TITLE,
          italic: !big,
          color: big ? '#ffffff' : UI.ink,
          align: 'center',
          alpha: a,
          shadow: 'rgba(0,0,0,0.8)',
        });
        y += big ? 30 : 21;
      }
    });
    if (this.t > 50 && (this.t >> 5) % 2 === 0) drawText(ctx, 'Z', SCREEN_W - 24, SCREEN_H - 18, { size: 11, font: FONT_UI, bold: true, color: UI.gold, align: 'center' });
  }
}
