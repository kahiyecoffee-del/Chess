import { Color, Position } from '../chess';
import { Puzzle, playerColorOf } from './puzzle';

export type MoveResult =
  | { kind: 'wrong' }
  | { kind: 'correct'; reply: string } // rakibin otomatik cevabı (animasyonla oynanacak)
  | { kind: 'solved' };

/**
 * Bir bulmacanın çözüm durumu. Görsel katmandan bağımsızdır.
 * Kural: son hamlede mat yapan HER hamle doğru sayılır; diğer hamlelerde veritabanı hamlesi beklenir.
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
    let ok = uci === this.puzzle.moves[this.index];
    if (!ok && this.isFinalMove) {
      this.position.makeMove(move);
      ok = this.position.isCheckmate();
      this.position.unmakeMove(move);
    }
    if (!ok) {
      this.mistakes++;
      return { kind: 'wrong' };
    }
    this.position.makeMove(move);
    this.index++;
    if (this.solved) return { kind: 'solved' };
    const reply = this.puzzle.moves[this.index];
    this.position.playUci(reply);
    this.index++;
    return { kind: 'correct', reply };
  }
}
