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
  it('never gets easier from one world to the next', () => {
    const themes = ['mateIn1', 'fork', 'pin', 'hangingPiece'];
    const pool: Puzzle[] = Array.from({ length: 5000 }, (_, i) => ({
      id: `p${i}`, fen: '', moves: [], rating: Math.round(400 + ((i * 7919) % 2200)), themes: [themes[i % 4]],
    }));
    const levels = orderByDifficulty(pool, 2000);
    expect(levels).toHaveLength(2000);
    const avg = worldAverages(levels, 100);
    for (let i = 1; i < avg.length; i++) expect(avg[i]).toBeGreaterThan(avg[i - 1]);
    // Orantılı artış: ilk dünya en kolay uca, son dünya en zor uca yakın.
    expect(avg[0]).toBeLessThan(560);
    expect(avg[avg.length - 1]).toBeGreaterThan(2400);
  });
});
