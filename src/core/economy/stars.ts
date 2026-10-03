/** Yıldız kuralı: 3 = ipucusuz ve hatasız; 2 = bir hata veya ipucu; 1 = çözüldü. */
export function starsFor(mistakes: number, hints = 0): 1 | 2 | 3 {
  const slips = mistakes + hints;
  return slips === 0 ? 3 : slips === 1 ? 2 : 1;
}
