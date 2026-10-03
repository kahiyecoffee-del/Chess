// Tüm oyuncuya görünen metinler. İngilizce temel tablodur; diğer diller `locales/` altında.
// Çoğul kurallarına takılmamak için metinler "Hatalar: 2" gibi sayıdan bağımsız kurulur.

import { LOCALES_A } from './locales/a';
import { LOCALES_B } from './locales/b';
import { LOCALES_C } from './locales/c';
import { LOCALES_D } from './locales/d';

export const EN = {
  level: 'Level {n}',
  levelWord: 'Level',
  next: 'Next level',
  map: 'Map',
  close: 'Close',
  youPlayWhite: 'You play White',
  youPlayBlack: 'You play Black',
  yourMove: 'Your move',
  opponentMoving: 'Opponent is moving…',
  correct: 'Good move! Keep going.',
  wrong: 'Not that one. Try again.',
  solvedPerfect: 'No mistakes',
  solvedMistakes: 'Mistakes: {n}',
  choosePromotion: 'Promote to',
  loadError: 'Puzzles could not be loaded.',
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
  playLevel: 'Play level {n}',
  livesFull: 'Full',
  livesLabel: 'Lives: {n}',
  triesLabel: 'Tries left: {n}',
  lockedLevel: 'Level {n} is locked',
  stars: 'Stars: {n}/3',
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
  worldN: 'World {n}',
  outOfTriesTitle: 'Out of tries!',
  outOfTriesText: 'Watch a short ad to get more tries and keep this puzzle. Or give up and lose a life.',
  watchAdTries: 'Watch ad: +{n} tries',
  giveUp: 'Give up',
  loseLifeNote: 'Costs 1 life',
  noLivesTitle: 'No lives left',
  noLivesText: 'Next life in {time}',
  watchAdLife: 'Watch ad: +1 life',
  ok: 'OK',
  leaveTitle: 'Leave this level?',
  leaveText: 'You made a mistake here, so leaving costs a life.',
  stay: 'Keep playing',
  leave: 'Leave',
  adTitle: 'Test ad',
  adReward: 'Real ads come later. Wait for the timer to get your reward.',
  adNoReward: 'The ad was closed early, so there is no reward.',
  greatJob: 'Great job!',
  perfect: 'Perfect!',
  levelComplete: 'Level {n} complete',
  settings: 'Settings',
  music: 'Music',
  language: 'Language',
  languageAuto: 'Device language',
  credits: 'Every puzzle is generated and verified by our own chess engine.',
};

export type TextKey = keyof typeof EN;
export type Table = Record<TextKey, string>;

export interface Locale {
  code: string;
  name: string; // dilin kendi adı
  dir?: 'rtl';
  t: Table;
}

/** Desteklenen diller, en çok konuşulandan aza doğru. */
export const LOCALES: Locale[] = [
  { code: 'en', name: 'English', t: EN },
  ...LOCALES_A, ...LOCALES_B, ...LOCALES_C, ...LOCALES_D,
];

let current: Locale = LOCALES[0];

/** Tarayıcı dilini desteklenen bir koda eşler (zh-HK → zh-TW, pt-PT → pt …). */
export function matchLanguage(preferred: readonly string[]): string {
  const codes = LOCALES.map((l) => l.code);
  for (const raw of preferred) {
    const tag = raw.toLowerCase();
    const exact = codes.find((c) => c.toLowerCase() === tag);
    if (exact) return exact;
    if (tag.startsWith('zh')) return /tw|hk|mo|hant/.test(tag) ? 'zh-TW' : 'zh-CN';
    if (tag === 'tl' || tag.startsWith('tl-')) return 'fil';
    const base = codes.find((c) => c === tag.split('-')[0]);
    if (base) return base;
  }
  return 'en';
}

export function setLanguage(code: string): Locale {
  current = LOCALES.find((l) => l.code === code) ?? LOCALES[0];
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current.code;
    document.documentElement.dir = current.dir ?? 'ltr';
  }
  return current;
}

export function currentLanguage(): Locale {
  return current;
}

export function t(key: TextKey | string, vars: Record<string, string | number> = {}): string {
  const raw = (current.t as Record<string, string>)[key] ?? (EN as Record<string, string>)[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
