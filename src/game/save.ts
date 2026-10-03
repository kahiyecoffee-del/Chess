// Yerel kayıt: sürüm numaralı JSON + migrasyon. Bulut kaydı (Play Games) Aşama 4'te.
// Sürüm 0: yalnızca `cq.lastLevel`. Sürüm 1: can, kilit, yıldız. Sürüm 2: + ayarlar.

import { ECONOMY, LivesState, fullLives } from '../core/economy';

export const SAVE_VERSION = 2;
const KEY = 'cq.save';
const LEGACY_LAST_LEVEL_KEY = 'cq.lastLevel';

export interface Settings {
  music: boolean;
  /** Seçilen dil kodu; null = cihaz dili. */
  language: string | null;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  lives: LivesState;
  /** Oynanabilir en yüksek seviye (1 tabanlı). */
  unlocked: number;
  /** stars[seviye-1] = 0..3 */
  stars: number[];
  settings: Settings;
}

export const defaultSettings = (): Settings => ({ music: true, language: null });

export const freshSave = (): SaveData => ({
  version: SAVE_VERSION, lives: fullLives(ECONOMY.lives), unlocked: 1, stars: [], settings: defaultSettings(),
});

/** Eski veya bozuk veriyi güncel sürüme taşır. Bilinmeyen alanları atar. */
export function migrate(raw: unknown, legacyLastLevel: string | null): SaveData {
  const data = freshSave();
  const version = raw && typeof raw === 'object' ? (raw as { version?: number }).version : undefined;
  if (version === 1 || version === 2) {
    const r = raw as Partial<SaveData>;
    if (r.lives && typeof r.lives.lives === 'number') {
      data.lives = { lives: Math.max(0, Math.min(ECONOMY.lives.max, r.lives.lives)), regenStart: r.lives.regenStart ?? null };
    }
    if (typeof r.unlocked === 'number' && r.unlocked >= 1) data.unlocked = Math.floor(r.unlocked);
    if (Array.isArray(r.stars)) data.stars = r.stars.map((s) => (typeof s === 'number' ? Math.max(0, Math.min(3, s)) : 0));
    if (version === 2 && r.settings && typeof r.settings === 'object') {
      if (typeof r.settings.music === 'boolean') data.settings.music = r.settings.music;
      if (typeof r.settings.language === 'string') data.settings.language = r.settings.language;
    }
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
