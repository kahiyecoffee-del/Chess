// Bir bulmacanın baştan sona oynanışı: oturum (Core) ile 3D tahta (Presentation) arasındaki köprü.

import { Color, Move, Position, describeMove, isCapture, moveFrom, movePromo, moveTo, moveToUci, pieceColor } from '../core/chess';
import { Puzzle, PuzzleSession } from '../core/puzzle';
import { Board3D } from '../presentation/board3d';
import { BoardInput } from '../presentation/input';

export interface FlowUi {
  setStatus(text: 'yourMove' | 'opponentMoving' | 'correct' | 'wrong'): void;
  setProgress(done: number, total: number): void;
  showSolved(mistakes: number): void;
  askPromotion(color: Color): Promise<number | null>;
}

export class PuzzleFlow {
  private session: PuzzleSession | null = null;
  private selected = -1;
  private targets: Move[] = [];
  private busy = true;
  private token = 0; // her yeni bulmacada artar; eski async akışları iptal eder
  readonly input: BoardInput;

  constructor(private board: Board3D, canvas: HTMLElement, private ui: FlowUi) {
    this.input = new BoardInput(canvas, board, {
      canDrag: (sq) => this.isOwnPiece(sq),
      onTap: (sq) => void this.tap(sq),
      onDragStart: (sq) => this.select(sq),
      onDragOver: (sq) => this.board.showHover(this.targets.some((m) => moveTo(m) === sq) ? sq : -1),
      onDrop: (from, sq) => void this.drop(from, sq),
    });
  }

  /** Uçtan uca testler için: beklenen hamle. */
  get expectedMove(): string | null {
    return this.session?.expectedMove ?? null;
  }

  get accepting(): boolean {
    return !this.busy && !!this.session && this.session.started && !this.session.solved;
  }

  async start(puzzle: Puzzle): Promise<void> {
    const token = ++this.token;
    const session = new PuzzleSession(puzzle);
    this.session = session;
    this.busy = true;
    this.deselect();
    this.board.resetCamera();
    this.board.setOrientation(session.playerColor);
    this.board.setPosition(session.position);
    this.board.showLastMove(-1, -1);
    this.ui.setProgress(0, puzzle.moves.length / 2);
    this.ui.setStatus('opponentMoving');
    await this.board.tweener.wait(0.55);
    if (token !== this.token) return;
    await this.playOpponent(session.position.clone(), puzzle.moves[0], () => session.playOpening());
    if (token !== this.token) return;
    this.busy = false;
    this.ui.setStatus('yourMove');
  }

  /** Rakip hamlesini `before` pozisyonundan tarif edip canlandırır. `apply` oturumu ilerletir. */
  private async playOpponent(before: Position, uci: string, apply?: () => void): Promise<void> {
    const m = before.parseUci(uci)!;
    const desc = describeMove(before, m);
    const color = before.side;
    apply?.();
    await this.board.animateMove(desc, color);
    this.updateCheck();
  }

  private updateCheck(): void {
    const pos = this.session!.position;
    this.board.setCheck(pos.inCheck() ? pos.kings[pos.side] : -1);
  }

  private isOwnPiece(sq: number): boolean {
    if (!this.accepting || sq < 0) return false;
    const p = this.session!.position.board[sq];
    return p !== 0 && pieceColor(p) === this.session!.playerColor;
  }

  private select(sq: number): void {
    this.selected = sq;
    this.targets = this.session!.position.legalMoves().filter((m) => moveFrom(m) === sq);
    const seen = new Set<number>();
    const marks: { sq: number; capture: boolean }[] = [];
    for (const m of this.targets) {
      const to = moveTo(m);
      if (seen.has(to)) continue; // terfi seçenekleri aynı kareye gider
      seen.add(to);
      marks.push({ sq: to, capture: isCapture(m) });
    }
    this.board.showSelection(sq, marks);
  }

  private deselect(): void {
    this.selected = -1;
    this.targets = [];
    this.board.clearSelection();
  }

  private async tap(sq: number): Promise<void> {
    if (!this.accepting) return;
    if (this.selected >= 0 && this.targets.some((m) => moveTo(m) === sq)) {
      await this.attempt(this.selected, sq, false);
    } else if (this.isOwnPiece(sq) && sq !== this.selected) {
      this.select(sq);
    } else {
      this.deselect();
    }
  }

  private async drop(from: number, sq: number): Promise<void> {
    this.board.showHover(-1);
    if (this.accepting && this.targets.some((m) => moveTo(m) === sq)) {
      await this.attempt(from, sq, true);
    } else {
      await this.board.returnPiece(from);
    }
  }

  private async attempt(from: number, to: number, dragged: boolean): Promise<void> {
    const session = this.session!;
    const token = this.token;
    let candidates = this.targets.filter((m) => moveFrom(m) === from && moveTo(m) === to);
    if (candidates.length > 1) {
      this.busy = true;
      const promo = await this.ui.askPromotion(session.playerColor);
      this.busy = false;
      if (token !== this.token) return;
      if (promo === null) {
        if (dragged) await this.board.returnPiece(from);
        return;
      }
      candidates = candidates.filter((m) => movePromo(m) === promo);
    }
    const move = candidates[0];
    if (move === undefined) return;
    const before = session.position.clone();
    const desc = describeMove(before, move);
    this.deselect();
    this.busy = true;
    const result = session.tryMove(moveToUci(move));

    if (result.kind === 'wrong') {
      this.ui.setStatus('wrong');
      await this.board.rejectMove(from, to, dragged);
      if (token === this.token) this.busy = false;
      return;
    }

    await this.board.animateMove(desc, session.playerColor, { fast: dragged });
    if (token !== this.token) return;
    const { done, total } = session.progress;
    this.ui.setProgress(result.kind === 'solved' ? total : done, total);

    if (result.kind === 'solved') {
      if (session.position.isCheckmate()) {
        const loser = session.position.side;
        await this.board.playCheckmate(session.position.kings[loser], desc.to);
      } else {
        this.updateCheck();
        await this.board.tweener.wait(0.5);
      }
      if (token !== this.token) return;
      this.ui.showSolved(session.mistakes);
      return;
    }

    this.updateCheck();
    this.ui.setStatus('correct');
    await this.board.tweener.wait(0.35);
    if (token !== this.token) return;
    before.makeMove(move);
    await this.playOpponent(before, result.reply);
    if (token !== this.token) return;
    this.busy = false;
    this.ui.setStatus('yourMove');
  }
}
