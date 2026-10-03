// Dokunmatik ve fare girdisi: dokun-seç, sürükle-bırak, iki parmakla döndürme, çift dokunuşla sıfırlama.

import * as THREE from 'three';
import { Board3D } from './board3d';

export interface InputHandlers {
  /** Dokunuş (sürükleme olmadan): dokunulan taşın karesi ve tahta yüzeyindeki kare. */
  onTap(hit: { piece: number; plane: number }): void;
  /** Bu karedeki taş sürüklenebilir mi? */
  canDrag(sq: number): boolean;
  onDragStart(sq: number): void;
  onDragOver(sq: number): void;
  /** Sürükleme bitti; `sq` = bırakılan kare (-1 = tahta dışı). */
  onDrop(from: number, sq: number): void;
}

const DRAG_THRESHOLD_PX = 10;
const DOUBLE_TAP_MS = 300;

export class BoardInput {
  enabled = true;
  private pointers = new Map<number, { x: number; y: number }>();
  private press: { id: number; x: number; y: number; sq: number; hit: { piece: number; plane: number } } | null = null;
  private dragging = false;
  private lastTap = 0;
  private pinchAngle: number | null = null;
  private dragPoint = new THREE.Vector3();

  constructor(private el: HTMLElement, private board: Board3D, private h: InputHandlers) {
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.cancel);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private down = (e: PointerEvent) => {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      // İkinci parmak: sürüklemeyi bırak, döndürme moduna geç.
      if (this.dragging && this.press) this.h.onDrop(this.press.sq, -1);
      this.press = null;
      this.dragging = false;
      this.pinchAngle = this.twoFingerAngle();
      return;
    }
    if (this.pointers.size > 2 || !this.enabled) return;
    this.el.setPointerCapture(e.pointerId);
    const hit = this.board.squaresAt(e.clientX, e.clientY);
    // Sürükleme için: dokunulan sürüklenebilir taş, yoksa yüzeydeki kare.
    const sq = hit.piece >= 0 && this.h.canDrag(hit.piece) ? hit.piece : hit.plane;
    this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, sq, hit };
  };

  private move = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse' && this.enabled) this.board.showHover(-1);
      return;
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2 && this.pinchAngle !== null) {
      const a = this.twoFingerAngle();
      let delta = a - this.pinchAngle;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      this.board.rotateBy(-delta);
      this.pinchAngle = a;
      return;
    }
    const p = this.press;
    if (!p || p.id !== e.pointerId || !this.enabled) return;
    if (!this.dragging) {
      const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (moved < DRAG_THRESHOLD_PX || p.sq < 0 || !this.h.canDrag(p.sq)) return;
      this.dragging = true;
      this.h.onDragStart(p.sq);
    }
    const point = this.board.pointOnBoard(e.clientX, e.clientY, 0.45);
    if (point) {
      this.dragPoint.copy(point);
      this.board.dragPieceTo(p.sq, this.dragPoint);
      this.h.onDragOver(this.squareUnder(e));
    }
  };

  private squareUnder(e: PointerEvent): number {
    const flat = this.board.pointOnBoard(e.clientX, e.clientY, 0);
    if (!flat) return -1;
    const file = Math.floor(flat.x + 4), rank = Math.floor(4 - flat.z);
    return file >= 0 && file < 8 && rank >= 0 && rank < 8 ? rank * 8 + file : -1;
  }

  private up = (e: PointerEvent) => {
    const wasPinch = this.pointers.size >= 2;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchAngle = null;
    if (wasPinch) return;
    const p = this.press;
    this.press = null;
    if (!p || p.id !== e.pointerId) return;
    if (this.dragging) {
      this.dragging = false;
      this.h.onDrop(p.sq, this.squareUnder(e));
      return;
    }
    const now = performance.now();
    // Çift dokunuş görünümü sıfırlar; dokunuş yine de normal işlenir.
    if (now - this.lastTap < DOUBLE_TAP_MS) this.board.resetView();
    this.lastTap = now;
    if (this.enabled) this.h.onTap(p.hit);
  };

  private cancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.dragging && this.press) this.h.onDrop(this.press.sq, -1);
    this.press = null;
    this.dragging = false;
    this.pinchAngle = null;
  };

  private twoFingerAngle(): number {
    const [a, b] = [...this.pointers.values()];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
}
