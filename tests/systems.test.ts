import { describe, expect, it } from 'vitest';
import { compileSong, parseChord, parseMelody, parseNote, SONG_IDS } from '../src/audio/music';
import { SONGS } from '../src/audio/songs';
import { insertScore, qualifies, sanitizeTable, TABLE_SIZE } from '../src/core/highscores';
import { ACTIONS, DEFAULT_BINDINGS, rebind, sanitizeBindings } from '../src/core/input';
import { sanitizeSettings } from '../src/core/settings';
import { GAME_DATA } from '../src/data/registry';
import { validateData } from '../src/game/validate';

describe('music', () => {
  it('parses notes, chords and melodies', () => {
    expect(parseNote('a4')).toBe(69);
    expect(parseNote('c4')).toBe(60);
    expect(parseNote('bb4')).toBe(70);
    expect(parseNote('c#5')).toBe(73);
    expect(parseChord('Am')).toEqual({ root: 9, intervals: [0, 3, 7], steps: 16 });
    expect(parseChord('Bb/2').steps).toBe(8);
    expect(parseChord('F#m7*2')).toEqual({ root: 6, intervals: [0, 3, 7, 10], steps: 32 });
    const m = parseMelody('c5:4 d5 e5:8 -:2 | r:2');
    expect(m.length).toBe(4 + 4 + 8 + 2 + 2);
    expect(m.notes.map((n) => n.steps)).toEqual([4, 4, 10]);
    expect(() => parseMelody('c5:4 - :2')).toThrow();
  });

  it('compiles every song, with every melody exactly as long as its chords', () => {
    for (const song of SONGS) {
      const c = compileSong(song);
      expect(c.loop.length).toBeGreaterThan(0);
      expect(c.loop.length % 16).toBe(0);
      const notes = c.loop.reduce((n, s) => n + s.notes.length, 0);
      expect(notes).toBeGreaterThan(50);
    }
  });

  it('has a track for every stage, boss, title and ending', () => {
    expect(validateData(GAME_DATA, SONG_IDS)).toEqual([]);
    expect(SONG_IDS.has('title')).toBe(true);
    expect(SONG_IDS.has('ending')).toBe(true);
  });
});

describe('high scores', () => {
  it('falls back to a default table and sanitizes garbage', () => {
    const t = sanitizeTable({ normal: [{ name: 'x'.repeat(50), score: 5, stage: 9 }, { score: 'lots' }, null] });
    expect(t.normal.length).toBe(1);
    expect(t.normal[0].name.length).toBeLessThanOrEqual(12);
    expect(t.normal[0].stage).toBe(3);
    expect(t.easy.length).toBe(TABLE_SIZE);
  });

  it('inserts in order and keeps ten entries', () => {
    const t = sanitizeTable(null);
    const low = t.normal[TABLE_SIZE - 1].score;
    expect(qualifies(t, 'normal', low - 1)).toBe(false);
    const rank = insertScore(t, 'normal', { name: 'Tester', score: 99_999_999, stage: 3, cleared: true, continues: 0, date: '2026-01-01' });
    expect(rank).toBe(0);
    expect(t.normal.length).toBe(TABLE_SIZE);
    expect(t.normal[0].name).toBe('Tester');
    expect(insertScore(t, 'normal', { name: 'Low', score: 1, stage: 1, cleared: false, continues: 0, date: '2026-01-01' })).toBe(-1);
  });
});

describe('key bindings and settings', () => {
  it('swaps keys instead of leaving an action unbound', () => {
    const b = rebind(DEFAULT_BINDINGS, 'shoot', 'KeyX');
    expect(b.shoot).toEqual(['KeyX']);
    expect(b.bomb).toEqual(['KeyZ']);
    for (const a of ACTIONS) expect(b[a].length).toBeGreaterThan(0);
  });

  it('never assigns one key to two actions', () => {
    let b = DEFAULT_BINDINGS;
    for (const code of ['ShiftLeft', 'KeyC', 'ArrowUp', 'Escape', 'Space']) {
      for (const a of ACTIONS) {
        b = rebind(b, a, code);
        const all = ACTIONS.flatMap((x) => b[x]);
        expect(new Set(all).size).toBe(all.length);
      }
    }
  });

  it('rejects malformed saved bindings and settings', () => {
    const b = sanitizeBindings({ up: [42], shoot: ['KeyJ'], focus: [] });
    expect(b.up).toEqual(DEFAULT_BINDINGS.up);
    expect(b.shoot).toEqual(['KeyJ']);
    expect(b.focus).toEqual(DEFAULT_BINDINGS.focus);
    const s = sanitizeSettings({ master: 7, music: -1, sfx: 'loud', quality: 5 });
    expect(s.master).toBe(1);
    expect(s.music).toBe(0);
    expect(s.sfx).toBe(0.8);
    expect(s.quality).toBe(2);
  });
});
