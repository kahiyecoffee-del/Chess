// Prints the interior PDF (6x9 in) and renders the front cover (1800x2700 px, 300 dpi).
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(out, 'mate-in-2-interior.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: path.join(out, 'mate-in-2-interior.pdf'), width: '6in', height: '9in', printBackground: true, preferCSSPageSize: true });

const board = fs.readFileSync(path.join(out, 'cover-board.svg'), 'utf8');
const cover = `<!doctype html><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}
body{width:1800px;height:2700px;background:#13212E;color:#F6F4EE;font-family:Inter,sans-serif;position:relative;overflow:hidden}
.k{position:absolute;left:150px;top:170px;font-size:44px;font-weight:700;letter-spacing:.2em;color:#F2B33D}
h1{position:absolute;left:150px;top:250px;font-size:215px;font-weight:900;line-height:.92;letter-spacing:-6px}
h1 span{color:#F2B33D}
.s{position:absolute;left:150px;top:900px;font-size:62px;font-weight:500;color:#C9D2DA;line-height:1.3}
.b{position:absolute;left:225px;top:1080px}.b svg{width:1350px;height:1350px;display:block;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.45)}
.ft{position:absolute;left:150px;right:150px;bottom:110px;display:flex;justify-content:space-between;font-size:46px;font-weight:700;color:#C9D2DA}
</style><div class="k">CHESS TACTICS WORKBOOK</div><h1>300<br><span>Mate-in-2</span><br>Puzzles</h1>
<div class="s">Verified tactics for improving players · Full solutions</div><div class="b">${board}</div>
<div class="ft"><span>Rowwise Chess</span><span>Easy → Hard</span></div>`;
const cp = await browser.newPage({ viewport: { width: 1800, height: 2700 } });
await cp.setContent(cover); await cp.evaluate(() => document.fonts.ready);
await cp.screenshot({ path: path.join(out, 'mate-in-2-cover-front.png') });
await browser.close();
console.log('done');
