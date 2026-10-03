import { Color, Position } from '../chess';
import { Puzzle, playerColorOf } from './puzzle';

export type MoveResult =
  | { kind: 'wrong' }
  | { kind: 'correct'; reply: string } // rakibin otomatik cevabı (animasyonla oynanacak)
  | { kind: 'solved' };

/**
 * Bir bulmacanın çözüm durumu. Görsel katmandan bağımsızdır.
 * Kural: mat yapan HER hamle bulmacayı çözer (çözüm satırından daha iyi olsa bile);
 * mat değilse veritabanındaki hamle beklenir.
 */
export class PuzzleSession {
  readonly position: Position;
  readonly playerColor: Color;
  mistakes = 0;
  hintsUsed = 0;
  private index = 0;

  constructor(readonly puzzle: Puzzle) {
    this.position = Position.fromFen(puzzle.fen);
    this.playerColor = playerColorOf(puzzle);
  }

  /** Rakibin açılış hamlesini uygular ve döner. Bir kez çağrılır. */
  playOpening(): string {
    if (this.index !== 0) throw new Error('opening already played');
    const uci = this.puzzle.moves[0];
    this.position.playUci(uci);
    this.index = 1;
    return uci;
  }

  get started(): boolean {
    return this.index > 0;
  }

  get solved(): boolean {
    return this.index >= this.puzzle.moves.length;
  }

  /** Oyuncudan beklenen hamle (ipucu için). */
  get expectedMove(): string | null {
    return this.solved || !this.started ? null : this.puzzle.moves[this.index];
  }

  get isFinalMove(): boolean {
    return this.index === this.puzzle.moves.length - 1;
  }

  /** Kaçıncı oyuncu hamlesindeyiz (0 tabanlı) ve toplam kaç tane var. */
  get progress(): { done: number; total: number } {
    return { done: Math.floor((this.index - 1) / 2), total: this.puzzle.moves.length / 2 };
  }

  tryMove(uci: string): MoveResult {
    if (!this.started || this.solved) throw new Error('session not accepting moves');
    const move = this.position.parseUci(uci);
    if (move === null) {
      this.mistakes++;
      return { kind: 'wrong' };
    }
    const expected = uci === this.puzzle.moves[this.index];
    this.position.makeMove(move);
    const mates = this.position.isCheckmate();
    this.position.unmakeMove(move);
    if (!expected && !mates) {
      this.mistakes++;
      return { kind: 'wrong' };
    }
    this.position.makeMove(move);
    this.index++;
    if (mates) this.index = this.puzzle.moves.length; // mat: bulmaca bitti
    if (this.solved) return { kind: 'solved' };
    const reply = this.puzzle.moves[this.index];
    this.position.playUci(reply);
    this.index++;
    return { kind: 'correct', reply };
  }
}
