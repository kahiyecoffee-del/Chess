import { Position } from './position';
import { FLAG_CASTLE, FLAG_EP, Move, WHITE, moveFlags, moveFrom, movePromo, moveTo } from './types';

/** Görsel katmanın bir hamleyi canlandırması için gereken her şey. */
export interface MoveDescription {
  from: number;
  to: number;
  captureSq: number; // -1 = alma yok (geçerken almada `to`dan farklıdır)
  rookFrom: number; // -1 = rok değil
  rookTo: number;
  promo: number; // 0 = terfi yok
}

/** Hamle YAPILMADAN önceki pozisyonda çağrılmalıdır. */
export function describeMove(pos: Position, m: Move): MoveDescription {
  const from = moveFrom(m), to = moveTo(m), flags = moveFlags(m);
  let captureSq = pos.board[to] ? to : -1;
  if (flags & FLAG_EP) captureSq = to + (pos.side === WHITE ? -8 : 8);
  let rookFrom = -1, rookTo = -1;
  if (flags & FLAG_CASTLE) {
    if (to > from) { rookFrom = from + 3; rookTo = from + 1; }
    else { rookFrom = from - 4; rookTo = from - 1; }
  }
  return { from, to, captureSq, rookFrom, rookTo, promo: movePromo(m) };
}
