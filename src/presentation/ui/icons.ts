// Arayüz simgeleri (satır içi SVG, degrade dolgulu; dış dosya yok).

const heartPath = 'M12 21.2 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5z';
const starPath = 'M12 2.4l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.47l-5.9 3.1 1.13-6.57L2.45 9.34l6.6-.96z';

/** Simgelerin paylaştığı degradeler: belgeye bir kez eklenir (gizli ekranlardaki tanımlar çizilmez). */
export function installIconDefs(): void {
  if (document.getElementById('cq-icon-defs')) return;
  const holder = document.createElement('div');
  holder.innerHTML = `<svg id="cq-icon-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="cqh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7d93"/><stop offset="1" stop-color="#e0213f"/></linearGradient>
    <linearGradient id="cqs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".45" stop-color="#ffcc33"/><stop offset="1" stop-color="#f08a00"/></linearGradient>
  </defs></svg>`;
  document.body.prepend(holder.firstElementChild!);
}

export const icon = {
  heart: (cls = '') => `<svg class="ic heart ${cls}" viewBox="0 0 24 24" aria-hidden="true">
    <path class="fill" d="${heartPath}" stroke-width="1.2"/>
    <path class="shine" d="M6 6.6c1-1.1 2.6-1.3 3.6-.6-1 .1-2 .6-2.7 1.5-.5.6-.8 1.3-.9 2-.6-.9-.6-2.1 0-2.9z" fill="#fff" opacity=".7"/></svg>`,
  star: (cls = '') => `<svg class="ic star ${cls}" viewBox="0 0 24 24" aria-hidden="true">
    <path class="fill" d="${starPath}" stroke-width="1.1" stroke-linejoin="round"/>
    <path class="shine" d="M12 5.2l1.6 3.3-3.4.5z" fill="#fff" opacity=".6"/></svg>`,
  lock: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10V7.5a5 5 0 0 1 10 0V10h1.5A1.5 1.5 0 0 1 20 11.5v8A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10zm2.5 0h5V7.5a2.5 2.5 0 0 0-5 0z"/></svg>`,
  back: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.4 4.6 8 12l7.4 7.4-2 2L4 12l9.4-9.4z"/></svg>`,
  play: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>`,
  video: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6.5A2.5 2.5 0 0 1 5.5 4h9A2.5 2.5 0 0 1 17 6.5v2.2l3.5-2.3a1 1 0 0 1 1.5.8v9.6a1 1 0 0 1-1.5.8L17 15.3v2.2a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 17.5z"/></svg>`,
  pawn: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.4a3.6 3.6 0 0 1 2.2 6.45h1.1v1.6h-1.2l.9 6.2h1.9a1.6 1.6 0 0 1 1.6 1.6v2.75H5.5v-2.75a1.6 1.6 0 0 1 1.6-1.6H9l.9-6.2H8.7v-1.6h1.1A3.6 3.6 0 0 1 12 2.4z"/></svg>`,
  clock: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1 5v6l5 3 1-1.7-4-2.3V7z"/></svg>`,
};
