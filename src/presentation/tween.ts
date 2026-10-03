// Küçük, bağımlılıksız animasyon sistemi. Zaman ölçeği (yavaş çekim) destekler.

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  // Ağırlıklı iniş: sonda hafifçe hızlanıp oturur.
  heavy: (t: number) => (t < 0.7 ? ease.inOutCubic(t / 0.7) * 0.92 : 0.92 + 0.08 * ease.outQuad((t - 0.7) / 0.3)),
};

interface Active {
  elapsed: number;
  duration: number;
  ease: Ease;
  update: (k: number, t: number) => void;
  resolve: () => void;
  unscaled: boolean;
}

export class Tweener {
  timeScale = 1;
  private active: Active[] = [];
  private frameHooks = new Set<(dt: number) => void>();

  /** `update(k)` her karede 0..1 arası (eased) değerle çağrılır. */
  tween(duration: number, update: (k: number, t: number) => void, e: Ease = ease.inOutCubic,
    unscaled = false): Promise<void> {
    return new Promise((resolve) => {
      if (duration <= 0) { update(1, 1); resolve(); return; }
      this.active.push({ elapsed: 0, duration, ease: e, update, resolve, unscaled });
    });
  }

  wait(seconds: number): Promise<void> {
    return this.tween(seconds, () => {});
  }

  /** Her karede çalışan sürekli kanca (ör. nabız efekti). Geri dönen fonksiyon kaldırır. */
  onFrame(fn: (dt: number) => void): () => void {
    this.frameHooks.add(fn);
    return () => this.frameHooks.delete(fn);
  }

  /** Süren tüm animasyonları uygulamadan bitirir (bekleyen promise'ler çözülür). */
  cancelAll(): void {
    const active = this.active;
    this.active = [];
    this.timeScale = 1;
    for (const a of active) a.resolve();
  }

  get busy(): boolean {
    return this.active.length > 0;
  }

  step(realDt: number): void {
    const dt = realDt * this.timeScale;
    for (const fn of this.frameHooks) fn(dt);
    const done: Active[] = [];
    for (const a of this.active) {
      a.elapsed += a.unscaled ? realDt : dt;
      const t = Math.min(1, a.elapsed / a.duration);
      a.update(a.ease(t), t);
      if (t >= 1) done.push(a);
    }
    if (done.length) {
      this.active = this.active.filter((a) => !done.includes(a));
      for (const a of done) a.resolve();
    }
  }
}
