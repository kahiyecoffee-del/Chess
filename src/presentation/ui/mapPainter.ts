// Harita arazisini canvas'a çizer: zemin dokusu, arazi öğeleri, taş döşeli yol ve süslemeler.
// Her şey dünya numarasından türetilen tohumla belirlenir; aynı dünya her zaman aynı görünür.

import { WorldTheme } from '../../game/worlds';

export type Rng = () => number;

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), a | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

type G = CanvasRenderingContext2D;

// ---- Renk yardımcıları ----

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Rengi açar (k>0) ya da koyulaştırır (k<0). */
export function shade(hex: string, k: number, alpha = 1): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
  return `rgba(${f(r)},${f(g)},${f(b)},${alpha})`;
}

// ---- Öğeler (x, y = tabanın ortası; s = ölçek px) ----

function groundShadow(g: G, x: number, y: number, w: number): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, w);
  grad.addColorStop(0, 'rgba(20,10,40,0.28)');
  grad.addColorStop(1, 'rgba(20,10,40,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(x, y, w, w * 0.35, 0, 0, Math.PI * 2);
  g.fill();
}

function ball(g: G, x: number, y: number, r: number, color: string): void {
  const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
  grad.addColorStop(0, shade(color, 0.35));
  grad.addColorStop(0.6, color);
  grad.addColorStop(1, shade(color, -0.35));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function tree(g: G, x: number, y: number, s: number, color: string): void {
  groundShadow(g, x + s * 0.1, y, s * 0.55);
  const tg = g.createLinearGradient(x - s * 0.08, 0, x + s * 0.08, 0);
  tg.addColorStop(0, '#8a5a36');
  tg.addColorStop(1, '#5a3620');
  g.fillStyle = tg;
  g.beginPath();
  g.roundRect(x - s * 0.07, y - s * 0.55, s * 0.14, s * 0.55, s * 0.04);
  g.fill();
  ball(g, x - s * 0.22, y - s * 0.62, s * 0.3, shade(color, -0.08));
  ball(g, x + s * 0.22, y - s * 0.6, s * 0.28, shade(color, -0.12));
  ball(g, x, y - s * 0.85, s * 0.36, color);
}

function pine(g: G, x: number, y: number, s: number, color: string, snow: boolean): void {
  groundShadow(g, x + s * 0.08, y, s * 0.42);
  g.fillStyle = '#5a3620';
  g.fillRect(x - s * 0.05, y - s * 0.2, s * 0.1, s * 0.2);
  for (let i = 0; i < 3; i++) {
    const w = s * (0.42 - i * 0.1), top = y - s * (0.55 + i * 0.32), base = y - s * (0.15 + i * 0.3);
    const grad = g.createLinearGradient(x - w, 0, x + w, 0);
    grad.addColorStop(0, shade(color, 0.15));
    grad.addColorStop(1, shade(color, -0.3));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x, top);
    g.quadraticCurveTo(x + w * 0.6, base - s * 0.05, x + w, base);
    g.lineTo(x - w, base);
    g.quadraticCurveTo(x - w * 0.6, base - s * 0.05, x, top);
    g.fill();
    if (snow) {
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(x + w * 0.35, top + (base - top) * 0.38);
      g.quadraticCurveTo(x, top + (base - top) * 0.5, x - w * 0.35, top + (base - top) * 0.38);
      g.fill();
    }
  }
}

function bush(g: G, x: number, y: number, s: number, color: string): void {
  groundShadow(g, x, y, s * 0.5);
  ball(g, x - s * 0.22, y - s * 0.18, s * 0.22, shade(color, -0.1));
  ball(g, x + s * 0.2, y - s * 0.16, s * 0.2, shade(color, -0.15));
  ball(g, x, y - s * 0.28, s * 0.26, color);
}

function rock(g: G, x: number, y: number, s: number, color: string): void {
  groundShadow(g, x, y, s * 0.5);
  const grad = g.createLinearGradient(x - s * 0.4, y - s * 0.5, x + s * 0.4, y);
  grad.addColorStop(0, shade(color, 0.3));
  grad.addColorStop(1, shade(color, -0.35));
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(x - s * 0.45, y);
  g.lineTo(x - s * 0.35, y - s * 0.3);
  g.lineTo(x - s * 0.05, y - s * 0.48);
  g.lineTo(x + s * 0.3, y - s * 0.36);
  g.lineTo(x + s * 0.45, y);
  g.closePath();
  g.fill();
}

function flowers(g: G, x: number, y: number, s: number, r: Rng): void {
  const colors = ['#ff6f91', '#ffd23f', '#ffffff', '#b28dff'];
  for (let i = 0; i < 6; i++) {
    const fx = x + (r() - 0.5) * s, fy = y + (r() - 0.5) * s * 0.4;
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    g.beginPath();
    g.arc(fx, fy, 2 + r() * 2, 0, Math.PI * 2);
    g.fill();
  }
}

function pond(g: G, x: number, y: number, s: number, water: string): void {
  g.fillStyle = shade(water, -0.4, 0.35);
  g.beginPath();
  g.ellipse(x, y + 3, s, s * 0.45, 0, 0, Math.PI * 2);
  g.fill();
  const grad = g.createLinearGradient(0, y - s * 0.45, 0, y + s * 0.45);
  grad.addColorStop(0, shade(water, 0.25));
  grad.addColorStop(1, shade(water, -0.2));
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(x, y, s * 0.95, s * 0.4, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(x - s * 0.2, y - s * 0.08, s * 0.35, s * 0.08, 0, Math.PI * 1.1, Math.PI * 1.7);
  g.stroke();
}

function house(g: G, x: number, y: number, s: number, roof: string): void {
  groundShadow(g, x, y, s * 0.6);
  const wall = g.createLinearGradient(x - s * 0.4, 0, x + s * 0.4, 0);
  wall.addColorStop(0, '#fff3dc');
  wall.addColorStop(1, '#e2c9a0');
  g.fillStyle = wall;
  g.fillRect(x - s * 0.38, y - s * 0.5, s * 0.76, s * 0.5);
  g.fillStyle = shade(roof, -0.1);
  g.beginPath();
  g.moveTo(x - s * 0.48, y - s * 0.48);
  g.lineTo(x, y - s * 0.9);
  g.lineTo(x + s * 0.48, y - s * 0.48);
  g.closePath();
  g.fill();
  g.fillStyle = shade(roof, 0.25);
  g.beginPath();
  g.moveTo(x - s * 0.48, y - s * 0.48);
  g.lineTo(x, y - s * 0.9);
  g.lineTo(x - s * 0.05, y - s * 0.48);
  g.closePath();
  g.fill();
  g.fillStyle = '#6b4226';
  g.fillRect(x - s * 0.08, y - s * 0.28, s * 0.16, s * 0.28);
  g.fillStyle = '#9fd8ff';
  g.fillRect(x + s * 0.16, y - s * 0.38, s * 0.12, s * 0.12);
}

function tower(g: G, x: number, y: number, s: number, stone: string, roof: string): void {
  groundShadow(g, x, y, s * 0.45);
  const body = g.createLinearGradient(x - s * 0.22, 0, x + s * 0.22, 0);
  body.addColorStop(0, shade(stone, 0.25));
  body.addColorStop(0.55, stone);
  body.addColorStop(1, shade(stone, -0.35));
  g.fillStyle = body;
  g.fillRect(x - s * 0.22, y - s * 0.9, s * 0.44, s * 0.9);
  g.fillStyle = shade(stone, -0.25);
  for (let i = -2; i <= 2; i += 2) g.fillRect(x + i * s * 0.09 - s * 0.05, y - s * 0.98, s * 0.1, s * 0.1);
  const r = g.createLinearGradient(x - s * 0.28, 0, x + s * 0.28, 0);
  r.addColorStop(0, shade(roof, 0.25));
  r.addColorStop(1, shade(roof, -0.3));
  g.fillStyle = r;
  g.beginPath();
  g.moveTo(x - s * 0.28, y - s * 0.95);
  g.lineTo(x, y - s * 1.45);
  g.lineTo(x + s * 0.28, y - s * 0.95);
  g.closePath();
  g.fill();
  g.strokeStyle = '#5a3620';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x, y - s * 1.45);
  g.lineTo(x, y - s * 1.65);
  g.stroke();
  g.fillStyle = '#ffd23f';
  g.beginPath();
  g.moveTo(x, y - s * 1.65);
  g.lineTo(x + s * 0.2, y - s * 1.58);
  g.lineTo(x, y - s * 1.51);
  g.fill();
  g.fillStyle = '#3b2a5e';
  g.beginPath();
  g.roundRect(x - s * 0.06, y - s * 0.6, s * 0.12, s * 0.18, [s * 0.06, s * 0.06, 0, 0]);
  g.fill();
}

function cactus(g: G, x: number, y: number, s: number, color: string): void {
  groundShadow(g, x, y, s * 0.4);
  const draw = (cx: number, top: number, bottom: number, w: number) => {
    const grad = g.createLinearGradient(cx - w, 0, cx + w, 0);
    grad.addColorStop(0, shade(color, 0.2));
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, shade(color, -0.35));
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(cx - w, top, w * 2, bottom - top, w);
    g.fill();
  };
  draw(x, y - s, y, s * 0.12);
  draw(x - s * 0.28, y - s * 0.7, y - s * 0.35, s * 0.08);
  draw(x + s * 0.28, y - s * 0.8, y - s * 0.45, s * 0.08);
  g.fillStyle = color;
  g.fillRect(x - s * 0.28, y - s * 0.43, s * 0.2, s * 0.1);
  g.fillRect(x + s * 0.08, y - s * 0.53, s * 0.2, s * 0.1);
}

function palm(g: G, x: number, y: number, s: number): void {
  groundShadow(g, x + s * 0.2, y, s * 0.5);
  g.strokeStyle = '#a8743f';
  g.lineWidth = s * 0.09;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + s * 0.05, y - s * 0.6, x + s * 0.2, y - s * 1.0);
  g.stroke();
  const cx = x + s * 0.2, cy = y - s * 1.0;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55;
    g.fillStyle = i % 2 ? '#2f9e5a' : '#3fbf6e';
    g.beginPath();
    g.moveTo(cx, cy);
    g.quadraticCurveTo(cx + Math.cos(a - 0.3) * s * 0.4, cy + Math.sin(a - 0.3) * s * 0.4,
      cx + Math.cos(a) * s * 0.55, cy + Math.sin(a) * s * 0.55 + s * 0.12);
    g.quadraticCurveTo(cx + Math.cos(a + 0.3) * s * 0.3, cy + Math.sin(a + 0.3) * s * 0.3, cx, cy);
    g.fill();
  }
}

function crystal(g: G, x: number, y: number, s: number, color: string): void {
  const glow = g.createRadialGradient(x, y - s * 0.4, 0, x, y - s * 0.4, s * 0.9);
  glow.addColorStop(0, shade(color, 0.3, 0.45));
  glow.addColorStop(1, shade(color, 0, 0));
  g.fillStyle = glow;
  g.fillRect(x - s, y - s * 1.3, s * 2, s * 1.6);
  const shard = (cx: number, h: number, w: number, tilt: number) => {
    g.save();
    g.translate(cx, y);
    g.rotate(tilt);
    g.fillStyle = shade(color, -0.15);
    g.beginPath();
    g.moveTo(-w, 0); g.lineTo(-w, -h * 0.7); g.lineTo(0, -h); g.lineTo(0, 0);
    g.fill();
    g.fillStyle = shade(color, 0.35);
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(0, -h); g.lineTo(w, -h * 0.7); g.lineTo(w, 0);
    g.fill();
    g.restore();
  };
  shard(x - s * 0.22, s * 0.6, s * 0.12, -0.3);
  shard(x + s * 0.22, s * 0.7, s * 0.12, 0.25);
  shard(x, s, s * 0.16, 0);
}

function planet(g: G, x: number, y: number, s: number, color: string, ring: boolean): void {
  if (ring) {
    g.strokeStyle = 'rgba(255,214,120,0.75)';
    g.lineWidth = s * 0.06;
    g.beginPath();
    g.ellipse(x, y, s * 0.75, s * 0.2, -0.25, Math.PI, Math.PI * 2);
    g.stroke();
  }
  ball(g, x, y, s * 0.42, color);
  if (ring) {
    g.beginPath();
    g.ellipse(x, y, s * 0.75, s * 0.2, -0.25, 0, Math.PI);
    g.stroke();
  }
}

function mushroom(g: G, x: number, y: number, s: number, color: string): void {
  groundShadow(g, x, y, s * 0.45);
  g.fillStyle = '#fff1dc';
  g.beginPath();
  g.roundRect(x - s * 0.11, y - s * 0.5, s * 0.22, s * 0.5, s * 0.08);
  g.fill();
  const grad = g.createRadialGradient(x - s * 0.15, y - s * 0.75, s * 0.05, x, y - s * 0.55, s * 0.5);
  grad.addColorStop(0, shade(color, 0.3));
  grad.addColorStop(1, shade(color, -0.3));
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(x, y - s * 0.5, s * 0.45, s * 0.35, 0, Math.PI, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [dx, dy, r] of [[-0.2, -0.62, 0.06], [0.08, -0.72, 0.07], [0.25, -0.58, 0.05]]) {
    g.beginPath();
    g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    g.fill();
  }
}

function coral(g: G, x: number, y: number, s: number, color: string): void {
  g.strokeStyle = color;
  g.lineCap = 'round';
  const branch = (bx: number, by: number, a: number, len: number, depth: number) => {
    const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
    g.lineWidth = Math.max(2, s * 0.05 * depth);
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(ex, ey);
    g.stroke();
    if (depth > 1) {
      branch(ex, ey, a - 0.45, len * 0.7, depth - 1);
      branch(ex, ey, a + 0.45, len * 0.7, depth - 1);
    }
  };
  branch(x, y, -Math.PI / 2, s * 0.35, 3);
}

function cloud(g: G, x: number, y: number, s: number): void {
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [dx, dy, r] of [[-0.3, 0, 0.22], [0, -0.12, 0.3], [0.3, 0, 0.22], [0.1, 0.05, 0.24]]) {
    g.beginPath();
    g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    g.fill();
  }
}

function lantern(g: G, x: number, y: number, s: number, color: string): void {
  const glow = g.createRadialGradient(x, y - s * 0.5, 0, x, y - s * 0.5, s);
  glow.addColorStop(0, shade(color, 0.4, 0.55));
  glow.addColorStop(1, shade(color, 0, 0));
  g.fillStyle = glow;
  g.fillRect(x - s, y - s * 1.5, s * 2, s * 2);
  g.strokeStyle = '#3b2a5e';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - s * 0.2);
  g.stroke();
  ball(g, x, y - s * 0.5, s * 0.28, color);
}

function lavaRock(g: G, x: number, y: number, s: number): void {
  rock(g, x, y, s, '#5b3a3a');
  g.strokeStyle = '#ffb347';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - s * 0.2, y - s * 0.05);
  g.lineTo(x - s * 0.05, y - s * 0.25);
  g.lineTo(x + s * 0.12, y - s * 0.18);
  g.stroke();
}

// ---- Dünya tarifleri ----

export type Item = { kind: string; x: number; y: number; s: number; v: number };

interface Recipe {
  items: [kind: string, weight: number, minSize: number, maxSize: number][];
  texture: 'grass' | 'sand' | 'snow' | 'stars' | 'water' | 'none';
  blobs: number; // zemin ton lekeleri
}

const RECIPES: Record<string, Recipe> = {
  village: { items: [['tree', 5, 46, 70], ['bush', 3, 24, 36], ['house', 1.2, 40, 52], ['flowers', 3, 30, 40], ['pond', 0.7, 34, 48], ['rock', 1, 18, 26]], texture: 'grass', blobs: 10 },
  castle: { items: [['tower', 2, 34, 48], ['pine', 3, 40, 60], ['bush', 2, 22, 32], ['rock', 1.5, 20, 30], ['flowers', 2, 30, 40]], texture: 'grass', blobs: 10 },
  desert: { items: [['cactus', 3, 34, 52], ['palm', 2, 50, 70], ['rock', 2.5, 18, 30], ['pond', 0.5, 30, 40]], texture: 'sand', blobs: 14 },
  ice: { items: [['snowpine', 4, 44, 66], ['crystal', 3, 30, 46], ['rock', 1, 18, 26], ['pond', 0.8, 34, 50]], texture: 'snow', blobs: 10 },
  space: { items: [['planet', 2, 30, 56], ['ringplanet', 1, 40, 60], ['crystal', 2, 24, 36], ['rock', 1.5, 18, 28]], texture: 'stars', blobs: 8 },
  jungle: { items: [['tree', 4, 50, 76], ['mushroom', 3, 24, 38], ['bush', 3, 26, 38], ['flowers', 2, 30, 40], ['pond', 0.8, 34, 48]], texture: 'grass', blobs: 12 },
  reef: { items: [['coral', 4, 30, 46], ['rock', 2, 18, 30], ['mushroom', 1, 20, 30]], texture: 'water', blobs: 12 },
  clouds: { items: [['cloud', 5, 46, 76], ['tower', 1, 30, 40], ['crystal', 1, 24, 32]], texture: 'none', blobs: 14 },
  lantern: { items: [['lantern', 4, 26, 40], ['house', 2, 38, 50], ['tree', 2, 40, 56], ['flowers', 1, 30, 40]], texture: 'grass', blobs: 10 },
  volcano: { items: [['lavarock', 4, 24, 40], ['rock', 3, 22, 34], ['crystal', 1, 24, 32]], texture: 'sand', blobs: 12 },
};

/** Bir dünyadaki tüm süs öğelerinin yerleşimi (yolu kapatmayacak şekilde). */
export function layoutItems(theme: WorldTheme, seed: number, width: number, height: number,
  pathX: (y: number) => number): Item[] {
  const recipe = RECIPES[theme.key];
  const r = rng(seed);
  const total = recipe.items.reduce((a, it) => a + it[1], 0);
  const items: Item[] = [];
  const count = Math.round((height / 1000) * (width / 390) * 26);
  for (let i = 0; i < count * 3 && items.length < count; i++) {
    const y = 40 + r() * (height - 40);
    const x = r() * width;
    // Yoldan uzak dur.
    if (Math.abs(x - pathX(y)) < 62) continue;
    let pick = r() * total;
    const def = recipe.items.find((it) => (pick -= it[1]) <= 0) ?? recipe.items[0];
    items.push({ kind: def[0], x, y, s: def[2] + r() * (def[3] - def[2]), v: r() });
  }
  return items.sort((a, b) => a.y - b.y); // arkadakiler önce
}

export function drawItem(g: G, it: Item, theme: WorldTheme, r: Rng): void {
  const greens = ['#3fb36b', '#4cc27a', '#2f9e5a', '#5fcf6f'];
  const v = it.v;
  switch (it.kind) {
    case 'tree': tree(g, it.x, it.y, it.s, theme.key === 'jungle' ? shade(greens[2], -0.1) : greens[Math.floor(v * 4)]); break;
    case 'pine': pine(g, it.x, it.y, it.s, '#2f8f5a', false); break;
    case 'snowpine': pine(g, it.x, it.y, it.s, '#2f7f6a', true); break;
    case 'bush': bush(g, it.x, it.y, it.s, greens[Math.floor(v * 4)]); break;
    case 'rock': rock(g, it.x, it.y, it.s, theme.key === 'space' ? '#6b5aa6' : theme.key === 'ice' ? '#9fb7c9' : '#9a8f86'); break;
    case 'flowers': flowers(g, it.x, it.y, it.s, r); break;
    case 'pond': pond(g, it.x, it.y, it.s, theme.key === 'ice' ? '#8fd6ff' : '#4fb8e8'); break;
    case 'house': house(g, it.x, it.y, it.s, ['#e2574c', '#5b7bd5', '#e89a3c'][Math.floor(v * 3)]); break;
    case 'tower': tower(g, it.x, it.y, it.s, '#d9d2e9', ['#7b5cff', '#e2574c', '#2ec4b6'][Math.floor(v * 3)]); break;
    case 'cactus': cactus(g, it.x, it.y, it.s, '#3fa86a'); break;
    case 'palm': palm(g, it.x, it.y, it.s); break;
    case 'crystal': crystal(g, it.x, it.y, it.s, theme.key === 'space' ? '#c38bff' : theme.key === 'volcano' ? '#ff7a59' : '#7fd4ff'); break;
    case 'planet': planet(g, it.x, it.y, it.s, ['#ff7bd5', '#4dd2ff', '#ffb347'][Math.floor(v * 3)], false); break;
    case 'ringplanet': planet(g, it.x, it.y, it.s, ['#9b7bff', '#ff8a65'][Math.floor(v * 2)], true); break;
    case 'mushroom': mushroom(g, it.x, it.y, it.s, ['#ff5c5c', '#ff8a3d', '#b05cff'][Math.floor(v * 3)]); break;
    case 'coral': coral(g, it.x, it.y, it.s, ['#ff6f91', '#ffb347', '#b28dff'][Math.floor(v * 3)]); break;
    case 'cloud': cloud(g, it.x, it.y, it.s); break;
    case 'lantern': lantern(g, it.x, it.y, it.s, ['#ff7b54', '#ffd23f', '#ff5c8a'][Math.floor(v * 3)]); break;
    case 'lavarock': lavaRock(g, it.x, it.y, it.s); break;
  }
}

/** Zemin: ana renk + yumuşak ton lekeleri + ince doku. Döşeme (tile) koordinatlarında çizer. */
export function drawGround(g: G, theme: WorldTheme, seed: number, width: number, sectionHeight: number,
  y0: number, y1: number): void {
  const recipe = RECIPES[theme.key];
  g.fillStyle = theme.ground;
  g.fillRect(0, y0, width, y1 - y0);
  // Kenarlara doğru hafif koyulaşma (derinlik)
  const side = g.createLinearGradient(0, 0, width, 0);
  side.addColorStop(0, shade(theme.ground, -0.18, 0.6));
  side.addColorStop(0.25, shade(theme.ground, 0, 0));
  side.addColorStop(0.75, shade(theme.ground, 0, 0));
  side.addColorStop(1, shade(theme.ground, -0.18, 0.6));
  g.fillStyle = side;
  g.fillRect(0, y0, width, y1 - y0);
  const r = rng(seed * 31 + 5);
  const blobs = Math.round((sectionHeight / 1000) * recipe.blobs);
  for (let i = 0; i < blobs; i++) {
    const bx = r() * width, by = r() * sectionHeight, br = 80 + r() * 160, light = r() > 0.5;
    if (by + br < y0 || by - br > y1) continue;
    const grad = g.createRadialGradient(bx, by, 0, bx, by, br);
    grad.addColorStop(0, shade(theme.ground, light ? 0.18 : -0.12, 0.55));
    grad.addColorStop(1, shade(theme.ground, 0, 0));
    g.fillStyle = grad;
    g.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  // İnce doku
  const tr = rng(seed * 97 + Math.floor(y0));
  const n = Math.round(((y1 - y0) * width) / 900);
  for (let i = 0; i < n; i++) {
    const x = tr() * width, y = y0 + tr() * (y1 - y0);
    switch (recipe.texture) {
      case 'grass':
        g.strokeStyle = shade(theme.ground, tr() > 0.5 ? 0.25 : -0.2, 0.5);
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (tr() - 0.5) * 3, y - 4 - tr() * 4);
        g.stroke();
        break;
      case 'sand':
        g.fillStyle = shade(theme.ground, tr() > 0.5 ? 0.3 : -0.15, 0.5);
        g.fillRect(x, y, 1.5, 1.5);
        break;
      case 'snow':
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.beginPath();
        g.arc(x, y, 0.8 + tr() * 1.4, 0, Math.PI * 2);
        g.fill();
        break;
      case 'stars':
        g.fillStyle = `rgba(255,255,255,${0.3 + tr() * 0.7})`;
        g.beginPath();
        g.arc(x, y, 0.5 + tr() * 1.3, 0, Math.PI * 2);
        g.fill();
        break;
      case 'water':
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x, y, 2 + tr() * 3, 0, Math.PI * 2);
        g.stroke();
        break;
    }
  }
}

/** Taş döşeli yol: gölge, kenar, dolgu ve kaldırım taşları. */
export function drawPath(g: G, theme: WorldTheme, pts: [number, number][]): void {
  if (pts.length < 2) return;
  const trace = () => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1], [x, y] = pts[i];
      const my = (py + y) / 2;
      g.bezierCurveTo(px, my, x, my, x, y);
    }
  };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.save();
  g.translate(0, 7);
  trace();
  g.strokeStyle = 'rgba(30,15,50,0.22)';
  g.lineWidth = 40;
  g.stroke();
  g.restore();
  trace();
  g.strokeStyle = shade(theme.path, -0.35);
  g.lineWidth = 36;
  g.stroke();
  trace();
  g.strokeStyle = theme.path;
  g.lineWidth = 29;
  g.stroke();
  // Kaldırım taşları: yol boyunca küçük yuvarlak taşlar
  g.setLineDash([9, 7]);
  trace();
  g.strokeStyle = shade(theme.path, -0.12);
  g.lineWidth = 18;
  g.stroke();
  g.setLineDash([]);
  trace();
  g.strokeStyle = shade(theme.path, 0.5, 0.35);
  g.lineWidth = 3;
  g.stroke();
}
