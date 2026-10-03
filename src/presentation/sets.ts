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
  table: string; // tahtanın altındaki zemin rengi
}

export const PIECE_SETS: Record<string, PieceSetDef> = {
  classic: {
    id: 'classic',
    white: { color: '#efe4cf', roughness: 0.42, metalness: 0.02 },
    black: { color: '#2c2420', roughness: 0.32, metalness: 0.08 },
  },
};

export const BOARD_SETS: Record<string, BoardSetDef> = {
  walnut: {
    id: 'walnut',
    light: { color: '#e6d2ad', roughness: 0.62, metalness: 0 },
    dark: { color: '#9a6a45', roughness: 0.58, metalness: 0 },
    frame: { color: '#4b2e1f', roughness: 0.5, metalness: 0.05 },
    table: '#1b2236',
  },
};

export const DEFAULT_PIECE_SET = 'classic';
export const DEFAULT_BOARD_SET = 'walnut';
