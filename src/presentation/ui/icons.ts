// Arayüz simgeleri (satır içi SVG; dış dosya yok).

export const icon = {
  heart: (cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5z"/><path class="shine" d="M6.2 6.4c.9-.9 2.2-1.1 3.1-.6-.9.1-1.8.6-2.4 1.4-.4.5-.7 1.1-.8 1.7-.5-.8-.5-1.8.1-2.5z"/></svg>`,
  star: (cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>`,
  lock: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7.5a5 5 0 0 1 10 0V10h1.5A1.5 1.5 0 0 1 20 11.5v8A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10zm2.5 0h5V7.5a2.5 2.5 0 0 0-5 0z"/></svg>`,
  back: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 4.6 8 12l7.4 7.4-2 2L4 12l9.4-9.4z"/></svg>`,
  play: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>`,
  pawn: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6" r="3.6"/><path d="M8.6 10.6h6.8l-1.1 6h2.9c.9 0 1.6.7 1.6 1.6V21H5.2v-2.8c0-.9.7-1.6 1.6-1.6h2.9z"/></svg>`,
  clock: () => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1 5v6l5 3 1-1.7-4-2.3V7z"/></svg>`,
};
