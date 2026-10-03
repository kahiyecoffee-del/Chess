// Uygulama girişi: harita, oyun ekranı, can sistemi, reklamlar ve bulmaca akışını bağlar.

import './styles.css';
import { Color } from './core/chess';
import { ECONOMY, addLives, loseLife, msToNextLife, settleLives, starsFor } from './core/economy';
import { Puzzle, PuzzlePack } from './core/puzzle';
import { t } from './game/i18n';
import { LevelLibrary } from './game/levels';
import { FlowUi, PuzzleFlow } from './game/puzzleFlow';
import { SaveData, loadSave, writeSave } from './game/save';
import { world, worldOf } from './game/worlds';
import { Board3D } from './presentation/board3d';
import { icon, installIconDefs } from './presentation/ui/icons';
import { MapScreen } from './presentation/ui/map';
import { MockAdService } from './services/ads';

// Uygulamaya gömülü ilk paket(ler). Kalan paketler Aşama 4'te uzaktan indirilecek.
const packs = import.meta.glob<PuzzlePack>('../content/puzzles/levels/pack-00[0-1].json', { eager: true, import: 'default' });

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const all = (sel: string) => document.querySelectorAll<HTMLElement>(sel);

const GOALS = ['mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack', 'hangingPiece', 'sacrifice', 'promotion'];
const goalKey = (p: Puzzle) => `goal.${GOALS.find((x) => p.themes.includes(x)) ?? 'advantage'}`;

function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function boot(): void {
  const library = new LevelLibrary();
  for (const key of Object.keys(packs).sort()) library.addPack(packs[key]);

  const save: SaveData = loadSave();
  const persist = () => writeSave(save);
  const now = () => Date.now();
  const lives = () => (save.lives = settleLives(save.lives, now(), ECONOMY.lives)).lives;

  const ads = new MockAdService(ECONOMY.ads.mockAdSeconds, { title: t('adTitle'), close: t('close'), reward: t('adReward') });

  // ---- Statik simgeler ve metinler ----
  installIconDefs();
  all('[data-heart]').forEach((el) => (el.innerHTML = icon.heart()));
  all('[data-heart-broken]').forEach((el) => (el.innerHTML = icon.heart()));
  all('[data-play-icon]').forEach((el) => (el.innerHTML = icon.play()));
  all('[data-video-icon]').forEach((el) => (el.innerHTML = icon.video()));
  all('[data-clock]').forEach((el) => (el.innerHTML = icon.clock()));
  $('btn-back').innerHTML = icon.back();
  $('btn-back').setAttribute('aria-label', t('map'));
  $('level-label').textContent = t('level', { n: '' }).trim();
  const texts: Record<string, string> = {
    'btn-next': t('next'), 'result-ribbon': t('levelComplete', { n: '' }), 'btn-result-map': t('backToMap'), 'tries-title': t('outOfTriesTitle'),
    'give-up-label': t('giveUp'), 'give-up-note': t('loseLifeNote'), 'nolives-title': t('noLivesTitle'),
    'ad-life-label': t('watchAdLife'), 'btn-nolives-ok': t('ok'), 'leave-title': t('leaveTitle'),
    'leave-text': t('leaveText'), 'btn-stay': t('stay'), 'btn-leave': t('leave'), 'promo-title': t('choosePromotion'),
    'ad-tries-label': t('watchAdTries', { n: ECONOMY.level.adExtraMistakes }),
    'tries-text': t('outOfTriesText', { n: ECONOMY.level.adExtraMistakes }),
  };
  for (const [id, text] of Object.entries(texts)) $(id).textContent = text;

  // ---- Canlar ----
  const renderLives = () => {
    const n = lives();
    const wait = msToNextLife(save.lives, now(), ECONOMY.lives);
    all('[data-lives-count]').forEach((el) => (el.textContent = String(n)));
    all('[data-lives-timer]').forEach((el) => (el.textContent = wait ? formatTime(wait) : t('livesFull')));
    all('[data-lives]').forEach((el) => el.setAttribute('aria-label', t('livesLabel', { n })));
    if (!$('modal-nolives').hidden) $('nolives-text').textContent = t('noLivesText', { time: formatTime(wait) });
  };
  const flashLifeLost = () => all('[data-lives]').forEach((el) => {
    el.classList.remove('lost');
    void el.offsetWidth;
    el.classList.add('lost');
  });
  setInterval(renderLives, 1000);

  // ---- Ekranlar ----
  const map = new MapScreen($('map-scroll'), (n) => startLevel(n));
  const canvas = $<HTMLCanvasElement>('board');
  let board: Board3D | null = null; // ilk oyunda oluşturulur (harita açılışı hızlı olsun)
  let flow: PuzzleFlow | null = null;
  let level = 1;
  const playable = () => Math.min(save.unlocked, library.count);

  const refreshMap = () => {
    map.render({ levelCount: library.count, unlocked: playable(), stars: (l) => save.stars[l - 1] ?? 0 });
    $('map-play-label').textContent = t('playLevel', { n: playable() });
  };

  const showMap = (celebrate = 0) => {
    flow?.stop();
    $('screen-game').hidden = true;
    $('screen-map').hidden = false;
    refreshMap();
    requestAnimationFrame(() => {
      map.scrollToLevel(playable());
      if (celebrate) map.celebrate(celebrate);
    });
  };

  const applyWorldSky = (n: number) => {
    const th = world(worldOf(n)).theme;
    const game = $('screen-game');
    game.style.setProperty('--sky-top', th.skyTop);
    game.style.setProperty('--sky-bottom', th.skyBottom);
  };

  // ---- Oyun ekranı arayüzü ----
  const status = $('status');
  const confetti = () => {
    const box = $('modal-result').querySelector('.confetti')!;
    const colors = ['#ff5c8a', '#ffc93c', '#2fc98a', '#5ec8ff', '#7b5cff'];
    box.replaceChildren(...Array.from({ length: 36 }, (_, i) => {
      const c = document.createElement('i');
      const a = (i / 36) * Math.PI * 2;
      const r = 140 + Math.random() * 120;
      c.style.cssText = `left:50%;background:${colors[i % colors.length]};--dx:${Math.cos(a) * r}px;` +
        `--dy:${Math.sin(a) * r - 60}px;--rot:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 0.15}s`;
      return c;
    }));
  };

  const ui: FlowUi = {
    setStatus(key) {
      status.textContent = t(key);
      status.className = 'status' + (key === 'correct' ? ' good' : key === 'wrong' ? ' bad' : '');
      if (key === 'correct' || key === 'wrong') {
        void status.offsetWidth;
        status.classList.add('bump');
      }
    },
    setProgress(done, total) {
      $('move-progress').replaceChildren(...Array.from({ length: total }, (_, i) => {
        const dot = document.createElement('i');
        if (i < done) dot.className = 'done';
        return dot;
      }));
    },
    setTriesLeft(left, total) {
      const el = $('tries');
      const prev = el.querySelectorAll('.ic:not(.spent)').length;
      el.innerHTML = Array.from({ length: total }, (_, i) => icon.heart(i < left ? '' : 'spent')).join('');
      if (left < prev && left >= 0) el.children[left]?.classList.add('breaking');
      el.setAttribute('aria-label', t('triesLabel', { n: Math.max(0, left) }));
    },
    outOfTries() {
      $('tries-note').hidden = true;
      $('modal-tries').hidden = false;
    },
    showSolved(mistakes) {
      const stars = starsFor(mistakes);
      save.stars[level - 1] = Math.max(save.stars[level - 1] ?? 0, stars);
      if (level + 1 > save.unlocked && level < library.count) save.unlocked = level + 1;
      persist();
      $('result-stars').innerHTML = [1, 2, 3].map((s) => icon.star(s <= stars ? 'on' : '')).join('');
      $('result-title').textContent = stars === 3 ? t('perfect') : t('greatJob');
      $('result-ribbon').textContent = t('levelComplete', { n: level });
      $('result-detail').textContent = mistakes === 0 ? t('solvedPerfect') : t('solvedMistakes', { n: mistakes });
      $('btn-next').hidden = level >= library.count;
      confetti();
      $('modal-result').hidden = false;
    },
    askPromotion(_color: Color) {
      const sheet = $('modal-promo');
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

  const ensureBoard = (): PuzzleFlow => {
    if (board && flow) return flow;
    const b = new Board3D(canvas);
    const f = new PuzzleFlow(b, canvas, ui);
    board = b;
    flow = f;
    const layout = () => {
      const h = window.innerHeight;
      const top = $('screen-game').querySelector('.goal-card')!.getBoundingClientRect().bottom;
      const bottom = h - status.getBoundingClientRect().top;
      b.setLayout({ topInset: (top + 6) / h, bottomInset: (bottom + 4) / h });
    };
    window.addEventListener('resize', layout);
    layout();
    // Uçtan uca testlerin oyunu sürebilmesi için küçük bir kanca.
    (window as unknown as { __cq: unknown }).__cq = { flow: f, board: b, library, play: startLevel, save: () => save };
    return f;
  };

  const noLives = () => {
    $('nolives-note').hidden = true;
    $('modal-nolives').hidden = false;
    renderLives();
  };

  function startLevel(n: number): void {
    const puzzle = library.level(n);
    if (!puzzle || n > save.unlocked) return;
    if (lives() <= 0) { noLives(); return; }
    level = n;
    for (const id of ['modal-result', 'modal-tries', 'modal-leave']) $(id).hidden = true;
    $('screen-map').hidden = true;
    $('screen-game').hidden = false;
    applyWorldSky(n);
    const f = ensureBoard();
    $('level-num').textContent = String(n);
    $('goal-text').textContent = t(goalKey(puzzle));
    const white = puzzle.fen.split(' ')[1] === 'b';
    $('side-label').textContent = t(white ? 'youPlayWhite' : 'youPlayBlack');
    $('side-swatch').classList.toggle('black', !white);
    void f.start(puzzle, ECONOMY.level.mistakesAllowed);
  }

  const giveUp = () => {
    save.lives = loseLife(save.lives, now(), ECONOMY.lives);
    persist();
    $('modal-tries').hidden = true;
    $('modal-leave').hidden = true;
    showMap();
    renderLives();
    flashLifeLost();
  };

  // ---- Düğmeler ----
  $('btn-map-play').addEventListener('click', () => startLevel(playable()));
  $('btn-back').addEventListener('click', () => {
    if (flow && flow.mistakes > 0) $('modal-leave').hidden = false;
    else showMap();
  });
  $('btn-stay').addEventListener('click', () => ($('modal-leave').hidden = true));
  $('btn-leave').addEventListener('click', giveUp);
  $('btn-give-up').addEventListener('click', giveUp);
  $('btn-ad-tries').addEventListener('click', async () => {
    const result = await ads.showRewarded('extra_tries');
    if (result === 'rewarded') {
      $('modal-tries').hidden = true;
      flow?.grantTries(ECONOMY.level.adExtraMistakes);
    } else {
      $('tries-note').textContent = t('adNoReward');
      $('tries-note').hidden = false;
    }
  });
  $('btn-ad-life').addEventListener('click', async () => {
    const result = await ads.showRewarded('refill_life');
    if (result === 'rewarded') {
      save.lives = addLives(save.lives, ECONOMY.ads.rewardedLifeAmount, now(), ECONOMY.lives);
      persist();
      $('modal-nolives').hidden = true;
      renderLives();
    } else {
      $('nolives-note').textContent = t('adNoReward');
      $('nolives-note').hidden = false;
    }
  });
  $('btn-nolives-ok').addEventListener('click', () => ($('modal-nolives').hidden = true));
  $('btn-next').addEventListener('click', () => {
    $('modal-result').hidden = true;
    startLevel(level + 1);
  });
  $('btn-result-map').addEventListener('click', () => {
    $('modal-result').hidden = true;
    showMap(playable());
  });

  renderLives();
  if (library.count === 0) {
    $('map-play-label').textContent = t('loadError');
    return;
  }
  showMap();
}

boot();
