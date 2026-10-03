// Bulmaca zorluğu için sezgisel ilk derece. Oyuncu verisi geldikçe (Aşama 4) yeniden ayarlanacak.

import { Position, isCapture, movePromo } from '../../src/core/chess';
import { QUEEN } from '../../src/core/chess';

export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function estimateRating(start: Position, line: string[], themes: string[], mateIn1Count: number): number {
  const has = (t: string) => themes.includes(t);
  let r: number;
  if (has('mateIn1')) r = 650;
  else if (has('mateIn2')) r = 1250;
  else if (has('mateIn3')) r = 1650;
  else if (has('oneMove')) r = has('hangingPiece') ? 750 : 950;
  else if (has('short')) r = 1200;
  else r = 1550;

  const pos = start.clone();
  const first = pos.parseUci(line[0])!;
  const legalCount = pos.legalMoves().length;
  pos.makeMove(first);
  const givesCheck = pos.inCheck();
  pos.unmakeMove(first);

  if (givesCheck) r -= 90;
  else if (isCapture(first)) r -= 40;
  else r += 260; // sessiz hamleyi görmek zor
  if (movePromo(first) && movePromo(first) !== QUEEN) r += 250;
  if (has('sacrifice')) r += 220;
  if (has('discoveredAttack') || has('discoveredCheck')) r += 90;
  if (has('smotheredMate')) r += 80;
  if (has('backRankMate')) r -= 40;
  if (has('mateIn1') && mateIn1Count > 1) r -= 80 * Math.min(3, mateIn1Count - 1);
  r += Math.max(-80, Math.min(80, (legalCount - 25) * 4));

  let pieces = 0;
  for (let s = 0; s < 64; s++) if (start.board[s]) pieces++;
  r += (pieces - 16) * 5;

  r += (hashString(start.toFen()) % 61) - 30;
  return Math.round(Math.max(400, Math.min(2800, r)));
}
