// Macera haritasının dünyaları. Her dünya 100 seviye; liste bitince temalar
// yeni bir numarayla prosedürel olarak devam eder (Village II, Castle II …).

export const WORLD_SIZE = 100;

export type Decor = 'tree' | 'tower' | 'cactus' | 'crystal' | 'planet' | 'mushroom' | 'shell' | 'cloud' | 'lantern' | 'flame';

export interface WorldTheme {
  key: string;
  decor: Decor;
  skyTop: string;
  skyBottom: string;
  ground: string; // harita bölümünün zemin rengi
  accent: string; // tamamlanmış düğümler
  path: string;
}

const THEMES: WorldTheme[] = [
  { key: 'village', decor: 'tree', skyTop: '#8fdcff', skyBottom: '#d9f7c9', ground: '#9fe08a', accent: '#ff6f91', path: '#fff4d6' },
  { key: 'castle', decor: 'tower', skyTop: '#b8a6ff', skyBottom: '#ffd3ea', ground: '#c9b8ff', accent: '#ffb627', path: '#fff0f8' },
  { key: 'desert', decor: 'cactus', skyTop: '#ffd27a', skyBottom: '#ffb38a', ground: '#ffd89a', accent: '#2ec4b6', path: '#fff6e0' },
  { key: 'ice', decor: 'crystal', skyTop: '#a9ecff', skyBottom: '#eefaff', ground: '#c9f1ff', accent: '#7b5cff', path: '#ffffff' },
  { key: 'space', decor: 'planet', skyTop: '#2d1d72', skyBottom: '#6b3fd1', ground: '#4a2fa3', accent: '#ffd23f', path: '#c9b8ff' },
  { key: 'jungle', decor: 'mushroom', skyTop: '#7ee0b0', skyBottom: '#d6ff9e', ground: '#7fd38a', accent: '#ff7b54', path: '#fff8dc' },
  { key: 'reef', decor: 'shell', skyTop: '#5fd3e8', skyBottom: '#b5f2ff', ground: '#7fe0e8', accent: '#ff5d8f', path: '#fffbe8' },
  { key: 'clouds', decor: 'cloud', skyTop: '#ffc6e5', skyBottom: '#e3dcff', ground: '#f5d9ff', accent: '#4cc9f0', path: '#ffffff' },
  { key: 'lantern', decor: 'lantern', skyTop: '#ff9a8b', skyBottom: '#ffd6a5', ground: '#ffc29a', accent: '#5b5fef', path: '#fff3e6' },
  { key: 'volcano', decor: 'flame', skyTop: '#ff7a59', skyBottom: '#ffc75f', ground: '#ff9d6e', accent: '#3a86ff', path: '#fff1e0' },
];

const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

export interface World {
  index: number; // 0 tabanlı
  theme: WorldTheme;
  nameKey: string; // i18n anahtarı
  suffix: string; // tekrar turu: " II" …
  firstLevel: number;
  lastLevel: number;
}

export function worldOf(level: number): number {
  return Math.floor((level - 1) / WORLD_SIZE);
}

export function world(index: number): World {
  const theme = THEMES[index % THEMES.length];
  const cycle = Math.floor(index / THEMES.length);
  return {
    index,
    theme,
    nameKey: `world.${theme.key}`,
    suffix: cycle < ROMAN.length ? ROMAN[cycle] : ` ${cycle + 1}`,
    firstLevel: index * WORLD_SIZE + 1,
    lastLevel: (index + 1) * WORLD_SIZE,
  };
}
