import { describe, expect, it } from 'vitest';
import { Position, moveToUci } from '../src/core/chess';
import { canForceMate, matingMoves, shortestMate } from '../src/core/analysis';
import { Puzzle, PuzzleSession, fromRow, toRow, validatePuzzle } from '../src/core/puzzle';

// Siyah g6'yı oynar, beyaz Qxf7# (Scholar mat benzeri) — elle kurulmuş örnek.
const mateIn1: Puzzle = {
  id: 't1',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
  moves: ['g7g6', 'f3f7'],
  rating: 600,
  themes: ['mateIn1'],
};

describe('validatePuzzle', () => {
  it('accepts a valid puzzle', () => {
    expect(validatePuzzle(mateIn1)).toBeNull();
  });
  it('rejects odd move counts, illegal moves and bad FEN', () => {
    expect(validatePuzzle({ ...mateIn1, moves: ['g7g6'] })).toMatch(/even/);
    expect(validatePuzzle({ ...mateIn1, moves: ['g7g6', 'f3f8'] })).toMatch(/illegal/);
    expect(validatePuzzle({ ...mateIn1, fen: 'nonsense w - -' })).toMatch(/FEN/);
  });
  it('rejects a mate theme that does not end in mate', () => {
    expect(validatePuzzle({ ...mateIn1, moves: ['g7g6', 'f3f6'] })).toMatch(/not checkmate/);
  });
  it('row round-trip', () => {
    expect(fromRow(toRow(mateIn1))).toEqual(mateIn1);
  });
});

describe('PuzzleSession', () => {
  it('plays opening, rejects wrong move, accepts solution', () => {
    const s = new PuzzleSession(mateIn1);
    expect(s.playerColor).toBe(0);
    expect(s.playOpening()).toBe('g7g6');
    expect(s.tryMove('f3f6')).toEqual({ kind: 'wrong' });
    expect(s.mistakes).toBe(1);
    expect(s.tryMove('f3f7')).toEqual({ kind: 'solved' });
    expect(s.position.isCheckmate()).toBe(true);
  });

  it('accepts an alternative mate on the final move', () => {
    // Siyah Şh8 oynar; hem Ra8# hem Rb8# mat (beyaz şah g6, g7/h7'yi tutuyor).
    const p: Puzzle = {
      id: 't2', fen: '6k1/8/6K1/8/8/8/8/RR6 b - - 0 1', moves: ['g8h8', 'b1b8'], rating: 500, themes: ['mateIn1'],
    };
    expect(validatePuzzle(p)).toBeNull();
    const s = new PuzzleSession(p);
    s.playOpening();
    expect(s.tryMove('a1a2')).toEqual({ kind: 'wrong' });
    expect(s.tryMove('a1a8')).toEqual({ kind: 'solved' });
  });

  it('auto-plays opponent replies in multi-move puzzles', () => {
    // Mat-in-2 (merdiven matı): Rb7+ / Ra8#
    const p: Puzzle = {
      id: 't3', fen: '6k1/8/8/8/8/8/R7/1R4K1 b - - 0 1', moves: ['g8h8', 'b1b7', 'h8g8', 'a2a8'],
      rating: 900, themes: ['mateIn2'],
    };
    expect(validatePuzzle(p)).toBeNull();
    const s = new PuzzleSession(p);
    s.playOpening();
    expect(s.tryMove('b1b7')).toEqual({ kind: 'correct', reply: 'h8g8' });
    expect(s.progress).toEqual({ done: 1, total: 2 });
    expect(s.tryMove('a2a8')).toEqual({ kind: 'solved' });
  });
});

describe('mate search', () => {
  it('finds mate in 1 and 2', () => {
    const pos = Position.fromFen('7k/8/8/8/8/8/R7/1R4K1 w - - 0 1');
    expect(shortestMate(pos, 3)).toBe(2);
    expect(canForceMate(pos, 1)).toBe(false);
    const m1 = Position.fromFen('7k/1R6/8/8/8/8/R7/6K1 w - - 0 1');
    expect(matingMoves(m1, 1).map(moveToUci)).toEqual(['a2a8']);
  });
  it('mating move list at depth 2 contains the ladder move', () => {
    const pos = Position.fromFen('7k/8/8/8/8/8/R7/1R4K1 w - - 0 1');
    const moves = matingMoves(pos, 2).map(moveToUci);
    expect(moves).toContain('b1b7');
    expect(moves).toContain('a2a7');
    expect(moves).not.toContain('g1f1');
  });
});
