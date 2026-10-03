# Third-party licenses

| Component | Use | License | Shipped in app |
|---|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) 0.186 (incl. RoomEnvironment, RoundedBoxGeometry, BufferGeometryUtils addons) | 3D rendering | MIT | Yes |
| [Baloo 2](https://fonts.google.com/specimen/Baloo+2), [Nunito](https://fonts.google.com/specimen/Nunito) | UI fonts (loaded from Google Fonts in the preview; to be bundled in the app) | SIL Open Font License 1.1 | Yes |
| [Vite](https://vitejs.dev) | Build tool | MIT | No |
| [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) | Single-file preview build | MIT | No |
| [TypeScript](https://www.typescriptlang.org) | Compiler | Apache-2.0 | No |
| [Vitest](https://vitest.dev) | Unit tests | MIT | No |
| [tsx](https://github.com/privatenumber/tsx) | Runs generator scripts | MIT | No |
| [Playwright](https://playwright.dev) | End-to-end checks | Apache-2.0 | No |

## Own work

- Chess rules engine, search, puzzle generator, piece models and animations were written from scratch for this project.
- All puzzles in `content/puzzles/` were generated and verified by our own engine. No external puzzle database is used.
- Stockfish and other GPL engines are **not** used.
