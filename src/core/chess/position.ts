import {
  BISHOP, BLACK, CASTLE_BK, CASTLE_BQ, CASTLE_WK, CASTLE_WQ, Color, EMPTY, FLAG_CAPTURE,
  FLAG_CASTLE, FLAG_DOUBLE, FLAG_EP, KING, KNIGHT, Move, PAWN, PIECE_CHARS, QUEEN, ROOK, WHITE,
  encodeMove, fileOf, makePiece, moveFlags, moveFrom, movePromo, moveTo, moveToUci, parseSquare,
  pieceColor, pieceType, rankOf, squareName,
} from './types';

// ---- Önceden hesaplanmış saldırı tabloları ----

function buildJumpTable(deltas: [number, number][]): number[][] {
  const table: number[][] = [];
  for (let sq = 0; sq < 64; sq++) {
    const list: number[] = [];
    for (const [df, dr] of deltas) {
      const f = fileOf(sq) + df;
      const r = rankOf(sq) + dr;
      if (f >= 0 && f < 8 && r >= 0 && r < 8) list.push(r * 8 + f);
    }
    table.push(list);
  }
  return table;
}

const KNIGHT_TARGETS = buildJumpTable([[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]);
const KING_TARGETS = buildJumpTable([[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]);

// RAYS[yön][kare] = o yöndeki karelerin sırası. 0-3 düz (kale), 4-7 çapraz (fil).
const DIRS: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
export const RAYS: number[][][] = DIRS.map(([df, dr]) => {
  const perSquare: number[][] = [];
  for (let sq = 0; sq < 64; sq++) {
    const ray: number[] = [];
    let f = fileOf(sq) + df;
    let r = rankOf(sq) + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      ray.push(r * 8 + f);
      f += df;
      r += dr;
    }
    perSquare.push(ray);
  }
  return perSquare;
});

// Bir karenin taşınması/alınması hangi rok haklarını iptal eder.
const CASTLE_KEEP = new Array<number>(64).fill(15);
CASTLE_KEEP[0] = 15 & ~CASTLE_WQ;
CASTLE_KEEP[4] = 15 & ~(CASTLE_WK | CASTLE_WQ);
CASTLE_KEEP[7] = 15 & ~CASTLE_WK;
CASTLE_KEEP[56] = 15 & ~CASTLE_BQ;
CASTLE_KEEP[60] = 15 & ~(CASTLE_BK | CASTLE_BQ);
CASTLE_KEEP[63] = 15 & ~CASTLE_BK;

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class FenError extends Error {}

export class Position {
  board = new Int8Array(64);
  side: Color = WHITE;
  castling = 0;
  ep = -1;
  halfmove = 0;
  fullmove = 1;
  kings: [number, number] = [-1, -1];
  // Geri alma bilgisi: alınan taş, rok hakları, ep, halfmove — sayı dizisinde paketli.
  private history: number[] = [];

  static fromFen(fen: string): Position {
    const pos = new Position();
    pos.loadFen(fen);
    return pos;
  }

  clone(): Position {
    const p = new Position();
    p.board.set(this.board);
    p.side = this.side;
    p.castling = this.castling;
    p.ep = this.ep;
    p.halfmove = this.halfmove;
    p.fullmove = this.fullmove;
    p.kings = [this.kings[0], this.kings[1]];
    return p;
  }

  loadFen(fen: string): void {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) throw new FenError(`FEN must have at least 4 fields: "${fen}"`);
    const [placement, side, castling, ep, half = '0', full = '1'] = parts;
    const ranks = placement.split('/');
    if (ranks.length !== 8) throw new FenError('FEN must have 8 ranks');
    this.board.fill(EMPTY);
    this.kings = [-1, -1];
    const kingCount = [0, 0];
    for (let i = 0; i < 8; i++) {
      const rank = 7 - i;
      let file = 0;
      for (const ch of ranks[i]) {
        if (ch >= '1' && ch <= '8') {
          file += Number(ch);
        } else {
          const idx = PIECE_CHARS.indexOf(ch);
          if (idx <= 0 || ch === ' ') throw new FenError(`Invalid piece char "${ch}"`);
          if (file > 7) throw new FenError('Rank overflow');
          const sq = rank * 8 + file;
          this.board[sq] = idx;
          if (pieceType(idx) === KING) {
            const c = pieceColor(idx);
            this.kings[c] = sq;
            kingCount[c]++;
          }
          if (pieceType(idx) === PAWN && (rank === 0 || rank === 7)) {
            throw new FenError('Pawn on first/last rank');
          }
          file++;
        }
      }
      if (file !== 8) throw new FenError(`Rank ${rank + 1} does not have 8 squares`);
    }
    if (kingCount[0] !== 1 || kingCount[1] !== 1) throw new FenError('Each side needs exactly one king');
    if (side !== 'w' && side !== 'b') throw new FenError('Invalid side to move');
    this.side = side === 'w' ? WHITE : BLACK;

    this.castling = 0;
    if (castling !== '-') {
      for (const ch of castling) {
        const bit = 'KQkq'.indexOf(ch);
        if (bit < 0) throw new FenError('Invalid castling field');
        this.castling |= 1 << bit;
      }
    }
    // Tahtayla tutarsız rok haklarını düşür.
    const wk = makePiece(KING, WHITE), wr = makePiece(ROOK, WHITE);
    const bk = makePiece(KING, BLACK), br = makePiece(ROOK, BLACK);
    if (this.board[4] !== wk || this.board[7] !== wr) this.castling &= ~CASTLE_WK;
    if (this.board[4] !== wk || this.board[0] !== wr) this.castling &= ~CASTLE_WQ;
    if (this.board[60] !== bk || this.board[63] !== br) this.castling &= ~CASTLE_BK;
    if (this.board[60] !== bk || this.board[56] !== br) this.castling &= ~CASTLE_BQ;

    this.ep = ep === '-' ? -1 : parseSquare(ep);
    if (ep !== '-' && this.ep < 0) throw new FenError('Invalid en passant square');
    this.halfmove = Number(half) || 0;
    this.fullmove = Number(full) || 1;
    this.history = [];

    if (this.isAttacked(this.kings[this.side ^ 1], this.side)) {
      throw new FenError('Side not to move is in check');
    }
  }

  toFen(): string {
    let out = '';
    for (let rank = 7; rank >= 0; rank--) {
      let empty = 0;
      for (let file = 0; file < 8; file++) {
        const p = this.board[rank * 8 + file];
        if (p === EMPTY) {
          empty++;
        } else {
          if (empty) out += empty;
          empty = 0;
          out += PIECE_CHARS[p];
        }
      }
      if (empty) out += empty;
      if (rank > 0) out += '/';
    }
    let castling = '';
    for (let bit = 0; bit < 4; bit++) if (this.castling & (1 << bit)) castling += 'KQkq'[bit];
    return [
      out, this.side === WHITE ? 'w' : 'b', castling || '-',
      this.ep >= 0 ? squareName(this.ep) : '-', this.halfmove, this.fullmove,
    ].join(' ');
  }

  // ---- Saldırı tespiti ----

  isAttacked(sq: number, by: Color): boolean {
    const b = this.board;
    const f = fileOf(sq);
    if (by === WHITE) {
      const wp = makePiece(PAWN, WHITE);
      if (f < 7 && sq >= 7 && b[sq - 7] === wp) return true;
      if (f > 0 && sq >= 9 && b[sq - 9] === wp) return true;
    } else {
      const bp = makePiece(PAWN, BLACK);
      if (f > 0 && sq + 7 < 64 && b[sq + 7] === bp) return true;
      if (f < 7 && sq + 9 < 64 && b[sq + 9] === bp) return true;
    }
    const knight = makePiece(KNIGHT, by);
    for (const t of KNIGHT_TARGETS[sq]) if (b[t] === knight) return true;
    const king = makePiece(KING, by);
    for (const t of KING_TARGETS[sq]) if (b[t] === king) return true;
    const rook = makePiece(ROOK, by), bishop = makePiece(BISHOP, by), queen = makePiece(QUEEN, by);
    for (let d = 0; d < 8; d++) {
      const slider = d < 4 ? rook : bishop;
      for (const t of RAYS[d][sq]) {
        const p = b[t];
        if (p === EMPTY) continue;
        if (p === slider || p === queen) return true;
        break;
      }
    }
    return false;
  }

  /** Verilen renkteki taşlardan `sq` karesine saldıranların kareleri. */
  attackersOf(sq: number, by: Color): number[] {
    const out: number[] = [];
    const b = this.board;
    for (let s = 0; s < 64; s++) {
      const p = b[s];
      if (p === EMPTY || pieceColor(p) !== by) continue;
      if (this.pieceAttacks(s, sq)) out.push(s);
    }
    return out;
  }

  /** `from` karesindeki taş `to` karesine saldırıyor mu (yasal olup olmadığına bakmadan). */
  pieceAttacks(from: number, to: number): boolean {
    const p = this.board[from];
    if (p === EMPTY || from === to) return false;
    const type = pieceType(p);
    const df = fileOf(to) - fileOf(from);
    const dr = rankOf(to) - rankOf(from);
    switch (type) {
      case PAWN: {
        const dir = pieceColor(p) === WHITE ? 1 : -1;
        return dr === dir && Math.abs(df) === 1;
      }
      case KNIGHT: return KNIGHT_TARGETS[from].includes(to);
      case KING: return KING_TARGETS[from].includes(to);
      default: {
        const straight = df === 0 || dr === 0;
        const diagonal = Math.abs(df) === Math.abs(dr);
        if (type === ROOK && !straight) return false;
        if (type === BISHOP && !diagonal) return false;
        if (type === QUEEN && !straight && !diagonal) return false;
        const sf = Math.sign(df), sr = Math.sign(dr);
        let s = from + sr * 8 + sf;
        while (s !== to) {
          if (this.board[s] !== EMPTY) return false;
          s += sr * 8 + sf;
        }
        return true;
      }
    }
  }

  inCheck(): boolean {
    return this.isAttacked(this.kings[this.side], (this.side ^ 1) as Color);
  }

  // ---- Hamle üretimi ----

  /** Sözde-yasal hamleler (kendi şahını açıkta bırakabilir). */
  pseudoMoves(capturesOnly = false): Move[] {
    const moves: Move[] = [];
    const b = this.board;
    const us = this.side;
    const them = (us ^ 1) as Color;
    for (let from = 0; from < 64; from++) {
      const p = b[from];
      if (p === EMPTY || pieceColor(p) !== us) continue;
      const type = pieceType(p);
      if (type === PAWN) {
        this.pawnMoves(from, moves, capturesOnly);
      } else if (type === KNIGHT || type === KING) {
        const targets = type === KNIGHT ? KNIGHT_TARGETS[from] : KING_TARGETS[from];
        for (const to of targets) {
          const t = b[to];
          if (t === EMPTY) {
            if (!capturesOnly) moves.push(encodeMove(from, to));
          } else if (pieceColor(t) === them) {
            moves.push(encodeMove(from, to, 0, FLAG_CAPTURE));
          }
        }
      } else {
        const dStart = type === BISHOP ? 4 : 0;
        const dEnd = type === ROOK ? 4 : 8;
        for (let d = dStart; d < dEnd; d++) {
          for (const to of RAYS[d][from]) {
            const t = b[to];
            if (t === EMPTY) {
              if (!capturesOnly) moves.push(encodeMove(from, to));
              continue;
            }
            if (pieceColor(t) === them) moves.push(encodeMove(from, to, 0, FLAG_CAPTURE));
            break;
          }
        }
      }
    }
    if (!capturesOnly) this.castleMoves(moves);
    return moves;
  }

  private pawnMoves(from: number, moves: Move[], capturesOnly: boolean): void {
    const b = this.board;
    const us = this.side;
    const dir = us === WHITE ? 8 : -8;
    const startRank = us === WHITE ? 1 : 6;
    const lastRank = us === WHITE ? 7 : 0;
    const f = fileOf(from);
    const push = (to: number, flags: number) => {
      if (rankOf(to) === lastRank) {
        for (const promo of [QUEEN, KNIGHT, ROOK, BISHOP]) moves.push(encodeMove(from, to, promo, flags));
      } else {
        moves.push(encodeMove(from, to, 0, flags));
      }
    };
    const one = from + dir;
    if (b[one] === EMPTY) {
      // Terfi her zaman üretilir (quiescence için de önemli).
      if (!capturesOnly || rankOf(one) === lastRank) push(one, 0);
      if (!capturesOnly && rankOf(from) === startRank && b[one + dir] === EMPTY) {
        moves.push(encodeMove(from, one + dir, 0, FLAG_DOUBLE));
      }
    }
    for (const df of [-1, 1]) {
      if (f + df < 0 || f + df > 7) continue;
      const to = one + df;
      const t = b[to];
      if (t !== EMPTY && pieceColor(t) !== us) push(to, FLAG_CAPTURE);
      else if (to === this.ep) moves.push(encodeMove(from, to, 0, FLAG_CAPTURE | FLAG_EP));
    }
  }

  private castleMoves(moves: Move[]): void {
    const b = this.board;
    const us = this.side;
    const them = (us ^ 1) as Color;
    const base = us === WHITE ? 0 : 56;
    const kBit = us === WHITE ? CASTLE_WK : CASTLE_BK;
    const qBit = us === WHITE ? CASTLE_WQ : CASTLE_BQ;
    if (!(this.castling & (kBit | qBit))) return;
    if (this.isAttacked(base + 4, them)) return;
    if (this.castling & kBit && b[base + 5] === EMPTY && b[base + 6] === EMPTY &&
        !this.isAttacked(base + 5, them) && !this.isAttacked(base + 6, them)) {
      moves.push(encodeMove(base + 4, base + 6, 0, FLAG_CASTLE));
    }
    if (this.castling & qBit && b[base + 1] === EMPTY && b[base + 2] === EMPTY && b[base + 3] === EMPTY &&
        !this.isAttacked(base + 3, them) && !this.isAttacked(base + 2, them)) {
      moves.push(encodeMove(base + 4, base + 2, 0, FLAG_CASTLE));
    }
  }

  legalMoves(capturesOnly = false): Move[] {
    const out: Move[] = [];
    const us = this.side;
    const them = (us ^ 1) as Color;
    for (const m of this.pseudoMoves(capturesOnly)) {
      this.makeMove(m);
      if (!this.isAttacked(this.kings[us], them)) out.push(m);
      this.unmakeMove(m);
    }
    return out;
  }

  hasLegalMove(): boolean {
    const us = this.side;
    const them = (us ^ 1) as Color;
    for (const m of this.pseudoMoves()) {
      this.makeMove(m);
      const ok = !this.isAttacked(this.kings[us], them);
      this.unmakeMove(m);
      if (ok) return true;
    }
    return false;
  }

  isCheckmate(): boolean {
    return this.inCheck() && !this.hasLegalMove();
  }

  isStalemate(): boolean {
    return !this.inCheck() && !this.hasLegalMove();
  }

  /** Yalnızca iki şah, ya da şah + tek hafif taş. */
  isInsufficientMaterial(): boolean {
    let minors = 0;
    for (let s = 0; s < 64; s++) {
      const t = pieceType(this.board[s]);
      if (t === EMPTY || t === KING) continue;
      if (t === KNIGHT || t === BISHOP) minors++;
      else return false;
    }
    return minors <= 1;
  }

  // ---- Hamle yapma / geri alma ----

  makeMove(m: Move): void {
    const b = this.board;
    const from = moveFrom(m), to = moveTo(m), promo = movePromo(m), flags = moveFlags(m);
    const piece = b[from];
    const us = this.side;
    let captured: number;
    if (flags & FLAG_EP) {
      const capSq = to + (us === WHITE ? -8 : 8);
      captured = b[capSq];
      b[capSq] = EMPTY;
    } else {
      captured = b[to];
    }
    this.history.push(captured | (this.castling << 4) | ((this.ep + 1) << 8) | (this.halfmove << 16));

    b[to] = promo ? makePiece(promo, us) : piece;
    b[from] = EMPTY;
    if (flags & FLAG_CASTLE) {
      if (to === from + 2) { b[from + 1] = b[from + 3]; b[from + 3] = EMPTY; }
      else { b[from - 1] = b[from - 4]; b[from - 4] = EMPTY; }
    }
    if (pieceType(piece) === KING) this.kings[us] = to;
    this.castling &= CASTLE_KEEP[from] & CASTLE_KEEP[to];
    this.ep = flags & FLAG_DOUBLE ? (from + to) >> 1 : -1;
    this.halfmove = pieceType(piece) === PAWN || captured ? 0 : this.halfmove + 1;
    if (us === BLACK) this.fullmove++;
    this.side = (us ^ 1) as Color;
  }

  unmakeMove(m: Move): void {
    const b = this.board;
    const from = moveFrom(m), to = moveTo(m), promo = movePromo(m), flags = moveFlags(m);
    const undo = this.history.pop();
    if (undo === undefined) throw new Error('unmakeMove without makeMove');
    const us = (this.side ^ 1) as Color;
    this.side = us;
    const captured = undo & 15;
    const piece = promo ? makePiece(PAWN, us) : b[to];
    b[from] = piece;
    if (flags & FLAG_EP) {
      b[to] = EMPTY;
      b[to + (us === WHITE ? -8 : 8)] = captured;
    } else {
      b[to] = captured;
    }
    if (flags & FLAG_CASTLE) {
      if (to === from + 2) { b[from + 3] = b[from + 1]; b[from + 1] = EMPTY; }
      else { b[from - 4] = b[from - 1]; b[from - 1] = EMPTY; }
    }
    if (pieceType(piece) === KING) this.kings[us] = from;
    this.castling = (undo >> 4) & 15;
    this.ep = ((undo >> 8) & 127) - 1;
    this.halfmove = undo >>> 16;
    if (us === BLACK) this.fullmove--;
  }

  // ---- UCI ----

  /** UCI dizesini bu pozisyondaki yasal bir hamleye çevirir; yoksa null. */
  parseUci(uci: string): Move | null {
    for (const m of this.legalMoves()) if (moveToUci(m) === uci) return m;
    return null;
  }

  playUci(uci: string): Move {
    const m = this.parseUci(uci);
    if (m === null) throw new Error(`Illegal move ${uci} in ${this.toFen()}`);
    this.makeMove(m);
    return m;
  }

  pieceAt(sq: number): number {
    return this.board[sq];
  }
}

export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = pos.legalMoves();
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) {
    pos.makeMove(m);
    n += perft(pos, depth - 1);
    pos.unmakeMove(m);
  }
  return n;
}
