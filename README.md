# Checkmate Quest

3D chess puzzle game for mobile. See [CHESS_BRIEF.md](CHESS_BRIEF.md) for the full brief and decision log.

## Layout

```
src/core/chess      rules engine (FEN, legal moves, check/mate/stalemate, castling, en passant, promotion, UCI)
src/core/analysis   search used by the puzzle generator (eval, quiescence, alpha-beta, forced-mate search)
src/core/puzzle     puzzle model, validation, solving session
src/game            level library, puzzle flow, texts (i18n), progress
src/presentation    3D board, procedural pieces, visual sets, tweening, touch input
tools/puzzlegen     puzzle generator + level/curve builder
tools/e2e           headless browser checks (screenshots, plays levels by touch/drag)
content/puzzles     generated level packs (levels/ embedded, remote/ for later download)
tests               unit tests (perft, rules, puzzles, generator)
```

## Commands

```
npm install
npm test                 # unit tests incl. perft
npm run dev              # local dev server
npm run build            # typecheck + single-file build in dist/index.html
npm run gen:puzzles -- --target 22000 --workers 4   # generate raw puzzles (long)
npm run gen:levels -- --embedded 20000              # build curve + packs
```
