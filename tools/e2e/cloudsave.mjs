// Bulut kaydı: sahte bir `window.claude` (db + user) enjekte eder; deposu Node tarafında tutulur.
// Seviye 1 çözülür → localStorage silinir → sayfa yeniden açılır → ilerleme buluttan gelmeli.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const [file = 'dist/index.html'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const store = new Map();
const writes = [];
await context.exposeFunction('__cloudGet', (path) => store.get(path) ?? null);
await context.exposeFunction('__cloudSet', (path, body) => { store.set(path, body); writes.push(path); });
await context.addInitScript(() => {
  const db = { doc: (path) => ({
    get: async () => { const b = await window.__cloudGet(path); return { exists: !!b, data: () => b ?? undefined }; },
    set: async (body) => { await window.__cloudSet(path, JSON.parse(JSON.stringify(body))); },
  }) };
  const user = { id: async () => 'u_test' };
  window.claude = { use: async (name) => (name === 'db' ? db : name === 'user' ? user : null) };
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(pathToFileURL(file).href);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(800);
const T = { timeout: 120000 };
const sq = (n) => (n.charCodeAt(1) - 49) * 8 + (n.charCodeAt(0) - 97);
await page.click('#btn-map-play');
for (let i = 0; i < 6; i++) {
  await page.waitForFunction(() => window.__cq.flow.accepting, null, T);
  const uci = await page.evaluate(() => window.__cq.flow.expectedMove);
  const a = await page.evaluate((s) => window.__cq.board.squareToClient(s), sq(uci.slice(0, 2)));
  const b = await page.evaluate((s) => window.__cq.board.squareToClient(s), sq(uci.slice(2, 4)));
  await page.mouse.click(a.x, a.y);
  await page.waitForTimeout(120);
  await page.mouse.click(b.x, b.y);
  await page.waitForFunction(() => !document.getElementById('modal-result').hidden || window.__cq.flow.accepting, null, T);
  if (await page.evaluate(() => !document.getElementById('modal-result').hidden)) break;
}
await page.waitForTimeout(1500); // gecikmeli bulut yazması
const cloudAfterSolve = store.get('data/users/u_test/save')?.save?.unlocked ?? null;
// "Uygulamayı kapat": tarayıcı deposunu sil ve yeniden aç
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(2000);
const unlockedAfterReload = await page.evaluate(() => Number(document.getElementById('map-play-label').textContent.match(/\d+/)?.[0]));
const localRestored = await page.evaluate(() => JSON.parse(localStorage.getItem('cq.save') || '{}').unlocked ?? null);
console.log(JSON.stringify({ cloudAfterSolve, unlockedAfterReload, localRestored, cloudWrites: writes.length, errors }));
await browser.close();
