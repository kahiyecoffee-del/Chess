// Can sistemi: en fazla N can, her `regenMinutes` dakikada bir can dolar.
// Saf fonksiyonlar; zaman dışarıdan verilir (test edilebilir, saat hilesine karşı sunucu saatiyle de çalışır).

export interface LivesConfig {
  max: number;
  regenMinutes: number;
}

export interface LivesState {
  lives: number;
  /** Şu anki dolum sayacının başladığı an (ms). Canlar doluyken null. */
  regenStart: number | null;
}

const period = (cfg: LivesConfig) => cfg.regenMinutes * 60_000;

export const fullLives = (cfg: LivesConfig): LivesState => ({ lives: cfg.max, regenStart: null });

/** Geçen süreye göre dolan canları uygular. */
export function settleLives(s: LivesState, now: number, cfg: LivesConfig): LivesState {
  if (s.lives >= cfg.max) return { lives: Math.min(s.lives, cfg.max), regenStart: null };
  const start = s.regenStart ?? now;
  if (now < start) return { lives: s.lives, regenStart: now }; // saat geri alınmış
  const gained = Math.floor((now - start) / period(cfg));
  const lives = Math.min(cfg.max, s.lives + gained);
  return lives >= cfg.max ? { lives, regenStart: null } : { lives, regenStart: start + gained * period(cfg) };
}

export function loseLife(s: LivesState, now: number, cfg: LivesConfig): LivesState {
  const cur = settleLives(s, now, cfg);
  if (cur.lives <= 0) return cur;
  return { lives: cur.lives - 1, regenStart: cur.regenStart ?? now };
}

export function addLives(s: LivesState, amount: number, now: number, cfg: LivesConfig): LivesState {
  const cur = settleLives(s, now, cfg);
  const lives = Math.min(cfg.max, cur.lives + amount);
  return lives >= cfg.max ? { lives, regenStart: null } : { lives, regenStart: cur.regenStart ?? now };
}

/** Bir sonraki cana kalan süre (ms); canlar doluysa 0. */
export function msToNextLife(s: LivesState, now: number, cfg: LivesConfig): number {
  const cur = settleLives(s, now, cfg);
  return cur.regenStart === null ? 0 : cur.regenStart + period(cfg) - now;
}
