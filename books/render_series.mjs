// Renders interior PDF, front cover PNG and full-wrap cover PDF for one book of the series.
// Usage: node books/render_series.mjs <slug> "<line1>" "<line2 accent>" "<line3>" "<subtitle>" "<accent hex>" "<back headline>" "<back text>"
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const [slug, l1, l2, l3, sub, accent, backH, backP] = process.argv.slice(2);
const board = fs.readFileSync(path.join(out, `${slug}-cover-board.svg`), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(out, `${slug}-interior.html`)).href);
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: path.join(out, `${slug}-interior.pdf`), width: '6in', height: '9in', printBackground: true, preferCSSPageSize: true });
const nPages = (await page.evaluate(() => document.querySelectorAll('.page').length));
const bleed = 0.125, trimW = 6, trimH = 9, spine = +(nPages * 0.002252).toFixed(3);
const W = +(bleed * 2 + trimW * 2 + spine).toFixed(3), H = trimH + bleed * 2;
const front = (x) => `<div class="front" style="left:${x}in"><div class="k">CHESS TACTICS WORKBOOK</div><h1>${l1}<br><span>${l2}</span><br>${l3}</h1>
<div class="s">${sub}</div><div class="b">${board}</div><div class="ft"><span>Rowwise Chess</span><span>Easy → Hard</span></div></div>`;
const css = `*{margin:0;box-sizing:border-box}body{background:#13212E;color:#F6F4EE;font-family:Inter,sans-serif;position:relative;overflow:hidden}
.front{position:absolute;top:0;width:${trimW + bleed}in;height:${H}in}
.k{position:absolute;left:0.5in;top:${bleed + 0.55}in;font-size:10.5pt;font-weight:700;letter-spacing:.2em;color:${accent}}
h1{position:absolute;left:0.5in;top:${bleed + 0.8}in;font-size:44pt;font-weight:900;line-height:.95;letter-spacing:-1.2px;width:5.2in}
h1 span{color:${accent}}
.s{position:absolute;left:0.5in;top:${bleed + 3.05}in;font-size:12.5pt;color:#C9D2DA}
.b{position:absolute;left:0.75in;top:${bleed + 3.65}in}.b svg{width:4.5in;height:4.5in;display:block;border-radius:5px}
.ft{position:absolute;left:0.5in;width:5in;top:${bleed + 8.35}in;display:flex;justify-content:space-between;font-size:11pt;font-weight:700;color:#C9D2DA}
.back{position:absolute;left:${bleed + 0.5}in;top:${bleed + 0.6}in;width:${trimW - 1}in;height:${trimH - 1.2}in}
.back h2{font-size:20pt;font-weight:800;line-height:1.15;margin-bottom:12pt}.back p{font-size:10.5pt;line-height:1.5;color:#D5DCE2;margin-bottom:10pt}
.brand{position:absolute;left:0;bottom:0.6in;font-weight:700;color:${accent};font-size:11pt;letter-spacing:.12em}`;
const wrap = `<!doctype html><meta charset="utf-8"><style>@page{size:${W}in ${H}in;margin:0}body{width:${W}in;height:${H}in}${css}</style>
<div class="back"><h2>${backH}</h2><p>${backP}</p><p>Six large diagrams per page, shown from the side to move, with the opponent's last move marked. Full solutions at the back.</p><div class="brand">ROWWISE CHESS</div></div>${front(bleed + trimW + spine)}`;
const p2 = await browser.newPage();
await p2.setContent(wrap); await p2.evaluate(() => document.fonts.ready);
await p2.pdf({ path: path.join(out, `${slug}-cover-full.pdf`), width: `${W}in`, height: `${H}in`, printBackground: true });
const p3 = await browser.newPage({ viewport: { width: 576, height: 864 }, deviceScaleFactor: 3.125 });
await p3.setContent(`<!doctype html><meta charset="utf-8"><style>body{width:6in;height:9in}${css}.front{left:-${bleed}in}</style>${front(0)}`);
await p3.evaluate(() => document.fonts.ready);
await p3.screenshot({ path: path.join(out, `${slug}-cover-front.png`) });
await browser.close();
console.log(slug, 'pages', nPages, 'cover', W, 'x', H);
