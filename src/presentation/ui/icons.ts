// Arayüz simgeleri (satır içi SVG). Çizgi simgeler Lucide (ISC) tarzındadır; kalp ve yıldız degradeli.

const heartPath = 'M12 21.2 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5z';
const starPath = 'M12 2.4l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.47l-5.9 3.1 1.13-6.57L2.45 9.34l6.6-.96z';

/** Simgelerin paylaştığı degradeler: belgeye bir kez eklenir (gizli ekranlardaki tanımlar çizilmez). */
export function installIconDefs(): void {
  if (document.getElementById('cq-icon-defs')) return;
  const holder = document.createElement('div');
  holder.innerHTML = `<svg id="cq-icon-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="cqh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a9e"/><stop offset="1" stop-color="#ff3d63"/></linearGradient>
    <linearGradient id="cqs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe17a"/><stop offset="1" stop-color="#ffa62b"/></linearGradient>
  </defs></svg>`;
  document.body.prepend(holder.firstElementChild!);
}

const line = (body: string) =>
  `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icon = {
  heart: (cls = '') => `<svg class="ic heart ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="${heartPath}"/></svg>`,
  star: (cls = '') => `<svg class="ic star ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="${starPath}"/></svg>`,
  lock: () => line('<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>'),
  back: () => line('<path d="m15 18-6-6 6-6"/>'),
  close: () => line('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  settings: () => line('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  music: () => line('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  globe: () => line('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'),
  video: () => line('<path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.75-.43L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>'),
  clock: () => line('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  chevronDown: () => line('<path d="m6 9 6 6 6-6"/>'),
  play: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.6v14.8a1 1 0 0 0 1.52.85l11.6-7.4a1 1 0 0 0 0-1.7L8.52 3.75A1 1 0 0 0 7 4.6z"/></svg>`,
  pawn: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.4a3.6 3.6 0 0 1 2.2 6.45h1.1v1.6h-1.2l.9 6.2h1.9a1.6 1.6 0 0 1 1.6 1.6v2.75H5.5v-2.75a1.6 1.6 0 0 1 1.6-1.6H9l.9-6.2H8.7v-1.6h1.1A3.6 3.6 0 0 1 12 2.4z"/></svg>`,
};
