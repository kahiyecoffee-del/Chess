// Seviye arası reklam kuralı: her N tamamlanan seviyede bir, iki reklam arasında en az M saniye.
// Yalnızca seviye sonu ekranından çıkarken sorulur; bulmaca ortasında asla gösterilmez.

export interface InterstitialConfig {
  enabled: boolean;
  everyLevels: number;
  minSecondsBetween: number;
  mockSeconds: number;
}

export interface InterstitialState {
  /** Son reklamdan beri tamamlanan seviye sayısı. */
  sinceLast: number;
  /** Son reklamın zamanı (ms), hiç gösterilmediyse 0. */
  lastShownAt: number;
}

export const freshInterstitial = (): InterstitialState => ({ sinceLast: 0, lastShownAt: 0 });

export function recordLevelCompleted(s: InterstitialState): InterstitialState {
  return { ...s, sinceLast: s.sinceLast + 1 };
}

/** Reklamsız satın alımı (Aşama 3) `noAds` ile bu kuralı kapatır. */
export function shouldShowInterstitial(s: InterstitialState, now: number, cfg: InterstitialConfig, noAds = false): boolean {
  if (!cfg.enabled || noAds) return false;
  if (s.sinceLast < cfg.everyLevels) return false;
  return now - s.lastShownAt >= cfg.minSecondsBetween * 1000;
}

export function markInterstitialShown(now: number): InterstitialState {
  return { sinceLast: 0, lastShownAt: now };
}
