// Ölçülmüş zorluk: her bulmacayı motorla analiz eder ve oyuncunun zorlanacağı şeyleri sayar.
// Sezgisel ilk derecenin yerine geçer; gerçek oyuncu verisi geldiğinde (Aşama 4) yeniden ayarlanacak.

import { Move, Position, isCapture, moveToUci } from '../../src/core/chess';
import { INF, MATE, Searcher, materialBalance } from '../../src/core/analysis';
import { Puzzle } from '../../src/core/puzzle';

export interface DifficultyFeatures {
  length: number; // oyuncu hamle sayısı
  findDepth: number; // motorun ilk hamleyi bulduğu en küçük derinlik (1..5; 5 = 4'te de bulamadı)
  quiet: boolean; // ilk hamle şah da alma da değil
  shallowDrop: number; // ilk hamle yüzeysel bakışta ne kadar kötü görünüyor (cp)
  plausible: number; // ilk bakışta (derinlik 2) iyi görünen diğer hamleler
  forcing: number; // diğer şah/alma seçenekleri (dikkat dağıtıcılar)
  pieces: number;
}

function bestAtDepth(pos: Position, depth: number, s: Searcher): Move | null {
  let best: Move | null = null;
  let alpha = -INF;
  for (const m of pos.legalMoves()) {
    pos.makeMove(m);
    const v = -s.alphaBeta(pos, depth - 1, -INF, -alpha, 1);
    pos.unmakeMove(m);
    if (v > alpha) { alpha = v; best = m; }
  }
  return best;
}

export function measure(p: Puzzle, s = new Searcher(4_000_000)): DifficultyFeatures {
  const pos = Position.fromFen(p.fen);
  pos.playUci(p.moves[0]);
  const solution = p.moves[1];
  const attacker = pos.side;
  const first = pos.parseUci(solution)!;

  let findDepth = 5;
  for (let d = 1; d <= 4; d++) {
    s.nodes = 0;
    const m = bestAtDepth(pos, d, s);
    if (m !== null && moveToUci(m) === solution) { findDepth = d; break; }
    // Son hamlede mat varsa alternatif matlar da doğru sayılır.
    if (m !== null && p.moves.length === 2) {
      pos.makeMove(m);
      const mate = pos.isCheckmate();
      pos.unmakeMove(m);
      if (mate) { findDepth = d; break; }
    }
  }

  pos.makeMove(first);
  const givesCheck = pos.inCheck();
  pos.unmakeMove(first);
  const quiet = !givesCheck && !isCapture(first);

  // Yüzeysel görünüm: tek hamle + almalar sonrası değer, şu anki malzemeye göre.
  const base = materialBalance(pos, attacker);
  pos.makeMove(first);
  const shallow = -s.quiesce(pos, -MATE, MATE, 1);
  pos.unmakeMove(first);
  const shallowDrop = Math.max(0, Math.min(900, base - shallow));

  // İlk bakışta iyi görünen alternatifler ve dikkat dağıtan zorlayıcı hamleler.
  const scored = s.scoreRootMoves(pos, 2);
  const top = scored[0]?.score ?? 0;
  let plausible = 0;
  let forcing = 0;
  for (const { move, score } of scored) {
    if (moveToUci(move) === solution) continue;
    if (score >= top - 120 && score > -MATE / 2) plausible++;
    pos.makeMove(move);
    const check = pos.inCheck();
    pos.unmakeMove(move);
    if (check || isCapture(move)) forcing++;
  }
  let pieces = 0;
  for (let i = 0; i < 64; i++) if (pos.board[i]) pieces++;
  return { length: p.moves.length / 2, findDepth, quiet, shallowDrop, plausible, forcing, pieces };
}

/** Özelliklerden tek bir zorluk puanı (Elo benzeri ölçek). */
export function difficultyRating(f: DifficultyFeatures): number {
  let r = 420;
  r += 240 * (f.length - 1);
  r += 190 * (f.findDepth - 1);
  if (f.quiet) r += 200;
  r += Math.min(260, f.shallowDrop * 0.55);
  r += 22 * Math.min(8, f.plausible);
  r += 7 * Math.min(14, f.forcing);
  r += 4 * (f.pieces - 12);
  return Math.round(Math.max(300, Math.min(2800, r)));
}
