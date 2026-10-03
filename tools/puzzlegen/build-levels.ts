// Ham bulmacaları birleştirir, tekrar doğrular, zorluk eğrisine göre sıralar ve paketler.
//
// Kullanım:  npm run gen:levels -- --embedded 20000 --pack-size 1000
// Çıktı:     content/puzzles/levels/pack-XXX.json  (uygulamaya gömülü paketler)
//            content/puzzles/remote/pack-XXX.json  (sonradan indirilecek fazlalar)
//            content/puzzles/REPORT.md             (dağılım raporu)

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Puzzle, PuzzlePack, toRow, validatePuzzle } from '../../src/core/puzzle';
import { orderByDifficulty, worldAverages } from './curve';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'content/puzzles');

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const WORLD_SIZE = 100;

function load(): Puzzle[] {
  const rated = join(OUT, 'raw', 'rated');
  const dir = existsSync(rated) && readdirSync(rated).some((f) => f.endsWith('.jsonl')) ? rated : join(OUT, 'raw');
  console.log(`reading ${dir === rated ? 'measured (re-rated)' : 'raw'} puzzles`);
  const byPosition = new Map<string, Puzzle>();
  let invalid = 0;
  // Ölçülmüş bulmacalar + zor modda üretilenler (onlar üretimde zaten ölçülür).
  const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => join(dir, f));
  if (dir === rated) {
    const raw = join(OUT, 'raw');
    files.push(...readdirSync(raw).filter((f) => f.startsWith('hard-') && f.endsWith('.jsonl')).map((f) => join(raw, f)));
  }
  for (const file of files.sort()) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let p: Puzzle;
      try { p = JSON.parse(line) as Puzzle; } catch { invalid++; continue; }
      delete (p as Puzzle & { features?: unknown }).features;
      if (validatePuzzle(p)) { invalid++; continue; }
      const key = p.fen.split(' ').slice(0, 4).join(' ') + p.moves[0];
      if (!byPosition.has(key)) byPosition.set(key, p);
    }
  }
  console.log(`loaded ${byPosition.size} unique puzzles (${invalid} invalid skipped)`);
  return [...byPosition.values()];
}

function writePacks(dir: string, puzzles: Puzzle[], size: number, offset: number): number {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let packs = 0;
  for (let i = 0; i < puzzles.length; i += size) {
    const pack: PuzzlePack = { version: 1, pack: offset + packs, puzzles: puzzles.slice(i, i + size).map(toRow) };
    writeFileSync(join(dir, `pack-${String(offset + packs).padStart(3, '0')}.json`), JSON.stringify(pack));
    packs++;
  }
  return packs;
}

function report(levels: Puzzle[], remote: number): string {
  const lines = ['# Puzzle content report', '', `Generated: ${new Date().toISOString()}`, '',
    `- Embedded levels: ${levels.length}`, `- Remote (downloadable later): ${remote}`, ''];
  lines.push('## Rating by world (100 levels)', '', '| World | Levels | Min | Avg | Max |', '|---|---|---|---|---|');
  for (let w = 0; w * WORLD_SIZE < levels.length; w++) {
    const slice = levels.slice(w * WORLD_SIZE, (w + 1) * WORLD_SIZE);
    const r = slice.map((p) => p.rating);
    if (w < 10 || w % 20 === 0 || (w + 1) * WORLD_SIZE >= levels.length) {
      lines.push(`| ${w + 1} | ${w * WORLD_SIZE + 1}–${w * WORLD_SIZE + slice.length} | ${Math.min(...r)} | ${Math.round(r.reduce((a, b) => a + b, 0) / r.length)} | ${Math.max(...r)} |`);
    }
  }
  const counts = new Map<string, number>();
  for (const p of levels) for (const t of p.themes) counts.set(t, (counts.get(t) ?? 0) + 1);
  lines.push('', '## Themes (embedded)', '', '| Theme | Count |', '|---|---|');
  for (const [t, c] of [...counts].sort((a, b) => b[1] - a[1])) lines.push(`| ${t} | ${c} |`);
  return lines.join('\n') + '\n';
}

const embedded = Number(arg('embedded', '20000'));
const packSize = Number(arg('pack-size', '1000'));
const pool = load();
const levels = orderByDifficulty(pool, Math.min(embedded, pool.length));
const averages = worldAverages(levels, WORLD_SIZE);
const drops = averages.filter((a, i) => i > 0 && a < averages[i - 1]).length;
console.log(`world averages: ${averages.slice(0, 5).map(Math.round).join(', ')} … ${averages.slice(-3).map(Math.round).join(', ')}; drops: ${drops}`);
const chosen = new Set(levels);
const leftovers = pool.filter((p) => !chosen.has(p)).sort((a, b) => a.rating - b.rating);
const packs = writePacks(join(OUT, 'levels'), levels, packSize, 0);
const remotePacks = writePacks(join(OUT, 'remote'), leftovers, packSize, packs);
writeFileSync(join(OUT, 'REPORT.md'), report(levels, leftovers.length));
console.log(`wrote ${levels.length} levels in ${packs} packs, ${leftovers.length} remote puzzles in ${remotePacks} packs`);
