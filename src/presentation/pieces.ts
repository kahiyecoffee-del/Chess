// Staunton tarzı taş geometrileri tamamen kodla üretilir (dış model yok).
// Profiller spline ile yumuşatılır; her taş tipi tek bir BufferGeometry'dir ve tüm taşlarca paylaşılır.

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK } from '../core/chess';

const SEGMENTS = 48;
type Profile = [number, number][];

// Ortak kaide: basamaklı, yuvarlatılmış.
const BASE: Profile = [
  [0, 0], [0.365, 0], [0.38, 0.015], [0.38, 0.045], [0.355, 0.07], [0.335, 0.085], [0.335, 0.1],
  [0.35, 0.115], [0.335, 0.135], [0.29, 0.15], [0.255, 0.165],
];

/** Kontrol noktalarından pürüzsüz bir tornalama yüzeyi üretir. */
function lathe(points: Profile, smooth = true): THREE.BufferGeometry {
  let pts = points.map(([r, y]) => new THREE.Vector2(r, y));
  if (smooth) {
    // Kaideyi keskin bırak, gövdeyi yumuşat.
    const head = pts.slice(0, 3);
    const body = new THREE.SplineCurve(pts.slice(2)).getPoints(pts.length * 6);
    pts = [...head, ...body.slice(1)];
  }
  pts = pts.map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  const g = new THREE.LatheGeometry(pts, SEGMENTS);
  g.deleteAttribute('uv');
  return g.toNonIndexed();
}

function arc(cx: number, cy: number, r: number, from: number, to: number, steps: number): Profile {
  const out: Profile = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    out.push([Math.max(0, cx + Math.cos(a) * r), cy + Math.sin(a) * r]);
  }
  return out;
}

const deg = Math.PI / 180;

function roundedBox(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  const g = new RoundedBoxGeometry(w, h, d, 2, r);
  g.deleteAttribute('uv');
  return g.index ? g.toNonIndexed() : g;
}

function sphere(r: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 24, 16);
  g.deleteAttribute('uv');
  return g.toNonIndexed();
}

function pawn(): THREE.BufferGeometry {
  return lathe([
    ...BASE, [0.21, 0.2], [0.165, 0.27], [0.135, 0.36], [0.12, 0.42], [0.205, 0.445], [0.21, 0.47], [0.13, 0.49],
    ...arc(0, 0.605, 0.145, -58 * deg, 90 * deg, 10),
  ]);
}

function rook(): THREE.BufferGeometry {
  const body = lathe([
    ...BASE, [0.25, 0.2], [0.225, 0.3], [0.205, 0.56], [0.25, 0.6], [0.285, 0.63], [0.29, 0.66],
    [0.29, 0.79], [0.235, 0.8], [0.23, 0.74], [0.05, 0.74], [0, 0.74],
  ]);
  const parts = [body];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    const m = roundedBox(0.11, 0.1, 0.075, 0.018);
    m.rotateY(-a);
    m.translate(Math.cos(a) * 0.255, 0.835, Math.sin(a) * 0.255);
    parts.push(m);
  }
  return mergeGeometries(parts)!;
}

function bishop(): THREE.BufferGeometry {
  const body = lathe([
    ...BASE, [0.215, 0.2], [0.16, 0.3], [0.125, 0.5], [0.215, 0.535], [0.22, 0.565], [0.125, 0.595],
    [0.15, 0.65], [0.18, 0.72], [0.175, 0.8], [0.14, 0.88], [0.08, 0.95], [0.04, 0.985], [0.03, 1.0],
  ]);
  const top = sphere(0.055);
  top.translate(0, 1.05, 0);
  return mergeGeometries([body, top])!;
}

function crowned(rim: number, kind: 'queen' | 'king'): THREE.BufferGeometry {
  const body = lathe([
    ...BASE, [0.23, 0.2], [0.175, 0.32], [0.135, 0.62], [0.235, 0.665], [0.24, 0.7], [0.145, 0.73],
    [0.16, 0.8], [0.205, rim - 0.12], [0.245, rim - 0.04], [0.25, rim], [0.2, rim - 0.005],
    [0.14, rim + (kind === 'queen' ? 0.01 : 0.03)], [0, rim + (kind === 'queen' ? 0.02 : 0.06)],
  ]);
  const parts = [body];
  if (kind === 'queen') {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const s = sphere(0.032);
      s.translate(Math.cos(a) * 0.235, rim + 0.03, Math.sin(a) * 0.235);
      parts.push(s);
    }
    const top = sphere(0.07);
    top.translate(0, rim + 0.09, 0);
    parts.push(top);
  } else {
    const v = roundedBox(0.075, 0.26, 0.075, 0.02);
    v.translate(0, rim + 0.2, 0);
    const h = roundedBox(0.2, 0.07, 0.075, 0.02);
    h.translate(0, rim + 0.24, 0);
    parts.push(v, h);
  }
  return mergeGeometries(parts)!;
}

function knight(): THREE.BufferGeometry {
  const base = lathe([...BASE, [0.235, 0.18], [0.225, 0.21], [0.18, 0.225], [0, 0.225]], false);
  // Yandan at başı silueti; +x yönüne (burun) bakar.
  const s = new THREE.Shape();
  s.moveTo(-0.2, 0.19);
  s.lineTo(0.19, 0.19);
  s.bezierCurveTo(0.2, 0.3, 0.12, 0.38, 0.07, 0.45);
  s.bezierCurveTo(0.15, 0.5, 0.27, 0.52, 0.32, 0.6);
  s.bezierCurveTo(0.36, 0.66, 0.33, 0.72, 0.25, 0.73);
  s.bezierCurveTo(0.18, 0.75, 0.12, 0.8, 0.1, 0.89);
  s.lineTo(0.065, 0.99);
  s.lineTo(0.0, 0.9);
  s.bezierCurveTo(-0.08, 0.89, -0.16, 0.81, -0.2, 0.67);
  s.bezierCurveTo(-0.25, 0.52, -0.26, 0.33, -0.2, 0.19);
  const depth = 0.16;
  const head = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: true, bevelThickness: 0.055, bevelSize: 0.04, bevelSegments: 4, curveSegments: 14,
  });
  head.translate(0, 0, -depth / 2);
  head.deleteAttribute('uv');
  // Yontulmuş görünüm: burun ve kulaklara doğru incelt.
  const p = head.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const muzzle = THREE.MathUtils.clamp((x + 0.05) / 0.35, 0, 1);
    const top = THREE.MathUtils.clamp((y - 0.75) / 0.25, 0, 1);
    const neck = THREE.MathUtils.clamp((0.45 - y) / 0.25, 0, 1);
    p.setZ(i, z * (1 - 0.38 * muzzle * (1 - neck)) * (1 - 0.35 * top) * (1 + 0.35 * neck));
  }
  const smooth = mergeVertices(head, 1e-4);
  smooth.computeVertexNormals();
  return mergeGeometries([base, smooth.toNonIndexed()])!;
}

let cache: Map<number, THREE.BufferGeometry> | null = null;

export function pieceGeometry(type: number): THREE.BufferGeometry {
  if (!cache) {
    cache = new Map([
      [PAWN, pawn()], [KNIGHT, knight()], [BISHOP, bishop()], [ROOK, rook()],
      [QUEEN, crowned(1.08, 'queen')], [KING, crowned(1.12, 'king')],
    ]);
  }
  return cache.get(type)!;
}

/** Taşın üst noktası (efekt ve kamera hedefi için). */
export const PIECE_HEIGHT: Record<number, number> = {
  [PAWN]: 0.75, [KNIGHT]: 1.0, [BISHOP]: 1.1, [ROOK]: 0.88, [QUEEN]: 1.24, [KING]: 1.5,
};
