import { describe, expect, it } from 'vitest';
import { FenError, Position, START_FEN, moveToUci } from '../src/core/chess';

const uciList = (fen: string) => Position.fromFen(fen).legalMoves().map(moveToUci).sort();

describe('FEN', () => {
  it('round-trips', () => {
    const fens = [
      START_FEN,
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
      'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
      '8/8/8/8/8/8/6k1/4K3 b - - 12 60',
    ];
    for (const f of fens) expect(Position.fromFen(f).toFen()).toBe(f);
  });

  it.each([
    ['too few ranks', 'rnbqkbnr/pppppppp/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'],
    ['bad rank length', 'rnbqkbnr/ppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'],
    ['two white kings', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKKBNR w - - 0 1'],
    ['no black king', '8/8/8/8/8/8/8/4K3 w - - 0 1'],
    ['pawn on rank 8', 'P3k3/8/8/8/8/8/8/4K3 w - - 0 1'],
    ['bad side', '4k3/8/8/8/8/8/8/4K3 x - - 0 1'],
    ['bad piece', '4k3/8/8/8/8/8/8/4K2X w - - 0 1'],
    ['opponent in check', 'R3k3/8/8/8/8/8/8/4K3 w - - 0 1'],
    ['missing fields', '4k3/8/8/8/8/8/8/4K3 w'],
  ])('rejects %s', (_name, fen) => {
    expect(() => Position.fromFen(fen)).toThrow(FenError);
  });

  it('drops castling rights that do not match the board', () => {
    expect(Position.fromFen('4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1').toFen()).toBe('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
  });
});

describe('special moves', () => {
  it('en passant is generated and executed', () => {
    const pos = Position.fromFen('rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3');
    expect(pos.legalMoves().map(moveToUci)).toContain('e5f6');
    pos.playUci('e5f6');
    expect(pos.toFen()).toBe('rnbqkbnr/ppp1p1pp/5P2/3p4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3');
  });

  it('en passant that exposes the king is illegal', () => {
    // Beyaz şah ve siyah kale aynı yatayda; ep sonrası şah açılır.
    expect(uciList('8/8/8/K2pP2r/8/8/8/7k w - d6 0 1')).not.toContain('e5d6');
  });

  it('castling both sides', () => {
    const moves = uciList('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(moves).toContain('e1g1');
    expect(moves).toContain('e1c1');
    const pos = Position.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    pos.playUci('e1c1');
    expect(pos.toFen()).toBe('r3k2r/8/8/8/8/8/8/2KR3R b kq - 1 1');
  });

  it('cannot castle out of, through or into check', () => {
    expect(uciList('4k3/4r3/8/8/8/8/8/R3K2R w KQ - 0 1')).not.toContain('e1g1');
    expect(uciList('4k3/5r2/8/8/8/8/8/R3K2R w KQ - 0 1')).not.toContain('e1g1');
    expect(uciList('4k3/6r1/8/8/8/8/8/R3K2R w KQ - 0 1')).not.toContain('e1g1');
    // b1 saldırı altında olsa da uzun rok yasal (şah oradan geçmiyor)
    expect(uciList('4k3/1r6/8/8/8/8/8/R3K2R w KQ - 0 1')).toContain('e1c1');
  });

  it('moving or capturing a rook removes castling rights', () => {
    const pos = Position.fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    pos.playUci('a1a8');
    expect(pos.toFen()).toBe('R3k2r/8/8/8/8/8/8/4K2R b Kk - 0 1');
  });

  it('promotion generates four pieces and uses UCI suffix', () => {
    const moves = uciList('8/P7/8/8/8/8/8/k6K w - - 0 1');
    for (const p of ['q', 'r', 'b', 'n']) expect(moves).toContain(`a7a8${p}`);
    const pos = Position.fromFen('8/P7/8/8/8/8/8/k6K w - - 0 1');
    pos.playUci('a7a8n');
    expect(pos.toFen()).toBe('N7/8/8/8/8/8/8/k6K b - - 0 1');
  });

  it('parseUci rejects illegal moves', () => {
    const pos = Position.fromFen(START_FEN);
    expect(pos.parseUci('e2e5')).toBeNull();
    expect(pos.parseUci('zz')).toBeNull();
    expect(() => pos.playUci('e1e2')).toThrow();
  });
});

describe('game end', () => {
  it('detects checkmate', () => {
    const pos = Position.fromFen(START_FEN);
    for (const m of ['f2f3', 'e7e5', 'g2g4', 'd8h4']) pos.playUci(m);
    expect(pos.isCheckmate()).toBe(true);
    expect(pos.legalMoves()).toHaveLength(0);
  });

  it('detects stalemate', () => {
    const pos = Position.fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(pos.isStalemate()).toBe(true);
    expect(pos.isCheckmate()).toBe(false);
  });

  it('pinned piece cannot move off the pin line', () => {
    expect(uciList('4k3/4r3/8/8/8/8/4N3/4K3 w - - 0 1').filter((m) => m.startsWith('e2'))).toEqual([]);
  });

  it('insufficient material', () => {
    expect(Position.fromFen('4k3/8/8/8/8/8/8/4KB2 w - - 0 1').isInsufficientMaterial()).toBe(true);
    expect(Position.fromFen('4k3/8/8/8/8/8/8/4KR2 w - - 0 1').isInsufficientMaterial()).toBe(false);
  });
});
