// Ham bulmacaları birleştirir, tekrar doğrular, zorluk eğrisine göre sıralar ve paketler.
//
// Kullanım:  npm run gen:levels -- --embedded 20000 --pack-size 1000
// Çıktı:     content/puzzles/levels/pack-XXX.json  (uygulamaya gömülü paketler)
//            content/puzzles/remote/pack-XXX.json  (sonradan indirilecek fazlalar)
//            content/puzzles/REPORT.md             (dağılım raporu)

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Puzzle, PuzzlePack, toRow, validatePuzzle } from '../../src/core/puzzle';
import { primaryTheme } from './themes';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'content/puzzles');

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const EASY_LEVELS = 50; // ilk seviyeler: yalnızca çok kolay mat-in-1 ve korunmasız taş
const EASY_MAX_RATING = 900;
const WORLD_SIZE = 100;

function load(): Puzzle[] {
  const dir = join(OUT, 'raw');
  const byPosition = new Map<string, Puzzle>();
  let invalid = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort()) {
    for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let p: Puzzle;
      try { p = JSON.parse(line) as Puzzle; } catch { invalid++; continue; }
      if (validatePuzzle(p)) { invalid++; continue; }
      const key = p.fen.split(' ').slice(0, 4).join(' ') + p.moves[0];
      if (!byPosition.has(key)) byPosition.set(key, p);
    }
  }
  console.log(`loaded ${byPosition.size} unique puzzles (${invalid} invalid skipped)`);
  return [...byPosition.values()];
}

/**
 * Zorluk eğrisi: ilk 50 seviye çok kolay; sonra derece dağılımının yüzdelik dilimlerinde
 * yavaşça yükselir. Her dünya (100 seviye) kendi içinde hafif bir testere dişi çizer:
 * dünya başı biraz rahatlar, sonuna doğru zorlaşır.
 */
function order(pool: Puzzle[], count: number): Puzzle[] {
  const sorted = [...pool].sort((a, b) => a.rating - b.rating);
  const used = new Uint8Array(sorted.length);
  const result: Puzzle[] = [];
  const recent: string[] = [];

  const easy = sorted
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.rating <= EASY_MAX_RATING && (p.themes.includes('mateIn1') || p.themes.includes('hangingPiece')));
  // Mat-in-1 ve korunmasız taşı dönüşümlü ver.
  const mates = easy.filter((e) => e.p.themes.includes('mateIn1'));
  const loose = easy.filter((e) => !e.p.themes.includes('mateIn1'));
  for (let k = 0; k < EASY_LEVELS && (mates.length || loose.length); k++) {
    const src = (k % 3 === 2 && loose.length) || !mates.length ? loose : mates;
    const { p, i } = src.shift()!;
    used[i] = 1;
    result.push(p);
  }

  const n = sorted.length;
  const rest = count - result.length;
  for (let k = 0; k < rest; k++) {
    const level = result.length + 1;
    const progress = k / Math.max(1, rest - 1);
    const saw = (((level - 1) % WORLD_SIZE) / WORLD_SIZE - 0.5) * 0.06;
    const q = Math.min(0.995, Math.max(0, 0.08 + 0.9 * Math.pow(progress, 0.85) + saw));
    let idx = Math.floor(q * (n - 1));
    // En yakın kullanılmamış bulmacayı bul; son iki temayla aynı olmayanı tercih et.
    let best = -1;
    for (let r = 0; r < n && best < 0; r++) {
      for (const j of [idx - r, idx + r]) {
        if (j < 0 || j >= n || used[j]) continue;
        const theme = primaryTheme(sorted[j].themes);
        if (r < 40 && recent.includes(theme)) continue;
        best = j;
        break;
      }
    }
    if (best < 0) break;
    idx = best;
    used[idx] = 1;
    result.push(sorted[idx]);
    recent.push(primaryTheme(sorted[idx].themes));
    if (recent.length > 2) recent.shift();
  }
  return result;
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
const levels = order(pool, Math.min(embedded, pool.length));
const chosen = new Set(levels);
const leftovers = pool.filter((p) => !chosen.has(p)).sort((a, b) => a.rating - b.rating);
const packs = writePacks(join(OUT, 'levels'), levels, packSize, 0);
const remotePacks = writePacks(join(OUT, 'remote'), leftovers, packSize, packs);
writeFileSync(join(OUT, 'REPORT.md'), report(levels, leftovers.length));
console.log(`wrote ${levels.length} levels in ${packs} packs, ${leftovers.length} remote puzzles in ${remotePacks} packs`);
