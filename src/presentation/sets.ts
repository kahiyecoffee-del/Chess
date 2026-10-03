// Değiştirilebilir görsel setler (Unity'deki ScriptableObject "set" fikrinin karşılığı).
// Kozmetik mağaza (Aşama 3) yeni setleri buraya ekleyecek; görsel katman yalnızca bu tanımları okur.

export interface MaterialDef {
  color: string;
  roughness: number;
  metalness: number;
}

export interface PieceSetDef {
  id: string;
  white: MaterialDef;
  black: MaterialDef;
}

export interface BoardSetDef {
  id: string;
  light: MaterialDef;
  dark: MaterialDef;
  frame: MaterialDef;
  plinth: MaterialDef; // çerçevenin altındaki kaide
}

export const PIECE_SETS: Record<string, PieceSetDef> = {
  candy: {
    id: 'candy',
    white: { color: '#fffaf0', roughness: 0.28, metalness: 0 },
    black: { color: '#4a2f7a', roughness: 0.26, metalness: 0.02 },
  },
  classic: {
    id: 'classic',
    white: { color: '#efe4cf', roughness: 0.42, metalness: 0.02 },
    black: { color: '#2c2420', roughness: 0.32, metalness: 0.08 },
  },
};

export const BOARD_SETS: Record<string, BoardSetDef> = {
  toybox: {
    id: 'toybox',
    light: { color: '#fff1d6', roughness: 0.5, metalness: 0 },
    dark: { color: '#f2a65a', roughness: 0.48, metalness: 0 },
    frame: { color: '#7b5cff', roughness: 0.32, metalness: 0.02 },
    plinth: { color: '#5a3fd1', roughness: 0.4, metalness: 0 },
  },
  walnut: {
    id: 'walnut',
    light: { color: '#e6d2ad', roughness: 0.62, metalness: 0 },
    dark: { color: '#9a6a45', roughness: 0.58, metalness: 0 },
    frame: { color: '#4b2e1f', roughness: 0.5, metalness: 0.05 },
    plinth: { color: '#3a2318', roughness: 0.55, metalness: 0 },
  },
};

export const DEFAULT_PIECE_SET = 'candy';
export const DEFAULT_BOARD_SET = 'toybox';
