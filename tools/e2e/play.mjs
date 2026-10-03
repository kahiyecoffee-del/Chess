// Uçtan uca: haritadan başlar, seviyeleri gerçek dokunuşlarla çözer; hata hakkı, reklam ve can akışlarını dener.
// Kullanım: CHROMIUM_PATH=... node tools/e2e/play.mjs dist/index.html out-dir
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const [file = 'dist/index.html', out = 'shots'] = process.argv.slice(2);
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
await page.waitForTimeout(800);

const T = { timeout: 120000 };
const sq = (name) => (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
const waitTurn = () => page.waitForFunction(() => window.__cq?.flow.accepting, null, T);
const visible = (id) => page.evaluate((i) => !document.getElementById(i).hidden, id);
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

async function tapMove(uci, drag = false) {
  const a = await page.evaluate((s) => window.__cq.board.squareToClient(s), sq(uci.slice(0, 2)));
  const b = await page.evaluate((s) => window.__cq.board.squareToClient(s), sq(uci.slice(2, 4)));
  if (drag) {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
    await page.mouse.up();
  } else {
    await page.mouse.click(a.x, a.y);
    await page.waitForTimeout(120);
    await page.mouse.click(b.x, b.y);
  }
}

async function solve(drag = false) {
  for (let step = 0; step < 6; step++) {
    await waitTurn();
    await tapMove(await page.evaluate(() => window.__cq.flow.expectedMove), drag);
    await page.waitForFunction(() => !document.getElementById('modal-result').hidden || window.__cq.flow.accepting, null, T);
    if (await visible('modal-result')) return true;
  }
  return false;
}

async function burnTries(n) {
  for (let i = 0; i < n; i++) {
    await waitTurn();
    await tapMove(await page.evaluate(() => window.__cq.flow.wrongMoveForTests()));
    await page.waitForFunction(() => !document.getElementById('modal-tries').hidden || window.__cq.flow.accepting, null, T);
  }
}

const report = {};
// 1) Haritadan seviye 1: dokunarak çöz
await page.click('#btn-map-play');
await waitTurn();
await shot('game-level1');
report.level1Solved = await solve(false);
await page.waitForTimeout(1500);
await shot('result-level1');
await page.click('#btn-next');

// 2) Seviye 2: 3 yanlış → reklam → devam → sürükleyerek çöz
await burnTries(3);
report.triesModalShown = await visible('modal-tries');
await shot('out-of-tries');
await page.click('#btn-ad-tries');
await page.waitForTimeout(1200);
await shot('mock-ad');
await page.waitForFunction(() => document.getElementById('modal-tries').hidden, null, T);
report.level2SolvedAfterAd = await solve(true);
report.level2Stars = await page.evaluate(() => window.__cq.save().stars[1]);
await page.click('#btn-next');

// 3) Seviye 3: 3 yanlış → vazgeç → can kaybı → harita
await burnTries(3);
await page.click('#btn-give-up');
await page.waitForTimeout(900);
report.livesAfterGiveUp = await page.evaluate(() => window.__cq.save().lives.lives);
report.mapVisible = await visible('screen-map');
report.unlocked = await page.evaluate(() => window.__cq.save().unlocked);
report.stars = await page.evaluate(() => window.__cq.save().stars);
await shot('map-after');

console.log(JSON.stringify({ report, errors }, null, 1));
await browser.close();
