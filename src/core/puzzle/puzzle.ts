import { Color, FenError, Position } from '../chess';

/**
 * Bir bulmaca. `fen` rakibin ilk hamlesinden ÖNCEKİ pozisyondur.
 * `moves[0]` rakibin hamlesi (animasyonla oynanır); oyuncu `moves[1]`den itibaren çözer,
 * rakip cevapları (`moves[3]`, `moves[5]`…) otomatik oynanır.
 */
export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
}

/** Paketlerde kullanılan sıkıştırılmış satır: [id, fen, "m1 m2 …", rating, "tema1 tema2"]. */
export type PuzzleRow = [string, string, string, number, string];

export interface PuzzlePack {
  version: 1;
  pack: number;
  puzzles: PuzzleRow[];
}

export const fromRow = ([id, fen, moves, rating, themes]: PuzzleRow): Puzzle => ({
  id, fen, moves: moves.split(' '), rating, themes: themes ? themes.split(' ') : [],
});

export const toRow = (p: Puzzle): PuzzleRow => [p.id, p.fen, p.moves.join(' '), p.rating, p.themes.join(' ')];

export const isMateTheme = (themes: string[]): boolean => themes.some((t) => t.startsWith('mate'));

/** Bulmacayı kural motoruyla doğrular. Geçerliyse null, değilse hata açıklaması döner. */
export function validatePuzzle(p: Puzzle): string | null {
  if (p.moves.length < 2 || p.moves.length % 2 !== 0) return 'move count must be even and >= 2';
  let pos: Position;
  try {
    pos = Position.fromFen(p.fen);
  } catch (e) {
    return e instanceof FenError ? `invalid FEN: ${e.message}` : String(e);
  }
  for (const [i, uci] of p.moves.entries()) {
    if (pos.parseUci(uci) === null) return `illegal move #${i} ${uci}`;
    pos.playUci(uci);
  }
  if (isMateTheme(p.themes) && !pos.isCheckmate()) return 'mate theme but final position is not checkmate';
  return null;
}

/** Oyuncunun rengi: FEN'deki sıradaki tarafın tersi (ilk hamleyi rakip yapar). */
export function playerColorOf(p: Puzzle): Color {
  return p.fen.split(' ')[1] === 'w' ? 1 : 0;
}
