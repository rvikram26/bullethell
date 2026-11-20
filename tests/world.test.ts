import { describe, expect, it } from 'vitest';
import { neutralInput, type PlayerInput } from '../src/core/input';
import { GAME_DATA } from '../src/data/registry';
import type { DifficultyId } from '../src/data/types';
import { MODE_ALIVE, MODE_DEAD, MODE_DYING } from '../src/game/player';
import { type DebugOptions, newRun } from '../src/game/state';
import { World } from '../src/game/world';
import { Bot } from './helpers/bot';

function makeWorld(stage = 0, difficulty: DifficultyId = 'normal', debug: DebugOptions = {}, seed = 1234): World {
  const run = newRun(difficulty, false, stage, 0);
  return new World({ stage, run, seed, debug });
}

function idle(): PlayerInput {
  return neutralInput();
}

function step(w: World, n: number, input: PlayerInput = idle()): void {
  for (let i = 0; i < n; i++) w.update(input);
}

describe('World basics', () => {
  it('starts with the configured resources', () => {
    const w = makeWorld(0, 'normal');
    expect(w.run.lives).toBe(3);
    expect(w.run.bombs).toBe(3);
    expect(w.run.power).toBe(0);
    expect(w.stage.number).toBe(1);
  });

  it('fires a shot stream while shoot is held and levels up with power', () => {
    const w = makeWorld();
    const shoot = { ...idle(), shoot: true };
    step(w, 20, shoot);
    const lv1 = w.shots.active;
    expect(lv1).toBeGreaterThan(0);

    const w2 = makeWorld(0, 'normal', { power: 128 });
    step(w2, 20, shoot);
    expect(w2.shots.active).toBeGreaterThan(lv1 * 4);
  });

  it('moves slower while focused', () => {
    const a = makeWorld();
    const b = makeWorld();
    const startX = a.player.x;
    step(a, 20, { ...idle(), dx: 1 });
    step(b, 20, { ...idle(), dx: 1, focus: true });
    expect(a.player.x - startX).toBeGreaterThan((b.player.x - startX) * 1.8);
  });
});

describe('Player hits, deaths and bombs', () => {
  function spawnOnPlayer(w: World): void {
    const spec = w.bank.compiler.bullet({ sprite: 'orb', color: 'red', speed: 0 });
    w.bullets.spawn(w.player.x, w.player.y, 0, 0, spec);
  }

  it('loses a life, resets some power and drops items when hit', () => {
    const w = makeWorld(0, 'normal', { power: 80 });
    w.player.invuln = 0;
    spawnOnPlayer(w);
    step(w, 1);
    expect(w.player.mode).toBe(MODE_DYING);
    step(w, 12);
    expect(w.player.mode).toBe(MODE_DEAD);
    expect(w.run.lives).toBe(2);
    expect(w.run.power).toBe(80 - 24);
    expect(w.items.items.some((i) => i.active)).toBe(true);
    step(w, 80);
    expect(w.player.mode).toBe(MODE_ALIVE);
    expect(w.player.invuln).toBeGreaterThan(0);
  });

  it('a bomb inside the death window saves the player (deathbomb)', () => {
    const w = makeWorld();
    w.player.invuln = 0;
    spawnOnPlayer(w);
    step(w, 1);
    expect(w.player.mode).toBe(MODE_DYING);
    step(w, 1, { ...idle(), bomb: true });
    expect(w.player.mode).toBe(MODE_ALIVE);
    expect(w.run.bombs).toBe(2);
    expect(w.run.lives).toBe(3);
  });

  it('a bomb clears bullets, makes the player invulnerable and damages enemies', () => {
    const w = makeWorld();
    w.player.invuln = 0;
    const spec = w.bank.compiler.bullet({ sprite: 'orb', color: 'blue', speed: 60 });
    for (let i = 0; i < 100; i++) w.bullets.spawn(40 + i * 3, 60, Math.PI / 2, 1, spec);
    const enemy = w.spawnEnemy({ t: 0, type: 'spawn', enemy: 'moth', x: 192, y: 200, path: 'down-slow' });
    expect(enemy).not.toBeNull();
    const before = enemy?.hp ?? 0;
    step(w, 1, { ...idle(), bomb: true });
    expect(w.run.bombs).toBe(2);
    step(w, 40);
    expect(w.bullets.count).toBe(0);
    expect(enemy?.hp ?? 0).toBeLessThan(before);
    expect(w.player.invuln).toBeGreaterThan(100);
    // bullets spawned while the bomb is still active are swallowed as well
    w.bullets.spawn(w.player.x, w.player.y - 30, 0, 0, spec);
    step(w, 1);
    expect(w.bullets.count).toBe(0);
  });

  it('flags game over when the last life is lost, and continue revives', () => {
    const w = makeWorld(0, 'normal');
    w.run.lives = 0;
    w.player.invuln = 0;
    spawnOnPlayer(w);
    step(w, 14);
    expect(w.gameOver).toBe(true);
    w.continueGame();
    expect(w.gameOver).toBe(false);
    expect(w.run.lives).toBe(3);
    expect(w.run.continues).toBe(1);
    expect(w.run.score).toBe(0);
  });

  it('counts grazes without hurting the player', () => {
    const w = makeWorld();
    w.player.invuln = 0;
    const spec = w.bank.compiler.bullet({ sprite: 'orb', color: 'red', speed: 0 });
    w.bullets.spawn(w.player.x + 14, w.player.y, 0, 0, spec);
    step(w, 1);
    expect(w.run.graze).toBe(1);
    expect(w.player.mode).toBe(MODE_ALIVE);
    expect(w.run.score).toBeGreaterThan(0);
  });
});

describe('Items and score', () => {
  it('auto-collects every item when the player is near the top', () => {
    const w = makeWorld();
    w.player.y = 60;
    w.player.invuln = 0;
    w.items.spawn(2, 40, 300, w.rng);
    w.items.spawn(0, 300, 200, w.rng);
    const before = w.run.score;
    step(w, 90);
    expect(w.items.items.filter((i) => i.active).length).toBe(0);
    expect(w.run.score).toBeGreaterThan(before);
    expect(w.run.power).toBeGreaterThanOrEqual(1);
  });

  it('turns five bomb fragments into a bomb and awards extends at score thresholds', () => {
    const w = makeWorld();
    w.player.y = 60;
    for (let i = 0; i < 5; i++) w.items.spawn(3, 192, 90, w.rng, 0);
    step(w, 60);
    expect(w.run.bombs).toBe(4);
    const lives = w.run.lives;
    w.addScore(2_000_000);
    expect(w.run.lives).toBe(lives + 1);
    w.addScore(1_000_000);
    expect(w.run.lives).toBe(lives + 1);
  });
});

describe('Bosses and spell cards', () => {
  function bossReady(phase: number): World {
    const w = makeWorld(0, 'normal', { skipToBoss: 0, phase, god: true });
    // run until the boss is in its fight state
    for (let i = 0; i < 60 * 20 && !(w.boss && w.boss.mode === 'fight'); i++) {
      w.update(w.dialogue ? { ...idle(), bomb: true } : idle());
    }
    expect(w.boss?.mode).toBe('fight');
    return w;
  }

  it('awards the spell bonus only for a clean capture', () => {
    const clean = bossReady(1);
    expect(clean.boss?.spell).toBe(true);
    const base = clean.run.score;
    if (clean.boss) clean.boss.hp = 0;
    step(clean, 2);
    expect(clean.run.stats.spellsCaptured).toBe(1);
    expect(clean.run.score - base).toBeGreaterThanOrEqual(150_000);

    const bombed = bossReady(1);
    bombed.startBomb();
    if (bombed.boss) bombed.boss.hp = 0;
    step(bombed, 3);
    expect(bombed.run.stats.spellsCaptured).toBe(0);
    expect(bombed.run.stats.spellsSeen).toBe(1);

    const missed = bossReady(1);
    if (missed.boss) missed.boss.missed = true;
    if (missed.boss) missed.boss.hp = 0;
    step(missed, 3);
    expect(missed.run.stats.spellsCaptured).toBe(0);
  });

  it('moves on to the next phase on time-out and ends the fight after the last phase', () => {
    const w = bossReady(0);
    expect(w.boss?.phase).toBe(0);
    if (w.boss) w.boss.phaseT = w.boss.limit; // out of time
    step(w, 2);
    expect(w.boss?.mode).toBe('break');
    expect(w.run.stats.spellsCaptured).toBe(0);
    for (let i = 0; i < 60 * 6 && w.boss?.mode !== 'fight'; i++) step(w, 1);
    expect(w.boss?.phase).toBe(1);
    if (w.boss) w.boss.hp = 0;
    step(w, 300);
    expect(w.boss).toBeNull();
  });

  it('the boss cannot be damaged during the spell declaration', () => {
    const w = makeWorld(0, 'normal', { skipToBoss: 0, phase: 1, god: true });
    for (let i = 0; i < 60 * 20 && w.boss?.mode !== 'warmup'; i++) w.update(w.dialogue ? { ...idle(), bomb: true } : idle());
    expect(w.boss?.mode).toBe('warmup');
    expect(w.boss?.damage(100)).toBe(false);
  });
});

describe('Full stage runs with a dodging bot', () => {
  function playStage(stage: number, difficulty: DifficultyId, maxFrames: number) {
    const counts = { sfx: 0 };
    const w = new World({
      stage,
      run: newRun(difficulty, false, stage, 0),
      seed: 99 + stage,
      host: { sfx: () => counts.sfx++, music() {}, shake() {} },
    });
    const bot = new Bot();
    const inp = neutralInput();
    let peakBullets = 0;
    let continues = 0;
    let frames = 0;
    let worst = 0;
    while (!w.stageCleared && frames < maxFrames) {
      if (w.gameOver) {
        w.continueGame();
        continues++;
      }
      if (w.dialogue) {
        inp.dx = inp.dy = 0;
        inp.bomb = false;
        inp.shoot = frames % 12 === 0; // tap through dialogue
      } else {
        bot.decide(w, inp);
      }
      const t0 = performance.now();
      w.update(inp);
      worst = Math.max(worst, performance.now() - t0);
      peakBullets = Math.max(peakBullets, w.bullets.count);
      frames++;
    }
    return { w, frames, peakBullets, continues, worst, sfx: counts.sfx };
  }

  for (const stage of [0, 1, 2]) {
    for (const diff of ['easy', 'normal', 'lunatic'] as DifficultyId[]) {
      it(`stage ${stage + 1} on ${diff} can be completed`, () => {
        const r = playStage(stage, diff, 60 * 60 * 9);
        // eslint-disable-next-line no-console
        console.log(
          `[stage${stage + 1}/${diff}] cleared=${r.w.stageCleared} time=${(r.frames / 3600).toFixed(1)}min peakBullets=${r.peakBullets} ` +
            `continues=${r.continues} misses=${r.w.run.stats.misses} spells=${r.w.run.stats.spellsCaptured}/${r.w.run.stats.spellsSeen} worstStep=${r.worst.toFixed(2)}ms score=${r.w.run.score}`,
        );
        expect(r.w.stageCleared).toBe(true);
        expect(r.w.bullets.overflow).toBe(0);
      });
    }
  }
});

describe('data-driven stages', () => {
  it('every stage in the data can be instantiated on every difficulty', () => {
    for (let s = 0; s < GAME_DATA.stages.length; s++) {
      for (const d of ['easy', 'normal', 'hard', 'lunatic'] as DifficultyId[]) {
        const w = makeWorld(s, d);
        step(w, 120);
        expect(w.tick).toBe(120);
      }
    }
  });
});
