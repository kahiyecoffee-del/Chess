// Zorluk eğrisi: macera yolunda zorluk seviye numarasıyla doğru orantılı artar.
// Seviye i'nin hedef puanı = START + SLOPE * i. Her hedefe en yakın kullanılmamış bulmaca seçilir.
// Hedefe yakın bulmaca kalmadığında (zor uçta içerik bitince) yol orada biter; kalan bulmacalar
// diğer modlar (günlük, sonsuz) için ayrılır. Sonuç her zaman artan sıradadır.

import { Puzzle } from '../../src/core/puzzle';
import { primaryTheme } from './themes';

export const RAMP = { start: 420, slope: 0.27, tolerance: 120 }; // dünya (100 seviye) başına ~27 puan
const DIVERSITY_WINDOW = 6;

export function orderByDifficulty(pool: Puzzle[], maxLevels: number, ramp = RAMP): Puzzle[] {
  const sorted = [...pool].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id));
  const ratings = sorted.map((p) => p.rating);
  const used = new Uint8Array(sorted.length);
  // Her bulmacanın bir sonraki kullanılmamış komşusunu hızlı bulmak için basit atlamalı arama.
  const nearestUnused = (target: number): number => {
    let lo = 0, hi = ratings.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ratings[mid] < target) lo = mid + 1; else hi = mid; }
    let a = lo - 1, b = lo;
    while (a >= 0 && used[a]) a--;
    while (b < ratings.length && used[b]) b++;
    if (a < 0 && b >= ratings.length) return -1;
    if (a < 0) return b;
    if (b >= ratings.length) return a;
    return target - ratings[a] <= ratings[b] - target ? a : b;
  };
  const chosen: Puzzle[] = [];
  for (let i = 0; i < maxLevels; i++) {
    const target = ramp.start + ramp.slope * i;
    const j = nearestUnused(target);
    if (j < 0 || Math.abs(ratings[j] - target) > ramp.tolerance) break; // zor uçta içerik bitti
    used[j] = 1;
    chosen.push(sorted[j]);
  }
  // Rampa bittiyse, hedefin üstünde kalan en zor bulmacaları da sona ekle (sıralı).
  if (chosen.length < maxLevels) {
    const last = chosen.length ? chosen[chosen.length - 1].rating : 0;
    for (let j = 0; j < sorted.length && chosen.length < maxLevels; j++) {
      if (!used[j] && sorted[j].rating >= last) { used[j] = 1; chosen.push(sorted[j]); }
    }
  }
  chosen.sort((a, b) => a.rating - b.rating);
  // Yakın komşular arasında tema tekrarını azalt (aynı tema arka arkaya üç kez gelmesin).
  for (let i = 2; i < chosen.length; i++) {
    const t = primaryTheme(chosen[i].themes);
    if (t !== primaryTheme(chosen[i - 1].themes) || t !== primaryTheme(chosen[i - 2].themes)) continue;
    for (let j = i + 1; j < Math.min(chosen.length, i + DIVERSITY_WINDOW); j++) {
      if (primaryTheme(chosen[j].themes) !== t) {
        [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
        break;
      }
    }
  }
  return chosen;
}

/** Blok (dünya) ortalamaları. */
export function worldAverages(levels: Puzzle[], size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < levels.length; i += size) {
    const slice = levels.slice(i, i + size);
    out.push(slice.reduce((a, p) => a + p.rating, 0) / slice.length);
  }
  return out;
}
