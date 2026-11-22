// 2D phone-screen shots for episode 2 (voice memo list, playback at 1:02 and 3:05, Eray's message).
// Each shot = N frames with a slow push-in, written as frames/<name>_%04d.png at 640x360.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const FR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'build', 'frames');

const wave = (n, seed, hot) => Array.from({ length: n }, (_, i) => {
  const h = 6 + Math.abs(Math.sin(i * 0.7 + seed) * 18 + Math.sin(i * 0.23) * 10);
  return `<i style="height:${h}px;background:${i < hot ? '#ff453a' : '#555'}"></i>`;
}).join('');
const phone = (inner, tm = '08:14') => `<div class="ph"><div class="notch"></div><div class="st"><span>${tm}</span><span>▮▮▮ 4G</span></div>${inner}</div>`;
const memoList = phone(`<h3>Ses Kayıtları</h3>
  <div class="row on"><b>Yeni Kayıt</b><small>Bugün 03:00</small><em>3:07</em></div>
  <div class="row"><b>Ders notu – istatistik</b><small>Salı 14:12</small><em>12:40</em></div>
  <div class="row"><b>Annem</b><small>Pazar 20:05</small><em>0:48</em></div>`, '08:14');
const playing = (t, frac, tm) => phone(`<h3>Yeni Kayıt</h3><small class="d">Bugün 03:00</small>
  <div class="wv">${wave(46, 1, Math.round(46 * frac))}</div>
  <div class="tm"><span>${t}</span><span>3:07</span></div><div class="pl">❚❚</div>`, tm);
const message = phone(`<h3 class="c">Eray</h3>
  <div class="bub">Neredesin?</div><div class="bub">Aradım açmadın</div><div class="bub">Bir şey mi oldu Zehra?</div>
  <small class="d c">Şimdi · Görüldü</small>`, '19:42');

const css = `*{margin:0;box-sizing:border-box}body{width:640px;height:360px;background:#050506;display:grid;place-items:center;font-family:Inter,sans-serif;overflow:hidden}
.wrap{transform-origin:50% 45%}
.ph{width:200px;height:400px;border-radius:30px;background:#0d0d0f;border:3px solid #222;padding:14px 14px;color:#eee;position:relative;box-shadow:0 0 60px rgba(120,140,255,.08)}
.notch{width:70px;height:16px;background:#000;border-radius:10px;margin:0 auto 6px}
.st{display:flex;justify-content:space-between;font-size:9px;color:#aaa;margin-bottom:10px}
h3{font-size:17px;margin-bottom:8px}.c{text-align:center}
.row{border-top:1px solid #222;padding:8px 0;display:grid;grid-template-columns:1fr auto;font-size:11px}
.row small{color:#888;grid-column:1}.row em{grid-row:1/3;grid-column:2;align-self:center;font-style:normal;color:#aaa}
.row.on b{color:#fff}.d{color:#888;font-size:10px;display:block}
.wv{display:flex;align-items:center;gap:2px;height:90px;margin:26px 0 8px}.wv i{width:2px;border-radius:2px;display:block}
.tm{display:flex;justify-content:space-between;font-size:10px;color:#aaa}
.pl{margin:24px auto 0;width:44px;height:44px;border-radius:50%;background:#ff453a;display:grid;place-items:center;font-size:14px}
.bub{background:#2c2c2e;border-radius:14px;padding:7px 10px;font-size:12px;margin:6px 0;width:fit-content}`;

const call = (status, tm) => phone(`<div style="text-align:center;margin-top:40px"><div style="width:74px;height:74px;border-radius:50%;background:#333;margin:0 auto 12px;display:grid;place-items:center;font-size:30px">E</div>
  <h3 class="c">Eray</h3><small class="d c">${status}</small></div>
  <div style="display:flex;justify-content:space-around;margin-top:110px"><span style="width:46px;height:46px;border-radius:50%;background:#333"></span><span style="width:46px;height:46px;border-radius:50%;background:#ff453a"></span><span style="width:46px;height:46px;border-radius:50%;background:#333"></span></div>`, tm);
const ALL = [['arama1', call('aranıyor…', '03:04')], ['arama2', call('00:47', '03:05')], ['telefon1', memoList], ['telefon2', playing('1:02', 0.33, '08:15')], ['telefon3', playing('3:05', 0.99, '22:31')], ['mesaj', message]];
const want = process.argv.slice(2);
const shots = want.length ? ALL.filter(([n]) => want.includes(n)) : ALL;
const N = 24;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
for (const [name, html] of shots) {
  for (let f = 1; f <= N; f++) {
    const s = 0.82 + 0.06 * (f / N);
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>${css}</style><div class="wrap" style="transform:scale(${s})">${html}</div>`);
    if (f === 1) await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(FR, `${name}_${String(f).padStart(4, '0')}.png`) });
  }
}
await browser.close();
console.log('phone shots done');
