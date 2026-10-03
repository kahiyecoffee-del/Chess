// Bir bulmacanın baştan sona oynanışı: oturum (Core) ile 3D tahta (Presentation) arasındaki köprü.

import { Color, Move, Position, describeMove, isCapture, moveFrom, movePromo, moveTo, moveToUci, pieceColor } from '../core/chess';
import { Puzzle, PuzzleSession } from '../core/puzzle';
import { Board3D } from '../presentation/board3d';
import { BoardInput } from '../presentation/input';

export interface FlowUi {
  setStatus(text: 'yourMove' | 'opponentMoving' | 'correct' | 'wrong'): void;
  setProgress(done: number, total: number): void;
  /** Kalan hata hakkı değişti. */
  setTriesLeft(left: number, total: number): void;
  /** Hata hakları bitti; oyuncu reklamla devam edebilir ya da vazgeçer. */
  outOfTries(): void;
  showSolved(mistakes: number): void;
  askPromotion(color: Color): Promise<number | null>;
}

export class PuzzleFlow {
  private session: PuzzleSession | null = null;
  private selected = -1;
  private targets: Move[] = [];
  private busy = true;
  private token = 0; // her yeni bulmacada artar; eski async akışları iptal eder
  private triesAllowed = 3;
  readonly input: BoardInput;

  constructor(private board: Board3D, canvas: HTMLElement, private ui: FlowUi) {
    this.input = new BoardInput(canvas, board, {
      canDrag: (sq) => this.isOwnPiece(sq),
      onTap: (hit) => void this.tap(hit),
      onDragStart: (sq) => this.select(sq),
      onDragOver: (sq) => this.board.showHover(this.targets.some((m) => moveTo(m) === sq) ? sq : -1),
      onDrop: (from, sq) => void this.drop(from, sq),
    });
  }

  /** Uçtan uca testler için: beklenen hamle. */
  get expectedMove(): string | null {
    return this.session?.expectedMove ?? null;
  }

  /** Uçtan uca testler için: seçili kare. */
  get selectedSquare(): number {
    return this.selected;
  }

  /** Uçtan uca testler için: beklenmeyen, mat etmeyen yasal bir oyuncu hamlesi. */
  wrongMoveForTests(): string | null {
    const s = this.session;
    if (!s) return null;
    for (const m of s.position.legalMoves()) {
      const uci = moveToUci(m);
      if (uci === s.expectedMove) continue;
      s.position.makeMove(m);
      const mate = s.position.isCheckmate();
      s.position.unmakeMove(m);
      if (!mate) return uci;
    }
    return null;
  }

  get accepting(): boolean {
    return !this.busy && !!this.session && this.session.started && !this.session.solved;
  }

  /** Oyuncuyu bulmacadan çıkarır (harita, vazgeç). */
  stop(): void {
    this.token++;
    this.busy = true;
    this.deselect();
  }

  get mistakes(): number {
    return this.session?.mistakes ?? 0;
  }

  /** Reklam ödülü: ek hata hakkı ver ve kaldığı yerden devam et. */
  grantTries(extra: number): void {
    if (!this.session) return;
    this.triesAllowed += extra;
    this.ui.setTriesLeft(this.triesAllowed - this.session.mistakes, this.triesAllowed);
    this.busy = false;
    this.ui.setStatus('yourMove');
  }

  async start(puzzle: Puzzle, triesAllowed: number): Promise<void> {
    const token = ++this.token;
    this.triesAllowed = triesAllowed;
    const session = new PuzzleSession(puzzle);
    this.session = session;
    this.busy = true;
    this.deselect();
    this.board.resetCamera();
    this.board.setOrientation(session.playerColor);
    this.board.setPosition(session.position);
    this.board.showLastMove(-1, -1);
    this.ui.setProgress(0, puzzle.moves.length / 2);
    this.ui.setTriesLeft(triesAllowed, triesAllowed);
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

  private async tap({ piece, plane }: { piece: number; plane: number }): Promise<void> {
    if (!this.accepting) return;
    const isTarget = (sq: number) => sq >= 0 && this.targets.some((m) => moveTo(m) === sq);
    if (this.selected >= 0) {
      // Önce tahta yüzeyindeki kare: öndeki uzun bir taş arkadaki hedefi örtmüş olabilir.
      const target = isTarget(plane) ? plane : isTarget(piece) ? piece : -1;
      if (target >= 0) {
        await this.attempt(this.selected, target, false);
        return;
      }
    }
    const own = this.isOwnPiece(piece) ? piece : this.isOwnPiece(plane) ? plane : -1;
    if (own >= 0 && own !== this.selected) this.select(own);
    else this.deselect();
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
      const left = this.triesAllowed - session.mistakes;
      this.ui.setTriesLeft(left, this.triesAllowed);
      await this.board.rejectMove(from, to, dragged);
      if (token !== this.token) return;
      if (left <= 0) this.ui.outOfTries(); // giriş, grantTries ya da yeni bulmacaya kadar kapalı kalır
      else this.busy = false;
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
