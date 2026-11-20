import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../src/data/difficulty';
import type { BulletDef } from '../src/data/types';
import { BulletPool } from '../src/game/bullets';
import { Compiler, scaleCount } from '../src/game/compile';
import { Rng } from '../src/core/rng';

const normal = new Compiler(DIFFICULTIES.normal, 1);
const spec = (def: Partial<BulletDef> = {}) => normal.bullet({ sprite: 'orb', color: 'red', speed: 60, ...def });

describe('BulletPool', () => {
  it('moves bullets by speed / 60 per frame', () => {
    const pool = new BulletPool(new Rng(1), 64);
    pool.spawn(100, 100, 0, 1, spec());
    pool.update(0, 0);
    expect(pool.x[0]).toBeCloseTo(101, 4);
    expect(pool.y[0]).toBeCloseTo(100, 4);
  });

  it('removes bullets that leave the field and keeps spawn order of the survivors', () => {
    const pool = new BulletPool(new Rng(1), 64);
    const s = spec();
    pool.spawn(-200, 50, 0, 0, s); // far outside, culled
    pool.spawn(10, 10, 0, 0, s); // survivor A
    pool.spawn(500, 50, 0, 0, s); // far outside, culled
    pool.spawn(20, 20, 0, 0, s); // survivor B
    pool.update(0, 0);
    expect(pool.count).toBe(2);
    expect([pool.x[0], pool.x[1]]).toEqual([10, 20]);
  });

  it('accelerates, clamps speed and curves', () => {
    const pool = new BulletPool(new Rng(1), 8);
    const accel = spec({ speed: 0, accel: 60 * 60, maxSpeed: 120 }); // +1 px/frame^2, cap 2 px/frame
    pool.spawn(100, 100, 0, 0, accel);
    for (let i = 0; i < 10; i++) pool.update(0, 0);
    expect(pool.spd[0]).toBeCloseTo(2, 4);

    const curve = spec({ speed: 60, curve: 90 }); // 90 deg/s => 1.5 deg per frame
    const p2 = new BulletPool(new Rng(1), 8);
    p2.spawn(100, 100, 0, 1, curve);
    for (let i = 0; i < 60; i++) p2.update(0, 0);
    expect(p2.ang[0]).toBeCloseTo(Math.PI / 2, 2);
  });

  it('decelerating bullets stop instead of reversing', () => {
    const pool = new BulletPool(new Rng(1), 8);
    pool.spawn(100, 100, 0, 2, spec({ speed: 120, accel: -240 }));
    for (let i = 0; i < 300; i++) pool.update(0, 0);
    expect(pool.spd[0]).toBe(0);
  });

  it('splits into children mid-flight and removes the parent', () => {
    const pool = new BulletPool(new Rng(1), 64);
    const child: BulletDef = { sprite: 'pellet', color: 'white', speed: 90 };
    const parent = spec({ events: [{ at: 0.5, do: 'split', count: 8, bullet: child }] });
    pool.spawn(190, 200, Math.PI / 2, 0, parent);
    for (let i = 0; i < 29; i++) pool.update(0, 0);
    expect(pool.count).toBe(1);
    pool.update(0, 0); // frame 30: the event fires
    expect(pool.count).toBe(8);
    expect(pool.spec[0]?.size).toBeLessThan(10); // children are pellets
  });

  it('turns towards the player on a turn/aim event and changes speed', () => {
    const pool = new BulletPool(new Rng(1), 8);
    const s = spec({
      speed: 120,
      events: [
        { at: 0.1, do: 'turn', aim: true },
        { at: 0.1, do: 'speed', value: 180 },
      ],
    });
    pool.spawn(100, 100, 0, 2, s); // heading right
    for (let i = 0; i < 7; i++) pool.update(110, 300); // player straight below the bullet's position at turn time
    expect(pool.ang[0]).toBeCloseTo(Math.PI / 2, 3);
    expect(pool.spd[0]).toBeCloseTo(3, 4);
  });

  it('morphs into a different bullet type', () => {
    const pool = new BulletPool(new Rng(1), 8);
    const next: BulletDef = { sprite: 'big', color: 'blue', speed: 30 };
    pool.spawn(100, 100, 0, 1, spec({ events: [{ at: 0.05, do: 'morph', bullet: next }] }));
    for (let i = 0; i < 4; i++) pool.update(0, 0);
    expect(pool.spec[0]?.kind).toBe(2); // 'big'
    expect(pool.rad[0]).toBeGreaterThan(5);
  });

  it('bounces off walls the configured number of times', () => {
    const pool = new BulletPool(new Rng(1), 8);
    pool.spawn(380, 100, 0, 2, spec({ bounce: 1 }));
    for (let i = 0; i < 6; i++) pool.update(0, 0);
    expect(pool.vx[0]).toBeLessThan(0);
    expect(pool.bnc[0]).toBe(0);
  });

  it('detects hits and grazes with circle tests, once per bullet', () => {
    const pool = new BulletPool(new Rng(1), 8);
    const s = spec();
    pool.spawn(100, 100, 0, 0, s);
    expect(pool.testPlayer(100, 140, 2, 15)).toBe(-1);
    expect(pool.grazed).toBe(0);
    expect(pool.testPlayer(100, 117, 2, 15)).toBe(-1); // 17 px away: inside graze radius + bullet radius
    expect(pool.grazed).toBe(1);
    expect(pool.testPlayer(100, 117, 2, 15)).toBe(-1);
    expect(pool.grazed).toBe(0); // already grazed
    expect(pool.testPlayer(100, 104, 2, 15)).toBe(0); // 4 px away: direct hit
  });

  it('clears by radius and in total', () => {
    const pool = new BulletPool(new Rng(1), 16);
    const s = spec();
    pool.spawn(10, 10, 0, 0, s);
    pool.spawn(200, 200, 0, 0, s);
    pool.spawn(205, 205, 0, 0, s);
    expect(pool.clearRadius(200, 200, 20)).toBe(2);
    expect(pool.count).toBe(1);
    expect(pool.clearAll()).toBe(1);
    expect(pool.count).toBe(0);
  });

  it('drops spawns instead of overflowing when full', () => {
    const pool = new BulletPool(new Rng(1), 4);
    const s = spec();
    for (let i = 0; i < 10; i++) pool.spawn(10, 10, 0, 0, s);
    expect(pool.count).toBe(4);
    expect(pool.overflow).toBe(6);
  });

  it('simulates 3000 bullets well within the frame budget', () => {
    const pool = new BulletPool(new Rng(7), 6144);
    const s = spec({ speed: 40, curve: 20, accel: 5 });
    for (let i = 0; i < 3000; i++) pool.spawn(192 + (i % 40) - 20, 100 + ((i / 40) | 0), (i * 0.37) % 6.28, 0.5 + (i % 7) * 0.1, s);
    const t0 = performance.now();
    const frames = 120;
    let hits = 0;
    for (let f = 0; f < frames; f++) {
      pool.update(192, 400);
      if (pool.testPlayer(192, 400, 2, 15) >= 0) hits++;
      while (pool.count < 3000) pool.spawn(192, 150, (f * 0.5) % 6.28, 1.2, s);
    }
    const perFrame = (performance.now() - t0) / frames;
    expect(pool.count).toBeGreaterThanOrEqual(3000);
    expect(hits).toBeGreaterThanOrEqual(0);
    // generous bound so slow CI machines pass; real cost is far lower (a 16.6 ms frame budget)
    expect(perFrame).toBeLessThan(8);
  });
});

describe('difficulty scaling', () => {
  it('keeps the parity of fans so an aimed fan keeps (or lacks) its centre bullet', () => {
    for (const d of [0.6, 1, 1.3, 1.6]) {
      expect(scaleCount(3, d, true) % 2).toBe(1);
      expect(scaleCount(5, d, true) % 2).toBe(1);
      expect(scaleCount(4, d, true) % 2).toBe(0);
    }
  });

  it('never scales single shots', () => {
    expect(scaleCount(1, 1.6, false)).toBe(1);
    expect(scaleCount(1, 0.6, true)).toBe(1);
  });

  it('applies speed multipliers except to per-difficulty tuples', () => {
    const lunatic = new Compiler(DIFFICULTIES.lunatic, 3);
    const plain = lunatic.bullet({ sprite: 'orb', color: 'red', speed: 120 });
    const tiered = lunatic.bullet({ sprite: 'orb', color: 'red', speed: [60, 120, 180, 240] });
    expect(plain.speed).toBeCloseTo((120 * DIFFICULTIES.lunatic.speed) / 60, 5);
    expect(tiered.speed).toBeCloseTo(240 / 60, 5);
  });
});
