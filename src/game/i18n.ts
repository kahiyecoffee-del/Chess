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
  map: 'Map',
  playLevel: 'Play level {n}',
  livesFull: 'Full',
  livesLabel: '{n} lives',
  triesLabel: '{n} tries left',
  lockedLevel: 'Level {n} is locked',
  stars: '{n} of 3 stars',
  'world.village': 'Village',
  'world.castle': 'Castle',
  'world.desert': 'Desert Palace',
  'world.ice': 'Ice Kingdom',
  'world.space': 'Space Arena',
  'world.jungle': 'Jungle Ruins',
  'world.reef': 'Coral Reef',
  'world.clouds': 'Cloud Kingdom',
  'world.lantern': 'Lantern Town',
  'world.volcano': 'Volcano Peak',
  worldLevels: 'Levels {a}–{b}',
  outOfTriesTitle: 'Out of tries!',
  outOfTriesText: 'Watch a short ad to get {n} more tries and keep this puzzle. Or give up and lose a life.',
  watchAdTries: 'Watch ad: +{n} tries',
  giveUp: 'Give up',
  loseLifeNote: 'Costs 1 life',
  noLivesTitle: 'No lives left',
  noLivesText: 'A new life arrives in {time}.',
  watchAdLife: 'Watch ad: +1 life',
  ok: 'OK',
  leaveTitle: 'Leave this level?',
  leaveText: 'You made a mistake here, so leaving costs a life.',
  stay: 'Keep playing',
  leave: 'Leave',
  backToMap: 'Map',
  adTitle: 'Test ad',
  adReward: 'Real ads come later. Wait for the timer to get your reward.',
  adNoReward: 'The ad was closed early, so there is no reward.',
  greatJob: 'Great job!',
  perfect: 'Perfect!',
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
