// Geçici: yalnızca son oynanan seviyeyi hatırlar. Sürümlü kayıt sistemi Aşama 2'de gelecek.

const KEY = 'cq.lastLevel';

export function loadLastLevel(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isInteger(v) && v > 0 ? v : 1;
  } catch {
    return 1;
  }
}

export function saveLastLevel(level: number): void {
  try {
    localStorage.setItem(KEY, String(level));
  } catch {
    // Depolama kapalıysa sessizce geç.
  }
}
