// Zorluk eğrisi: seviye numarasıyla orantılı, hiç geri düşmeyen artış.
// Bulmacalar zorluğa göre sıralanır ve seviye i, dağılımın i/N'inci dilimini alır.
// Yalnızca çok küçük bir pencerede (±DIVERSITY_WINDOW) tema çeşitliliği için yer değiştirilir.

import { Puzzle } from '../../src/core/puzzle';
import { primaryTheme } from './themes';

const DIVERSITY_WINDOW = 6;

export function orderByDifficulty(pool: Puzzle[], count: number): Puzzle[] {
  const sorted = [...pool].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id));
  // Hedef: N bulmacayı tüm dağılım boyunca eşit aralıklarla seç (en kolaydan en zora).
  const n = Math.min(count, sorted.length);
  const step = sorted.length / n;
  const chosen: Puzzle[] = [];
  for (let i = 0; i < n; i++) chosen.push(sorted[Math.min(sorted.length - 1, Math.floor(i * step))]);
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

/** Her blok (dünya) ortalamasının bir öncekinden düşük olmadığını doğrular. */
export function worldAverages(levels: Puzzle[], size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < levels.length; i += size) {
    const slice = levels.slice(i, i + size);
    out.push(slice.reduce((a, p) => a + p.rating, 0) / slice.length);
  }
  return out;
}
