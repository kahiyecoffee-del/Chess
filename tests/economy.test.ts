import { describe, expect, it } from 'vitest';
import { LivesState, addLives, fullLives, loseLife, msToNextLife, settleLives, starsFor } from '../src/core/economy';
import { freshSave, mergeSaves, migrate } from '../src/game/save';

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
    expect(migrate(null, null)).toEqual({
      version: 2, lives: { lives: 5, regenStart: null }, unlocked: 1, stars: [], settings: { music: true, language: null },
      interstitial: { sinceLast: 0, lastShownAt: 0 }, updatedAt: 0,
    });
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
  it('migrates v1 to v2 with default settings', () => {
    const s = migrate({ version: 1, lives: { lives: 2, regenStart: 5 }, unlocked: 4, stars: [3] }, null);
    expect(s.version).toBe(2);
    expect(s.settings).toEqual({ music: true, language: null });
    expect(s.unlocked).toBe(4);
  });
  it('keeps and sanitises the interstitial counter', () => {
    const s = migrate({ version: 2, lives: { lives: 5, regenStart: null }, unlocked: 1, stars: [], interstitial: { sinceLast: 3.7, lastShownAt: -5 } }, null);
    expect(s.interstitial).toEqual({ sinceLast: 3, lastShownAt: 0 });
  });
  it('keeps v2 settings', () => {
    const s = migrate({ version: 2, lives: { lives: 5, regenStart: null }, unlocked: 1, stars: [], settings: { music: false, language: 'tr' } }, null);
    expect(s.settings).toEqual({ music: false, language: 'tr' });
  });
  it('ignores garbage', () => {
    expect(migrate('nope', 'abc').unlocked).toBe(1);
  });
});

import { freshInterstitial, markInterstitialShown, recordLevelCompleted, shouldShowInterstitial } from '../src/core/economy';

describe('interstitial ads', () => {
  const cfg = { enabled: true, everyLevels: 5, minSecondsBetween: 90, mockSeconds: 5 };
  it('shows after every 5 completed levels', () => {
    let s = freshInterstitial();
    for (let i = 1; i <= 4; i++) {
      s = recordLevelCompleted(s);
      expect(shouldShowInterstitial(s, 1_000_000, cfg)).toBe(false);
    }
    s = recordLevelCompleted(s);
    expect(shouldShowInterstitial(s, 1_000_000, cfg)).toBe(true);
    s = markInterstitialShown(1_000_000);
    expect(s.sinceLast).toBe(0);
  });
  it('waits at least 90 seconds between ads', () => {
    let s = markInterstitialShown(0);
    for (let i = 0; i < 5; i++) s = recordLevelCompleted(s);
    expect(shouldShowInterstitial(s, 60_000, cfg)).toBe(false);
    expect(shouldShowInterstitial(s, 90_000, cfg)).toBe(true);
  });
  it('can be switched off (config or no-ads purchase)', () => {
    let s = freshInterstitial();
    for (let i = 0; i < 5; i++) s = recordLevelCompleted(s);
    expect(shouldShowInterstitial(s, 1e9, { ...cfg, enabled: false })).toBe(false);
    expect(shouldShowInterstitial(s, 1e9, cfg, true)).toBe(false);
  });
});

describe('save merge (device + cloud)', () => {
  it('never loses progress and takes settings from the newer save', () => {
    const device = { ...freshSave(), unlocked: 12, stars: [3, 1, 2], updatedAt: 100, settings: { music: false, language: 'tr' } };
    const cloud = { ...freshSave(), unlocked: 9, stars: [2, 3, 2, 3], updatedAt: 200, settings: { music: true, language: 'de' } };
    const m = mergeSaves(device, cloud);
    expect(m.unlocked).toBe(12);
    expect(m.stars).toEqual([3, 3, 2, 3]);
    expect(m.settings).toEqual({ music: true, language: 'de' });
    expect(m.updatedAt).toBe(200);
  });
  it('is symmetric for progress', () => {
    const a = { ...freshSave(), unlocked: 5, stars: [1], updatedAt: 1 };
    const b = { ...freshSave(), unlocked: 7, stars: [0, 2], updatedAt: 2 };
    expect(mergeSaves(a, b).unlocked).toBe(mergeSaves(b, a).unlocked);
    expect(mergeSaves(a, b).stars).toEqual(mergeSaves(b, a).stars);
  });
});
