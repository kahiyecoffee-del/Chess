// Full-wrap paperback cover for KDP: 6x9 trim, 64 pages white paper, 0.125in bleed.
// Spine = 64 * 0.002252 in = 0.144 in (too thin for spine text: KDP requires 79+ pages).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const pages = 64, bleed = 0.125, trimW = 6, trimH = 9, spine = +(pages * 0.002252).toFixed(3);
const W = +(bleed * 2 + trimW * 2 + spine).toFixed(3), H = trimH + bleed * 2;
const board = fs.readFileSync(path.join(out, 'cover-board.svg'), 'utf8');
const html = `<!doctype html><meta charset="utf-8"><style>
@page{size:${W}in ${H}in;margin:0}*{margin:0;box-sizing:border-box}
body{width:${W}in;height:${H}in;background:#13212E;color:#F6F4EE;font-family:Inter,sans-serif;position:relative;overflow:hidden}
.back{position:absolute;left:${bleed + 0.5}in;top:${bleed + 0.6}in;width:${trimW - 1}in}
.back h2{font-size:20pt;font-weight:800;line-height:1.15;margin-bottom:12pt}
.back p{font-size:10.5pt;line-height:1.5;color:#D5DCE2;margin-bottom:10pt}
.back ul{font-size:10.5pt;line-height:1.6;color:#D5DCE2;padding-left:14pt;margin-bottom:12pt}
.back .brand{position:absolute;left:0;top:${trimH - 1.75}in;font-weight:700;color:#F2B33D;font-size:11pt;letter-spacing:.12em}
.front{position:absolute;left:${bleed + trimW + spine}in;top:0;width:${trimW + bleed}in;height:${H}in}
.k{position:absolute;left:0.5in;top:${bleed + 0.55}in;font-size:10.5pt;font-weight:700;letter-spacing:.2em;color:#F2B33D}
h1{position:absolute;left:0.5in;top:${bleed + 0.8}in;font-size:51pt;font-weight:900;line-height:.92;letter-spacing:-1.5px}
h1 span{color:#F2B33D}
.s{position:absolute;left:0.5in;top:${bleed + 3.1}in;font-size:13pt;color:#C9D2DA}
.b{position:absolute;left:0.75in;top:${bleed + 3.65}in}.b svg{width:4.5in;height:4.5in;display:block;border-radius:5px}
.ft{position:absolute;left:0.5in;width:5in;top:${bleed + 8.35}in;display:flex;justify-content:space-between;font-size:11pt;font-weight:700;color:#C9D2DA}
</style>
<div class="back"><h2>Train your eye for checkmate.</h2>
<p>300 mate-in-two puzzles from realistic positions, ordered from easy to hard. Every one has been checked by computer: there is no mate in one, exactly one first move wins, and the printed solution ends in checkmate.</p>
<ul><li>Three parts: Warm-up, Building strength, Challenge</li><li>Six large diagrams per page, shown from the side to move</li><li>Opponent's last move marked on every board</li><li>Full solutions at the back</li></ul>
<p>For club players, adult improvers, juniors and coaches.</p>
<div class="brand">ROWWISE CHESS</div></div>
<div class="front"><div class="k">CHESS TACTICS WORKBOOK</div><h1>300<br><span>Mate-in-2</span><br>Puzzles</h1>
<div class="s">Verified tactics for improving players · Full solutions</div><div class="b">${board}</div>
<div class="ft"><span>Rowwise Chess</span><span>Easy → Hard</span></div></div>`;
const browser = await chromium.launch();
const p = await browser.newPage();
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: path.join(out, 'mate-in-2-cover-full.pdf'), width: `${W}in`, height: `${H}in`, printBackground: true });
await browser.close();
console.log(`cover ${W} x ${H} in, spine ${spine} in`);
