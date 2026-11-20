import { describe, expect, it } from 'vitest';
import { neutralInput } from '../src/core/input';
import { GAME_DATA } from '../src/data/registry';
import type { DifficultyId } from '../src/data/types';
import { newRun } from '../src/game/state';
import { World } from '../src/game/world';
import { Bot } from './helpers/bot';

interface PhaseReport {
  stage: number;
  boss: string;
  phase: number;
  name: string;
  seconds: number;
  limit: number;
  timedOut: boolean;
  peakBullets: number;
  hpPool: number;
  misses: number;
}

/**
 * Fight one boss from start to finish with the bot. With `god` the bot cannot die, which isolates
 * the time-to-kill; without it the number of times it is hit measures how punishing a pattern is.
 */
function fightBoss(stage: number, bossIndex: number, power: number, difficulty: DifficultyId, god: boolean): PhaseReport[] {
  const run = newRun(difficulty, false, stage, 0);
  const w = new World({ stage, run, seed: 4242, debug: { skipToBoss: bossIndex, god, power } });
  const bot = new Bot(false);
  const inp = neutralInput();
  const out: PhaseReport[] = [];

  let lastPhase = -2;
  let seen = false;
  let phaseStart = 0;
  let missesAtStart = 0;
  let peak = 0;
  let frames = 0;
  while (frames < 60 * 60 * 6) {
    if (w.gameOver) w.continueGame();
    if (w.dialogue) {
      inp.dx = inp.dy = 0;
      inp.bomb = true;
      inp.shoot = false;
    } else {
      bot.decide(w, inp);
    }
    w.update(inp);
    frames++;
    const b = w.boss;
    if (!b) {
      if (seen) break; // the boss has been defeated
      continue;
    }
    seen = true;
    peak = Math.max(peak, w.bullets.count);
    if (b.phase !== lastPhase) {
      lastPhase = b.phase;
      phaseStart = frames;
      missesAtStart = w.run.stats.misses;
      peak = 0;
    }
    if (b.mode === 'break' || b.mode === 'dying') {
      const p = b.currentPhase;
      if (p && !out.some((r) => r.phase === b.phase)) {
        out.push({
          stage,
          boss: b.def.id,
          phase: b.phase,
          name: p.name ?? '(attack)',
          seconds: (frames - phaseStart) / 60,
          limit: p.time,
          timedOut: b.phaseT >= b.limit && b.hp > 0,
          peakBullets: peak,
          hpPool: b.maxHp,
          misses: w.run.stats.misses - missesAtStart,
        });
      }
    }
  }
  return out;
}

describe('boss balance report', () => {
  const stages = GAME_DATA.stages.length;

  for (let s = 0; s < stages; s++) {
    for (let bi = 0; bi < 2; bi++) {
      it(`stage ${s + 1} boss ${bi}: phases last long enough and are beatable`, () => {
        const normalFull = fightBoss(s, bi, 128, 'normal', true);
        const lunaticFull = fightBoss(s, bi, 128, 'lunatic', true);
        const normalLow = fightBoss(s, bi, 40, 'normal', true);
        const live = {
          easy: fightBoss(s, bi, 128, 'easy', false),
          normal: fightBoss(s, bi, 128, 'normal', false),
          hard: fightBoss(s, bi, 128, 'hard', false),
          lunatic: fightBoss(s, bi, 128, 'lunatic', false),
        };
        const rows = normalFull.map((r, i) => ({
          phase: `${r.boss}#${r.phase} ${r.name}`.slice(0, 40).padEnd(40),
          hp: String(r.hpPool).padStart(5),
          full: `${r.seconds.toFixed(1)}s/${r.limit}s`.padStart(10),
          low: `${(normalLow[i]?.seconds ?? 0).toFixed(1)}s${normalLow[i]?.timedOut ? '!' : ''}`.padStart(7),
          peaks: `${r.peakBullets}/${lunaticFull[i]?.peakBullets ?? 0}`.padStart(9),
          misses: `${live.easy[i]?.misses ?? '-'}/${live.normal[i]?.misses ?? '-'}/${live.hard[i]?.misses ?? '-'}/${live.lunatic[i]?.misses ?? '-'}`.padStart(11),
        }));
        // eslint-disable-next-line no-console
        console.log(
          `\n  phase                                       hp  normal-full  low-pwr  peak(N/L)  bot misses E/N/H/L\n` +
            rows.map((r) => `  ${r.phase} ${r.hp} ${r.full} ${r.low} ${r.peaks} ${r.misses}`).join('\n'),
        );
        const bossDef = Object.values(GAME_DATA.bosses).find((b) => b.id === normalFull[0]?.boss);
        expect(normalFull.length).toBe(bossDef?.phases.length);
        for (const r of normalFull) {
          expect(r.seconds).toBeGreaterThan(6);
          expect(r.timedOut).toBe(false);
        }
      });
    }
  }
});
