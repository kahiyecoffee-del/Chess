// Covers for gigs 4–7 (1280x769) + landing-page screenshots. Run: node services/render_gig_images_2.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const P = (f) => path.join(here, 'portfolio', f);
const uri = (f) => 'data:image/png;base64,' + fs.readFileSync(P(f)).toString('base64');

const C = { ink: '#13212E', paper: '#F6F4EE', green: '#1FA971', coral: '#E5533D', amber: '#F2B33D', line: '#D9D5CA' };
const base = `*{margin:0;box-sizing:border-box}body{width:1280px;height:769px;font-family:Inter,sans-serif;background:${C.paper};color:${C.ink};position:relative;overflow:hidden}
.mono{font-family:'JetBrains Mono',monospace}.brand{position:absolute;left:56px;bottom:36px;font-weight:800;font-size:26px}
.brand span{display:inline-block;width:18px;height:18px;background:${C.amber};border-radius:4px;margin-right:10px;vertical-align:-2px}
h1{font-size:60px;font-weight:900;letter-spacing:-2px;line-height:1.02;position:absolute;left:56px;top:48px}
.shot{border-radius:12px;box-shadow:0 18px 40px rgba(19,33,46,.25);position:absolute}`;

const browser = await chromium.launch();

// landing page screenshots (desktop + mobile)
const site = pathToFileURL(P('landing-sample/index.html')).href;
for (const [name, w, h] of [['previews/landing-desktop.png', 1440, 900], ['previews/landing-mobile.png', 390, 844]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(site); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: P(name) }); await p.close();
}

const rows = [['Harbor Textiles Ltd.', 'INV-2026-1040', 'Steel hinge 40mm', '200', '0.32', '64.00'],
  ['Harbor Textiles Ltd.', 'INV-2026-1040', 'Kraft mailer box S', '200', '0.55', '110.00'],
  ['Harbor Textiles Ltd.', 'INV-2026-1040', 'Zipper 20cm', '1,000', '0.21', '210.00'],
  ['Blue Pine Packaging', 'INV-2026-1047', 'Shipping carton L', '200', '1.10', '220.00']];
const gig4 = `<style>${base}table{border-collapse:collapse;font-size:19px}td,th{border:1px solid ${C.line};padding:9px 12px;background:#fff}th{background:${C.ink};color:#fff;text-align:left}</style>
<h1>PDF → <span style="color:${C.green}">clean Excel</span></h1>
<div class="shot" style="left:56px;top:180px;width:360px;height:250px;overflow:hidden;background:#fff"><img src="${uri('previews/invoice-1.png')}" style="width:560px;margin:-40px 0 0 -100px"></div>
<div style="position:absolute;left:410px;top:330px;font-size:64px;font-weight:900">→</div>
<div class="shot" style="left:480px;top:180px;background:#fff;padding:0"><table>
<tr><th>Supplier</th><th>Invoice</th><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr>
${rows.map(r => `<tr>${r.map((c, i) => `<td style="${i > 2 ? 'text-align:right' : ''}">${c}</td>`).join('')}</tr>`).join('')}
<tr><td colspan="6" style="background:#DDF3E9;font-weight:700">✓ 12/12 lines verified · totals match the PDFs</td></tr></table></div>
<div class="brand"><span></span>Rowwise Data · PDF / scan to Excel · data entry</div>`;

const gig5 = `<style>${base}.c{position:absolute;top:170px;width:560px;background:#fff;border-radius:16px;padding:26px 28px;border:2px solid ${C.line};font-size:19px;line-height:1.45}
.c b{display:block;font-size:22px;margin-bottom:10px}.tag{display:inline-block;background:${C.ink};color:#fff;border-radius:6px;padding:3px 10px;font-size:15px;font-weight:700;margin-bottom:12px}</style>
<h1>Listings that <span style="color:${C.amber}">sell</span> — EN & TR</h1>
<div class="c" style="left:56px"><span class="tag">AMAZON · ETSY · SHOPIFY</span><b>Bamboo Desk Organizer with Drawer, 5 Compartments, Phone Stand…</b>
• Clears the clutter in one piece<br>• Phone stand built in<br>• Solid bamboo, smooth finish<br>• Fits most desks (34 × 18 cm)</div>
<div class="c" style="left:664px"><span class="tag">TRENDYOL · HEPSIBURADA</span><b>Bambu Masa Düzenleyici – Çekmeceli, 5 Bölmeli, Telefon Standlı…</b>
• Tek parçada düzen<br>• Dahili telefon standı<br>• Masif bambu, plastik yok<br>• Kompakt: 34 × 18 cm</div>
<div class="brand"><span></span>Rowwise Data · Product descriptions · Turkish ⇄ English</div>`;

const gig6 = `<style>${base}body{background:${C.ink};color:${C.paper}}</style>
<h1>A website that <span style="color:${C.amber}">works on every screen</span></h1>
<img class="shot" src="${uri('previews/landing-desktop.png')}" style="left:56px;top:165px;width:800px">
<img class="shot" src="${uri('previews/landing-mobile.png')}" style="left:900px;top:165px;width:215px;border:6px solid #0C1620;border-radius:26px">
<div class="brand" style="color:${C.paper}"><span></span>Rowwise Data · Landing pages · fast, responsive, SEO-ready</div>`;

const gig7 = `<style>${base}</style>
<h1>Pitch decks that <span style="color:#14A08C">look funded</span></h1>
<img class="shot" src="${uri('previews/deck-1.png')}" style="left:56px;top:170px;width:560px">
<img class="shot" src="${uri('previews/deck-2.png')}" style="left:664px;top:170px;width:560px">
<img class="shot" src="${uri('previews/deck-4.png')}" style="left:56px;top:500px;width:340px;opacity:.97">
<img class="shot" src="${uri('previews/deck-5.png')}" style="left:420px;top:500px;width:340px;opacity:.97">
<div style="position:absolute;left:800px;top:520px;font-size:26px;font-weight:700;line-height:1.5">Editable PowerPoint<br>Your brand colours<br>Charts from your data</div>`;

for (const [name, html] of [['gig4-pdf-to-excel.png', gig4], ['gig5-listings.png', gig5], ['gig6-landing-page.png', gig6], ['gig7-presentations.png', gig7]]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 769 } });
  await page.setContent(`<!doctype html><meta charset="utf-8">${html}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: P(name) });
  await page.close();
}
await browser.close();
console.log('done');
