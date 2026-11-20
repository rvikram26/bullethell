import { App, type Scene } from './app';
import { topScore } from './core/highscores';
import { clamp } from './core/math';
import { DIFFICULTY_IDS, type DifficultyId } from './data/types';
import { newRun } from './game/state';
import { EndingScene } from './scenes/ending';
import { GameScene } from './scenes/game';
import { KeyConfigScene, OptionsScene } from './scenes/options';
import { NameEntryScene, ScoresScene } from './scenes/scores';
import { DifficultyScene } from './scenes/select';
import { TitleScene } from './scenes/title';

/**
 * URL switches (for testing and practice):
 *   ?stage=2&diff=hard        start a run directly at stage 2 on Hard
 *   &practice                 practice mode (single stage, full power)
 *   &boss=0|1&phase=N         skip to the mid-boss (0) or boss (1), optionally a later phase
 *   &god&power=128&seed=7     invulnerable, start power, fixed random seed
 *   &lives=0                  spare lives at the start
 *   &stress=3000              keep 3000 bullets on screen (performance test)
 *   ?debug                    performance overlay and a window.__lt test handle
 *   ?debug&scene=options      jump to a menu screen (options, keys, scores, ending, name, difficulty)
 */
function launch(app: App, params: URLSearchParams): Scene {
  const num = (k: string): number | undefined => {
    const v = params.get(k);
    if (v === null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const rawDiff = params.get('diff') ?? 'normal';
  const diff: DifficultyId = (DIFFICULTY_IDS as readonly string[]).includes(rawDiff) ? (rawDiff as DifficultyId) : 'normal';

  if (params.get('stage') !== null) {
    const stage = clamp(Math.round((num('stage') ?? 1) - 1), 0, 2);
    const run = newRun(diff, params.has('practice'), stage, topScore(app.scores, diff));
    return new GameScene(app, run, {
      debug: { god: params.has('god'), skipToBoss: num('boss'), phase: num('phase'), power: num('power'), stress: num('stress'), lives: num('lives') },
      seed: num('seed'),
    });
  }

  if (app.debug) {
    const run = newRun(diff, false, 2, 0);
    run.score = 12_345_670;
    switch (params.get('scene')) {
      case 'options':
        return new OptionsScene(app, () => new TitleScene(app));
      case 'keys':
        return new KeyConfigScene(app, () => new TitleScene(app));
      case 'scores':
        return new ScoresScene(app, diff);
      case 'ending':
        return new EndingScene(app, run);
      case 'name':
        return new NameEntryScene(app, run, true);
      case 'difficulty':
        return new DifficultyScene(app, 'game');
      default:
        break;
    }
  }
  return new TitleScene(app);
}

function boot(): void {
  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing #game canvas');
  const params = new URLSearchParams(location.search);
  const app = new App(canvas, params.has('debug'));
  app.start(launch(app, params));
  document.getElementById('boot')?.classList.add('hidden');
  canvas.focus();
  window.addEventListener('pointerdown', () => canvas.focus());

  if (app.debug) {
    const w = window as unknown as Record<string, unknown>;
    w.__lt = {
      app,
      stats: () => {
        const scene = app.current;
        const world = scene instanceof GameScene ? scene.world : null;
        return {
          scene: scene?.id ?? null,
          fps: app.loop.stats.fps,
          ups: app.loop.stats.updatesPerSecond,
          updateMs: app.loop.stats.updateMs,
          renderMs: app.loop.stats.renderMs,
          bullets: world?.bullets.count ?? 0,
          overflow: world?.bullets.overflow ?? 0,
          boss: world?.boss ? { id: world.boss.def.id, phase: world.boss.phase, mode: world.boss.mode } : null,
          score: world?.run.score ?? 0,
          lives: world?.run.lives ?? 0,
          stage: world?.stage.number ?? 0,
          audio: app.audio.ready,
        };
      },
      audioReport: async () => (await import('./audio/analyze')).analyzeAudio(),
    };
  }
}

boot();
