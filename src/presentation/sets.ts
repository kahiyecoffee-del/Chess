// Değiştirilebilir görsel setler (Unity'deki ScriptableObject "set" fikrinin karşılığı).
// Kozmetik mağaza (Aşama 3) yeni setleri buraya ekleyecek; görsel katman yalnızca bu tanımları okur.

export interface MaterialDef {
  color: string;
  roughness: number;
  metalness: number;
  clearcoat?: number; // lake / cila katmanı
  clearcoatRoughness?: number;
  sheen?: number;
}

export interface PieceSetDef {
  id: string;
  white: MaterialDef;
  black: MaterialDef;
}

/** Tahta karelerinin dokusu kodla çizilir: iki ton ve damar rengi. */
export interface SurfaceDef {
  base: string;
  grain: string;
}

export interface BoardSetDef {
  id: string;
  light: SurfaceDef;
  dark: SurfaceDef;
  surface: MaterialDef; // karelerin malzeme özellikleri (renk dokudan gelir)
  frame: MaterialDef & { base: string; grain: string };
  inlay: MaterialDef; // çerçevedeki ince kakma şerit
  label: string; // koordinat harfleri
}

export const PIECE_SETS: Record<string, PieceSetDef> = {
  tournament: {
    id: 'tournament',
    white: { color: '#f4ead8', roughness: 0.32, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.12, sheen: 0.2 },
    black: { color: '#1f1a24', roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 },
  },
  candy: {
    id: 'candy',
    white: { color: '#fffaf0', roughness: 0.28, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 },
    black: { color: '#4a2f7a', roughness: 0.26, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 },
  },
};

export const BOARD_SETS: Record<string, BoardSetDef> = {
  royal: {
    id: 'royal',
    light: { base: '#dcbc8a', grain: '#b8925e' },
    dark: { base: '#7e4a2b', grain: '#552e18' },
    surface: { color: '#ffffff', roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.18 },
    frame: { color: '#ffffff', roughness: 0.45, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.2, base: '#262a36', grain: '#1b1e28' },
    inlay: { color: '#ffb547', roughness: 0.3, metalness: 1 },
    label: '#ffd28a',
  },
};

export const DEFAULT_PIECE_SET = 'tournament';
export const DEFAULT_BOARD_SET = 'royal';
