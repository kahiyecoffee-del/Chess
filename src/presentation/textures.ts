// Kodla üretilen dokular: ahşap damarlı tahta, çerçeve ahşabı, yumuşak vurgu ve temas gölgesi.

import * as THREE from 'three';
import { SurfaceDef } from './sets';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), a | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function toTexture(canvas: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Bir dikdörtgene ahşap damarı çizer. `vertical` damar yönünü belirler. */
function paintWood(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: SurfaceDef,
  vertical: boolean, r: () => number): void {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = s.base;
  g.fillRect(x, y, w, h);
  // Hafif ton farkı
  const shade = r() * 0.12 - 0.06;
  g.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${-shade})`;
  g.fillRect(x, y, w, h);
  const len = vertical ? h : w;
  const across = vertical ? w : h;
  const lines = 26 + Math.floor(r() * 10);
  const phase = r() * 10;
  for (let i = 0; i < lines; i++) {
    const off = (i / lines) * across + r() * 3;
    const amp = 1.5 + r() * 4;
    const freq = 0.01 + r() * 0.02;
    g.strokeStyle = s.grain;
    g.globalAlpha = 0.08 + r() * 0.22;
    g.lineWidth = 0.6 + r() * 1.8;
    g.beginPath();
    for (let t = 0; t <= len; t += 6) {
      const d = off + Math.sin(t * freq + phase + i * 0.3) * amp + Math.sin(t * 0.07 + i) * 0.6;
      const px = vertical ? x + d : x + t;
      const py = vertical ? y + t : y + d;
      if (t === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  g.restore();
}

/** 8x8 kare tahta yüzeyi. a1 sol altta (doku v ekseni yukarı). */
export function boardTexture(light: SurfaceDef, dark: SurfaceDef): THREE.CanvasTexture {
  const size = 1024, cell = size / 8;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = rng(42);
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const isLight = (file + rank) % 2 === 1;
      const x = file * cell, y = (7 - rank) * cell;
      paintWood(g, x, y, cell, cell, isLight ? light : dark, (file + rank) % 2 === 0, r);
      // Kareler arası ince oluk
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(x, y + cell - 1.5, cell, 1.5);
      g.fillRect(x + cell - 1.5, y, 1.5, cell);
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(x, y, cell, 1.2);
      g.fillRect(x, y, 1.2, cell);
    }
  }
  return toTexture(c);
}

export function frameTexture(grain: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  paintWood(g, 0, 0, 512, 512, { base: '#4a2a18', grain }, false, rng(7));
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Yuvarlak köşeli, kenarlara doğru parlayan kare (seçim / son hamle). */
export function glowSquareTexture(color: string, strength = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 10, 64, 64, 92);
  grad.addColorStop(0, `rgba(255,255,255,${0.15 * strength})`);
  grad.addColorStop(1, `rgba(255,255,255,${0.7 * strength})`);
  g.fillStyle = grad;
  g.beginPath();
  g.roundRect(4, 4, 120, 120, 18);
  g.fill();
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, 128, 128);
  return toTexture(c);
}

/** Yumuşak kenarlı hedef noktası. */
export function dotTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, color);
  grad.addColorStop(0.55, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return toTexture(c);
}

/** Alma hedefi: kare köşelerinde üçgen işaretler. */
export function captureTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  const k = 34;
  for (const [x, y, dx, dy] of [[0, 0, 1, 1], [128, 0, -1, 1], [0, 128, 1, -1], [128, 128, -1, -1]]) {
    g.beginPath();
    g.moveTo(x + dx * 6, y + dy * 6);
    g.lineTo(x + dx * (6 + k), y + dy * 6);
    g.lineTo(x + dx * 6, y + dy * (6 + k));
    g.closePath();
    g.fill();
  }
  return toTexture(c);
}

/** Tahtanın altındaki yumuşak temas gölgesi. */
export function contactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 40, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return toTexture(c, false);
}
