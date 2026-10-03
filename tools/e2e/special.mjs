// Özel durumlar: terfi seçimi (dokunarak) ve 3 hamlelik bulmaca (rakip cevapları otomatik).
// Kullanım: node tools/e2e/special.mjs dist/index.html out-dir <terfiSeviyesi> <uzunSeviye>
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const [file, out, promoLevel, longLevel] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errors.push(m.text()); });
await page.goto(pathToFileURL(file).href);
await page.evaluate(() => localStorage.setItem('cq.save', JSON.stringify({ version: 2, lives: { lives: 5, regenStart: null }, unlocked: 5000, stars: [], settings: { music: false, language: 'en' } })));
await page.reload();
await page.waitForTimeout(800);
await page.click('#btn-map-play'); // board'u başlat
await page.waitForFunction(() => window.__cq?.flow.accepting, null, { timeout: 120000 });
const T = { timeout: 120000 };
const sq = (n) => (n.charCodeAt(1) - 49) * 8 + (n.charCodeAt(0) - 97);
async function tap(uci) {
  const a = await page.evaluate((s) => window.__cq.board.squareToClient(s), sq(uci.slice(0, 2)));
  const b = await page.evaluate((s) => window.__cq.board.squareToClient(s), sq(uci.slice(2, 4)));
  await page.mouse.click(a.x, a.y);
  await page.waitForTimeout(150);
  await page.mouse.click(b.x, b.y);
}
async function solve() {
  let moves = 0;
  for (let i = 0; i < 6; i++) {
    await page.waitForFunction(() => window.__cq.flow.accepting, null, T);
    const uci = await page.evaluate(() => window.__cq.flow.expectedMove);
    await tap(uci);
    moves++;
    if (uci.length === 5) {
      await page.waitForSelector('#modal-promo:not([hidden])', T);
      await page.screenshot({ path: `${out}/promo.png` });
      await page.click(`#modal-promo [data-promo="${{ q: 5, r: 4, b: 3, n: 2 }[uci[4]]}"]`);
    }
    await page.waitForFunction(() => !document.getElementById('modal-result').hidden || window.__cq.flow.accepting, null, T);
    if (await page.evaluate(() => !document.getElementById('modal-result').hidden)) return moves;
  }
  return -1;
}
const report = {};
await page.evaluate((n) => window.__cq.play(n), Number(promoLevel));
report.promotionSolvedInMoves = await solve();
await page.evaluate((n) => window.__cq.play(n), Number(longLevel));
report.longSolvedInMoves = await solve();
console.log(JSON.stringify({ report, errors }));
await browser.close();
