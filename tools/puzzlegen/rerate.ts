// Tüm ham bulmacaları ölçülmüş zorlukla yeniden derecelendirir (paralel).
// Kullanım:  npx tsx tools/puzzlegen/rerate.ts --workers 4
// Çıktı:     content/puzzles/raw/rated/shard-<n>.jsonl  (build-levels.ts bunları tercih eder)

import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Puzzle, validatePuzzle } from '../../src/core/puzzle';
import { difficultyRating, measure } from './difficulty';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RAW = join(ROOT, 'content/puzzles/raw');
const OUT = join(RAW, 'rated');

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

export function loadRaw(): Puzzle[] {
  const byKey = new Map<string, Puzzle>();
  for (const file of readdirSync(RAW).filter((f) => f.endsWith('.jsonl')).sort()) {
    for (const line of readFileSync(join(RAW, file), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const p = JSON.parse(line) as Puzzle;
      if (validatePuzzle(p)) continue;
      const key = p.fen.split(' ').slice(0, 4).join(' ') + p.moves[0];
      if (!byKey.has(key)) byKey.set(key, p);
    }
  }
  return [...byKey.values()];
}

if (process.argv.includes('--shard')) {
  const shard = Number(arg('shard', '0')), of = Number(arg('of', '1'));
  const all = loadRaw();
  const out = join(OUT, `shard-${shard}.jsonl`);
  let done = 0;
  for (let i = shard; i < all.length; i += of) {
    const p = all[i];
    const features = measure(p);
    appendFileSync(out, JSON.stringify({ ...p, rating: difficultyRating(features), features }) + '\n');
    if (++done % 500 === 0) console.log(`[shard ${shard}] ${done}`);
  }
  console.log(`[shard ${shard}] done ${done}`);
} else {
  const workers = Number(arg('workers', '4'));
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  console.log(`re-rating ${loadRaw().length} puzzles with ${workers} workers`);
  const self = fileURLToPath(import.meta.url);
  for (let i = 0; i < workers; i++) {
    spawn(process.execPath, ['--import', 'tsx', self, '--shard', String(i), '--of', String(workers)], { stdio: 'inherit' });
  }
}
