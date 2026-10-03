// Reklam soyutlaması. Oyun yalnızca bu arayüzü bilir; AdMob/LevelPlay uygulaması sonra eklenecek
// (yalnızca test ID'leriyle). Şimdilik ekranda "test reklamı" gösteren sahte uygulama kullanılır.

export type RewardedPlacement = 'extra_tries' | 'refill_life' | 'double_reward' | 'free_hint' | 'daily_chest';
export type AdResult = 'rewarded' | 'dismissed' | 'unavailable';

export interface IAdService {
  isRewardedReady(placement: RewardedPlacement): boolean;
  /** Ödüllü reklamı gösterir; ödül yalnızca 'rewarded' dönerse verilir. */
  showRewarded(placement: RewardedPlacement): Promise<AdResult>;
  /** Seviye arası reklam (kuralları çağıran taraf uygular). */
  showInterstitial(): Promise<void>;
}

/** Geliştirme için sahte reklam: geri sayım biter → ödül; erken kapatılırsa ödül yok. */
export class MockAdService implements IAdService {
  constructor(private seconds: number, private labels: () => { title: string; close: string; reward: string }) {}

  isRewardedReady(): boolean {
    return true;
  }

  showRewarded(placement: RewardedPlacement): Promise<AdResult> {
    const labels = this.labels();
    return new Promise((resolve) => {
      const root = document.createElement('div');
      root.className = 'mock-ad';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-label', labels.title);
      root.innerHTML = `
        <button class="mock-ad-close" type="button" aria-label="${labels.close}">×</button>
        <div class="mock-ad-body">
          <div class="mock-ad-tag">${labels.title}</div>
          <div class="mock-ad-count" aria-live="polite">${this.seconds}</div>
          <div class="mock-ad-bar"><i></i></div>
          <div class="mock-ad-note">${labels.reward}</div>
          <div class="mock-ad-placement">${placement}</div>
        </div>`;
      document.body.appendChild(root);
      const count = root.querySelector('.mock-ad-count')!;
      const bar = root.querySelector<HTMLElement>('.mock-ad-bar i')!;
      const started = performance.now();
      const finish = (r: AdResult) => {
        clearInterval(timer);
        root.remove();
        resolve(r);
      };
      const timer = setInterval(() => {
        const t = (performance.now() - started) / 1000;
        count.textContent = String(Math.max(0, Math.ceil(this.seconds - t)));
        bar.style.width = `${Math.min(100, (t / this.seconds) * 100)}%`;
        if (t >= this.seconds) finish('rewarded');
      }, 100);
      root.querySelector('.mock-ad-close')!.addEventListener('click', () => finish('dismissed'));
    });
  }

  async showInterstitial(): Promise<void> {}
}
