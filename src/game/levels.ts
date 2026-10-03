import { Puzzle, PuzzlePack, fromRow, validatePuzzle } from '../core/puzzle';

export interface SkippedPuzzle {
  id: string;
  reason: string;
}

/**
 * Seviye kütüphanesi. Her bulmaca yüklenirken kural motoruyla doğrulanır;
 * hatalı olanlar atlanır ve `skipped` listesine kaydedilir (Aşama 4'te analitiğe gidecek).
 */
export class LevelLibrary {
  private puzzles: Puzzle[] = [];
  readonly skipped: SkippedPuzzle[] = [];

  addPack(pack: PuzzlePack): void {
    for (const row of pack.puzzles) {
      const p = fromRow(row);
      const reason = validatePuzzle(p);
      if (reason) {
        this.skipped.push({ id: p.id, reason });
        console.warn(`[levels] skipped puzzle ${p.id}: ${reason}`);
        continue;
      }
      this.puzzles.push(p);
    }
  }

  get count(): number {
    return this.puzzles.length;
  }

  /** 1 tabanlı seviye numarası. */
  level(n: number): Puzzle | null {
    return this.puzzles[n - 1] ?? null;
  }
}
