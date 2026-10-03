// Oyunu başsız tarayıcıda açar, ekran görüntüsü alır ve konsol hatalarını raporlar.
// Kullanım: node tools/e2e/screenshot.mjs dist/index.html out-dir [actions]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const [file = 'dist/index.html', out = 'shots'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(pathToFileURL(file).href);
await page.waitForTimeout(6000);
await page.screenshot({ path: `${out}/01-start.png` });
console.log(JSON.stringify({ errors }, null, 1));
await browser.close();
