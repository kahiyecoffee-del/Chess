// Yerel kayıt: sürüm numaralı JSON + migrasyon. Bulut kaydı (Play Games) Aşama 4'te.

import { ECONOMY, LivesState, fullLives } from '../core/economy';

export const SAVE_VERSION = 1;
const KEY = 'cq.save';
const LEGACY_LAST_LEVEL_KEY = 'cq.lastLevel'; // sürüm 0: yalnızca son seviye

export interface SaveData {
  version: typeof SAVE_VERSION;
  lives: LivesState;
  /** Oynanabilir en yüksek seviye (1 tabanlı). */
  unlocked: number;
  /** stars[seviye-1] = 0..3 */
  stars: number[];
}

export const freshSave = (): SaveData => ({ version: SAVE_VERSION, lives: fullLives(ECONOMY.lives), unlocked: 1, stars: [] });

/** Eski veya bozuk veriyi güncel sürüme taşır. Bilinmeyen alanları atar. */
export function migrate(raw: unknown, legacyLastLevel: string | null): SaveData {
  const data = freshSave();
  if (raw && typeof raw === 'object' && (raw as { version?: number }).version === 1) {
    const r = raw as Partial<SaveData>;
    if (r.lives && typeof r.lives.lives === 'number') {
      data.lives = { lives: Math.max(0, Math.min(ECONOMY.lives.max, r.lives.lives)), regenStart: r.lives.regenStart ?? null };
    }
    if (typeof r.unlocked === 'number' && r.unlocked >= 1) data.unlocked = Math.floor(r.unlocked);
    if (Array.isArray(r.stars)) data.stars = r.stars.map((s) => (typeof s === 'number' ? Math.max(0, Math.min(3, s)) : 0));
    return data;
  }
  const legacy = Number(legacyLastLevel);
  if (Number.isInteger(legacy) && legacy > 1) data.unlocked = legacy;
  return data;
}

export function loadSave(): SaveData {
  try {
    const text = localStorage.getItem(KEY);
    return migrate(text ? JSON.parse(text) : null, localStorage.getItem(LEGACY_LAST_LEVEL_KEY));
  } catch {
    return freshSave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Depolama kapalı (gizli pencere vb.): oyun kayıtsız devam eder.
  }
}
