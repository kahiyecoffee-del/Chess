import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Tek dosyalık build: web önizlemesi tek bir HTML olarak paylaşılabilsin.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2020', assetsInlineLimit: 100_000_000 },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120_000 },
});
