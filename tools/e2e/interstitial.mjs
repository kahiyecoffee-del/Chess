// Seviye arası reklam: 1-5. seviyeleri çözer; reklam yalnızca 5.'den sonra, "Sonraki seviye"ye basınca çıkmalı.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const [file = 'dist/index.html', out = 'shots'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(pathToFileURL(file).href);
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.reload();
await page.waitForTimeout(800);
const T = { timeout: 120000 };
const sq = (n) => (n.charCodeAt(1) - 49) * 8 + (n.charCodeAt(0) - 97);
async function solve() {
  for (let i = 0; i < 6; i++) {
    await page.waitForFunction(() => window.__cq.flow.accepting, null, T);
    const uci = await page.evaluate(() => window.__cq.flow.expectedMove);
    const a = await page.evaluate((s) => window.__cq.board.squareToClient(s), sq(uci.slice(0, 2)));
    const b = await page.evaluate((s) => window.__cq.board.squareToClient(s), sq(uci.slice(2, 4)));
    await page.mouse.click(a.x, a.y);
    await page.waitForTimeout(120);
    await page.mouse.click(b.x, b.y);
    if (uci.length === 5) {
      await page.waitForSelector('#modal-promo:not([hidden])', T);
      await page.click(`#modal-promo [data-promo="${{ q: 5, r: 4, b: 3, n: 2 }[uci[4]]}"]`);
    }
    await page.waitForFunction(() => !document.getElementById('modal-result').hidden || window.__cq.flow.accepting, null, T);
    if (await page.evaluate(() => !document.getElementById('modal-result').hidden)) return;
  }
}
const adAfter = [];
await page.click('#btn-map-play');
for (let level = 1; level <= 5; level++) {
  await solve();
  await page.click('#btn-next');
  await page.waitForTimeout(400);
  const ad = await page.evaluate(() => !!document.querySelector('.mock-ad.interstitial'));
  adAfter.push({ level, ad });
  if (ad) {
    await page.screenshot({ path: `${out}/interstitial.png` });
    const closableEarly = await page.evaluate(() => !document.querySelector('.mock-ad.interstitial .mock-ad-close').disabled);
    adAfter.push({ closableEarly });
    await page.waitForFunction(() => !document.querySelector('.mock-ad.interstitial .mock-ad-close').disabled, null, T);
    await page.click('.mock-ad.interstitial .mock-ad-close');
  }
}
await page.waitForFunction(() => window.__cq.flow.accepting, null, T);
const levelNow = await page.textContent('#level-num');
const counter = await page.evaluate(() => window.__cq.save().interstitial.sinceLast);
console.log(JSON.stringify({ adAfter, levelNow, counter, errors }));
await browser.close();
