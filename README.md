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
npx tsx tools/puzzlegen/generate.ts --target 12000 --min-rating 900 --prefix hard- --seed 777   # hard-only puzzles
npx tsx tools/puzzlegen/rerate.ts --workers 4       # measured difficulty for all raw puzzles
npm run gen:levels -- --embedded 20000              # proportional ramp + packs
node tools/build-artifact.mjs                       # dist/preview.html for the web preview
```

## End-to-end checks (headless Chromium)

```
CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tools/e2e/play.mjs dist/index.html shots
node tools/e2e/shot-ui.mjs dist/index.html shots        # settings, languages (incl. RTL), music
node tools/e2e/special.mjs dist/index.html shots 95 1733 # promotion picker, 3-move puzzle
node tools/e2e/shot-worlds.mjs dist/index.html shots 40 140 230   # map worlds
```
