import { describe, expect, it } from 'vitest';
import { Position } from '../src/core/chess';
import { Searcher } from '../src/core/analysis';
import { PuzzleSession, toRow, validatePuzzle } from '../src/core/puzzle';
import { findMate, findTactic } from '../tools/puzzlegen/detect';
import { detectThemes } from '../tools/puzzlegen/themes';
import { LevelLibrary } from '../src/game/levels';

describe('puzzle detection', () => {
  it('rejects a mate in 2 that has several winning first moves', () => {
    // Merdiven matı: Rb7 de Ra7 de kazanır. Tek çözümlü olmadığı için bulmaca değildir.
    expect(findMate(Position.fromFen('7k/8/8/8/8/8/R7/1R4K1 w - - 0 1'), 3)).toBeNull();
  });

  it('reproduces a generated mate in 2 (promotion then mate)', () => {
    const p = {
      id: '02smyy0', fen: '4k1nr/2N1P2n/1p1P4/7p/pP3P1p/7N/P5RP/2R1K3 b - - 1 36',
      moves: ['e8f7', 'e7e8q', 'f7f6', 'e8e6'], rating: 1266, themes: ['mate', 'mateIn2'],
    };
    expect(validatePuzzle(p)).toBeNull();
    const start = Position.fromFen(p.fen);
    start.playUci(p.moves[0]);
    const found = findMate(start, 3);
    expect(found?.mateIn).toBe(2);
    expect(found?.line[0]).toBe('e7e8q');
  });

  it('finds a knight fork that wins the rook', () => {
    // Siyah h6 oynar; Nc7+ şahı ve kaleyi çatallar.
    const prev = Position.fromFen('r3k3/7p/8/1N6/8/8/8/4K3 b - - 0 1');
    const start = prev.clone();
    start.playUci('h7h6');
    const found = findTactic(start, prev, new Searcher());
    expect(found).not.toBeNull();
    expect(found!.line[0]).toBe('b5c7');
    const themes = detectThemes({ start, line: found!.line, mateIn: 0 });
    expect(themes).toContain('fork');
  });

  it('does not treat a simple recapture as a puzzle', () => {
    // Siyah b5'teki atı alır; beyaz geri alır. Malzeme dengelenir, kazanç yok.
    const prev = Position.fromFen('4k3/8/2p5/1N6/8/8/8/1R2K3 b - - 0 1');
    const start = prev.clone();
    start.playUci('c6b5');
    expect(findTactic(start, prev, new Searcher())).toBeNull();
  });
});

describe('LevelLibrary', () => {
  it('skips invalid puzzles and records why', () => {
    const good = { id: 'ok', fen: '6k1/8/6K1/8/8/8/8/RR6 b - - 0 1', moves: ['g8h8', 'b1b8'], rating: 500, themes: ['mateIn1'] };
    expect(validatePuzzle(good)).toBeNull();
    const bad = { ...good, id: 'bad', moves: ['g8h8', 'b1b9'] };
    const lib = new LevelLibrary();
    const warn = console.warn;
    console.warn = () => {};
    lib.addPack({ version: 1, pack: 0, puzzles: [toRow(bad), toRow(good)] });
    console.warn = warn;
    expect(lib.count).toBe(1);
    expect(lib.level(1)?.id).toBe('ok');
    expect(lib.skipped).toEqual([{ id: 'bad', reason: 'illegal move #1 b1b9' }]);
    const s = new PuzzleSession(lib.level(1)!);
    s.playOpening();
    expect(s.tryMove('b1b8').kind).toBe('solved');
  });
});
