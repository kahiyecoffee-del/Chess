// Macera haritası: kıvrımlı yol üzerinde seviye düğümleri; seviye 1 en altta, yukarı doğru ilerler.
// Her dünya (100 seviye) ayrı bir bölüm; bölümler ekrana yaklaşınca doldurulur.

import { t } from '../../game/i18n';
import { Decor, WORLD_SIZE, World, world, worldOf } from '../../game/worlds';
import { icon } from './icons';

const GAP = 88; // iki düğüm arası dikey mesafe (px)
const PAD = 70; // bölüm üst/alt boşluğu
const BANNER = 96;
const SECTION_HEIGHT = PAD * 2 + (WORLD_SIZE - 1) * GAP + BANNER;

export interface MapState {
  levelCount: number;
  unlocked: number;
  stars: (level: number) => number;
}

/** Düğümün yatay konumu (% genişlik): yumuşak, düzensiz bir kıvrım. */
function nodeX(level: number): number {
  const k = level - 1;
  return 50 + 27 * Math.sin(k * 0.82) + 6 * Math.sin(k * 2.1 + 1);
}

function nodeY(indexInWorld: number): number {
  return SECTION_HEIGHT - PAD - indexInWorld * GAP; // bölüm içinde, üstten px
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), a | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const DECOR_SVG: Record<Decor, (c: string) => string> = {
  tree: (c) => `<svg viewBox="0 0 40 48"><rect x="17" y="30" width="6" height="14" rx="2" fill="#a0673e"/><circle cx="20" cy="20" r="15" fill="${c}"/><circle cx="14" cy="15" r="5" fill="#fff" opacity=".25"/></svg>`,
  tower: (c) => `<svg viewBox="0 0 40 52"><rect x="9" y="16" width="22" height="34" rx="3" fill="${c}"/><path d="M6 18 20 2l14 16z" fill="#ff6f91"/><rect x="17" y="34" width="6" height="16" rx="3" fill="#5a3fd1"/></svg>`,
  cactus: (c) => `<svg viewBox="0 0 40 48"><rect x="16" y="8" width="9" height="38" rx="4.5" fill="${c}"/><rect x="5" y="18" width="7" height="16" rx="3.5" fill="${c}"/><rect x="5" y="28" width="14" height="6" rx="3" fill="${c}"/><rect x="28" y="14" width="7" height="14" rx="3.5" fill="${c}"/><rect x="22" y="24" width="13" height="6" rx="3" fill="${c}"/></svg>`,
  crystal: (c) => `<svg viewBox="0 0 40 48"><path d="M20 2 31 16 25 46H15L9 16z" fill="${c}"/><path d="M20 2v44M9 16h22" stroke="#fff" stroke-width="1.5" opacity=".6"/></svg>`,
  planet: (c) => `<svg viewBox="0 0 48 40"><circle cx="24" cy="20" r="12" fill="${c}"/><ellipse cx="24" cy="21" rx="22" ry="6" fill="none" stroke="#ffd23f" stroke-width="2.5"/><circle cx="19" cy="15" r="3" fill="#fff" opacity=".35"/></svg>`,
  mushroom: (c) => `<svg viewBox="0 0 40 44"><rect x="15" y="22" width="10" height="18" rx="4" fill="#fff4e0"/><path d="M4 24a16 14 0 0 1 32 0z" fill="${c}"/><circle cx="14" cy="16" r="3" fill="#fff"/><circle cx="25" cy="13" r="2.5" fill="#fff"/></svg>`,
  shell: (c) => `<svg viewBox="0 0 40 40"><path d="M20 4C9 4 4 16 6 30l14 6 14-6C36 16 31 4 20 4z" fill="${c}"/><path d="M20 6v28M12 10l5 24M28 10l-5 24" stroke="#fff" stroke-width="1.6" opacity=".55"/></svg>`,
  cloud: (c) => `<svg viewBox="0 0 52 32"><path d="M12 28a9 9 0 0 1-1-18 12 12 0 0 1 23-3 9 9 0 0 1 8 21z" fill="${c}"/></svg>`,
  lantern: (c) => `<svg viewBox="0 0 32 48"><path d="M16 2v6" stroke="#5a3fd1" stroke-width="2"/><rect x="5" y="8" width="22" height="30" rx="11" fill="${c}"/><rect x="11" y="38" width="10" height="6" rx="2" fill="#5a3fd1"/></svg>`,
  flame: (c) => `<svg viewBox="0 0 36 48"><path d="M18 2c4 9 14 14 14 27a14 14 0 0 1-28 0c0-7 4-11 7-14 0 5 2 8 5 9-2-8 0-15 2-22z" fill="${c}"/></svg>`,
};

const DECOR_COLOR: Record<Decor, string> = {
  tree: '#4cbf6b', tower: '#fff0f8', cactus: '#3cb371', crystal: '#9ad8ff', planet: '#ff7bd5', mushroom: '#ff5c5c',
  shell: '#ffb3c7', cloud: '#ffffff', lantern: '#ff7b54', flame: '#ffd23f',
};

export class MapScreen {
  private track: HTMLElement;
  private sections = new Map<number, HTMLElement>();
  private observer: IntersectionObserver;
  private state: MapState = { levelCount: 0, unlocked: 1, stars: () => 0 };

  constructor(scroller: HTMLElement, private onPick: (level: number) => void) {
    this.track = scroller.querySelector('.map-track') as HTMLElement;
    this.observer = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) this.fill(Number((e.target as HTMLElement).dataset.world));
    }, { root: scroller, rootMargin: '1200px 0px' });
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
  }

  /** Harita durumunu günceller; gerekli bölümleri oluşturur ve doldurur. */
  render(state: MapState): void {
    this.state = state;
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
        this.observer.observe(section);
      } else if (section.dataset.filled) {
        this.fill(w, true);
      }
    }
  }

  scrollToLevel(level: number, smooth = false): void {
    const w = worldOf(level);
    this.fill(w);
    const node = this.sections.get(w)?.querySelector<HTMLElement>(`[data-level="${level}"]`);
    node?.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  }

  /** Yeni açılan düğümü zıplat. */
  celebrate(level: number): void {
    const node = this.track.querySelector<HTMLElement>(`[data-level="${level}"]`);
    node?.classList.add('just-unlocked');
  }

  private fill(w: number, force = false): void {
    const section = this.sections.get(w);
    if (!section || (section.dataset.filled && !force)) return;
    section.dataset.filled = '1';
    const info = world(w);
    const th = info.theme;
    section.style.setProperty('--ground', th.ground);
    section.style.setProperty('--accent', th.accent);
    section.style.setProperty('--path', th.path);
    // Uzun gradyanlar bazı GPU'larda çizilmiyor: zemin düz renk, tepede kısa bir gökyüzü geçişi.
    section.style.backgroundColor = th.ground;
    section.style.setProperty('--sky-top', th.skyTop);
    section.style.setProperty('--sky-bottom', th.skyBottom);
    if (th.key === 'space') section.classList.add('night');

    const levels: number[] = [];
    for (let l = info.firstLevel; l <= Math.min(info.lastLevel, this.state.levelCount); l++) levels.push(l);
    const sky = document.createElement('div');
    sky.className = 'world-sky';
    section.replaceChildren(sky, this.banner(info), this.path(levels), ...this.decor(info, levels), ...levels.map((l) => this.node(l)));
  }

  private banner(info: World): HTMLElement {
    const el = document.createElement('div');
    el.className = 'world-banner';
    el.innerHTML = `<span class="world-name">${t(info.nameKey)}${info.suffix}</span>
      <span class="world-range">${t('worldLevels', { a: info.firstLevel, b: info.lastLevel })}</span>`;
    return el;
  }

  private path(levels: number[]): SVGSVGElement {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'world-path');
    svg.setAttribute('viewBox', `0 0 100 ${SECTION_HEIGHT}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const pts = levels.map((l) => [nodeX(l), nodeY((l - 1) % WORLD_SIZE)]);
    // Bir sonraki dünyaya devam eden uç
    if (pts.length) pts.push([nodeX(levels[levels.length - 1] + 1), nodeY(WORLD_SIZE) + 10]);
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      if (i === 0) { d += `M${x} ${y + PAD}L${x} ${y}`; continue; }
      const [px, py] = pts[i - 1];
      const my = (py + y) / 2;
      d += `C${px} ${my} ${x} ${my} ${x} ${y}`;
    }
    for (const cls of ['road-edge', 'road', 'road-dash']) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', cls);
      p.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(p);
    }
    return svg;
  }

  private decor(info: World, levels: number[]): HTMLElement[] {
    const r = rng(info.index * 7919 + 17);
    const out: HTMLElement[] = [];
    const kind = info.theme.decor;
    for (let i = 0; i < levels.length; i += 2) {
      const l = levels[i];
      const x = nodeX(l);
      // Yolun karşı tarafına yerleştir.
      const side = x > 50 ? 8 + r() * 20 : 72 + r() * 20;
      const el = document.createElement('div');
      el.className = 'decor';
      const size = 34 + r() * 30;
      el.style.cssText = `left:${side}%;top:${nodeY((l - 1) % WORLD_SIZE) - size / 2 + (r() - 0.5) * 40}px;width:${size}px;`;
      el.innerHTML = DECOR_SVG[kind](DECOR_COLOR[kind]);
      out.push(el);
    }
    return out;
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
    if (locked) btn.classList.add('locked');
    else if (current) btn.classList.add('current');
    else btn.classList.add('done');
    if (level % WORLD_SIZE === 0) btn.classList.add('boss');
    btn.setAttribute('aria-label', locked ? t('lockedLevel', { n: level })
      : `${t('level', { n: level })}${stars ? `, ${t('stars', { n: stars })}` : ''}`);
    let html = `<span class="node-num">${locked ? icon.lock() : level}</span>`;
    if (!locked && !current) {
      html += `<span class="node-stars">${[1, 2, 3].map((s) => icon.star(s <= stars ? 'on' : 'off')).join('')}</span>`;
    }
    if (current) html += `<span class="avatar">${icon.pawn()}</span>`;
    btn.innerHTML = html;
    return btn;
  }
}
