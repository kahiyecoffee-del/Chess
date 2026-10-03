// Harita arazisini canvas'a çizer. Katmanlar: zemin lekeleri → arazi (nehir, göl, tarla, kum tepesi…)
// → taş döşeli yol ve düğüm platformları → köprüler → yoğun süsler (orman, evler, hayvanlar…) → çim ve çiçek.
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
type Pt = [number, number];

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
const pick = <T>(r: Rng, list: T[]): T => list[Math.floor(r() * list.length)];

// ---- Dünya paletleri ----

interface Palette {
  ground: string[]; // zemin tonları (lekeler için)
  foliage: string[];
  water: string;
  rock: string;
  path: string;
  pathEdge: string;
  flowers: string[];
  shadow: string; // gölge rengi (dünyaya göre tonlu)
}

const PALETTES: Record<string, Palette> = {
  village: { ground: ['#8fd16b', '#86cc63', '#9cd875', '#7fc25d'], foliage: ['#4fb55a', '#5fc463', '#43a650', '#72cc5e'], water: '#4fb8e8', rock: '#a59d94', path: '#f1dfb8', pathEdge: '#b99766', flowers: ['#ff6f91', '#ffd23f', '#ffffff', '#b28dff', '#ff9248'], shadow: '20,60,20' },
  castle: { ground: ['#9fcf7a', '#8cc46a', '#b3d98e', '#7ab35c'], foliage: ['#2f8a5a', '#3f9e6a', '#2a7a4e'], water: '#5aa9e6', rock: '#b8b0c8', path: '#e9dfd0', pathEdge: '#9c8f7c', flowers: ['#ff5c8a', '#ffffff', '#ffd23f'], shadow: '30,40,60' },
  desert: { ground: ['#f3cf8a', '#ebc27a', '#f8dca0', '#e2b56c'], foliage: ['#3fa86a', '#55b96f'], water: '#3fc3d6', rock: '#c9946a', path: '#fff0cf', pathEdge: '#c79a5c', flowers: ['#ff6f91', '#ffd23f'], shadow: '120,70,20' },
  ice: { ground: ['#e9f6ff', '#d6eefc', '#f6fbff', '#c8e4f7'], foliage: ['#2f7f6a', '#3a8f78'], water: '#8fd6ff', rock: '#9fb7c9', path: '#ffffff', pathEdge: '#9cc2dc', flowers: ['#7fd4ff', '#ffffff'], shadow: '40,80,130' },
  space: { ground: ['#2b1f63', '#33246f', '#241a55', '#3a2a7c'], foliage: ['#7b5cff'], water: '#6b4fd8', rock: '#6b5aa6', path: '#c9b8ff', pathEdge: '#7a64d6', flowers: ['#ffd23f', '#7fd4ff', '#ff7bd5'], shadow: '5,0,20' },
  jungle: { ground: ['#6cc46a', '#63bb62', '#78cc74', '#58ad58'], foliage: ['#2f8f47', '#3aa152', '#2a8040', '#47b05a'], water: '#3fb0b8', rock: '#8f9a86', path: '#ead9b0', pathEdge: '#a68a5a', flowers: ['#ff5c5c', '#ffd23f', '#ff8a3d'], shadow: '10,50,20' },
  reef: { ground: ['#5fd3e0', '#4cc4d6', '#76e0ea', '#40b3c8'], foliage: ['#2fa37a', '#3fbf8a'], water: '#2b9fc8', rock: '#e6c9a8', path: '#fff4dc', pathEdge: '#d0b088', flowers: ['#ff6f91', '#ffb347', '#b28dff'], shadow: '0,60,90' },
  clouds: { ground: ['#f3e3ff', '#e9dcff', '#fbefff', '#dcd2ff'], foliage: ['#ffb3d1', '#c9b8ff'], water: '#a8d8ff', rock: '#d6cdf0', path: '#ffffff', pathEdge: '#c3b5ea', flowers: ['#ff9ec7', '#ffd23f', '#7fd4ff'], shadow: '90,60,140' },
  lantern: { ground: ['#f0b48a', '#e8a37a', '#f6c59e', '#dc9468'], foliage: ['#ff9ec7', '#ffb3d1', '#3f9e4a'], water: '#5a8fd6', rock: '#a58a7a', path: '#fff0e0', pathEdge: '#b98a6a', flowers: ['#ff5c8a', '#ffd23f', '#ffffff'], shadow: '90,40,30' },
  volcano: { ground: ['#6b4a48', '#5a3d3c', '#7a5654', '#4c3332'], foliage: ['#3a3030'], water: '#ff7a2e', rock: '#4a3a3a', path: '#d8c2b0', pathEdge: '#7a5a48', flowers: ['#ffb347', '#ff7a2e'], shadow: '0,0,0' },
};

// ---- Temel çizim parçaları ----

function shadowBlob(g: G, x: number, y: number, w: number, p: Palette, alpha = 0.28): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, w);
  grad.addColorStop(0, `rgba(${p.shadow},${alpha})`);
  grad.addColorStop(1, `rgba(${p.shadow},0)`);
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(x, y, w, w * 0.42, 0, 0, Math.PI * 2);
  g.fill();
}

function ball(g: G, x: number, y: number, r: number, color: string, depth = 0.32): void {
  const grad = g.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.08, x, y, r * 1.05);
  grad.addColorStop(0, shade(color, 0.36));
  grad.addColorStop(0.55, color);
  grad.addColorStop(1, shade(color, -depth));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function blob(g: G, cx: number, cy: number, rx: number, ry: number, r: Rng, wobble = 0.22): void {
  const n = 9;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * wobble * 2;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    if (i === 0) g.moveTo(mx, my);
    else g.quadraticCurveTo(x0, y0, mx, my);
  }
  const [x0, y0] = pts[0], [x1, y1] = pts[1];
  g.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  g.closePath();
}

// ---- Süs öğeleri (x, y = tabanın ortası; s = ölçek) ----

function tree(g: G, x: number, y: number, s: number, color: string, p: Palette, r: Rng): void {
  shadowBlob(g, x + s * 0.25, y + 2, s * 0.6, p);
  const tg = g.createLinearGradient(x - s * 0.08, 0, x + s * 0.08, 0);
  tg.addColorStop(0, '#8a5a36');
  tg.addColorStop(1, '#4f2f1c');
  g.fillStyle = tg;
  g.beginPath();
  g.moveTo(x - s * 0.09, y);
  g.lineTo(x - s * 0.05, y - s * 0.5);
  g.lineTo(x + s * 0.05, y - s * 0.5);
  g.lineTo(x + s * 0.09, y);
  g.fill();
  const parts: [number, number, number, number][] = [
    [-0.26, -0.56, 0.27, -0.1], [0.26, -0.55, 0.26, -0.12], [0, -0.64, 0.3, -0.04],
    [-0.15, -0.86, 0.26, 0.06], [0.16, -0.85, 0.25, 0.04], [0, -1.02, 0.23, 0.14],
  ];
  for (const [dx, dy, rr, light] of parts) ball(g, x + dx * s, y + dy * s, rr * s * (0.92 + r() * 0.16), shade(color, light), 0.16);
  // Üst parlama
  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath();
  g.ellipse(x - s * 0.12, y - s * 1.08, s * 0.12, s * 0.06, -0.4, 0, Math.PI * 2);
  g.fill();
  // Meyve / çiçek noktaları
  if (r() < 0.35) {
    g.fillStyle = pick(r, ['#ff5c5c', '#ffd23f', '#ffffff']);
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(x + (r() - 0.5) * s * 0.7, y - s * (0.6 + r() * 0.45), s * 0.035, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function pine(g: G, x: number, y: number, s: number, color: string, p: Palette, snow: boolean): void {
  shadowBlob(g, x + s * 0.2, y + 2, s * 0.42, p);
  g.fillStyle = '#5a3620';
  g.fillRect(x - s * 0.05, y - s * 0.2, s * 0.1, s * 0.2);
  for (let i = 0; i < 4; i++) {
    const w = s * (0.44 - i * 0.09), top = y - s * (0.5 + i * 0.27), base = y - s * (0.14 + i * 0.25);
    const grad = g.createLinearGradient(x - w, 0, x + w, 0);
    grad.addColorStop(0, shade(color, 0.2));
    grad.addColorStop(1, shade(color, -0.3));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x, top);
    g.quadraticCurveTo(x + w * 0.6, base - s * 0.05, x + w, base);
    g.quadraticCurveTo(x, base + s * 0.05, x - w, base);
    g.quadraticCurveTo(x - w * 0.6, base - s * 0.05, x, top);
    g.fill();
    if (snow) {
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(x + w * 0.4, top + (base - top) * 0.42);
      g.quadraticCurveTo(x, top + (base - top) * 0.6, x - w * 0.4, top + (base - top) * 0.42);
      g.fill();
    }
  }
}

function bush(g: G, x: number, y: number, s: number, color: string, p: Palette, r: Rng): void {
  shadowBlob(g, x + s * 0.15, y + 1, s * 0.55, p, 0.22);
  ball(g, x - s * 0.24, y - s * 0.18, s * 0.22, shade(color, -0.04), 0.16);
  ball(g, x + s * 0.22, y - s * 0.16, s * 0.21, shade(color, -0.06), 0.16);
  ball(g, x, y - s * 0.3, s * 0.27, shade(color, 0.08), 0.16);
  if (r() < 0.5) {
    g.fillStyle = pick(r, p.flowers);
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(x + (r() - 0.5) * s * 0.6, y - s * (0.15 + r() * 0.3), s * 0.045, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function rock(g: G, x: number, y: number, s: number, color: string, p: Palette, r: Rng): void {
  shadowBlob(g, x + s * 0.15, y + 1, s * 0.5, p, 0.22);
  blob(g, x, y - s * 0.22, s * 0.42, s * 0.26, r, 0.18);
  const grad = g.createLinearGradient(x - s * 0.3, y - s * 0.5, x + s * 0.3, y);
  grad.addColorStop(0, shade(color, 0.35));
  grad.addColorStop(1, shade(color, -0.3));
  g.fillStyle = grad;
  g.fill();
}

function flower(g: G, x: number, y: number, s: number, color: string): void {
  g.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.beginPath();
    g.arc(x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5, s * 0.45, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ffd23f';
  g.beginPath();
  g.arc(x, y, s * 0.35, 0, Math.PI * 2);
  g.fill();
}

function tuft(g: G, x: number, y: number, s: number, color: string): void {
  g.strokeStyle = color;
  g.lineWidth = 1.4;
  g.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(x + i * 1.5, y);
    g.quadraticCurveTo(x + i * 2.5, y - s * 0.6, x + i * 3.5, y - s);
    g.stroke();
  }
}

function house(g: G, x: number, y: number, s: number, roof: string, p: Palette, lit = false): void {
  shadowBlob(g, x + s * 0.3, y + 2, s * 0.75, p);
  const wall = g.createLinearGradient(x - s * 0.4, 0, x + s * 0.4, 0);
  wall.addColorStop(0, '#fff6e6');
  wall.addColorStop(1, '#e0c9a4');
  g.fillStyle = wall;
  g.fillRect(x - s * 0.4, y - s * 0.52, s * 0.8, s * 0.52);
  g.fillStyle = '#8a5a36';
  g.fillRect(x + s * 0.18, y - s * 1.0, s * 0.1, s * 0.25);
  g.fillStyle = shade(roof, -0.15);
  g.beginPath();
  g.moveTo(x - s * 0.52, y - s * 0.48);
  g.lineTo(x, y - s * 0.95);
  g.lineTo(x + s * 0.52, y - s * 0.48);
  g.closePath();
  g.fill();
  g.fillStyle = shade(roof, 0.2);
  g.beginPath();
  g.moveTo(x - s * 0.52, y - s * 0.48);
  g.lineTo(x, y - s * 0.95);
  g.lineTo(x - s * 0.04, y - s * 0.48);
  g.closePath();
  g.fill();
  g.fillStyle = '#6b4226';
  g.beginPath();
  g.roundRect(x - s * 0.09, y - s * 0.3, s * 0.18, s * 0.3, [s * 0.08, s * 0.08, 0, 0]);
  g.fill();
  g.fillStyle = lit ? '#ffd86b' : '#9fd8ff';
  g.fillRect(x - s * 0.32, y - s * 0.42, s * 0.14, s * 0.12);
  g.fillRect(x + s * 0.18, y - s * 0.42, s * 0.14, s * 0.12);
  if (lit) {
    const glow = g.createRadialGradient(x, y - s * 0.35, 0, x, y - s * 0.35, s);
    glow.addColorStop(0, 'rgba(255,200,90,0.25)');
    glow.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = glow;
    g.fillRect(x - s, y - s * 1.3, s * 2, s * 2);
  }
}

function windmill(g: G, x: number, y: number, s: number, p: Palette, r: Rng): void {
  shadowBlob(g, x + s * 0.3, y + 2, s * 0.6, p);
  const body = g.createLinearGradient(x - s * 0.25, 0, x + s * 0.25, 0);
  body.addColorStop(0, '#fff6e6');
  body.addColorStop(1, '#d9c3a0');
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(x - s * 0.26, y);
  g.lineTo(x - s * 0.16, y - s * 0.9);
  g.lineTo(x + s * 0.16, y - s * 0.9);
  g.lineTo(x + s * 0.26, y);
  g.fill();
  g.fillStyle = '#c0504a';
  g.beginPath();
  g.moveTo(x - s * 0.22, y - s * 0.88);
  g.lineTo(x, y - s * 1.1);
  g.lineTo(x + s * 0.22, y - s * 0.88);
  g.fill();
  const cx = x, cy = y - s * 0.92, a0 = r() * Math.PI;
  for (let i = 0; i < 4; i++) {
    const a = a0 + (i * Math.PI) / 2;
    g.save();
    g.translate(cx, cy);
    g.rotate(a);
    g.fillStyle = '#fffaf0';
    g.fillRect(-s * 0.03, -s * 0.7, s * 0.14, s * 0.62);
    g.strokeStyle = '#8a5a36';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -s * 0.72);
    g.stroke();
    g.restore();
  }
  ball(g, cx, cy, s * 0.06, '#8a5a36');
}

function sheep(g: G, x: number, y: number, s: number, p: Palette, r: Rng): void {
  shadowBlob(g, x + 2, y + 1, s * 0.5, p, 0.2);
  const dir = r() < 0.5 ? -1 : 1;
  g.fillStyle = '#3a3030';
  g.fillRect(x - s * 0.22, y - s * 0.2, s * 0.06, s * 0.2);
  g.fillRect(x + s * 0.16, y - s * 0.2, s * 0.06, s * 0.2);
  for (const [dx, dy, rr] of [[-0.18, -0.3, 0.17], [0.05, -0.36, 0.2], [0.2, -0.3, 0.16], [0, -0.24, 0.18]]) ball(g, x + dx * s, y + dy * s, rr * s, '#fbfbf7');
  ball(g, x + dir * s * 0.34, y - s * 0.34, s * 0.11, '#3a3030');
}

function field(g: G, x: number, y: number, w: number, h: number, color: string, r: Rng): void {
  g.save();
  g.translate(x, y);
  g.rotate((r() - 0.5) * 0.25);
  g.fillStyle = shade(color, -0.1);
  g.beginPath();
  g.roundRect(-w / 2, -h / 2, w, h, 10);
  g.fill();
  g.strokeStyle = shade(color, 0.25, 0.9);
  g.lineWidth = 3;
  for (let yy = -h / 2 + 7; yy < h / 2 - 3; yy += 8) {
    g.beginPath();
    g.moveTo(-w / 2 + 6, yy);
    g.lineTo(w / 2 - 6, yy);
    g.stroke();
  }
  g.restore();
}

function fence(g: G, x: number, y: number, len: number): void {
  g.strokeStyle = '#a0703f';
  g.lineWidth = 2.5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y - 8);
  g.lineTo(x + len, y - 8);
  g.moveTo(x, y - 4);
  g.lineTo(x + len, y - 4);
  g.stroke();
  g.lineWidth = 3;
  for (let i = 0; i <= len; i += 12) {
    g.beginPath();
    g.moveTo(x + i, y);
    g.lineTo(x + i, y - 12);
    g.stroke();
  }
}

function tower(g: G, x: number, y: number, s: number, roof: string, p: Palette): void {
  shadowBlob(g, x + s * 0.3, y + 2, s * 0.5, p);
  const stone = '#e2dcef';
  const body = g.createLinearGradient(x - s * 0.22, 0, x + s * 0.22, 0);
  body.addColorStop(0, shade(stone, 0.2));
  body.addColorStop(0.55, stone);
  body.addColorStop(1, shade(stone, -0.35));
  g.fillStyle = body;
  g.fillRect(x - s * 0.22, y - s * 0.95, s * 0.44, s * 0.95);
  g.fillStyle = shade(stone, -0.2);
  for (let i = -2; i <= 2; i += 2) g.fillRect(x + i * s * 0.09 - s * 0.05, y - s * 1.03, s * 0.1, s * 0.1);
  const rg = g.createLinearGradient(x - s * 0.3, 0, x + s * 0.3, 0);
  rg.addColorStop(0, shade(roof, 0.25));
  rg.addColorStop(1, shade(roof, -0.3));
  g.fillStyle = rg;
  g.beginPath();
  g.moveTo(x - s * 0.3, y - s * 1.0);
  g.lineTo(x, y - s * 1.55);
  g.lineTo(x + s * 0.3, y - s * 1.0);
  g.fill();
  g.strokeStyle = '#5a3620';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x, y - s * 1.55);
  g.lineTo(x, y - s * 1.78);
  g.stroke();
  g.fillStyle = '#ffd23f';
  g.beginPath();
  g.moveTo(x, y - s * 1.78);
  g.lineTo(x + s * 0.22, y - s * 1.71);
  g.lineTo(x, y - s * 1.64);
  g.fill();
  g.fillStyle = '#3b2a5e';
  g.beginPath();
  g.roundRect(x - s * 0.06, y - s * 0.65, s * 0.12, s * 0.2, [s * 0.06, s * 0.06, 0, 0]);
  g.fill();
}

function cactus(g: G, x: number, y: number, s: number, color: string, p: Palette): void {
  shadowBlob(g, x + s * 0.2, y + 1, s * 0.4, p);
  const part = (cx: number, top: number, bottom: number, w: number) => {
    const grad = g.createLinearGradient(cx - w, 0, cx + w, 0);
    grad.addColorStop(0, shade(color, 0.25));
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, shade(color, -0.35));
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(cx - w, top, w * 2, bottom - top, w);
    g.fill();
  };
  part(x, y - s, y, s * 0.13);
  part(x - s * 0.3, y - s * 0.72, y - s * 0.36, s * 0.085);
  part(x + s * 0.3, y - s * 0.82, y - s * 0.46, s * 0.085);
  g.fillStyle = color;
  g.fillRect(x - s * 0.3, y - s * 0.44, s * 0.22, s * 0.1);
  g.fillRect(x + s * 0.08, y - s * 0.54, s * 0.22, s * 0.1);
  if (s > 40) flower(g, x, y - s * 1.02, 3, '#ff6f91');
}

function palm(g: G, x: number, y: number, s: number, p: Palette): void {
  shadowBlob(g, x + s * 0.4, y + 2, s * 0.55, p);
  g.strokeStyle = '#a8743f';
  g.lineWidth = s * 0.09;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + s * 0.05, y - s * 0.6, x + s * 0.2, y - s * 1.0);
  g.stroke();
  const cx = x + s * 0.2, cy = y - s * 1.0;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.5;
    g.fillStyle = i % 2 ? '#2f9e5a' : '#3fbf6e';
    g.beginPath();
    g.moveTo(cx, cy);
    g.quadraticCurveTo(cx + Math.cos(a - 0.3) * s * 0.4, cy + Math.sin(a - 0.3) * s * 0.4,
      cx + Math.cos(a) * s * 0.58, cy + Math.sin(a) * s * 0.58 + s * 0.14);
    g.quadraticCurveTo(cx + Math.cos(a + 0.3) * s * 0.3, cy + Math.sin(a + 0.3) * s * 0.3, cx, cy);
    g.fill();
  }
  ball(g, cx - 3, cy + 4, s * 0.05, '#7a4a20');
  ball(g, cx + 4, cy + 5, s * 0.05, '#7a4a20');
}

function pyramid(g: G, x: number, y: number, s: number, p: Palette): void {
  shadowBlob(g, x + s * 0.5, y + 2, s * 0.9, p);
  g.fillStyle = '#f0c27a';
  g.beginPath();
  g.moveTo(x - s * 0.7, y);
  g.lineTo(x, y - s * 0.75);
  g.lineTo(x, y);
  g.fill();
  g.fillStyle = '#c9944f';
  g.beginPath();
  g.moveTo(x, y - s * 0.75);
  g.lineTo(x + s * 0.7, y);
  g.lineTo(x, y);
  g.fill();
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
    g.fillStyle = shade(color, 0.4);
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(0, -h); g.lineTo(w, -h * 0.7); g.lineTo(w, 0);
    g.fill();
    g.restore();
  };
  shard(x - s * 0.22, s * 0.6, s * 0.12, -0.3);
  shard(x + s * 0.22, s * 0.7, s * 0.12, 0.25);
  shard(x, s, s * 0.16, 0);
}

function snowman(g: G, x: number, y: number, s: number, p: Palette): void {
  shadowBlob(g, x + s * 0.2, y + 1, s * 0.45, p);
  ball(g, x, y - s * 0.25, s * 0.27, '#ffffff');
  ball(g, x, y - s * 0.62, s * 0.19, '#ffffff');
  g.fillStyle = '#ff8a3d';
  g.beginPath();
  g.moveTo(x, y - s * 0.62);
  g.lineTo(x + s * 0.18, y - s * 0.6);
  g.lineTo(x, y - s * 0.58);
  g.fill();
  g.fillStyle = '#e2574c';
  g.fillRect(x - s * 0.18, y - s * 0.48, s * 0.36, s * 0.06);
}

function igloo(g: G, x: number, y: number, s: number, p: Palette): void {
  shadowBlob(g, x + s * 0.3, y + 2, s * 0.7, p);
  const grad = g.createRadialGradient(x - s * 0.2, y - s * 0.4, s * 0.1, x, y, s * 0.6);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#bcdcf2');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, s * 0.55, Math.PI, 0);
  g.fill();
  g.strokeStyle = 'rgba(120,170,210,0.6)';
  g.lineWidth = 1.2;
  for (const yy of [0.18, 0.36]) {
    g.beginPath();
    g.moveTo(x - s * 0.5, y - s * yy);
    g.lineTo(x + s * 0.5, y - s * yy);
    g.stroke();
  }
  g.fillStyle = '#5a7da0';
  g.beginPath();
  g.arc(x + s * 0.25, y, s * 0.16, Math.PI, 0);
  g.fill();
}

function planet(g: G, x: number, y: number, s: number, color: string, ring: boolean): void {
  const glow = g.createRadialGradient(x, y, s * 0.3, x, y, s);
  glow.addColorStop(0, shade(color, 0.2, 0.35));
  glow.addColorStop(1, shade(color, 0, 0));
  g.fillStyle = glow;
  g.fillRect(x - s, y - s, s * 2, s * 2);
  if (ring) {
    g.strokeStyle = 'rgba(255,214,120,0.8)';
    g.lineWidth = s * 0.06;
    g.beginPath();
    g.ellipse(x, y, s * 0.78, s * 0.2, -0.25, Math.PI, Math.PI * 2);
    g.stroke();
  }
  ball(g, x, y, s * 0.42, color);
  if (ring) {
    g.beginPath();
    g.ellipse(x, y, s * 0.78, s * 0.2, -0.25, 0, Math.PI);
    g.stroke();
  }
}

function mushroom(g: G, x: number, y: number, s: number, color: string, p: Palette): void {
  shadowBlob(g, x + s * 0.15, y + 1, s * 0.45, p, 0.2);
  g.fillStyle = '#fff1dc';
  g.beginPath();
  g.roundRect(x - s * 0.11, y - s * 0.5, s * 0.22, s * 0.5, s * 0.08);
  g.fill();
  const grad = g.createRadialGradient(x - s * 0.15, y - s * 0.75, s * 0.05, x, y - s * 0.55, s * 0.5);
  grad.addColorStop(0, shade(color, 0.3));
  grad.addColorStop(1, shade(color, -0.3));
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(x, y - s * 0.5, s * 0.45, s * 0.36, 0, Math.PI, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [dx, dy, rr] of [[-0.2, -0.64, 0.06], [0.08, -0.74, 0.07], [0.25, -0.58, 0.05]]) {
    g.beginPath();
    g.arc(x + dx * s, y + dy * s, rr * s, 0, Math.PI * 2);
    g.fill();
  }
}

function fern(g: G, x: number, y: number, s: number, color: string): void {
  g.strokeStyle = color;
  g.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.4;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.6, x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s * 0.5);
    g.stroke();
  }
}

function pillar(g: G, x: number, y: number, s: number, p: Palette): void {
  shadowBlob(g, x + s * 0.3, y + 2, s * 0.4, p);
  const grad = g.createLinearGradient(x - s * 0.14, 0, x + s * 0.14, 0);
  grad.addColorStop(0, '#e6e0cf');
  grad.addColorStop(1, '#9f9a86');
  g.fillStyle = grad;
  g.fillRect(x - s * 0.14, y - s * 0.8, s * 0.28, s * 0.8);
  g.fillRect(x - s * 0.2, y - s * 0.88, s * 0.4, s * 0.1);
  g.fillStyle = '#4fa354';
  g.beginPath();
  g.ellipse(x - s * 0.05, y - s * 0.86, s * 0.16, s * 0.05, 0, 0, Math.PI * 2);
  g.fill();
}

function coral(g: G, x: number, y: number, s: number, color: string): void {
  g.strokeStyle = color;
  g.lineCap = 'round';
  const branch = (bx: number, by: number, a: number, len: number, depth: number) => {
    const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
    g.lineWidth = Math.max(2, s * 0.055 * depth);
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(ex, ey);
    g.stroke();
    if (depth > 1) {
      branch(ex, ey, a - 0.45, len * 0.72, depth - 1);
      branch(ex, ey, a + 0.45, len * 0.72, depth - 1);
    }
  };
  branch(x, y, -Math.PI / 2, s * 0.34, 3);
}

function seaweed(g: G, x: number, y: number, s: number): void {
  g.strokeStyle = '#2fa37a';
  g.lineWidth = 3;
  g.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.moveTo(x + i * 5, y);
    for (let k = 1; k <= 4; k++) g.quadraticCurveTo(x + i * 5 + (k % 2 ? 6 : -6), y - s * (k - 0.5) * 0.22, x + i * 5, y - s * k * 0.22);
    g.stroke();
  }
}

function fish(g: G, x: number, y: number, s: number, color: string, r: Rng): void {
  const dir = r() < 0.5 ? -1 : 1;
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y, s * 0.3, s * 0.16, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(x - dir * s * 0.25, y);
  g.lineTo(x - dir * s * 0.45, y - s * 0.14);
  g.lineTo(x - dir * s * 0.45, y + s * 0.14);
  g.fill();
  g.fillStyle = '#1b1b2b';
  g.beginPath();
  g.arc(x + dir * s * 0.16, y - s * 0.03, s * 0.035, 0, Math.PI * 2);
  g.fill();
}

function shell(g: G, x: number, y: number, s: number, color: string): void {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y);
  g.arc(x, y, s * 0.3, Math.PI, 0);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.6)';
  g.lineWidth = 1.2;
  for (let i = 1; i < 5; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * s * 0.3, y + Math.sin(a) * s * 0.3);
    g.stroke();
  }
}

function cloud(g: G, x: number, y: number, s: number): void {
  g.fillStyle = 'rgba(160,140,220,0.18)';
  g.beginPath();
  g.ellipse(x + 6, y + s * 0.2, s * 0.6, s * 0.12, 0, 0, Math.PI * 2);
  g.fill();
  for (const [dx, dy, rr] of [[-0.32, 0, 0.22], [0, -0.14, 0.3], [0.32, 0, 0.22], [0.12, 0.04, 0.24], [-0.12, 0.04, 0.24]]) ball(g, x + dx * s, y + dy * s, rr * s, '#ffffff');
}

function balloon(g: G, x: number, y: number, s: number, color: string): void {
  g.strokeStyle = 'rgba(90,60,40,0.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - s * 0.18, y - s * 0.55);
  g.lineTo(x - s * 0.08, y - s * 0.2);
  g.moveTo(x + s * 0.18, y - s * 0.55);
  g.lineTo(x + s * 0.08, y - s * 0.2);
  g.stroke();
  g.fillStyle = '#a0703f';
  g.fillRect(x - s * 0.1, y - s * 0.2, s * 0.2, s * 0.14);
  ball(g, x, y - s * 0.85, s * 0.36, color);
  g.strokeStyle = 'rgba(255,255,255,0.6)';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(x, y - s * 0.85, s * 0.12, s * 0.36, 0, 0, Math.PI * 2);
  g.stroke();
}

function rainbow(g: G, x: number, y: number, s: number): void {
  const colors = ['#ff5c5c', '#ffb347', '#ffe066', '#7ee07e', '#6cc4ff', '#b28dff'];
  g.lineWidth = s * 0.06;
  colors.forEach((c, i) => {
    g.strokeStyle = shade(c, 0, 0.75);
    g.beginPath();
    g.arc(x, y, s * (0.9 - i * 0.06), Math.PI, Math.PI * 2);
    g.stroke();
  });
}

function lantern(g: G, x: number, y: number, s: number, color: string): void {
  const glow = g.createRadialGradient(x, y - s * 0.5, 0, x, y - s * 0.5, s);
  glow.addColorStop(0, shade(color, 0.4, 0.55));
  glow.addColorStop(1, shade(color, 0, 0));
  g.fillStyle = glow;
  g.fillRect(x - s, y - s * 1.5, s * 2, s * 2);
  g.strokeStyle = '#5a3a2a';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, y + s * 0.4);
  g.lineTo(x, y - s * 0.2);
  g.stroke();
  ball(g, x, y - s * 0.5, s * 0.28, color);
  g.fillStyle = '#5a3a2a';
  g.fillRect(x - s * 0.1, y - s * 0.82, s * 0.2, s * 0.06);
}

function blossom(g: G, x: number, y: number, s: number, p: Palette, r: Rng): void {
  tree(g, x, y, s, pick(r, ['#ffb3d1', '#ff9ec7', '#ffc9de']), p, r);
}

function lavaRock(g: G, x: number, y: number, s: number, p: Palette, r: Rng): void {
  rock(g, x, y, s, '#4a3a3a', p, r);
  g.strokeStyle = '#ffb347';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - s * 0.2, y - s * 0.08);
  g.lineTo(x - s * 0.05, y - s * 0.28);
  g.lineTo(x + s * 0.12, y - s * 0.2);
  g.stroke();
}

function smoke(g: G, x: number, y: number, s: number): void {
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `rgba(200,190,190,${0.25 - i * 0.05})`;
    g.beginPath();
    g.arc(x + i * s * 0.12, y - i * s * 0.28, s * (0.18 + i * 0.06), 0, Math.PI * 2);
    g.fill();
  }
}

// ---- Arazi özellikleri ----

export interface Water {
  kind: 'river' | 'lake';
  pts: Pt[]; // nehir: orta hat; göl: [merkez]
  w: number; // nehir genişliği ya da göl yarıçapı
  seed: number;
}

export interface Bridge { x: number; y: number; angle: number; len: number }

export type Item = { kind: string; x: number; y: number; s: number; v: number };

export interface WorldLayout {
  items: Item[];
  water: Water[];
  bridges: Bridge[];
  fields: { x: number; y: number; w: number; h: number; c: string }[];
}

interface Recipe {
  items: [kind: string, weight: number, minSize: number, maxSize: number, cluster?: number][];
  rivers: number; // 1000 px başına nehir sayısı
  lakes: number;
  fields: number;
  density: number; // 1000 px başına öğe
  details: 'grass' | 'sand' | 'snow' | 'stars' | 'bubbles' | 'ash' | 'petals';
}

const RECIPES: Record<string, Recipe> = {
  village: { items: [['tree', 6, 46, 72, 4], ['bush', 4, 24, 36, 2], ['house', 1.2, 40, 54], ['windmill', 0.4, 60, 74], ['sheep', 1.5, 22, 28, 3], ['rock', 1, 16, 26], ['fence', 0.8, 40, 70]], rivers: 0.35, lakes: 0.25, fields: 0.8, density: 46, details: 'grass' },
  castle: { items: [['pine', 5, 42, 64, 4], ['tower', 1.4, 34, 46], ['bush', 3, 22, 32, 2], ['rock', 1.5, 18, 30], ['tree', 2, 44, 60, 3]], rivers: 0.3, lakes: 0.3, fields: 0.2, density: 42, details: 'grass' },
  desert: { items: [['cactus', 4, 30, 52, 2], ['palm', 2.5, 50, 72, 3], ['rock', 3, 18, 34], ['pyramid', 0.5, 60, 90]], rivers: 0, lakes: 0.35, fields: 0, density: 30, details: 'sand' },
  ice: { items: [['snowpine', 6, 42, 66, 5], ['crystal', 2.5, 28, 44], ['snowman', 0.8, 30, 38], ['igloo', 0.6, 40, 50], ['rock', 1, 18, 26]], rivers: 0.2, lakes: 0.4, fields: 0, density: 40, details: 'snow' },
  space: { items: [['planet', 1.6, 34, 64], ['ringplanet', 0.8, 46, 66], ['crystal', 2.5, 24, 40, 3], ['asteroid', 3, 14, 26, 3]], rivers: 0, lakes: 0, fields: 0, density: 24, details: 'stars' },
  jungle: { items: [['jtree', 7, 50, 80, 5], ['fern', 4, 26, 40, 3], ['mushroom', 2, 22, 36, 2], ['pillar', 0.8, 36, 48], ['bush', 3, 26, 38, 2]], rivers: 0.4, lakes: 0.2, fields: 0, density: 52, details: 'grass' },
  reef: { items: [['coral', 4, 30, 46, 3], ['seaweed', 4, 30, 50, 3], ['shell', 2, 18, 26], ['fish', 3, 18, 28], ['rock', 1.5, 18, 30]], rivers: 0, lakes: 0, fields: 0, density: 40, details: 'bubbles' },
  clouds: { items: [['cloud', 5, 46, 80, 2], ['balloon', 1.5, 34, 48], ['rainbow', 0.4, 70, 100], ['crystal', 1, 22, 30]], rivers: 0, lakes: 0, fields: 0, density: 26, details: 'petals' },
  lantern: { items: [['blossom', 5, 46, 66, 3], ['lithouse', 2, 40, 52, 2], ['lantern', 3, 22, 34, 3], ['bush', 2, 24, 32, 2]], rivers: 0.3, lakes: 0.2, fields: 0, density: 44, details: 'petals' },
  volcano: { items: [['lavarock', 4, 22, 40, 3], ['rock', 3, 20, 34, 2], ['crystal', 1.2, 24, 34], ['smoke', 1, 30, 40]], rivers: 0.35, lakes: 0.2, fields: 0, density: 34, details: 'ash' },
};

export function distToPolyline(x: number, y: number, pts: Pt[]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const dx = x1 - x0, dy = y1 - y0;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)));
  }
  return best;
}

/** Yolun yoğun örneklenmiş hali (bezier), uzaklık sorguları ve köprüler için. */
export function samplePath(nodes: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i < nodes.length; i++) {
    const [px, py] = nodes[i - 1], [x, y] = nodes[i];
    const my = (py + y) / 2;
    for (let k = 0; k <= 14; k++) {
      const t = k / 14, u = 1 - t;
      out.push([u * u * u * px + 3 * u * u * t * px + 3 * u * t * t * x + t * t * t * x,
        u * u * u * py + 3 * u * u * t * my + 3 * u * t * t * my + t * t * t * y]);
    }
  }
  return out;
}

/** Bir dünyanın arazi düzeni: su, köprüler, tarlalar ve süsler. */
export function layoutWorld(theme: WorldTheme, seed: number, width: number, height: number, path: Pt[],
  keepOut: (x: number, y: number) => boolean): WorldLayout {
  const recipe = RECIPES[theme.key];
  const r = rng(seed);
  const water: Water[] = [];
  const bridges: Bridge[] = [];
  const near = (x: number, y: number, d: number) => {
    // Hızlı ön eleme: yol noktalarını y'ye göre tara
    for (const [px, py] of path) if (Math.abs(py - y) < d && Math.hypot(px - x, py - y) < d) return true;
    return false;
  };

  // Nehirler: soldan sağa kıvrılarak akar; yolu kestiği yerde köprü.
  const rivers = Math.round((height / 1000) * recipe.rivers);
  for (let i = 0; i < rivers; i++) {
    const y0 = ((i + 0.5) / rivers) * height + (r() - 0.5) * 300;
    const pts: Pt[] = [];
    const amp = 40 + r() * 70, ph = r() * 6, slope = (r() - 0.5) * 160;
    for (let x = -40; x <= width + 40; x += 12) pts.push([x, y0 + Math.sin(x / 70 + ph) * amp + (x / width) * slope]);
    const w = 34 + r() * 14;
    water.push({ kind: 'river', pts, w, seed: Math.floor(r() * 1e6) });
    // Köprü: yolun nehre en yakın noktası
    let best = Infinity, bi = -1;
    for (let k = 0; k < path.length; k++) {
      const d = distToPolyline(path[k][0], path[k][1], pts);
      if (d < best) { best = d; bi = k; }
    }
    if (bi > 0 && best < w) {
      const [ax, ay] = path[Math.max(0, bi - 3)], [bx, by] = path[Math.min(path.length - 1, bi + 3)];
      bridges.push({ x: path[bi][0], y: path[bi][1], angle: Math.atan2(by - ay, bx - ax), len: w * 2 + 26 });
    }
  }
  // Göller
  const lakes = Math.round((height / 1000) * recipe.lakes);
  for (let i = 0, tries = 0; i < lakes && tries < 200; tries++) {
    const x = 40 + r() * (width - 80), y = 200 + r() * (height - 300), rad = 38 + r() * 30;
    if (near(x, y, rad + 50) || keepOut(x, y)) continue;
    water.push({ kind: 'lake', pts: [[x, y]], w: rad, seed: Math.floor(r() * 1e6) });
    i++;
  }
  const inWater = (x: number, y: number, pad: number) => water.some((wt) => wt.kind === 'lake'
    ? Math.hypot(x - wt.pts[0][0], (y - wt.pts[0][1]) * 1.6) < wt.w + pad
    : distToPolyline(x, y, wt.pts) < wt.w / 2 + pad);

  // Tarlalar
  const fields: WorldLayout['fields'] = [];
  const nf = Math.round((height / 1000) * recipe.fields);
  for (let i = 0, tries = 0; i < nf && tries < 200; tries++) {
    const w = 70 + r() * 50, h = 44 + r() * 30;
    const x = w / 2 + 8 + r() * (width - w - 16), y = 200 + r() * (height - 300);
    if (near(x, y, Math.max(w, h) * 0.7 + 30) || inWater(x, y, 50) || keepOut(x, y)) continue;
    fields.push({ x, y, w, h, c: pick(r, ['#e8c45a', '#9ccc5a', '#d9a65a', '#b5d86a']) });
    i++;
  }
  const inField = (x: number, y: number) => fields.some((f) => Math.abs(x - f.x) < f.w / 2 + 12 && Math.abs(y - f.y) < f.h / 2 + 12);

  // Süsler: kümeler halinde (orman, sürü…)
  const total = recipe.items.reduce((a, it) => a + it[1], 0);
  const items: Item[] = [];
  const target = Math.round((height / 1000) * (width / 390) * recipe.density);
  for (let tries = 0; items.length < target && tries < target * 12; tries++) {
    let p = r() * total;
    const def = recipe.items.find((it) => (p -= it[1]) <= 0) ?? recipe.items[0];
    const [kind, , min, max, cluster = 1] = def;
    const cx = r() * width, cy = 120 + r() * (height - 120);
    const count = 1 + Math.floor(r() * cluster);
    for (let c = 0; c < count; c++) {
      const x = cx + (c ? (r() - 0.5) * 90 : 0), y = cy + (c ? (r() - 0.5) * 70 : 0);
      const s = min + r() * (max - min);
      if (x < -10 || x > width + 10 || near(x, y, 46 + s * 0.3) || inWater(x, y, 12) || inField(x, y) || keepOut(x, y)) continue;
      items.push({ kind, x, y, s, v: r() });
    }
  }
  items.sort((a, b) => a.y - b.y); // arkadakiler önce
  return { items, water, bridges, fields };
}

/** Ayrıntı çizimlerinin (çim, çiçek) kaçınacağı yerler: yol ve su. */
export function occupied(layout: WorldLayout, dense: Pt[]): (x: number, y: number) => boolean {
  return (x, y) => {
    for (const [px, py] of dense) if (Math.abs(py - y) < 26 && Math.hypot(px - x, py - y) < 26) return true;
    return layout.water.some((wt) => wt.kind === 'lake'
      ? Math.hypot(x - wt.pts[0][0], (y - wt.pts[0][1]) * 1.6) < wt.w + 6
      : distToPolyline(x, y, wt.pts) < wt.w / 2 + 8);
  };
}

// ---- Katman çizimleri ----

export function drawGround(g: G, theme: WorldTheme, seed: number, width: number, sectionHeight: number,
  y0: number, y1: number): void {
  const p = PALETTES[theme.key];
  g.fillStyle = theme.ground;
  g.fillRect(0, y0, width, y1 - y0);
  // Düzensiz ton lekeleri (çayır yamaları)
  const r = rng(seed * 31 + 5);
  const n = Math.round(sectionHeight / 22);
  for (let i = 0; i < n; i++) {
    const bx = r() * width, by = r() * sectionHeight, rx = 50 + r() * 120, ry = 30 + r() * 70;
    const col = pick(r, p.ground);
    if (by + ry < y0 - 10 || by - ry > y1 + 10) { r(); continue; }
    g.globalAlpha = 0.4;
    blob(g, bx, by, rx, ry, r, 0.3);
    g.fillStyle = col;
    g.fill();
  }
  g.globalAlpha = 1;
  // Kenarlarda yumuşak koyulaşma (derinlik)
  const side = g.createLinearGradient(0, 0, width, 0);
  side.addColorStop(0, `rgba(${p.shadow},0.22)`);
  side.addColorStop(0.2, `rgba(${p.shadow},0)`);
  side.addColorStop(0.8, `rgba(${p.shadow},0)`);
  side.addColorStop(1, `rgba(${p.shadow},0.22)`);
  g.fillStyle = side;
  g.fillRect(0, y0, width, y1 - y0);
  // Uzay: renkli bulutsular
  if (theme.key === 'space') {
    const nr = rng(seed * 7 + 1);
    for (let i = 0; i < sectionHeight / 500; i++) {
      const x = nr() * width, y = nr() * sectionHeight, rad = 120 + nr() * 160;
      if (y + rad < y0 || y - rad > y1) continue;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, pick(nr, ['rgba(255,110,200,0.35)', 'rgba(110,180,255,0.35)', 'rgba(170,120,255,0.4)']));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  // Çöl: kum tepeleri
  if (theme.key === 'desert') {
    const dr = rng(seed * 3 + 9);
    for (let i = 0; i < sectionHeight / 160; i++) {
      const x = dr() * width, y = dr() * sectionHeight, w = 90 + dr() * 120;
      if (y < y0 - 40 || y > y1 + 40) continue;
      const grad = g.createLinearGradient(0, y - 30, 0, y + 10);
      grad.addColorStop(0, 'rgba(255,240,200,0.7)');
      grad.addColorStop(1, 'rgba(200,140,70,0.35)');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(x - w, y + 10);
      g.quadraticCurveTo(x - w * 0.3, y - 34, x, y - 26);
      g.quadraticCurveTo(x + w * 0.4, y - 18, x + w, y + 10);
      g.fill();
    }
  }
}

export function drawDetails(g: G, theme: WorldTheme, seed: number, width: number, y0: number, y1: number,
  avoid: (x: number, y: number) => boolean): void {
  const p = PALETTES[theme.key];
  const recipe = RECIPES[theme.key];
  const r = rng(seed * 97 + Math.floor(y0));
  const n = Math.round(((y1 - y0) * width) / 1100);
  for (let i = 0; i < n; i++) {
    const x = r() * width, y = y0 + r() * (y1 - y0);
    const roll = r();
    if (avoid(x, y)) continue;
    switch (recipe.details) {
      case 'grass':
        if (roll < 0.22) flower(g, x, y, 2.2 + r() * 1.4, pick(r, p.flowers));
        else tuft(g, x, y, 4 + r() * 4, shade(pick(r, p.ground), roll < 0.6 ? -0.16 : 0.22, 0.55));
        break;
      case 'sand':
        g.fillStyle = shade(theme.ground, roll < 0.5 ? 0.3 : -0.2, 0.55);
        g.beginPath();
        g.arc(x, y, 1 + r() * 1.5, 0, Math.PI * 2);
        g.fill();
        break;
      case 'snow':
        g.fillStyle = roll < 0.2 ? 'rgba(150,190,220,0.35)' : 'rgba(255,255,255,0.9)';
        g.beginPath();
        g.arc(x, y, 1 + r() * 2, 0, Math.PI * 2);
        g.fill();
        break;
      case 'stars': {
        const rad = roll < 0.05 ? 2.4 : 0.6 + r() * 1.2;
        g.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`;
        g.beginPath();
        g.arc(x, y, rad, 0, Math.PI * 2);
        g.fill();
        if (rad > 2) {
          g.strokeStyle = 'rgba(255,255,255,0.6)';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.moveTo(x, y - 6); g.lineTo(x, y + 6);
          g.stroke();
        }
        break;
      }
      case 'bubbles':
        g.strokeStyle = 'rgba(255,255,255,0.5)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x, y, 2 + r() * 4, 0, Math.PI * 2);
        g.stroke();
        break;
      case 'ash':
        g.fillStyle = roll < 0.1 ? 'rgba(255,150,60,0.8)' : 'rgba(30,20,20,0.35)';
        g.beginPath();
        g.arc(x, y, 1 + r() * 1.6, 0, Math.PI * 2);
        g.fill();
        break;
      case 'petals':
        g.fillStyle = pick(r, p.flowers);
        g.globalAlpha = 0.7;
        g.beginPath();
        g.ellipse(x, y, 3, 1.8, r() * Math.PI, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
        break;
    }
  }
}

export function drawWater(g: G, theme: WorldTheme, layout: WorldLayout, y0: number, y1: number): void {
  const p = PALETTES[theme.key];
  const lava = theme.key === 'volcano';
  for (const wt of layout.water) {
    if (wt.kind === 'river') {
      if (!wt.pts.some(([, y]) => y > y0 - 80 && y < y1 + 80)) continue;
      const trace = () => {
        g.beginPath();
        wt.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      };
      g.lineCap = 'round';
      g.lineJoin = 'round';
      trace();
      g.strokeStyle = lava ? 'rgba(60,20,10,0.8)' : shade(p.ground[3] ?? theme.ground, -0.35);
      g.lineWidth = wt.w + 14;
      g.stroke();
      trace();
      g.strokeStyle = lava ? '#ff5a1f' : shade(p.water, -0.1);
      g.lineWidth = wt.w;
      g.stroke();
      trace();
      g.strokeStyle = lava ? '#ffb347' : shade(p.water, 0.25);
      g.lineWidth = wt.w * 0.45;
      g.stroke();
      // Parıltı çizgileri
      const r = rng(wt.seed);
      g.strokeStyle = lava ? 'rgba(255,240,180,0.8)' : 'rgba(255,255,255,0.7)';
      g.lineWidth = 2;
      for (let i = 2; i < wt.pts.length - 2; i += 3) {
        if (r() < 0.55) continue;
        const [x, y] = wt.pts[i];
        g.beginPath();
        g.moveTo(x - 5, y + (r() - 0.5) * wt.w * 0.5);
        g.lineTo(x + 5, y + (r() - 0.5) * wt.w * 0.5);
        g.stroke();
      }
    } else {
      const [x, y] = wt.pts[0];
      if (y + wt.w < y0 - 20 || y - wt.w > y1 + 20) continue;
      const r = rng(wt.seed);
      blob(g, x, y + 4, wt.w + 8, wt.w * 0.62 + 6, r, 0.12);
      g.fillStyle = lava ? 'rgba(60,20,10,0.8)' : shade(theme.ground, -0.3);
      g.fill();
      const r2 = rng(wt.seed);
      blob(g, x, y, wt.w, wt.w * 0.6, r2, 0.12);
      const grad = g.createLinearGradient(0, y - wt.w * 0.6, 0, y + wt.w * 0.6);
      grad.addColorStop(0, lava ? '#ffb347' : shade(p.water, 0.3));
      grad.addColorStop(1, lava ? '#ff5a1f' : shade(p.water, -0.15));
      g.fillStyle = grad;
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(x - wt.w * 0.25, y - wt.w * 0.15, wt.w * 0.35, wt.w * 0.08, 0, Math.PI * 1.1, Math.PI * 1.75);
      g.stroke();
      if (!lava && theme.key !== 'ice') {
        // Nilüferler
        for (let i = 0; i < 3; i++) {
          const lx = x + (r() - 0.5) * wt.w, ly = y + (r() - 0.5) * wt.w * 0.6;
          g.fillStyle = '#4fae5a';
          g.beginPath();
          g.arc(lx, ly, 5, 0.3, Math.PI * 2);
          g.lineTo(lx, ly);
          g.fill();
          if (r() < 0.5) flower(g, lx + 2, ly - 2, 1.8, '#ff9ec7');
        }
      }
    }
  }
  for (const f of layout.fields) {
    if (f.y + f.h < y0 - 20 || f.y - f.h > y1 + 20) continue;
    field(g, f.x, f.y, f.w, f.h, f.c, rng(Math.floor(f.x * 13 + f.y)));
    fence(g, f.x - f.w / 2, f.y + f.h / 2 + 10, f.w);
  }
}

/** Taş döşeli yol: gölge, kenar, dolgu ve tek tek kaldırım taşları; düğüm altlarında taş platform. */
export function drawPath(g: G, theme: WorldTheme, nodes: Pt[], dense: Pt[], seed: number, y0: number, y1: number): void {
  if (nodes.length < 2) return;
  const p = PALETTES[theme.key];
  const trace = () => {
    g.beginPath();
    g.moveTo(nodes[0][0], nodes[0][1]);
    for (let i = 1; i < nodes.length; i++) {
      const [px, py] = nodes[i - 1], [x, y] = nodes[i];
      const my = (py + y) / 2;
      g.bezierCurveTo(px, my, x, my, x, y);
    }
  };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.save();
  g.translate(4, 8);
  trace();
  g.strokeStyle = `rgba(${p.shadow},0.25)`;
  g.lineWidth = 44;
  g.stroke();
  g.restore();
  trace();
  g.strokeStyle = p.pathEdge;
  g.lineWidth = 40;
  g.stroke();
  trace();
  g.strokeStyle = p.path;
  g.lineWidth = 33;
  g.stroke();
  // Kaldırım taşları
  const r = rng(seed);
  for (let i = 0; i < dense.length; i += 1) {
    const [x, y] = dense[i];
    if (y < y0 - 30 || y > y1 + 30) { r(); r(); r(); continue; }
    const [nx, ny] = dense[Math.min(dense.length - 1, i + 1)];
    const ang = Math.atan2(ny - y, nx - x);
    for (let k = -1; k <= 1; k++) {
      const off = k * 10 + (r() - 0.5) * 3;
      const sx = x - Math.sin(ang) * off, sy = y + Math.cos(ang) * off;
      const w = 6 + r() * 3;
      g.fillStyle = shade(p.path, -0.06 - r() * 0.1);
      g.beginPath();
      g.ellipse(sx, sy, w, w * 0.7, ang, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Düğüm platformları
  for (const [x, y] of nodes.slice(1, -1)) {
    if (y < y0 - 60 || y > y1 + 60) continue;
    g.fillStyle = `rgba(${p.shadow},0.25)`;
    g.beginPath();
    g.ellipse(x + 3, y + 22, 40, 14, 0, 0, Math.PI * 2);
    g.fill();
    const grad = g.createLinearGradient(0, y - 6, 0, y + 26);
    grad.addColorStop(0, shade(p.path, 0.2));
    grad.addColorStop(1, p.pathEdge);
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(x, y + 14, 38, 16, 0, 0, Math.PI * 2);
    g.fill();
  }
}

export function drawBridges(g: G, layout: WorldLayout, y0: number, y1: number): void {
  for (const b of layout.bridges) {
    if (b.y < y0 - 100 || b.y > y1 + 100) continue;
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.angle);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(-b.len / 2 + 4, -22 + 6, b.len, 44);
    g.fillStyle = '#a8743f';
    g.fillRect(-b.len / 2, -21, b.len, 42);
    g.strokeStyle = '#7a5028';
    g.lineWidth = 2;
    for (let x = -b.len / 2 + 6; x < b.len / 2; x += 8) {
      g.beginPath();
      g.moveTo(x, -21);
      g.lineTo(x, 21);
      g.stroke();
    }
    g.fillStyle = '#6b4222';
    g.fillRect(-b.len / 2, -25, b.len, 5);
    g.fillRect(-b.len / 2, 20, b.len, 5);
    g.restore();
  }
}

export function drawItem(g: G, it: Item, theme: WorldTheme, r: Rng): void {
  const p = PALETTES[theme.key];
  const v = it.v;
  switch (it.kind) {
    case 'tree': tree(g, it.x, it.y, it.s, p.foliage[Math.floor(v * p.foliage.length)], p, r); break;
    case 'jtree': tree(g, it.x, it.y, it.s, p.foliage[Math.floor(v * p.foliage.length)], p, r); break;
    case 'pine': pine(g, it.x, it.y, it.s, '#2f8f5a', p, false); break;
    case 'snowpine': pine(g, it.x, it.y, it.s, '#2f7f6a', p, true); break;
    case 'bush': bush(g, it.x, it.y, it.s, p.foliage[Math.floor(v * p.foliage.length)], p, r); break;
    case 'rock': rock(g, it.x, it.y, it.s, p.rock, p, r); break;
    case 'asteroid': rock(g, it.x, it.y, it.s, '#8a7ac0', p, r); break;
    case 'house': house(g, it.x, it.y, it.s, ['#e2574c', '#5b7bd5', '#e89a3c', '#9b5cd5'][Math.floor(v * 4)], p); break;
    case 'lithouse': house(g, it.x, it.y, it.s, ['#c0504a', '#7a4ab0'][Math.floor(v * 2)], p, true); break;
    case 'windmill': windmill(g, it.x, it.y, it.s, p, r); break;
    case 'sheep': sheep(g, it.x, it.y, it.s, p, r); break;
    case 'fence': fence(g, it.x - it.s / 2, it.y, it.s); break;
    case 'tower': tower(g, it.x, it.y, it.s, ['#7b5cff', '#e2574c', '#2ec4b6'][Math.floor(v * 3)], p); break;
    case 'cactus': cactus(g, it.x, it.y, it.s, '#3fa86a', p); break;
    case 'palm': palm(g, it.x, it.y, it.s, p); break;
    case 'pyramid': pyramid(g, it.x, it.y, it.s, p); break;
    case 'crystal': crystal(g, it.x, it.y, it.s, theme.key === 'space' ? '#c38bff' : theme.key === 'volcano' ? '#ff7a59' : '#7fd4ff'); break;
    case 'snowman': snowman(g, it.x, it.y, it.s, p); break;
    case 'igloo': igloo(g, it.x, it.y, it.s, p); break;
    case 'planet': planet(g, it.x, it.y, it.s, ['#ff7bd5', '#4dd2ff', '#ffb347'][Math.floor(v * 3)], false); break;
    case 'ringplanet': planet(g, it.x, it.y, it.s, ['#9b7bff', '#ff8a65'][Math.floor(v * 2)], true); break;
    case 'mushroom': mushroom(g, it.x, it.y, it.s, ['#ff5c5c', '#ff8a3d', '#b05cff'][Math.floor(v * 3)], p); break;
    case 'fern': fern(g, it.x, it.y, it.s, shade('#2f8f47', v * 0.3 - 0.15)); break;
    case 'pillar': pillar(g, it.x, it.y, it.s, p); break;
    case 'coral': coral(g, it.x, it.y, it.s, ['#ff6f91', '#ffb347', '#b28dff'][Math.floor(v * 3)]); break;
    case 'seaweed': seaweed(g, it.x, it.y, it.s); break;
    case 'fish': fish(g, it.x, it.y, it.s, ['#ffb347', '#ff6f91', '#7fd4ff', '#ffe066'][Math.floor(v * 4)], r); break;
    case 'shell': shell(g, it.x, it.y, it.s, ['#ffd1dc', '#ffe8c2'][Math.floor(v * 2)]); break;
    case 'cloud': cloud(g, it.x, it.y, it.s); break;
    case 'balloon': balloon(g, it.x, it.y, it.s, ['#ff5c8a', '#ffb347', '#7fd4ff', '#7ee07e'][Math.floor(v * 4)]); break;
    case 'rainbow': rainbow(g, it.x, it.y, it.s); break;
    case 'lantern': lantern(g, it.x, it.y, it.s, ['#ff7b54', '#ffd23f', '#ff5c8a'][Math.floor(v * 3)]); break;
    case 'blossom': blossom(g, it.x, it.y, it.s, p, r); break;
    case 'lavarock': lavaRock(g, it.x, it.y, it.s, p, r); break;
    case 'smoke': smoke(g, it.x, it.y, it.s); break;
  }
}

/** Bölüme eklenecek hareketli öğe türü (CSS ile canlandırılır). */
export function ambientKind(themeKey: string): 'birds' | 'snow' | 'twinkle' | 'fish' | 'fireflies' | 'embers' | 'petals' {
  switch (themeKey) {
    case 'ice': return 'snow';
    case 'space': return 'twinkle';
    case 'reef': return 'fish';
    case 'lantern': return 'fireflies';
    case 'volcano': return 'embers';
    case 'clouds': return 'petals';
    default: return 'birds';
  }
}
