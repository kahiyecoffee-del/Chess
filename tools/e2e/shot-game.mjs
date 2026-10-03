// Haritayı ve ilk seviyenin oyun ekranını (seçili taşla) görüntüler.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
const [file = 'dist/index.html', out = 'shots', dpr = '1'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: Number(dpr) });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errors.push(m.text()); });
await page.goto(pathToFileURL(file).href);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/map.png` });
await page.click('#btn-map-play');
await page.waitForFunction(() => window.__cq?.flow.accepting, null, { timeout: 120000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/game.png` });
const uci = await page.evaluate(() => window.__cq.flow.expectedMove);
const from = (uci.charCodeAt(1) - 49) * 8 + (uci.charCodeAt(0) - 97);
const a = await page.evaluate((s) => window.__cq.board.squareToClient(s), from);
await page.mouse.click(a.x, a.y);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/game-selected.png` });
console.log(JSON.stringify({ errors }));
await browser.close();
