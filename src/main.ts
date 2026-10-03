// Uygulama girişi: harita, oyun ekranı, can sistemi, reklamlar, ayarlar, müzik ve bulmaca akışını bağlar.

import './styles.css';
import { Color } from './core/chess';
import {
  ECONOMY, addLives, loseLife, markInterstitialShown, msToNextLife, recordLevelCompleted, settleLives, shouldShowInterstitial,
  starsFor,
} from './core/economy';
import { Puzzle, PuzzlePack } from './core/puzzle';
import { LOCALES, matchLanguage, setLanguage, t } from './game/i18n';
import { LevelLibrary } from './game/levels';
import { FlowUi, PuzzleFlow } from './game/puzzleFlow';
import { SaveData, loadSave, mergeSaves, migrate, sameSave, writeSave } from './game/save';
import { world, worldOf } from './game/worlds';
import { Board3D } from './presentation/board3d';
import { icon, installIconDefs } from './presentation/ui/icons';
import { MapScreen } from './presentation/ui/map';
import { MockAdService } from './services/ads';
import { MusicPlayer } from './services/music';
import { CloudSave } from './services/cloudSave';

// Macera yolunun tüm paketleri uygulamaya gömülü. Fazla bulmacalar (remote/) diğer modlar için.
const packs = import.meta.glob<PuzzlePack>('../content/puzzles/levels/pack-*.json', { eager: true, import: 'default' });

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
  const cloud = new CloudSave();
  /** Cihaza hemen, buluta kısa bir gecikmeyle (art arda değişiklikler tek yazmada) kaydeder. */
  const persist = (immediate = false) => {
    writeSave(save);
    cloud.write(save, immediate);
  };
  const now = () => Date.now();
  const lives = () => (save.lives = settleLives(save.lives, now(), ECONOMY.lives)).lives;
  const deviceLanguage = () => matchLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]);
  setLanguage(save.settings.language ?? deviceLanguage());

  const ads = new MockAdService(ECONOMY.ads.mockAdSeconds, () => ({ title: t('adTitle'), close: t('close'), reward: t('adReward') }));

  // ---- Müzik: tarayıcı kuralı gereği ilk dokunuşta başlar ----
  const music = new MusicPlayer();
  music.setWorld(worldOf(Math.max(1, save.unlocked)));
  music.setEnabled(save.settings.music);
  const unlockAudio = () => music.resume();
  window.addEventListener('pointerdown', unlockAudio, { capture: true });
  document.addEventListener('visibilitychange', () => {
    music.pauseForBackground(document.hidden);
    if (document.hidden) persist(true); // oyundan çıkarken bekletmeden kaydet
  });
  window.addEventListener('pagehide', () => persist(true));

  // ---- Simgeler ----
  installIconDefs();
  all('[data-heart]').forEach((el) => (el.innerHTML = icon.heart()));
  all('[data-play-icon]').forEach((el) => (el.innerHTML = icon.play()));
  all('[data-video-icon]').forEach((el) => (el.innerHTML = icon.video()));
  all('[data-clock]').forEach((el) => (el.innerHTML = icon.clock()));
  all('[data-open-settings]').forEach((el) => (el.innerHTML = icon.settings()));
  all('[data-music-icon]').forEach((el) => (el.innerHTML = icon.music()));
  all('[data-globe-icon]').forEach((el) => (el.innerHTML = icon.globe()));
  all('[data-chevron]').forEach((el) => (el.innerHTML = icon.chevronDown()));
  $('btn-back').innerHTML = icon.back();
  $('btn-settings-close').innerHTML = icon.close();

  // ---- Ekranlar ----
  const map = new MapScreen($('map-scroll'), (n) => startLevel(n));
  const canvas = $<HTMLCanvasElement>('board');
  let board: Board3D | null = null; // ilk oyunda oluşturulur (harita açılışı hızlı olsun)
  let flow: PuzzleFlow | null = null;
  let level = 1;
  let currentPuzzle: Puzzle | null = null;
  /** Tahtayı görev kartının altına sığdırır; kart yüksekliği metne/dile göre değişir. */
  let relayout = () => {};
  const playable = () => Math.min(save.unlocked, library.count);

  /** Dile bağlı tüm metinleri yazar; dil değişince yeniden çağrılır. */
  const applyTexts = () => {
    const texts: Record<string, string> = {
      'btn-next': t('next'), 'btn-result-map': t('map'), 'tries-title': t('outOfTriesTitle'),
      'give-up-label': t('giveUp'), 'give-up-note': t('loseLifeNote'), 'nolives-title': t('noLivesTitle'),
      'ad-life-label': t('watchAdLife'), 'btn-nolives-ok': t('ok'), 'leave-title': t('leaveTitle'),
      'leave-text': t('leaveText'), 'btn-stay': t('stay'), 'btn-leave': t('leave'), 'promo-title': t('choosePromotion'),
      'ad-tries-label': t('watchAdTries', { n: ECONOMY.level.adExtraMistakes }), 'tries-text': t('outOfTriesText'),
      'settings-title': t('settings'), 'set-music-label': t('music'), 'set-language-label': t('language'),
      credits: t('credits'), 'level-label': t('levelWord'), 'map-play-label': t('playLevel', { n: playable() }),
    };
    for (const [id, text] of Object.entries(texts)) $(id).textContent = text;
    $('btn-back').setAttribute('aria-label', t('map'));
    $('btn-settings-close').setAttribute('aria-label', t('close'));
    all('[data-open-settings]').forEach((el) => el.setAttribute('aria-label', t('settings')));
    if (currentPuzzle) {
      $('goal-text').textContent = t(goalKey(currentPuzzle));
      const white = currentPuzzle.fen.split(' ')[1] === 'b';
      $('side-label').textContent = t(white ? 'youPlayWhite' : 'youPlayBlack');
    }
    // Dil listesi: önce "cihaz dili", sonra her dil kendi adıyla.
    const select = $<HTMLSelectElement>('set-language');
    select.replaceChildren(new Option(t('languageAuto'), ''), ...LOCALES.map((l) => new Option(l.name, l.code)));
    select.value = save.settings.language ?? '';
    renderLives();
    map.relabel();
  };

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

  const refreshMap = () => {
    map.render({ levelCount: library.count, unlocked: playable(), stars: (l) => save.stars[l - 1] ?? 0 });
    $('map-play-label').textContent = t('playLevel', { n: playable() });
  };

  const showMap = (celebrate = 0) => {
    flow?.stop();
    currentPuzzle = null;
    $('screen-game').hidden = true;
    $('screen-map').hidden = false;
    music.setWorld(worldOf(playable()));
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
    const colors = ['#ffc35a', '#ff7a45', '#45e6a0', '#7cc4ff', '#ff4f6d'];
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
      save.interstitial = recordLevelCompleted(save.interstitial);
      persist();
      $('result-stars').innerHTML = [1, 2, 3].map((s) => icon.star(s <= stars ? 'on' : '')).join('');
      $('result-eyebrow').textContent = t('levelComplete', { n: level });
      $('result-title').textContent = stars === 3 ? t('perfect') : t('greatJob');
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
      if ($('screen-game').hidden) return; // gizli ekranın ölçüleri sıfırdır
      const h = window.innerHeight;
      const top = $('screen-game').querySelector('.goal-card')!.getBoundingClientRect().bottom;
      const bottom = h - status.getBoundingClientRect().top;
      b.setLayout({ topInset: (top + 6) / h, bottomInset: (bottom + 4) / h });
    };
    window.addEventListener('resize', layout);
    relayout = layout;
    // Uçtan uca testlerin oyunu sürebilmesi için küçük bir kanca.
    (window as unknown as { __cq: unknown }).__cq = { flow: f, board: b, library, play: startLevel, save: () => save, music };
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
    currentPuzzle = puzzle;
    for (const id of ['modal-result', 'modal-tries', 'modal-leave']) $(id).hidden = true;
    $('screen-map').hidden = true;
    $('screen-game').hidden = false;
    applyWorldSky(n);
    music.setWorld(worldOf(n));
    const f = ensureBoard();
    $('level-num').textContent = String(n);
    applyTexts();
    relayout();
    $('side-swatch').classList.toggle('black', puzzle.fen.split(' ')[1] !== 'b');
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

  // ---- Ayarlar ----
  const musicSwitch = $<HTMLInputElement>('set-music');
  all('[data-open-settings]').forEach((el) => el.addEventListener('click', () => {
    musicSwitch.checked = save.settings.music;
    $<HTMLSelectElement>('set-language').value = save.settings.language ?? '';
    $('modal-settings').hidden = false;
  }));
  $('btn-settings-close').addEventListener('click', () => ($('modal-settings').hidden = true));
  $('modal-settings').addEventListener('click', (e) => { if (e.target === $('modal-settings')) $('modal-settings').hidden = true; });
  musicSwitch.addEventListener('change', () => {
    save.settings.music = musicSwitch.checked;
    persist();
    music.setEnabled(musicSwitch.checked);
  });
  $<HTMLSelectElement>('set-language').addEventListener('change', (e) => {
    const value = (e.target as HTMLSelectElement).value;
    save.settings.language = value || null;
    persist();
    setLanguage(value || deviceLanguage());
    applyTexts();
    relayout();
  });

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
  /** Seviye sonu ekranından çıkarken: kural izin veriyorsa seviye arası reklam (asla bulmaca ortasında değil). */
  let adShowing = false;
  const leaveResult = async (then: () => void) => {
    if (adShowing) return;
    $('modal-result').hidden = true;
    if (shouldShowInterstitial(save.interstitial, now(), ECONOMY.interstitial)) {
      adShowing = true;
      await ads.showInterstitial(ECONOMY.interstitial.mockSeconds);
      adShowing = false;
      save.interstitial = markInterstitialShown(now());
      persist();
    }
    then();
  };
  $('btn-next').addEventListener('click', () => void leaveResult(() => startLevel(level + 1)));
  $('btn-result-map').addEventListener('click', () => void leaveResult(() => showMap(playable())));

  // Buluttaki kaydı al ve cihazdakiyle birleştir (ilerleme hangisinde fazlaysa o kalır).
  void cloud.connect().then((remote) => {
    if (!cloud.connected) return;
    const merged = remote ? mergeSaves(save, migrate(remote, null)) : save;
    const changed = !sameSave(merged, save);
    const languageBefore = save.settings.language;
    Object.assign(save, merged);
    if (changed) {
      writeSave(save);
      if (save.settings.language !== languageBefore) setLanguage(save.settings.language ?? deviceLanguage());
      music.setEnabled(save.settings.music);
      applyTexts();
      if (!$('screen-map').hidden) showMap();
    }
    // Bulutta hiç yoksa ya da cihazdaki daha ileriyse buluta yaz.
    if (!remote || !sameSave(migrate(remote, null), save)) cloud.write(save, true);
  });

  applyTexts();
  if (library.count === 0) {
    $('map-play-label').textContent = t('loadError');
    return;
  }
  showMap();
}

boot();
