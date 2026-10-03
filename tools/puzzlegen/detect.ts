// Bir pozisyonda bulmaca var mı? Zorunlu mat ya da tek kazandıran taktik arar.

import { Color, Move, Position, moveToUci } from '../../src/core/chess';
import {
  MATE, Searcher, canForceMate, materialBalance, matingMoves,
} from '../../src/core/analysis';

export interface Found {
  line: string[]; // oyuncu hamlesiyle başlar
  mateIn: number;
  gain: number; // taktiklerde kazanılan malzeme (cp)
}

/** Savunanın en uzun dirençli cevabını ve bir sonraki tek mat devamını seçer. */
function buildMateLine(pos: Position, n: number): string[] | null {
  const line: string[] = [];
  for (let k = n; k >= 1; k--) {
    const cands = matingMoves(pos, k);
    if (cands.length === 0) return null;
    // Son hamle dışında tek çözüm şart (yoksa oyuncu doğru hamleyle "yanlış" duyar).
    if (k > 1 && cands.length !== 1) return null;
    const m = cands[0];
    line.push(moveToUci(m));
    pos.makeMove(m);
    if (k === 1) break;
    // Savunma: matı en çok geciktiren ve devamı tek olan cevap.
    let chosen: Move | null = null;
    let fallback: Move | null = null;
    for (const r of pos.legalMoves()) {
      pos.makeMove(r);
      const quicker = k - 2 >= 1 && canForceMate(pos, k - 2);
      const unique = !quicker && matingMoves(pos, k - 1).length === 1;
      pos.unmakeMove(r);
      if (quicker) continue;
      fallback ??= r;
      if (unique || k - 1 === 1) { chosen = r; break; }
    }
    const reply = chosen ?? (k - 1 === 1 ? fallback : null);
    if (reply === null) return null;
    line.push(moveToUci(reply));
    pos.makeMove(reply);
  }
  return line;
}

export function findMate(start: Position, maxN: number): Found | null {
  const pos = start.clone();
  for (let n = 1; n <= maxN; n++) {
    if (!canForceMate(pos, n)) continue;
    const line = buildMateLine(pos.clone(), n);
    return line ? { line, mateIn: n, gain: MATE } : null;
  }
  return null;
}

/**
 * Taktik: tek bir hamle en az `margin` farkla en iyisi ve kazanç gerçek (basit geri alma değil).
 * `baseline` = rakibin hamlesinden önceki ve sonraki malzemenin en iyisi (oyuncu açısından).
 */
export function findTactic(start: Position, before: Position, searcher: Searcher): Found | null {
  const attacker: Color = start.side;
  const baseline = Math.max(materialBalance(start, attacker), materialBalance(before, attacker));
  const pos = start.clone();

  // Ucuz ön filtre.
  const quick = searcher.alphaBeta(pos, 2, -MATE, MATE, 0);
  if (quick - baseline < 180 || quick > MATE / 2) return null;

  const line: string[] = [];
  for (let step = 0; step < 3; step++) {
    const best = searcher.uniqueBest(pos, step === 0 ? 4 : 3, 150);
    if (!best || searcher.exhausted) return null;
    if (best.score > MATE / 2) return null; // mat ise mat arayıcısı ele alsın
    if (step === 0 && best.score - baseline < 200) return null;
    line.push(moveToUci(best.move));
    pos.makeMove(best.move);
    // Kazanç gerçekleşti mi? Savunanın almaları dahil statik sonuç.
    const realized = -searcher.quiesce(pos, -MATE, MATE, 0);
    const gain = realized - baseline;
    if (gain >= 200 && Math.abs(realized - materialBalance(pos, attacker)) < 120) {
      return { line, mateIn: 0, gain };
    }
    if (!pos.hasLegalMove()) return null;
    // Savunanın en iyi cevabı
    const replies = searcher.scoreRootMoves(pos, 2);
    const reply = replies[0].move;
    line.push(moveToUci(reply));
    pos.makeMove(reply);
  }
  return null;
}
