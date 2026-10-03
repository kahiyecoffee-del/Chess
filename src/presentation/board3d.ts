// 3D tahta: sahne, kamera, taşlar, vurgular ve tüm hamle animasyonları.

import * as THREE from 'three';
import {
  BLACK, Color, EMPTY, KING, MoveDescription, Position, WHITE, fileOf, makePiece, pieceColor, pieceType,
  rankOf,
} from '../core/chess';
import { PIECE_HEIGHT, pieceGeometry } from './pieces';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BOARD_SETS, BoardSetDef, DEFAULT_BOARD_SET, DEFAULT_PIECE_SET, MaterialDef, PIECE_SETS, PieceSetDef } from './sets';
import { boardTexture, captureTexture, contactShadowTexture, dotTexture, frameTexture, glowSquareTexture } from './textures';
import { Tweener, ease } from './tween';

const material = (d: MaterialDef, map?: THREE.Texture) =>
  new THREE.MeshPhysicalMaterial({
    color: d.color, roughness: d.roughness, metalness: d.metalness, map: map ?? null,
    clearcoat: d.clearcoat ?? 0, clearcoatRoughness: d.clearcoatRoughness ?? 0.2, sheen: d.sheen ?? 0,
  });

const FRAME = 0.5; // tahta çerçevesi genişliği
const MAX_USER_ROTATION = 0.38; // radyan; iki parmakla döndürme sınırı
const LIE_HEIGHT = 0.3; // yatan taşın tahta üstündeki yüksekliği

export interface Layout {
  topInset: number; // ekranın üstünde UI'ye ayrılan oran (0..1)
  bottomInset: number;
}

const overlayMat = (map: THREE.Texture, opacity = 1) =>
  new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false, toneMapped: false });

export class Board3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  readonly tweener = new Tweener();
  readonly group = new THREE.Group(); // tahta + taşlar (döndürme ve yön çevirme bunun üzerinde)

  private pieces = new Map<number, THREE.Mesh>();
  private pieceMaterials: [THREE.MeshPhysicalMaterial, THREE.MeshPhysicalMaterial];
  private overlay = new THREE.Group();
  private labels: THREE.Mesh[] = [];
  private checkRing: THREE.Mesh;
  private orientation: Color = WHITE;
  private userRotation = 0;
  private cameraTarget = new THREE.Vector3(0, 0, 0.3);
  private cameraDir = new THREE.Vector3(0, Math.sin(58 * Math.PI / 180), Math.cos(58 * Math.PI / 180));
  private cameraDistance = 20;
  private zoom = 1; // mat sinematiği için
  private shake = 0;
  private layout: Layout = { topInset: 0.16, bottomInset: 0.12 };
  private raycaster = new THREE.Raycaster();
  private lastTime = performance.now();
  private hlMaterials = {
    selected: overlayMat(glowSquareTexture('#ffd36b'), 0.95),
    last: overlayMat(glowSquareTexture('#f5d77a', 0.75), 0.75),
    target: overlayMat(dotTexture('rgba(20,16,30,0.55)')),
    capture: overlayMat(captureTexture('rgba(214,54,64,0.85)')),
    hover: overlayMat(glowSquareTexture('#ffffff', 0.6), 0.6),
  };

  constructor(private canvas: HTMLCanvasElement, pieceSet: PieceSetDef = PIECE_SETS[DEFAULT_PIECE_SET],
    boardSet: BoardSetDef = BOARD_SETS[DEFAULT_BOARD_SET]) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0); // arka planı CSS (dünya teması) çizer
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Kodla üretilen stüdyo ortamı: cilalı yüzeylere gerçekçi yansıma verir.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    this.pieceMaterials = [material(pieceSet.white), material(pieceSet.black)];
    this.buildLights();
    this.buildBoard(boardSet);
    this.scene.add(this.group);
    this.group.add(this.overlay);

    this.checkRing = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), overlayMat(dotTexture('#ff3b30'), 0));
    this.checkRing.rotation.x = -Math.PI / 2;
    this.checkRing.position.y = 0.012;
    this.checkRing.visible = false;
    this.group.add(this.checkRing);
    let pulse = 0;
    this.tweener.onFrame((dt) => {
      if (!this.checkRing.visible) return;
      pulse += dt * 4.2;
      const k = 0.5 + 0.5 * Math.sin(pulse);
      (this.checkRing.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.45 * k;
      this.checkRing.scale.setScalar(0.85 + 0.2 * k);
    });

    this.resize();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.tweener.step(dt);
      // Oyun ekranı gizliyken (harita açık) çizim yapma: pil dostu.
      if (this.canvas.offsetParent !== null) {
        this.updateCamera(dt);
        this.renderer.render(this.scene, this.camera);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ---- Kurulum ----

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight('#fff4e6', '#3a2a4a', 0.5));
    const key = new THREE.DirectionalLight('#fff1dc', 2.2);
    key.position.set(-3.5, 11, 4.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.radius = 3;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#b9c8ff', 0.7);
    rim.position.set(4, 5, -7);
    this.scene.add(rim);
  }

  private buildBoard(set: BoardSetDef): void {
    // Oyun alanı: tek parça, ahşap damarlı doku.
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), material(set.surface, boardTexture(set.light, set.dark)));
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.001;
    surface.receiveShadow = true;
    this.group.add(surface);

    const outer = 8 + FRAME * 2;
    const frameTex = frameTexture(set.frame.base, set.frame.grain);
    frameTex.repeat.set(3, 3);
    const frame = new THREE.Mesh(new RoundedBoxGeometry(outer, 0.34, outer, 4, 0.1), material(set.frame, frameTex));
    frame.position.y = -0.185; // üst yüzü oyun alanının biraz altında (z-fighting olmasın)
    frame.receiveShadow = true;
    frame.castShadow = true;
    this.group.add(frame);

    // Altın kakma şerit: oyun alanının hemen çevresinde ince bir çerçeve.
    const inlayMat = material(set.inlay);
    const w = 8.16, t = 0.05;
    for (const [x, z, sx, sz] of [[0, w / 2, w + t, t], [0, -w / 2, w + t, t], [w / 2, 0, t, w], [-w / 2, 0, t, w]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.012, sz), inlayMat);
      bar.position.set(x, 0.002, z);
      this.group.add(bar);
    }

    // Tahtanın altında yumuşak temas gölgesi + taşların gerçek gölgesi.
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(13, 13),
      new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false, color: '#000000' }));
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = -0.36;
    this.group.add(contact);
    this.buildLabels(set);
  }

  private buildLabels(set: BoardSetDef): void {
    const make = (text: string) => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      g.fillStyle = set.label;
      g.font = '700 38px Outfit, Manrope, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, 32, 35);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), overlayMat(tex, 0.9));
      mesh.rotation.x = -Math.PI / 2;
      this.group.add(mesh);
      this.labels.push(mesh);
      return mesh;
    };
    for (let i = 0; i < 8; i++) {
      make(String.fromCharCode(97 + i)).userData = { kind: 'file', index: i };
      make(String(i + 1)).userData = { kind: 'rank', index: i };
    }
    this.placeLabels();
  }

  private placeLabels(): void {
    // Etiketler her zaman oyuncunun yakın kenarında ve okunur yönde olsun.
    const flip = this.orientation === BLACK;
    for (const mesh of this.labels) {
      const { kind, index } = mesh.userData as { kind: string; index: number };
      const edge = 4 + FRAME / 2 + 0.03;
      if (kind === 'file') {
        mesh.position.set(index - 3.5, 0.003, flip ? -edge : edge);
      } else {
        mesh.position.set(flip ? edge : -edge, 0.003, 3.5 - index);
      }
      mesh.rotation.z = flip ? Math.PI : 0;
    }
  }

  // ---- Koordinatlar ----

  squarePosition(sq: number): THREE.Vector3 {
    return new THREE.Vector3(fileOf(sq) - 3.5, 0, 3.5 - rankOf(sq));
  }

  private localToSquare(x: number, z: number): number {
    const file = Math.floor(x + 4), rank = Math.floor(4 - z);
    return file >= 0 && file < 8 && rank >= 0 && rank < 8 ? rank * 8 + file : -1;
  }

  private ray(clientX: number, clientY: number): THREE.Ray {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.ray;
  }

  /**
   * Ekran noktasının altındaki kareler: `piece` = dokunulan taş gövdesinin karesi,
   * `plane` = tahta yüzeyindeki kare. Uzun taşlar arkadaki kareyi örtebildiği için ikisi de gerekir.
   */
  squaresAt(clientX: number, clientY: number): { piece: number; plane: number } {
    this.ray(clientX, clientY);
    const hits = this.raycaster.intersectObjects([...this.pieces.values()], false);
    const p = this.pointOnBoard(clientX, clientY, 0);
    return {
      piece: hits.length ? (hits[0].object.userData.square as number) : -1,
      plane: p ? this.localToSquare(p.x, p.z) : -1,
    };
  }

  /** Tek kare gereken yerler için: önce taş, sonra yüzey. */
  squareAt(clientX: number, clientY: number): number {
    const { piece, plane } = this.squaresAt(clientX, clientY);
    return piece >= 0 ? piece : plane;
  }

  /** Ekran noktasının belirli yükseklikteki yatay düzlemdeki karşılığı (grup koordinatlarında). */
  pointOnBoard(clientX: number, clientY: number, height: number): THREE.Vector3 | null {
    const ray = this.ray(clientX, clientY);
    const hit = new THREE.Vector3();
    if (!ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -height), hit)) return null;
    return this.group.worldToLocal(hit);
  }

  /** Karenin ekran (client) koordinatı; uçtan uca testler için. */
  squareToClient(sq: number): { x: number; y: number } {
    const p = this.group.localToWorld(this.squarePosition(sq)).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
  }

  // ---- Kamera ----

  setLayout(layout: Layout): void {
    this.layout = layout;
    this.resize();
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.cameraDistance = this.fitDistance();
  }

  /** Tahtanın tamamı (UI şeritleri hariç alana) sığacak en yakın kamera mesafesi. */
  private fitDistance(): number {
    const half = 4 + FRAME + 0.1;
    const corners: THREE.Vector3[] = [];
    for (const x of [-half, half]) for (const z of [-half, half]) for (const y of [0, 0.9]) corners.push(new THREE.Vector3(x, y, z));
    const top = 1 - this.layout.topInset * 2, bottom = -1 + this.layout.bottomInset * 2;
    const fits = (d: number) => {
      this.camera.position.copy(this.cameraTarget).addScaledVector(this.cameraDir, d);
      this.camera.lookAt(this.cameraTarget);
      this.camera.updateMatrixWorld();
      return corners.every((c) => {
        const p = c.clone().project(this.camera);
        return p.x > -0.97 && p.x < 0.97 && p.y < top && p.y > bottom;
      });
    };
    let lo = 4, hi = 80;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid; else lo = mid;
    }
    return hi;
  }

  private updateCamera(dt: number): void {
    const d = this.cameraDistance * this.zoom;
    this.camera.position.copy(this.cameraTarget).addScaledVector(this.cameraDir, d);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.12;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(this.cameraTarget);
    const base = this.orientation === BLACK ? Math.PI : 0;
    this.group.rotation.y += (base + this.userRotation - this.group.rotation.y) * Math.min(1, dt * 12);
  }

  setOrientation(color: Color): void {
    const changed = color !== this.orientation;
    this.orientation = color;
    this.userRotation = 0;
    if (changed) this.group.rotation.y = color === BLACK ? Math.PI : 0;
    this.placeLabels();
  }

  rotateBy(radians: number): void {
    this.userRotation = Math.max(-MAX_USER_ROTATION, Math.min(MAX_USER_ROTATION, this.userRotation + radians));
  }

  resetView(): void {
    this.userRotation = 0;
  }

  shakeCamera(amount = 1): void {
    this.shake = amount;
  }

  // ---- Taşlar ----

  private createPiece(piece: number, sq: number): THREE.Mesh {
    const mesh = new THREE.Mesh(pieceGeometry(pieceType(piece)), this.pieceMaterials[pieceColor(piece)]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(this.squarePosition(sq));
    // Atlar rakip tarafa çapraz baksın; böylece kameradan profilleri görünür.
    mesh.rotation.y = pieceColor(piece) === WHITE ? Math.PI * 0.78 : -Math.PI * 0.22;
    mesh.userData = { square: sq, piece };
    this.group.add(mesh);
    this.pieces.set(sq, mesh);
    return mesh;
  }

  private removePiece(mesh: THREE.Mesh): void {
    this.group.remove(mesh);
    if (Array.isArray(mesh.material)) return;
    if (!this.pieceMaterials.includes(mesh.material as THREE.MeshPhysicalMaterial)) mesh.material.dispose();
  }

  setPosition(pos: Position): void {
    for (const mesh of this.pieces.values()) this.removePiece(mesh);
    this.pieces.clear();
    for (let sq = 0; sq < 64; sq++) if (pos.board[sq] !== EMPTY) this.createPiece(pos.board[sq], sq);
    this.setCheck(-1);
  }

  hasPiece(sq: number): boolean {
    return this.pieces.has(sq);
  }

  // ---- Vurgular ----

  private addOverlay(sq: number, mat: THREE.Material, kind: 'square' | 'dot' | 'ring', tag: string): void {
    const size = kind === 'dot' ? 0.42 : 1;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    mesh.rotation.x = -Math.PI / 2;
    const p = this.squarePosition(sq);
    mesh.position.set(p.x, kind === 'square' ? 0.005 : 0.008, p.z);
    mesh.userData.tag = tag;
    mesh.renderOrder = 1;
    this.overlay.add(mesh);
  }

  private clearOverlay(tag: string): void {
    for (const child of [...this.overlay.children]) {
      if (child.userData.tag !== tag) continue;
      this.overlay.remove(child);
      (child as THREE.Mesh).geometry.dispose();
    }
  }

  showSelection(sq: number, targets: { sq: number; capture: boolean }[]): void {
    this.clearSelection();
    if (sq < 0) return;
    this.addOverlay(sq, this.hlMaterials.selected, 'square', 'sel');
    for (const t of targets) {
      this.addOverlay(t.sq, t.capture ? this.hlMaterials.capture : this.hlMaterials.target, t.capture ? 'ring' : 'dot', 'sel');
    }
  }

  clearSelection(): void {
    this.clearOverlay('sel');
    this.clearOverlay('hover');
  }

  showHover(sq: number): void {
    this.clearOverlay('hover');
    if (sq >= 0) this.addOverlay(sq, this.hlMaterials.hover, 'square', 'hover');
  }

  showLastMove(from: number, to: number): void {
    this.clearOverlay('last');
    if (from < 0) return;
    this.addOverlay(from, this.hlMaterials.last, 'square', 'last');
    this.addOverlay(to, this.hlMaterials.last, 'square', 'last');
  }

  setCheck(kingSq: number): void {
    this.checkRing.visible = kingSq >= 0;
    if (kingSq >= 0) {
      const p = this.squarePosition(kingSq);
      this.checkRing.position.set(p.x, 0.012, p.z);
    }
  }

  // ---- Sürükleme ----

  /** Sürüklenen taşı parmağın altında tutar (grup koordinatlarında). */
  dragPieceTo(sq: number, point: THREE.Vector3): void {
    const mesh = this.pieces.get(sq);
    if (!mesh) return;
    mesh.position.set(point.x, 0.45, point.z);
  }

  async returnPiece(sq: number): Promise<void> {
    const mesh = this.pieces.get(sq);
    if (!mesh) return;
    const start = mesh.position.clone();
    const end = this.squarePosition(sq);
    await this.tweener.tween(0.18, (k) => mesh.position.lerpVectors(start, end, k), ease.outCubic);
  }

  // ---- Hamle animasyonları ----

  private async arcMove(mesh: THREE.Mesh, to: number, duration: number): Promise<void> {
    const start = mesh.position.clone();
    const end = this.squarePosition(to);
    const dist = start.distanceTo(end);
    const height = Math.max(0, 0.25 + dist * 0.07 - start.y);
    await this.tweener.tween(duration, (k) => {
      mesh.position.lerpVectors(start, end, k);
      mesh.position.y = start.y * (1 - k) + Math.sin(Math.PI * k) * height;
    }, ease.heavy);
    // Ağırlıklı iniş: hafif ezilme ve toparlanma.
    await this.tweener.tween(0.14, (k) => {
      const s = 1 - 0.08 * Math.sin(Math.PI * k);
      mesh.scale.set(1 + (1 - s) * 0.6, s, 1 + (1 - s) * 0.6);
    }, ease.linear);
    mesh.scale.set(1, 1, 1);
  }

  /** Alınan taş devrilir, kayar ve tahtadan düşer. */
  private topple(mesh: THREE.Mesh, fromDir: THREE.Vector3): Promise<void> {
    const dir = fromDir.clone().setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
    dir.normalize();
    const axis = new THREE.Vector3(dir.z, 0, -dir.x); // devrilme ekseni
    const q0 = mesh.quaternion.clone();
    const mat = (mesh.material as THREE.MeshPhysicalMaterial).clone();
    mat.transparent = true;
    mesh.material = mat;
    const pos = mesh.position.clone();
    const vel = dir.clone().multiplyScalar(4.2);
    let vy = 0;
    let fall = 0;
    let tipped = 0;
    let life = 0;
    return new Promise((resolve) => {
      const stop = this.tweener.onFrame((dt) => {
        life += dt;
        tipped = Math.min(1, tipped + dt * 4.5);
        const q = new THREE.Quaternion().setFromAxisAngle(axis, (Math.PI / 2) * ease.outQuad(tipped));
        mesh.quaternion.copy(q0).premultiply(q);
        const onBoard = Math.abs(pos.x) < 4 + FRAME && Math.abs(pos.z) < 4 + FRAME;
        if (tipped > 0.4) pos.addScaledVector(vel, dt);
        if (!onBoard) { vy -= 18 * dt; fall += vy * dt; }
        else vel.multiplyScalar(1 - dt * 0.6);
        // Taban merkezinde döndüğü için yatarken taban yarıçapı kadar yüksel.
        mesh.position.set(pos.x, pos.y + LIE_HEIGHT * Math.sin((Math.PI / 2) * ease.outQuad(tipped)) + fall, pos.z);
        if (life > 0.9) mat.opacity = Math.max(0, 1 - (life - 0.9) * 2.5);
        if (life > 1.3) {
          stop();
          this.removePiece(mesh);
          resolve();
        }
      });
    });
  }

  /**
   * Hamleyi canlandırır. `desc`, hamle yapılmadan önceki pozisyondan alınmalıdır.
   * Dönen promise, ana hareket bitince çözülür (devrilen taş arka planda düşmeye devam eder).
   */
  async animateMove(desc: MoveDescription, moverColor: Color, opts: { fast?: boolean } = {}): Promise<void> {
    const mesh = this.pieces.get(desc.from);
    if (!mesh) return;
    this.clearSelection();
    this.setCheck(-1);
    const captured = desc.captureSq >= 0 ? this.pieces.get(desc.captureSq) : undefined;
    if (captured) this.pieces.delete(desc.captureSq);
    this.pieces.delete(desc.from);
    this.pieces.set(desc.to, mesh);
    mesh.userData.square = desc.to;

    const duration = opts.fast ? 0.22 : 0.42;
    const moving = [this.arcMove(mesh, desc.to, duration)];
    if (desc.rookFrom >= 0) {
      const rook = this.pieces.get(desc.rookFrom);
      if (rook) {
        this.pieces.delete(desc.rookFrom);
        this.pieces.set(desc.rookTo, rook);
        rook.userData.square = desc.rookTo;
        moving.push(this.tweener.wait(0.08).then(() => this.arcMove(rook, desc.rookTo, duration)));
      }
    }
    if (captured) {
      const push = this.squarePosition(desc.captureSq).sub(this.squarePosition(desc.from));
      void this.tweener.wait(duration * 0.78).then(() => this.topple(captured, push));
    }
    await Promise.all(moving);
    if (desc.promo) {
      this.removePiece(mesh);
      this.pieces.delete(desc.to);
      const promoted = this.createPiece(makePiece(desc.promo, moverColor), desc.to);
      promoted.scale.setScalar(0.01);
      await this.tweener.tween(0.3, (k) => promoted.scale.setScalar(Math.max(0.01, k)), ease.outBack);
    }
    this.showLastMove(desc.from, desc.to);
  }

  /** Yanlış hamle: taş hedefe gider, geri kayar; kamera hafifçe sarsılır. */
  async rejectMove(from: number, to: number, alreadyDragged: boolean): Promise<void> {
    const mesh = this.pieces.get(from);
    if (!mesh) return;
    this.clearSelection();
    const home = this.squarePosition(from);
    const target = this.squarePosition(to);
    if (!alreadyDragged) {
      const start = mesh.position.clone();
      await this.tweener.tween(0.22, (k) => {
        mesh.position.lerpVectors(start, target, k);
        mesh.position.y = Math.sin(Math.PI * k) * 0.3;
      }, ease.inOutCubic);
    }
    this.shakeCamera(0.6);
    navigator.vibrate?.(60);
    const back = mesh.position.clone();
    await this.tweener.tween(0.3, (k) => {
      mesh.position.lerpVectors(back, home, k);
      mesh.position.y = back.y * (1 - k);
      mesh.position.x += Math.sin(k * Math.PI * 6) * 0.04 * (1 - k);
    }, ease.outCubic);
    mesh.position.copy(home);
  }

  /** Şah mat sineması: yavaş çekim, yakınlaşma, kral devrilir, parçacıklar. */
  async playCheckmate(kingSq: number, attackerSq: number): Promise<void> {
    const king = this.pieces.get(kingSq);
    if (!king || pieceType(king.userData.piece as number) !== KING) return;
    this.setCheck(-1);
    const world = king.getWorldPosition(new THREE.Vector3());
    const startTarget = this.cameraTarget.clone();
    const focus = new THREE.Vector3(world.x * 0.55, 0.3, world.z * 0.55 + 0.2);
    this.tweener.timeScale = 0.4;
    navigator.vibrate?.([30, 60, 90]);
    const zoomIn = this.tweener.tween(0.9, (k) => {
      this.zoom = 1 - 0.32 * k;
      this.cameraTarget.lerpVectors(startTarget, focus, k);
    }, ease.inOutCubic, true);
    this.burst(world, PIECE_HEIGHT[KING]);
    const push = this.squarePosition(kingSq).sub(attackerSq >= 0 ? this.squarePosition(attackerSq) : new THREE.Vector3(0, 0, 0));
    const dir = push.setY(0).normalize();
    const axis = new THREE.Vector3(dir.z, 0, -dir.x);
    const q0 = king.quaternion.clone();
    await this.tweener.tween(0.7, (k) => {
      king.quaternion.copy(q0).premultiply(new THREE.Quaternion().setFromAxisAngle(axis, (Math.PI / 2) * k));
      king.position.copy(this.squarePosition(kingSq)).addScaledVector(dir, 0.55 * k);
      king.position.y = LIE_HEIGHT * Math.sin((Math.PI / 2) * k);
    }, ease.inQuad);
    await zoomIn;
    await this.tweener.wait(0.5);
    this.tweener.timeScale = 1;
  }

  resetCamera(): void {
    this.tweener.timeScale = 1;
    this.zoom = 1;
    this.cameraTarget.set(0, 0, 0.3);
    this.resize();
  }

  private burst(origin: THREE.Vector3, height: number): void {
    const count = 180;
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];
    const local = this.group.worldToLocal(origin.clone());
    for (let i = 0; i < count; i++) {
      positions.set([local.x, height * 0.8, local.z], i * 3);
      const a = Math.random() * Math.PI * 2;
      const up = 2.5 + Math.random() * 4;
      const out = 1 + Math.random() * 2.6;
      velocities.push(new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: '#ffd36b', size: 0.11, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this.group.add(points);
    let life = 0;
    const stop = this.tweener.onFrame((dt) => {
      life += dt;
      for (let i = 0; i < count; i++) {
        const v = velocities[i];
        v.y -= 7 * dt;
        positions[i * 3] += v.x * dt;
        positions[i * 3 + 1] = Math.max(0.02, positions[i * 3 + 1] + v.y * dt);
        positions[i * 3 + 2] += v.z * dt;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = Math.max(0, 1 - life / 2.2);
      if (life > 2.2) {
        stop();
        this.group.remove(points);
        geo.dispose();
        mat.dispose();
      }
    });
  }
}
