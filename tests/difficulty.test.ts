import { describe, expect, it } from 'vitest';
import { Puzzle } from '../src/core/puzzle';
import { difficultyRating, measure } from '../tools/puzzlegen/difficulty';
import { orderByDifficulty, worldAverages } from '../tools/puzzlegen/curve';

const mateIn1: Puzzle = { id: 'a', fen: '6k1/8/6K1/8/8/8/8/RR6 b - - 0 1', moves: ['g8h8', 'b1b8'], rating: 0, themes: ['mateIn1'] };
const mateIn2: Puzzle = {
  id: 'b', fen: '4k1nr/2N1P2n/1p1P4/7p/pP3P1p/7N/P5RP/2R1K3 b - - 1 36',
  moves: ['e8f7', 'e7e8q', 'f7f6', 'e8e6'], rating: 0, themes: ['mateIn2'],
};

describe('measured difficulty', () => {
  it('rates a longer, deeper puzzle above a simple mate in 1', () => {
    const easy = measure(mateIn1);
    const hard = measure(mateIn2);
    expect(easy.length).toBe(1);
    expect(hard.length).toBe(2);
    expect(easy.findDepth).toBeLessThanOrEqual(hard.findDepth);
    expect(difficultyRating(hard)).toBeGreaterThan(difficultyRating(easy));
  });
});

describe('difficulty curve', () => {
  const themes = ['mateIn1', 'fork', 'pin', 'hangingPiece'];
  // Gerçek içerik gibi çarpık bir dağılım: çok sayıda kolay, az sayıda zor bulmaca.
  const pool: Puzzle[] = Array.from({ length: 20000 }, (_, i) => ({
    id: `p${i}`, fen: '', moves: [], rating: Math.round(400 + 1800 * Math.pow((i * 7919 % 20000) / 20000, 3)),
    themes: [themes[i % 4]],
  }));

  it('rises in proportion to the level number', () => {
    const levels = orderByDifficulty(pool, 20000);
    const avg = worldAverages(levels, 100);
    expect(avg.length).toBeGreaterThan(20);
    for (let i = 1; i < avg.length; i++) expect(avg[i]).toBeGreaterThan(avg[i - 1]);
    // Doğrusal rampa: her dünya bir öncekinden yaklaşık eşit miktarda zor (rampa bölümünde).
    const steps = avg.slice(1, 20).map((a, i) => a - avg[i]);
    for (const s of steps) expect(s).toBeGreaterThan(15);
    for (const s of steps) expect(s).toBeLessThan(40);
  });

  it('keeps the excess easy puzzles out of the adventure path', () => {
    const levels = orderByDifficulty(pool, 20000);
    expect(levels.length).toBeLessThan(pool.length);
    expect(new Set(levels.map((p) => p.id)).size).toBe(levels.length);
  });
});
