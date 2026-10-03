// Low-poly taş geometrileri tamamen kodla üretilir (dış model yok).
// Her taş tipi tek bir BufferGeometry'dir; tüm taşlar bu geometrileri paylaşır.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BISHOP, KING, KNIGHT, PAWN, QUEEN, ROOK } from '../core/chess';

const SEGMENTS = 22;
type Profile = [number, number][];

const BASE: Profile = [
  [0, 0], [0.35, 0], [0.365, 0.035], [0.35, 0.07], [0.31, 0.09], [0.315, 0.12], [0.27, 0.145],
];

function lathe(points: Profile): THREE.BufferGeometry {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), SEGMENTS).toNonIndexed();
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

function pawn(): THREE.BufferGeometry {
  return lathe([
    ...BASE, [0.19, 0.19], [0.13, 0.38], [0.115, 0.44], [0.19, 0.46], [0.19, 0.495], [0.11, 0.51],
    ...arc(0, 0.62, 0.135, -55 * deg, 90 * deg, 8),
  ]);
}

function rook(): THREE.BufferGeometry {
  const body = lathe([
    ...BASE, [0.23, 0.18], [0.205, 0.56], [0.27, 0.6], [0.27, 0.76], [0.2, 0.76], [0.2, 0.71], [0, 0.71],
  ]);
  const parts = [body];
  for (let i = 0; i < 6; i++) {
    const merlon = new THREE.BoxGeometry(0.1, 0.09, 0.1).toNonIndexed();
    const a = (i / 6) * Math.PI * 2;
    merlon.translate(Math.cos(a) * 0.225, 0.8, Math.sin(a) * 0.225);
    parts.push(merlon);
  }
  return mergeGeometries(parts)!;
}

function bishop(): THREE.BufferGeometry {
  return lathe([
    ...BASE, [0.19, 0.19], [0.115, 0.52], [0.19, 0.555], [0.19, 0.59], [0.1, 0.61],
    [0.14, 0.66], [0.165, 0.74], [0.15, 0.82], [0.1, 0.9], [0.04, 0.95], [0.035, 0.97],
    ...arc(0, 1.0, 0.045, -70 * deg, 90 * deg, 5),
  ]);
}

function crowned(height: number, topper: 'ball' | 'cross'): THREE.BufferGeometry {
  const body = lathe([
    ...BASE, [0.21, 0.19], [0.125, 0.6], [0.22, 0.66], [0.22, 0.7], [0.135, 0.72],
    [0.19, height - 0.12], [0.235, height - 0.06], [0.2, height - 0.04], [0.12, height - 0.02], [0, height],
  ]);
  const parts = [body];
  if (topper === 'ball') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = new THREE.SphereGeometry(0.035, 8, 6).toNonIndexed();
      s.translate(Math.cos(a) * 0.22, height - 0.04, Math.sin(a) * 0.22);
      parts.push(s);
    }
    const top = new THREE.SphereGeometry(0.065, 12, 8).toNonIndexed();
    top.translate(0, height + 0.04, 0);
    parts.push(top);
  } else {
    const v = new THREE.BoxGeometry(0.06, 0.22, 0.06).toNonIndexed();
    v.translate(0, height + 0.1, 0);
    const h = new THREE.BoxGeometry(0.18, 0.06, 0.06).toNonIndexed();
    h.translate(0, height + 0.13, 0);
    parts.push(v, h);
  }
  return mergeGeometries(parts)!;
}

function knight(): THREE.BufferGeometry {
  const base = lathe([...BASE, [0.22, 0.17], [0.2, 0.2], [0, 0.2]]);
  // Yandan at başı silueti; +x yönüne bakar.
  const pts: [number, number][] = [
    [-0.19, 0.16], [0.19, 0.16], [0.17, 0.3], [0.09, 0.42], [0.22, 0.5], [0.3, 0.57], [0.29, 0.64],
    [0.2, 0.68], [0.11, 0.74], [0.08, 0.86], [0.02, 0.79], [-0.05, 0.84], [-0.1, 0.74], [-0.17, 0.62],
    [-0.22, 0.45], [-0.23, 0.3],
  ];
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const depth = 0.2;
  const head = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 2, curveSegments: 4,
  });
  head.translate(0, 0, -depth / 2);
  head.deleteAttribute('uv');
  base.deleteAttribute('uv');
  const merged = mergeGeometries([base, head])!;
  merged.computeVertexNormals();
  return merged;
}

let cache: Map<number, THREE.BufferGeometry> | null = null;

export function pieceGeometry(type: number): THREE.BufferGeometry {
  if (!cache) {
    cache = new Map([
      [PAWN, pawn()], [KNIGHT, knight()], [BISHOP, bishop()], [ROOK, rook()],
      [QUEEN, crowned(1.08, 'ball')], [KING, crowned(1.14, 'cross')],
    ]);
  }
  return cache.get(type)!;
}

/** Taşın üst noktası (efekt ve kamera hedefi için). */
export const PIECE_HEIGHT: Record<number, number> = {
  [PAWN]: 0.76, [KNIGHT]: 0.9, [BISHOP]: 1.04, [ROOK]: 0.85, [QUEEN]: 1.12, [KING]: 1.38,
};
