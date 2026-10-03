import economy from '../../../config/economy.json';

export interface EconomyConfig {
  lives: { max: number; regenMinutes: number };
  level: { mistakesAllowed: number; adExtraMistakes: number };
  ads: { rewardedLifeAmount: number; mockAdSeconds: number };
}

/** Tüm ekonomi sayıları config/economy.json'dan gelir (Aşama 4'te Remote Config ile ezilebilir). */
export const ECONOMY: EconomyConfig = economy;
