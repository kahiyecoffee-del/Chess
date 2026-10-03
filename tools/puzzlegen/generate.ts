// Sıfırdan bulmaca üreticisi.
// Kendi motorumuz "gürültülü" oyunlar oynar; rakip bir hata yaptığında oluşan pozisyonda
// zorunlu mat ya da tek kazandıran taktik varsa bunu bulmacaya çevirir.
//
// Kullanım:  npm run gen:puzzles -- --target 22000 --workers 4
// Çıktı:     content/puzzles/raw/worker-<n>.jsonl (birleştirme ve sıralama: build-levels.ts)

import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Move, Position, START_FEN, moveToUci } from '../../src/core/chess';
import { MATE, Searcher, matingMoves } from '../../src/core/analysis';
import { Puzzle, validatePuzzle } from '../../src/core/puzzle';
import { findMate, findTactic } from './detect';
import { detectThemes } from './themes';
import { estimateRating, hashString } from './rating';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RAW_DIR = join(ROOT, 'content/puzzles/raw');

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const positionKey = (pos: Position): string => pos.toFen().split(' ').slice(0, 4).join(' ');

function chooseMove(pos: Position, searcher: Searcher, temperature: number, rng: () => number): Move {
  const moves = pos.legalMoves();
  const scores = moves.map((m) => {
    pos.makeMove(m);
    const s = pos.isCheckmate() ? MATE : -searcher.quiesce(pos, -MATE, MATE, 1);
    pos.unmakeMove(m);
    return s;
  });
  const max = Math.max(...scores);
  const weights = scores.map((s) => Math.exp((s - max) / temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < moves.length; i++) {
    x -= weights[i];
    if (x <= 0) return moves[i];
  }
  return moves[moves.length - 1];
}

function runWorker(id: number, quota: number, seed: number): void {
  mkdirSync(RAW_DIR, { recursive: true });
  const outFile = join(RAW_DIR, `worker-${id}.jsonl`);
  const seen = new Set<string>();
  let found = 0;
  if (existsSync(outFile)) {
    for (const line of readFileSync(outFile, 'utf8').split('\n')) {
      if (!line) continue;
      const p = JSON.parse(line) as Puzzle;
      const pos = Position.fromFen(p.fen);
      pos.playUci(p.moves[0]);
      seen.add(positionKey(pos));
      found++;
    }
  }
  const rng = mulberry32(seed + found * 7919);
  const searcher = new Searcher();
  const stats = { games: 0, mate: 0, tactic: 0, rejected: 0 };
  const t0 = Date.now();

  while (found < quota) {
    stats.games++;
    const pos = Position.fromFen(START_FEN);
    const temperature = [30, 50, 80, 120, 180][Math.floor(rng() * 5)];
    let fromThisGame = 0;
    let lastSolution = '';
    const randomOpening = 2 + Math.floor(rng() * 7);
    for (let ply = 0; ply < 220 && found < quota; ply++) {
      const legal = pos.legalMoves();
      if (legal.length === 0 || pos.isInsufficientMaterial() || pos.halfmove >= 100) break;
      const before = pos.clone();
      const move = ply < randomOpening ? legal[Math.floor(rng() * legal.length)] : chooseMove(pos, searcher, temperature, rng);
      pos.makeMove(move);
      if (ply < 6 || !pos.hasLegalMove()) continue;
      const key = positionKey(pos);
      if (seen.has(key)) continue;

      searcher.nodes = 0;
      searcher.nodeLimit = 1_500_000;
      const start = pos.clone();
      const result = findMate(start, rng() < 0.35 ? 3 : 2) ?? findTactic(start, before, searcher);
      if (!result) continue;
      seen.add(key);
      // Aynı oyundan çok sayıda / birbirinin tekrarı bulmaca alma.
      if (fromThisGame >= 4 || result.line[0] === lastSolution) continue;
      lastSolution = result.line[0];
      fromThisGame++;

      const moves = [moveToUci(move), ...result.line];
      const themes = detectThemes({ start, line: result.line, mateIn: result.mateIn });
      const mate1Count = result.mateIn === 1 ? matingMoves(start.clone(), 1).length : 0;
      const puzzle: Puzzle = {
        id: hashString(before.toFen() + moves.join('')).toString(36).padStart(7, '0'),
        fen: before.toFen(),
        moves,
        rating: estimateRating(start, result.line, themes, mate1Count),
        themes,
      };
      const error = validatePuzzle(puzzle);
      if (error) {
        stats.rejected++;
        continue;
      }
      appendFileSync(outFile, JSON.stringify(puzzle) + '\n');
      found++;
      if (result.mateIn) stats.mate++; else stats.tactic++;
      if (found % 50 === 0) {
        const rate = ((stats.mate + stats.tactic) / ((Date.now() - t0) / 1000)).toFixed(2);
        console.log(`[w${id}] ${found}/${quota} games=${stats.games} mate=${stats.mate} tactic=${stats.tactic} rejected=${stats.rejected} ${rate}/s`);
      }
    }
  }
  console.log(`[w${id}] done ${found}`);
}

function runMain(): void {
  const target = Number(arg('target', '22000'));
  const workers = Number(arg('workers', '4'));
  const seed = Number(arg('seed', '20261003'));
  const quota = Math.ceil(target / workers);
  const self = fileURLToPath(import.meta.url);
  console.log(`Generating ${target} puzzles with ${workers} workers -> ${RAW_DIR}`);
  for (let i = 0; i < workers; i++) {
    const child = spawn(process.execPath, ['--import', 'tsx', self, '--worker', String(i), '--quota', String(quota),
      '--seed', String(seed + i * 1_000_003)], { stdio: 'inherit' });
    child.on('exit', (code) => { if (code) console.error(`worker ${i} exited with ${code}`); });
  }
}

if (process.argv.includes('--worker')) {
  runWorker(Number(arg('worker', '0')), Number(arg('quota', '100')), Number(arg('seed', '1')));
} else {
  runMain();
}
