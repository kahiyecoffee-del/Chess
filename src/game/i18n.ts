// Tüm oyuncuya görünen metinler burada. Yeni diller aynı anahtarlarla eklenecek.

const en = {
  appName: 'Checkmate Quest',
  level: 'Level {n}',
  levels: 'Levels',
  retry: 'Retry',
  next: 'Next level',
  close: 'Close',
  youPlayWhite: 'You play White',
  youPlayBlack: 'You play Black',
  yourMove: 'Your move',
  opponentMoving: 'Opponent is moving…',
  correct: 'Good move. Keep going.',
  wrong: 'Not that one. Try again.',
  solved: 'Solved!',
  solvedPerfect: 'Solved with no mistakes',
  solvedMistakes: 'Solved with {n} mistake(s)',
  choosePromotion: 'Promote to',
  loadError: 'This puzzle could not be loaded. Skipping it.',
  'goal.mateIn1': 'Checkmate in 1 move',
  'goal.mateIn2': 'Checkmate in 2 moves',
  'goal.mateIn3': 'Checkmate in 3 moves',
  'goal.fork': 'Find the fork',
  'goal.pin': 'Use the pin',
  'goal.skewer': 'Find the skewer',
  'goal.discoveredAttack': 'Find the discovered attack',
  'goal.hangingPiece': 'Win the loose piece',
  'goal.sacrifice': 'Find the sacrifice',
  'goal.promotion': 'Promote your pawn',
  'goal.advantage': 'Win material',
  levelsTitle: 'Choose a level',
  credits: 'Every puzzle was generated and verified by our own engine.',
};

export type TextKey = keyof typeof en;
const tables: Record<string, Record<string, string>> = { en };
let current = 'en';

export function setLanguage(lang: string): void {
  if (tables[lang]) current = lang;
}

export function t(key: TextKey | string, vars: Record<string, string | number> = {}): string {
  const raw = tables[current][key] ?? tables.en[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
