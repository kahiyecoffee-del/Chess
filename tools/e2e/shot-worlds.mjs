// Haritada farklı dünyaların görüntüsü: her seviye için ilerlemeyi o seviyeye ayarlayıp haritayı açar.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
const [file = 'dist/index.html', out = 'shots', ...levels] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(file).href);
for (const l of levels.map(Number)) {
  await page.evaluate((u) => localStorage.setItem('cq.save', JSON.stringify({ version: 2, lives: { lives: 5, regenStart: null }, unlocked: u, stars: Array.from({ length: u - 1 }, (_, i) => 1 + (i % 3)), settings: { music: false, language: null } })), l);
  await page.reload();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/world-${l}.png` });
}
await browser.close();
