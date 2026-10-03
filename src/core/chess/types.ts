// Temel satranç tipleri ve sabitleri.
// Kare indeksi: 0 = a1, 7 = h1, 56 = a8, 63 = h8.
// Taş kodu: tip | (renk << 3). Beyaz 1..6, siyah 9..14, boş 0.

export type Color = 0 | 1;
export const WHITE: Color = 0;
export const BLACK: Color = 1;

export const EMPTY = 0;
export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

export const makePiece = (type: number, color: Color): number => type | (color << 3);
export const pieceType = (piece: number): number => piece & 7;
export const pieceColor = (piece: number): Color => (piece >> 3) as Color;

export const fileOf = (sq: number): number => sq & 7;
export const rankOf = (sq: number): number => sq >> 3;
export const squareAt = (file: number, rank: number): number => rank * 8 + file;

export const squareName = (sq: number): string =>
  String.fromCharCode(97 + fileOf(sq)) + String(rankOf(sq) + 1);

export function parseSquare(name: string): number {
  if (!/^[a-h][1-8]$/.test(name)) return -1;
  return squareAt(name.charCodeAt(0) - 97, name.charCodeAt(1) - 49);
}

// Rok hakları bit maskesi.
export const CASTLE_WK = 1;
export const CASTLE_WQ = 2;
export const CASTLE_BK = 4;
export const CASTLE_BQ = 8;

// Hamle tek bir tamsayıda kodlanır: from | to<<6 | promo<<12 | flags<<15.
export const FLAG_CAPTURE = 1;
export const FLAG_EP = 2;
export const FLAG_CASTLE = 4;
export const FLAG_DOUBLE = 8;

export type Move = number;

export const encodeMove = (from: number, to: number, promo = 0, flags = 0): Move =>
  from | (to << 6) | (promo << 12) | (flags << 15);
export const moveFrom = (m: Move): number => m & 63;
export const moveTo = (m: Move): number => (m >> 6) & 63;
export const movePromo = (m: Move): number => (m >> 12) & 7;
export const moveFlags = (m: Move): number => (m >> 15) & 15;
export const isCapture = (m: Move): boolean => (moveFlags(m) & FLAG_CAPTURE) !== 0;

const PROMO_CHARS = ['', '', 'n', 'b', 'r', 'q'];

export function moveToUci(m: Move): string {
  const promo = movePromo(m);
  return squareName(moveFrom(m)) + squareName(moveTo(m)) + (promo ? PROMO_CHARS[promo] : '');
}

export const PIECE_CHARS = ' PNBRQK  pnbrqk';
