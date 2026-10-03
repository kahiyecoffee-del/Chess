import { describe, expect, it } from 'vitest';
import { LivesState, addLives, fullLives, loseLife, msToNextLife, settleLives, starsFor } from '../src/core/economy';
import { migrate } from '../src/game/save';

const cfg = { max: 5, regenMinutes: 30 };
const MIN = 60_000;

describe('lives', () => {
  it('starts full and loses lives', () => {
    let s = fullLives(cfg);
    s = loseLife(s, 0, cfg);
    expect(s).toEqual({ lives: 4, regenStart: 0 });
    expect(msToNextLife(s, 10 * MIN, cfg)).toBe(20 * MIN);
  });

  it('regenerates one life every 30 minutes up to the max', () => {
    let s = fullLives(cfg);
    for (let i = 0; i < 5; i++) s = loseLife(s, 0, cfg);
    expect(s.lives).toBe(0);
    expect(settleLives(s, 29 * MIN, cfg).lives).toBe(0);
    expect(settleLives(s, 30 * MIN, cfg).lives).toBe(1);
    expect(settleLives(s, 95 * MIN, cfg)).toEqual({ lives: 3, regenStart: 90 * MIN });
    expect(settleLives(s, 24 * 60 * MIN, cfg)).toEqual({ lives: 5, regenStart: null });
  });

  it('keeps the running timer when another life is lost', () => {
    let s = loseLife(fullLives(cfg), 0, cfg);
    s = loseLife(s, 10 * MIN, cfg);
    expect(s).toEqual({ lives: 3, regenStart: 0 });
    expect(settleLives(s, 30 * MIN, cfg).lives).toBe(4);
  });

  it('cannot go below zero', () => {
    let s: LivesState = { lives: 0, regenStart: 0 };
    s = loseLife(s, 1, cfg);
    expect(s.lives).toBe(0);
  });

  it('rewarded life never exceeds the max', () => {
    const s = addLives(loseLife(fullLives(cfg), 0, cfg), 3, 1, cfg);
    expect(s).toEqual({ lives: 5, regenStart: null });
  });

  it('handles a clock moved backwards', () => {
    const s = settleLives({ lives: 2, regenStart: 100 * MIN }, 50 * MIN, cfg);
    expect(s).toEqual({ lives: 2, regenStart: 50 * MIN });
  });
});

describe('stars', () => {
  it('follows the brief rule', () => {
    expect(starsFor(0)).toBe(3);
    expect(starsFor(1)).toBe(2);
    expect(starsFor(0, 1)).toBe(2);
    expect(starsFor(2)).toBe(1);
    expect(starsFor(5)).toBe(1);
  });
});

describe('save migration', () => {
  it('creates a fresh save', () => {
    expect(migrate(null, null)).toEqual({ version: 1, lives: { lives: 5, regenStart: null }, unlocked: 1, stars: [] });
  });
  it('migrates the v0 last-level key', () => {
    expect(migrate(null, '12').unlocked).toBe(12);
  });
  it('sanitises a v1 save', () => {
    const s = migrate({ version: 1, lives: { lives: 99, regenStart: null }, unlocked: 7.5, stars: [3, 9, 'x'] }, null);
    expect(s.lives.lives).toBe(5);
    expect(s.unlocked).toBe(7);
    expect(s.stars).toEqual([3, 3, 0]);
  });
  it('ignores garbage', () => {
    expect(migrate('nope', 'abc').unlocked).toBe(1);
  });
});
