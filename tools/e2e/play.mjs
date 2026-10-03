// Uçtan uca: seviyeleri gerçek dokunuşlarla (ve sürükleyerek) çözer, ekran görüntüleri alır.
// Kullanım: CHROMIUM_PATH=... node tools/e2e/play.mjs dist/index.html out-dir [seviyeSayısı]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const [file = 'dist/index.html', out = 'shots', levelsArg = '3'] = process.argv.slice(2);
const LEVELS = Number(levelsArg);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(pathToFileURL(file).href);
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.reload();

const sq = (name) => (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
const waitTurn = () => page.waitForFunction(() => window.__cq.flow.accepting, null, { timeout: 90000 });
const results = [];
for (let level = 1; level <= LEVELS; level++) {
  await page.evaluate((n) => window.__cq.play(n), level);
  let wrongTried = false;
  for (let step = 0; step < 6; step++) {
    await waitTurn();
    if (level === 1 && step === 0) await page.screenshot({ path: `${out}/level1-ready.png` });
    const uci = await page.evaluate(() => window.__cq.flow.expectedMove);
    const [from, to] = [sq(uci.slice(0, 2)), sq(uci.slice(2, 4))];
    const a = await page.evaluate((s) => window.__cq.board.squareToClient(s), from);
    const b = await page.evaluate((s) => window.__cq.board.squareToClient(s), to);
    if (level === 2 && !wrongTried) {
      // Önce yanlış bir hamle dene: seçili taşın başka yasal hedefi ya da hiç.
      wrongTried = true;
      await page.mouse.click(a.x, a.y);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/level2-selected.png` });
      await page.mouse.click(a.x, a.y); // seçimi kaldır
    }
    if (level % 2 === 1) {
      // Dokun-dokun
      await page.mouse.click(a.x, a.y);
      await page.waitForTimeout(150);
      await page.mouse.click(b.x, b.y);
    } else {
      // Sürükle-bırak
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
      await page.mouse.up();
    }
    if (level === 1) {
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${out}/level1-cinematic.png` });
    }
    const solved = await page.waitForFunction(() => !document.getElementById('result').hidden || window.__cq.flow.accepting,
      null, { timeout: 90000 }).then(() => page.evaluate(() => !document.getElementById('result').hidden));
    if (solved) break;
  }
  const solved = await page.evaluate(() => !document.getElementById('result').hidden);
  if (level === 1) await page.screenshot({ path: `${out}/level1-solved.png` });
  results.push({ level, solved });
}
console.log(JSON.stringify({ results, errors }, null, 1));
await browser.close();
