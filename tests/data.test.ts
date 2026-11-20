import { describe, expect, it } from 'vitest';
import { GAME_DATA } from '../src/data/registry';
import { validateData } from '../src/game/validate';

describe('game data', () => {
  it('is internally consistent', () => {
    expect(validateData(GAME_DATA)).toEqual([]);
  });

  it('has three stages with a mid-boss and a boss each', () => {
    expect(GAME_DATA.stages.length).toBeGreaterThanOrEqual(1);
    for (const stage of GAME_DATA.stages) {
      const bosses = stage.steps.filter((s) => s.type === 'boss');
      expect(bosses.length).toBe(2);
      const defs = bosses.map((s) => GAME_DATA.bosses[(s as { boss: string }).boss]);
      expect(defs[0].midboss).toBe(true);
      expect(defs[1].midboss).not.toBe(true);
    }
  });

  it('gives every boss phase an hp pool, a time limit, a distinct rite name and a capture bonus', () => {
    const names = new Set<string>();
    for (const boss of Object.values(GAME_DATA.bosses)) {
      expect(boss.phases.length).toBeGreaterThanOrEqual(2);
      for (const p of boss.phases) {
        expect(p.hp).toBeGreaterThan(0);
        expect(p.time).toBeGreaterThan(0);
        expect(p.name).toBeTruthy();
        expect(p.bonus).toBeGreaterThan(0);
        expect(names.has(p.name as string)).toBe(false);
        names.add(p.name as string);
      }
    }
  });
});
