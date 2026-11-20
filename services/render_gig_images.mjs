// Fiverr gig cover images (1280x769). Run: node services/render_gig_images.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));

const C = { ink: '#13212E', paper: '#F6F4EE', green: '#1FA971', coral: '#E5533D', amber: '#F2B33D', line: '#D9D5CA' };
const base = `*{margin:0;box-sizing:border-box}body{width:1280px;height:769px;font-family:Inter,sans-serif;background:${C.paper};color:${C.ink};position:relative;overflow:hidden}
.mono{font-family:'JetBrains Mono',monospace}.brand{position:absolute;left:56px;bottom:40px;font-weight:800;font-size:28px;letter-spacing:-.5px}
.brand span{display:inline-block;width:18px;height:18px;background:${C.amber};border-radius:4px;margin-right:10px;vertical-align:-2px}
h1{font-size:64px;font-weight:900;letter-spacing:-2px;line-height:1.02}`;

const cell = (v, bad) => `<div style="padding:10px 14px;border:1px solid ${C.line};background:${bad ? '#FBE3DF' : '#DDF3E9'};font-size:24px" class="mono">${v}</div>`;
const gig1 = `<style>${base}.cols{position:absolute;top:220px;left:56px;right:56px;display:grid;grid-template-columns:1fr 90px 1fr;align-items:center}
.t{display:grid;grid-template-columns:1fr 1fr;background:#fff;border-radius:14px;overflow:hidden;border:3px solid}
.lab{font-weight:800;font-size:26px;margin-bottom:12px}</style>
<div style="position:absolute;left:56px;top:56px"><h1>Messy data → <span style="color:${C.green}">right totals</span></h1></div>
<div class="cols"><div><div class="lab" style="color:${C.coral}">BEFORE</div><div class="t" style="border-color:${C.coral}">
${cell('03/04/2026', 1)}${cell('"12"', 1)}${cell(' JOHN CARTER', 1)}${cell('$89.00', 1)}${cell('2026-04-03', 1)}${cell('(duplicate)', 1)}${cell('east', 1)}${cell('#N/A', 1)}</div></div>
<div style="font-size:72px;text-align:center;font-weight:900">→</div>
<div><div class="lab" style="color:${C.green}">AFTER</div><div class="t" style="border-color:${C.green}">
${cell('2026-04-03', 0)}${cell('12', 0)}${cell('John Carter', 0)}${cell('89', 0)}${cell('East', 0)}${cell('$1,068', 0)}${cell('✓ checked', 0)}${cell('✓ automated', 0)}</div></div></div>
<div class="brand"><span></span>Rowwise Data · Excel · Google Sheets · Power Query · VBA</div>`;

const bars = [41.8, 41.0, 40.7, 38.5, 34.4];
const gig2 = `<style>${base}.k{background:#fff;border-radius:14px;padding:20px 24px;border:2px solid ${C.line}}.k b{display:block;font-size:40px;font-weight:900}
.k i{font-style:normal;color:#6B6860;font-weight:700;font-size:20px}</style>
<div style="position:absolute;left:56px;top:56px"><h1>Your data, <span style="color:${C.amber}">one dashboard</span></h1></div>
<div style="position:absolute;left:56px;right:56px;top:190px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
<div class="k"><i>Revenue</i><b>$196,220</b></div><div class="k"><i>Orders</i><b>420</b></div><div class="k"><i>Avg order</i><b>$467</b></div><div class="k"><i>Units</i><b>2,773</b></div></div>
<div style="position:absolute;left:56px;right:56px;top:340px;height:330px;background:#fff;border-radius:14px;border:2px solid ${C.line};padding:28px 32px">
<div style="font-weight:800;font-size:24px;margin-bottom:18px">Revenue by rep ($k)</div>
${bars.map((b, i) => `<div style="display:flex;align-items:center;gap:16px;margin:10px 0"><div style="width:140px;font-size:20px;font-weight:600">Rep ${i + 1}</div><div style="height:30px;width:${b * 18}px;background:${i ? C.ink : C.amber};border-radius:6px"></div><div style="font-weight:800;font-size:20px">${b.toFixed(1)}</div></div>`).join('')}
</div><div class="brand"><span></span>Rowwise Data · Excel & Google Sheets dashboards</div>`;

const gig3 = `<style>${base}body{background:${C.ink};color:${C.paper}}.code{position:absolute;left:56px;right:56px;top:200px;background:#0C1620;border-radius:16px;padding:32px 36px;font-size:27px;line-height:1.55}
.k{color:${C.amber}}.s{color:${C.green}}.c{color:#6F7E8C}</style>
<div style="position:absolute;left:56px;top:56px"><h1>Weekly copy-paste? <span style="color:${C.amber}">Automated.</span></h1></div>
<div class="code mono"><span class="c"># merge 52 weekly exports into one clean report</span><br>
<span class="k">for</span> f <span class="k">in</span> folder.glob(<span class="s">"*.csv"</span>):<br>&nbsp;&nbsp;frames.append(clean(read(f)))<br>
report = pd.concat(frames).drop_duplicates()<br>report.to_excel(<span class="s">"weekly_report.xlsx"</span>)<br>
<span class="c"># ✓ hours of manual work → one command</span></div>
<div class="brand" style="color:${C.paper}"><span></span>Rowwise Data · Python automation for CSV & Excel</div>`;

const browser = await chromium.launch();
for (const [name, html] of [['gig1-clean-automate.png', gig1], ['gig2-dashboard.png', gig2], ['gig3-python.png', gig3]]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 769 } });
  await page.setContent(`<!doctype html><meta charset="utf-8">${html}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(here, 'portfolio', name) });
  await page.close();
}
await browser.close();
console.log('done');
