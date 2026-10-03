// Macera haritası: kıvrımlı yol üzerinde seviye düğümleri; seviye 1 en altta, yukarı doğru ilerler.
// Her dünya (100 seviye) ayrı bir bölüm. Arazi canvas döşemelerine çizilir; döşemeler ekrana
// yaklaşınca boyanır (uzun haritada bellek ve açılış süresi düşük kalsın).

import { t } from '../../game/i18n';
import { WORLD_SIZE, World, world, worldOf } from '../../game/worlds';
import { icon } from './icons';
import {
  WorldLayout, ambientKind, drawBridges, drawDetails, drawGround, drawItem, drawPath, drawWater, layoutWorld, occupied, rng,
  samplePath, shade,
} from './mapPainter';

const GAP = 96; // iki düğüm arası dikey mesafe (px)
const PAD = 80; // bölüm alt boşluğu
const BANNER = 150; // bölüm üstünde dünya başlığı için boşluk
const SECTION_HEIGHT = PAD + (WORLD_SIZE - 1) * GAP + BANNER;
const TILE = 1024; // döşeme yüksekliği (CSS px)
const SKY = 700; // bölüm tepesindeki gökyüzü geçişi

export interface MapState {
  levelCount: number;
  unlocked: number;
  stars: (level: number) => number;
}

/** Düğümün yatay konumu (% genişlik): yumuşak, düzensiz bir kıvrım. */
function nodeX(level: number): number {
  const k = level - 1;
  return 50 + 26 * Math.sin(k * 0.78) + 7 * Math.sin(k * 1.9 + 1);
}

function nodeY(indexInWorld: number): number {
  return SECTION_HEIGHT - PAD - indexInWorld * GAP; // bölüm içinde, üstten px
}

interface SectionData {
  info: World;
  width: number;
  layout: WorldLayout;
  nodes: [number, number][];
  dense: [number, number][];
  avoid: (x: number, y: number) => boolean;
}

export class MapScreen {
  private track: HTMLElement;
  private sections = new Map<number, HTMLElement>();
  private data = new Map<number, SectionData>();
  private sectionObserver: IntersectionObserver;
  private tileObserver: IntersectionObserver;
  private state: MapState = { levelCount: 0, unlocked: 1, stars: () => 0 };
  private lastWidth = 0;

  constructor(scroller: HTMLElement, private onPick: (level: number) => void) {
    this.track = scroller.querySelector('.map-track') as HTMLElement;
    this.sectionObserver = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) this.fill(Number((e.target as HTMLElement).dataset.world));
    }, { root: scroller, rootMargin: '1500px 0px' });
    this.tileObserver = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) this.paintTile(e.target as HTMLCanvasElement);
    }, { root: scroller, rootMargin: '900px 0px' });
    this.track.addEventListener('click', (e) => {
      const node = (e.target as HTMLElement).closest<HTMLElement>('.node');
      if (!node) return;
      const level = Number(node.dataset.level);
      if (level > this.state.unlocked) {
        node.classList.remove('nope');
        void node.offsetWidth;
        node.classList.add('nope');
        return;
      }
      this.onPick(level);
    });
    let timer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (this.track.clientWidth === this.lastWidth) return;
        for (const s of this.sections.values()) delete s.dataset.filled;
        this.data.clear();
        this.render(this.state);
      }, 200);
    });
  }

  /** Harita durumunu günceller; gerekli bölümleri oluşturur ve doldurur. */
  render(state: MapState): void {
    this.state = state;
    this.lastWidth = this.track.clientWidth;
    const lastWorld = Math.min(worldOf(Math.max(1, state.levelCount)), worldOf(state.unlocked) + 1);
    for (let w = 0; w <= lastWorld; w++) {
      let section = this.sections.get(w);
      if (!section) {
        section = document.createElement('section');
        section.className = 'world';
        section.dataset.world = String(w);
        section.style.height = `${SECTION_HEIGHT}px`;
        this.track.prepend(section); // seviye 1 en altta
        this.sections.set(w, section);
        this.sectionObserver.observe(section);
      } else if (section.dataset.filled) {
        this.refreshNodes(w);
      }
    }
  }

  scrollToLevel(level: number, smooth = false): void {
    const w = worldOf(level);
    this.fill(w);
    const node = this.sections.get(w)?.querySelector<HTMLElement>(`[data-level="${level}"]`);
    node?.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  }

  /** Dil değişince başlıkları ve düğüm etiketlerini yeniden yazar. */
  relabel(): void {
    for (const [w, section] of this.sections) {
      if (!section.dataset.filled) continue;
      section.querySelector('.world-banner')?.replaceWith(this.banner(world(w)));
      this.refreshNodes(w);
    }
  }

  /** Yeni açılan düğümü zıplat. */
  celebrate(level: number): void {
    this.track.querySelector<HTMLElement>(`[data-level="${level}"]`)?.classList.add('just-unlocked');
  }

  private levelsOf(info: World): number[] {
    const out: number[] = [];
    for (let l = info.firstLevel; l <= Math.min(info.lastLevel, this.state.levelCount); l++) out.push(l);
    return out;
  }

  private fill(w: number): void {
    const section = this.sections.get(w);
    if (!section || section.dataset.filled) return;
    section.dataset.filled = '1';
    const info = world(w);
    const width = section.clientWidth || this.track.clientWidth || 390;
    const levels = this.levelsOf(info);
    const pts: [number, number][] = levels.map((l) => [(nodeX(l) / 100) * width, nodeY((l - 1) % WORLD_SIZE)]);
    if (pts.length) {
      pts.unshift([pts[0][0], SECTION_HEIGHT + 10]);
      const next = levels[levels.length - 1] + 1;
      pts.push([(nodeX(next) / 100) * width, nodeY(WORLD_SIZE) - 10]);
    }
    const dense = samplePath(pts);
    // Dünya başlığının çevresini boş bırak.
    const keepOut = (x: number, y: number) => y < BANNER + 40 && Math.abs(x - width / 2) < 170;
    const layout = layoutWorld(info.theme, info.index * 7919 + 17, width, SECTION_HEIGHT, dense, keepOut);
    this.data.set(w, { info, width, layout, nodes: pts, dense, avoid: occupied(layout, dense) });

    section.style.setProperty('--accent', info.theme.accent);
    section.style.setProperty('--accent-deep', shade(info.theme.accent, -0.35));
    const tiles: HTMLCanvasElement[] = [];
    for (let y = 0; y < SECTION_HEIGHT; y += TILE) {
      const c = document.createElement('canvas');
      c.className = 'map-tile';
      c.dataset.world = String(w);
      c.dataset.y0 = String(y);
      c.style.cssText = `top:${y}px;height:${Math.min(TILE, SECTION_HEIGHT - y)}px`;
      tiles.push(c);
    }
    const nodes = document.createElement('div');
    nodes.className = 'world-nodes';
    section.querySelectorAll('canvas').forEach((old) => this.tileObserver.unobserve(old));
    section.replaceChildren(...tiles, this.ambient(info, width), this.banner(info), nodes);
    for (const c of tiles) this.tileObserver.observe(c);
    this.refreshNodes(w);
  }

  private refreshNodes(w: number): void {
    const holder = this.sections.get(w)?.querySelector('.world-nodes');
    if (holder) holder.replaceChildren(...this.levelsOf(world(w)).map((l) => this.node(l)));
  }

  private paintTile(c: HTMLCanvasElement): void {
    if (c.dataset.painted) return;
    const d = this.data.get(Number(c.dataset.world));
    if (!d) return;
    c.dataset.painted = '1';
    const y0 = Number(c.dataset.y0);
    const h = parseFloat(c.style.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(d.width * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext('2d')!;
    g.scale(dpr, dpr);
    g.translate(0, -y0);
    const th = d.info.theme;
    const y1 = y0 + h;
    drawGround(g, th, d.info.index + 1, d.width, SECTION_HEIGHT, y0, y1);
    if (y0 < SKY) {
      const sky = g.createLinearGradient(0, 0, 0, SKY);
      sky.addColorStop(0, th.skyTop);
      sky.addColorStop(0.55, shade(th.skyBottom, 0, 0.85));
      sky.addColorStop(1, shade(th.skyBottom, 0, 0));
      g.fillStyle = sky;
      g.fillRect(0, 0, d.width, SKY);
    }
    drawWater(g, th, d.layout, y0, y1);
    drawDetails(g, th, d.info.index + 3, d.width, y0, y1, d.avoid);
    drawPath(g, th, d.nodes, d.dense, d.info.index * 101 + 7, y0, y1);
    drawBridges(g, d.layout, y0, y1);
    const r = rng(d.info.index * 13 + y0);
    for (const it of d.layout.items) if (it.y > y0 - 10 && it.y - it.s * 1.9 < y1) drawItem(g, it, th, r);
  }

  /** Hareketli öğeler: uçan kuşlar, bulut gölgeleri, kar, yıldız parıltısı… (CSS ile, çizim maliyeti yok). */
  private ambient(info: World, width: number): HTMLElement {
    const box = document.createElement('div');
    const kind = ambientKind(info.theme.key);
    box.className = `ambient ambient-${kind}`;
    const r = rng(info.index * 31 + 3);
    const count = kind === 'birds' ? 26 : kind === 'snow' ? 140 : kind === 'twinkle' ? 90 : 60;
    let html = '';
    for (let i = 0; i < count; i++) {
      const y = Math.round(r() * SECTION_HEIGHT);
      const x = Math.round(r() * width);
      const delay = (r() * -30).toFixed(1);
      const dur = (kind === 'birds' ? 16 + r() * 14 : kind === 'snow' ? 6 + r() * 6 : 3 + r() * 5).toFixed(1);
      html += `<i style="top:${y}px;left:${x}px;animation-delay:${delay}s;animation-duration:${dur}s"></i>`;
    }
    // Gündüz dünyalarında süzülen bulut gölgeleri
    if (kind === 'birds') {
      for (let i = 0; i < 10; i++) {
        const y = Math.round(r() * SECTION_HEIGHT);
        html += `<b style="top:${y}px;animation-delay:${(r() * -60).toFixed(1)}s;animation-duration:${(45 + r() * 30).toFixed(1)}s"></b>`;
      }
    }
    box.innerHTML = html;
    return box;
  }

  private banner(info: World): HTMLElement {
    const el = document.createElement('div');
    el.className = 'world-banner';
    el.innerHTML = `<span class="world-index">${t('worldN', { n: info.index + 1 })}</span>
      <span class="world-name">${t(info.nameKey)}${info.suffix}</span>
      <span class="world-range">${t('worldLevels', { a: info.firstLevel, b: info.lastLevel })}</span>`;
    return el;
  }

  private node(level: number): HTMLElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'node';
    btn.dataset.level = String(level);
    btn.style.left = `${nodeX(level)}%`;
    btn.style.top = `${nodeY((level - 1) % WORLD_SIZE)}px`;
    const stars = this.state.stars(level);
    const locked = level > this.state.unlocked;
    const current = level === this.state.unlocked;
    btn.classList.add(locked ? 'locked' : current ? 'current' : 'done');
    if (level % WORLD_SIZE === 0) btn.classList.add('boss');
    btn.setAttribute('aria-label', locked ? t('lockedLevel', { n: level })
      : `${t('level', { n: level })}${stars ? `, ${t('stars', { n: stars })}` : ''}`);
    let html = `<span class="node-face"><span class="node-num">${locked ? icon.lock() : level}</span></span>`;
    if (!locked && !current) {
      html += `<span class="node-stars">${[1, 2, 3].map((s) => icon.star(s <= stars ? 'on' : 'off')).join('')}</span>`;
    }
    if (current) html += `<span class="avatar">${icon.pawn()}</span>`;
    btn.innerHTML = html;
    return btn;
  }
}
