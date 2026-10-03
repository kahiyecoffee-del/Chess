// Uygulama girişi: seviye kütüphanesi, 3D tahta, arayüz ve bulmaca akışını bağlar.

import './styles.css';
import { Color } from './core/chess';
import { Puzzle, PuzzlePack } from './core/puzzle';
import { LevelLibrary } from './game/levels';
import { t } from './game/i18n';
import { loadLastLevel, saveLastLevel } from './game/progress';
import { FlowUi, PuzzleFlow } from './game/puzzleFlow';
import { Board3D } from './presentation/board3d';

// Uygulamaya gömülü ilk paket(ler). Kalan paketler Aşama 4'te uzaktan indirilecek.
const packs = import.meta.glob<PuzzlePack>('../content/puzzles/levels/pack-000.json', { eager: true, import: 'default' });

const PHASE1_LEVEL_LIST = 30; // seviye listesinde gösterilen seviye sayısı (harita Aşama 2'de)

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function goalKey(p: Puzzle): string {
  const order = ['mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack', 'hangingPiece',
    'sacrifice', 'promotion'];
  return `goal.${order.find((x) => p.themes.includes(x)) ?? 'advantage'}`;
}

function boot(): void {
  const library = new LevelLibrary();
  for (const pack of Object.values(packs)) library.addPack(pack);

  const canvas = $<HTMLCanvasElement>('board');
  const board = new Board3D(canvas);
  const solved = new Set<number>();
  let level = Math.min(loadLastLevel(), Math.max(1, library.count));

  const status = $('status');
  const setStatus: FlowUi['setStatus'] = (key) => {
    status.textContent = t(key);
    status.className = 'status' + (key === 'correct' ? ' good' : key === 'wrong' ? ' bad' : '');
    if (key === 'correct' || key === 'wrong') {
      void status.offsetWidth; // animasyonu yeniden başlat
      status.classList.add('bump');
    }
  };

  const ui: FlowUi = {
    setStatus,
    setProgress(done, total) {
      const el = $('move-progress');
      el.replaceChildren(...Array.from({ length: total }, (_, i) => {
        const dot = document.createElement('i');
        if (i < done) dot.className = 'done';
        return dot;
      }));
    },
    showSolved(mistakes) {
      solved.add(level);
      $('result-title').textContent = t('solved');
      $('result-detail').textContent = mistakes === 0 ? t('solvedPerfect') : t('solvedMistakes', { n: mistakes });
      $('btn-next').hidden = level >= library.count;
      $('result').hidden = false;
      $('btn-next').focus();
    },
    askPromotion(_color: Color) {
      const sheet = $('promo');
      sheet.hidden = false;
      return new Promise((resolve) => {
        const onClick = (e: Event) => {
          const target = e.target as HTMLElement;
          const btn = target.closest('button');
          if (!btn && target !== sheet) return;
          sheet.hidden = true;
          sheet.removeEventListener('click', onClick);
          resolve(btn ? Number(btn.dataset.promo) : null);
        };
        sheet.addEventListener('click', onClick);
      });
    },
  };

  const flow = new PuzzleFlow(board, canvas, ui);
  // Uçtan uca testlerin oyunu sürebilmesi için küçük bir kanca.
  (window as unknown as { __cq: unknown }).__cq = { flow, board, library, play: (n: number) => play(n) };

  const play = (n: number) => {
    const puzzle = library.level(n);
    if (!puzzle) return;
    level = n;
    saveLastLevel(n);
    $('result').hidden = true;
    $('levels').hidden = true;
    $('level-num').textContent = String(n);
    $('goal-text').textContent = t(goalKey(puzzle));
    const white = puzzle.fen.split(' ')[1] === 'b';
    $('side-label').textContent = t(white ? 'youPlayWhite' : 'youPlayBlack');
    $('side-swatch').classList.toggle('black', !white);
    void flow.start(puzzle);
  };

  const renderLevelGrid = () => {
    const grid = $('level-grid');
    const count = Math.min(PHASE1_LEVEL_LIST, library.count);
    grid.replaceChildren(...Array.from({ length: count }, (_, i) => {
      const n = i + 1;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = String(n);
      b.setAttribute('aria-label', t('level', { n }));
      if (n === level) b.classList.add('current');
      if (solved.has(n)) b.classList.add('solved');
      b.addEventListener('click', () => play(n));
      return b;
    }));
  };

  // Statik metinler
  document.querySelector('[data-t="levelLabel"]')!.textContent = t('level', { n: '' }).trim();
  $('btn-retry').textContent = t('retry');
  $('btn-result-retry').textContent = t('retry');
  $('btn-next').textContent = t('next');
  $('levels-title').textContent = t('levelsTitle');
  $('promo-title').textContent = t('choosePromotion');
  $('credits').textContent = t('credits');
  $('btn-levels').setAttribute('aria-label', t('levels'));
  $('btn-levels-close').setAttribute('aria-label', t('close'));

  $('btn-retry').addEventListener('click', () => play(level));
  $('btn-result-retry').addEventListener('click', () => play(level));
  $('btn-next').addEventListener('click', () => play(level + 1));
  $('btn-levels').addEventListener('click', () => { renderLevelGrid(); $('levels').hidden = false; });
  $('btn-levels-close').addEventListener('click', () => { $('levels').hidden = true; });
  $('levels').addEventListener('click', (e) => { if (e.target === $('levels')) $('levels').hidden = true; });

  const layout = () => {
    const h = window.innerHeight;
    const top = $('app').querySelector('.hud-top')!.getBoundingClientRect().height;
    const bottom = $('app').querySelector('.hud-bottom')!.getBoundingClientRect().height + 56;
    board.setLayout({ topInset: (top + 8) / h, bottomInset: bottom / h });
  };
  window.addEventListener('resize', layout);
  layout();

  if (library.count === 0) {
    $('goal-text').textContent = t('loadError');
    return;
  }
  play(level);
}

boot();
