// Bulmaca üretimi ve doğrulaması için küçük bir arama motoru.
// Oyun içinde rakip hamlesi hesaplamak için kullanılmaz; çözümler veriden gelir.

import {
  BISHOP, Color, EMPTY, FLAG_CAPTURE, KING, KNIGHT, Move, PAWN, Position, QUEEN, ROOK, WHITE,
  fileOf, moveFlags, movePromo, moveTo, pieceColor, pieceType, rankOf,
} from '../chess';

export const PIECE_VALUE = [0, 100, 320, 330, 500, 900, 0];
export const MATE = 100_000;
export const INF = 1_000_000;

/** Yalnızca malzeme dengesi, `color` açısından. */
export function materialBalance(pos: Position, color: Color): number {
  let score = 0;
  for (let s = 0; s < 64; s++) {
    const p = pos.board[s];
    if (p === EMPTY) continue;
    const v = PIECE_VALUE[pieceType(p)];
    score += pieceColor(p) === color ? v : -v;
  }
  return score;
}

const CENTER_BONUS = (sq: number): number => {
  const f = fileOf(sq), r = rankOf(sq);
  return 6 - (Math.abs(3.5 - f) + Math.abs(3.5 - r)) * 1.5;
};

/** Hamle sırasındaki taraf açısından statik değerlendirme. */
export function evaluate(pos: Position): number {
  let score = 0;
  for (let s = 0; s < 64; s++) {
    const p = pos.board[s];
    if (p === EMPTY) continue;
    const t = pieceType(p);
    let v = PIECE_VALUE[t];
    if (t === KNIGHT || t === BISHOP) v += CENTER_BONUS(s) * 2;
    else if (t === PAWN) v += (pieceColor(p) === WHITE ? rankOf(s) - 1 : 6 - rankOf(s)) * 6;
    else if (t === QUEEN || t === ROOK) v += CENTER_BONUS(s) * 0.5;
    score += pieceColor(p) === pos.side ? v : -v;
  }
  return score;
}

function captureOrder(pos: Position, m: Move): number {
  const victim = pieceType(pos.board[moveTo(m)]) || PAWN;
  const promo = movePromo(m);
  return PIECE_VALUE[victim] * 10 + (promo ? PIECE_VALUE[promo] : 0);
}

export class Searcher {
  nodes = 0;
  constructor(public nodeLimit = 2_000_000) {}

  get exhausted(): boolean {
    return this.nodes > this.nodeLimit;
  }

  quiesce(pos: Position, alpha: number, beta: number, ply: number): number {
    this.nodes++;
    const inCheck = pos.inCheck();
    if (!inCheck) {
      const stand = evaluate(pos);
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
    }
    const moves = pos.legalMoves(!inCheck);
    if (moves.length === 0) return inCheck ? -MATE + ply : alpha;
    moves.sort((a, b) => captureOrder(pos, b) - captureOrder(pos, a));
    for (const m of moves) {
      pos.makeMove(m);
      const score = -this.quiesce(pos, -beta, -alpha, ply + 1);
      pos.unmakeMove(m);
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  alphaBeta(pos: Position, depth: number, alpha: number, beta: number, ply: number): number {
    if (depth <= 0) return this.quiesce(pos, alpha, beta, ply);
    this.nodes++;
    const moves = pos.legalMoves();
    if (moves.length === 0) return pos.inCheck() ? -MATE + ply : 0;
    orderMoves(pos, moves);
    let best = -INF;
    for (const m of moves) {
      pos.makeMove(m);
      const score = -this.alphaBeta(pos, depth - 1, -beta, -alpha, ply + 1);
      pos.unmakeMove(m);
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return best;
  }

  /** Her kök hamlesi için tam pencereyle skor (en iyi + ikinci en iyi farkını görmek için). */
  scoreRootMoves(pos: Position, depth: number): { move: Move; score: number }[] {
    const out: { move: Move; score: number }[] = [];
    for (const m of pos.legalMoves()) {
      pos.makeMove(m);
      const score = -this.alphaBeta(pos, depth - 1, -INF, INF, 1);
      pos.unmakeMove(m);
      out.push({ move: m, score });
    }
    return out.sort((a, b) => b.score - a.score);
  }

  /**
   * En iyi hamle ve diğer her hamlenin en az `margin` kadar kötü olup olmadığı.
   * Diğer hamleler sıfır-pencere ile test edilir; bu tam skordan çok daha hızlı.
   */
  uniqueBest(pos: Position, depth: number, margin: number): { move: Move; score: number } | null {
    const moves = pos.legalMoves();
    if (moves.length === 0) return null;
    orderMoves(pos, moves);
    let bestMove = moves[0];
    let bestScore = -INF;
    for (const m of moves) {
      pos.makeMove(m);
      const s = -this.alphaBeta(pos, depth - 1, -INF, -bestScore, 1);
      pos.unmakeMove(m);
      if (s > bestScore) { bestScore = s; bestMove = m; }
    }
    const threshold = bestScore - margin;
    for (const m of moves) {
      if (m === bestMove) continue;
      pos.makeMove(m);
      // Rakip açısından: skorumuz > threshold mi? -> rakip skoru < -threshold
      const s = -this.alphaBeta(pos, depth - 1, -threshold - 1, -threshold, 1);
      pos.unmakeMove(m);
      if (s > threshold) return null;
      if (this.exhausted) return null;
    }
    return { move: bestMove, score: bestScore };
  }
}

export function orderMoves(pos: Position, moves: Move[]): void {
  const key = (m: Move): number => {
    let k = 0;
    if (moveFlags(m) & FLAG_CAPTURE) k += 1000 + captureOrder(pos, m) - PIECE_VALUE[pieceType(pos.board[m & 63])];
    if (movePromo(m)) k += 800;
    return k;
  };
  moves.sort((a, b) => key(b) - key(a));
}

// ---- Zorunlu mat arama ----

/** Hamle sırasındaki taraf en fazla `n` hamlede mat edebilir mi? */
export function canForceMate(pos: Position, n: number, counter = { nodes: 0 }): boolean {
  const moves = pos.legalMoves();
  orderForMate(pos, moves);
  for (const m of moves) {
    pos.makeMove(m);
    const ok = defenderLoses(pos, n, counter);
    pos.unmakeMove(m);
    if (ok) return true;
  }
  return false;
}

/** Saldıran hamle yaptıktan sonra: savunan her cevapta `n-1` içinde mat oluyor mu? */
export function defenderLoses(pos: Position, n: number, counter = { nodes: 0 }): boolean {
  counter.nodes++;
  const inCheck = pos.inCheck();
  if (n <= 1) return inCheck && !pos.hasLegalMove();
  const replies = pos.legalMoves();
  if (replies.length === 0) return inCheck;
  // Kaçışları önce dene: şah hamleleri ve almalar en sık çürütmelerdir.
  replies.sort((a, b) => replyKey(pos, b) - replyKey(pos, a));
  for (const r of replies) {
    pos.makeMove(r);
    const ok = canForceMate(pos, n - 1, counter);
    pos.unmakeMove(r);
    if (!ok) return false;
  }
  return true;
}

function replyKey(pos: Position, m: Move): number {
  let k = 0;
  if (pieceType(pos.board[m & 63]) === KING) k += 50;
  if (moveFlags(m) & FLAG_CAPTURE) k += 100 + PIECE_VALUE[pieceType(pos.board[moveTo(m)])] / 10;
  return k;
}

function orderForMate(pos: Position, moves: Move[]): void {
  const keys = new Map<Move, number>();
  for (const m of moves) {
    pos.makeMove(m);
    let k = pos.inCheck() ? 1000 : 0;
    pos.unmakeMove(m);
    if (moveFlags(m) & FLAG_CAPTURE) k += 100 + PIECE_VALUE[pieceType(pos.board[moveTo(m)])] / 10;
    keys.set(m, k);
  }
  moves.sort((a, b) => keys.get(b)! - keys.get(a)!);
}

/** En kısa zorunlu mat uzunluğu (≤ maxN), yoksa 0. */
export function shortestMate(pos: Position, maxN: number): number {
  for (let n = 1; n <= maxN; n++) if (canForceMate(pos, n)) return n;
  return 0;
}

/** Tam olarak `n` hamlede mat eden ilk hamleler (daha kısa mat yoksa anlamlıdır). */
export function matingMoves(pos: Position, n: number): Move[] {
  const out: Move[] = [];
  for (const m of pos.legalMoves()) {
    pos.makeMove(m);
    if (defenderLoses(pos, n)) out.push(m);
    pos.unmakeMove(m);
  }
  return out;
}
