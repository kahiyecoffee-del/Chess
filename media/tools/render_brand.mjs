// Renders Rowwise brand assets and the LF1 thumbnail with headless Chromium.
// Fonts: Inter + JetBrains Mono (SIL OFL), installed locally.
// Run: node media/tools/render_brand.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = { ink: '#13212E', paper: '#F6F4EE', green: '#1FA971', coral: '#E5533D', amber: '#F2B33D', line: '#D9D5CA' };

// Logo mark: 3x3 grid, middle row highlighted, cells forming an "R" silhouette.
const mark = (s) => {
  const cells = [[1,1,0],[1,1,1],[1,0,1]]; // R-ish pattern
  const g = s / 3, pad = g * 0.08;
  let out = '';
  cells.forEach((row, r) => row.forEach((on, c) => {
    const fill = r === 1 ? C.amber : on ? C.paper : 'rgba(246,244,238,0.12)';
    out += `<rect x="${c*g+pad}" y="${r*g+pad}" width="${g-2*pad}" height="${g-2*pad}" rx="${g*0.12}" fill="${fill}"/>`;
  }));
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${out}</svg>`;
};

const base = `*{margin:0;box-sizing:border-box}body{font-family:Inter,sans-serif;background:${C.ink};color:${C.paper}}
.mono{font-family:'JetBrains Mono',monospace}`;

const logo = `<style>${base}body{width:800px;height:800px;display:grid;place-items:center;border-radius:0}</style>
<div style="display:grid;place-items:center">${mark(520)}</div>`;

const banner = `<style>${base}
body{width:2560px;height:1440px;position:relative;overflow:hidden}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(246,244,238,.06) 2px,transparent 2px),linear-gradient(90deg,rgba(246,244,238,.06) 2px,transparent 2px);background-size:120px 60px}
.safe{position:absolute;left:50%;top:50%;width:1546px;height:423px;transform:translate(-50%,-50%);display:flex;align-items:center;gap:56px}
h1{font-size:150px;font-weight:800;letter-spacing:-4px;line-height:1}
p{font-size:52px;font-weight:500;opacity:.85;margin-top:18px}
.row{position:absolute;left:0;right:0;top:calc(50% - 30px);height:60px;background:rgba(242,179,61,.10)}
.f{color:${C.amber}}
</style><div class="grid"></div><div class="row"></div>
<div class="safe">${mark(300)}<div><h1>Rowwise</h1><p>Get the <span class="f">right answer</span> from your data.</p>
<p class="mono" style="font-size:36px;opacity:.6;margin-top:22px">Excel · SQL · Python · AI — new videos Tue &amp; Fri</p></div></div>`;

const thumb = `<style>${base}
body{width:1280px;height:720px;background:${C.paper};color:${C.ink};position:relative;overflow:hidden}
.side{position:absolute;left:0;top:0;bottom:0;width:120px;background:${C.ink};display:grid;grid-template-rows:repeat(9,1fr);gap:6px;padding:10px}
.side div{background:rgba(246,244,238,.12);border-radius:6px}.side div:nth-child(5){background:${C.amber}}
.fx{position:absolute;left:170px;top:80px;font-size:64px;font-weight:700;background:#fff;border:4px solid ${C.ink};border-radius:14px;padding:18px 28px}
.fx b{color:${C.coral}}
.cell{position:absolute;left:170px;top:270px;width:560px;height:300px;background:#fff;border:8px solid ${C.coral};border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:230px;font-weight:800;letter-spacing:-8px}
.x{position:absolute;left:660px;top:220px;width:150px;height:150px;border-radius:50%;background:${C.coral};color:#fff;font-size:110px;font-weight:900;display:grid;place-items:center}
.tag{position:absolute;right:60px;top:300px;font-size:120px;font-weight:900;line-height:.95;text-align:right;letter-spacing:-3px}
.tag span{color:${C.coral}}
</style><div class="side">${'<div></div>'.repeat(9)}</div>
<div class="fx mono">=VLOOKUP(E3,A:C,3<b>&#8203;</b>)</div>
<div class="cell">$49</div><div class="x">✗</div>
<div class="tag">NO<br><span>ERROR</span></div>`;

const jobs = [
  ['brand/logo.png', logo, 800, 800],
  ['brand/banner.png', banner, 2560, 1440],
  ['videos/001-lookup-wrong-answers/thumbnail-a.png', thumb, 1280, 720],
];

const browser = await chromium.launch();
for (const [out, html, w, h] of jobs) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset="utf-8">${html}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, out) });
  await page.close();
  console.log('wrote', out);
}
await browser.close();
