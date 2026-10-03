// Bir çözüm satırından tema etiketleri çıkarır.

import {
  BISHOP, Color, EMPTY, KING, KNIGHT, PAWN, Position, QUEEN, ROOK, fileOf, movePromo,
  moveTo, pieceColor, pieceType, rankOf,
} from '../../src/core/chess';
import { PIECE_VALUE } from '../../src/core/analysis';
import { RAYS } from '../../src/core/chess/position';

const value = (p: number): number => (pieceType(p) === KING ? 10_000 : PIECE_VALUE[pieceType(p)]);

function nonPawnMaterial(pos: Position): number {
  let total = 0;
  for (let s = 0; s < 64; s++) {
    const t = pieceType(pos.board[s]);
    if (t !== EMPTY && t !== PAWN && t !== KING) total += PIECE_VALUE[t];
  }
  return total;
}

function isDefended(pos: Position, sq: number, by: Color): boolean {
  return pos.attackersOf(sq, by).length > 0;
}

export interface ThemeInput {
  start: Position; // rakibin ilk hamlesinden sonraki pozisyon (oyuncu sırası)
  line: string[]; // oyuncu ve rakip hamleleri, oyuncuyla başlar
  mateIn: number; // 0 = mat değil
}

export function detectThemes({ start, line, mateIn }: ThemeInput): string[] {
  const themes = new Set<string>();
  const pos = start.clone();
  const attacker = pos.side;
  const defender = (attacker ^ 1) as Color;
  const attackerMoves = Math.ceil(line.length / 2);

  if (mateIn > 0) {
    themes.add('mate');
    themes.add(`mateIn${mateIn}`);
  } else {
    themes.add(attackerMoves === 1 ? 'oneMove' : attackerMoves === 2 ? 'short' : 'long');
  }

  const phaseMaterial = nonPawnMaterial(pos);
  if (phaseMaterial <= 1300) themes.add('endgame');
  else if (pos.fullmove <= 12) themes.add('opening');
  else themes.add('middlegame');

  // İlk oyuncu hamlesi üzerinde taktik desenler.
  const first = pos.parseUci(line[0])!;
  const to = moveTo(first);
  const captured = pos.board[to];
  const targetDefendedBefore = captured !== EMPTY && isDefended(pos, to, defender);
  const attackedBefore = new Set<string>();
  for (let s = 0; s < 64; s++) {
    const p = pos.board[s];
    if (p === EMPTY || pieceColor(p) !== attacker) continue;
    for (let t = 0; t < 64; t++) {
      const q = pos.board[t];
      if (q !== EMPTY && pieceColor(q) === defender && pos.pieceAttacks(s, t)) attackedBefore.add(`${s}-${t}`);
    }
  }

  pos.makeMove(first);
  const movedPiece = pos.board[to];

  if (mateIn === 0 && attackerMoves === 1 && captured !== EMPTY && !targetDefendedBefore) themes.add('hangingPiece');

  // Çatal: hamle yapan taş iki ya da daha fazla değerli hedefe saldırıyor.
  let forkTargets = 0;
  for (let t = 0; t < 64; t++) {
    const q = pos.board[t];
    if (q === EMPTY || pieceColor(q) !== defender || !pos.pieceAttacks(to, t)) continue;
    if (pieceType(q) === KING || value(q) > value(movedPiece) || !isDefended(pos, t, defender)) {
      if (pieceType(q) !== PAWN) forkTargets++;
    }
  }
  if (forkTargets >= 2 && attackerMoves >= 2 && pieceType(movedPiece) !== KING) themes.add('fork');

  // Açmaz / şiş: kayan taşın hattında iki rakip taş.
  const t = pieceType(movedPiece);
  if (t === BISHOP || t === ROOK || t === QUEEN) {
    const dStart = t === BISHOP ? 4 : 0, dEnd = t === ROOK ? 4 : 8;
    for (let d = dStart; d < dEnd; d++) {
      const hits: number[] = [];
      for (const s of RAYS[d][to]) {
        const p = pos.board[s];
        if (p === EMPTY) continue;
        hits.push(p);
        if (hits.length === 2) break;
      }
      if (hits.length < 2 || hits.some((p) => pieceColor(p) !== defender)) continue;
      const [a, b] = hits;
      if (pieceType(a) === PAWN) continue;
      if (value(b) > value(a)) themes.add('pin');
      else if (pieceType(a) === KING || value(a) > value(b) + 100) themes.add('skewer');
    }
  }

  // Açarak saldırı / çifte şah.
  const checkers = pos.attackersOf(pos.kings[defender], attacker);
  if (checkers.length >= 2) themes.add('doubleCheck');
  for (let s = 0; s < 64; s++) {
    const p = pos.board[s];
    if (p === EMPTY || pieceColor(p) !== attacker || s === to) continue;
    for (let u = 0; u < 64; u++) {
      const q = pos.board[u];
      if (q === EMPTY || pieceColor(q) !== defender || pieceType(q) === PAWN) continue;
      if (!pos.pieceAttacks(s, u) || attackedBefore.has(`${s}-${u}`)) continue;
      if (pieceType(q) === KING) themes.add('discoveredCheck');
      else if (value(q) > value(p)) themes.add('discoveredAttack');
    }
  }

  // Fedakârlık: hamle yapılan taş, aldığından daha değerli ve korunmasız bir karede.
  if (attackerMoves >= 2 && pos.attackersOf(to, defender).length > 0 &&
      value(movedPiece) > (captured ? value(captured) : 0) + 150 &&
      pos.attackersOf(to, attacker).length === 0) {
    themes.add('sacrifice');
  }
  pos.unmakeMove(first);

  // Terfi ve mat desenleri tüm satır boyunca.
  for (let i = 0; i < line.length; i++) {
    const m = pos.parseUci(line[i])!;
    if (i % 2 === 0 && movePromo(m)) themes.add(movePromo(m) === QUEEN ? 'promotion' : 'underPromotion');
    pos.makeMove(m);
  }
  if (mateIn > 0) {
    const mateSq = squareFromUci(line[line.length - 1].slice(2, 4));
    const king = pos.kings[defender];
    const matingPiece = pos.board[mateSq];
    const backRank = defender === 0 ? 0 : 7;
    if (rankOf(king) === backRank && (pieceType(matingPiece) === ROOK || pieceType(matingPiece) === QUEEN) &&
        rankOf(mateSq) === backRank) {
      themes.add('backRankMate');
    }
    if (pieceType(matingPiece) === KNIGHT) {
      let smothered = true;
      for (let s = 0; s < 64; s++) {
        if (Math.max(Math.abs(fileOf(s) - fileOf(king)), Math.abs(rankOf(s) - rankOf(king))) !== 1) continue;
        const p = pos.board[s];
        if (p === EMPTY || pieceColor(p) !== defender) { smothered = false; break; }
      }
      if (smothered) themes.add('smotheredMate');
    }
  }
  return [...themes];
}

function squareFromUci(s: string): number {
  return (s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97);
}

/** Arayüzde gösterilecek ana görev metni anahtarı. */
export function primaryTheme(themes: string[]): string {
  const order = ['mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack', 'hangingPiece',
    'sacrifice', 'promotion'];
  return order.find((t) => themes.includes(t)) ?? 'advantage';
}
