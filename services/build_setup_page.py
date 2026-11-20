"""Builds a phone-friendly Fiverr setup page from GIGS.md: one copy button per Fiverr form field.
Run: python3 services/build_setup_page.py  -> services/fiverr-kurulum.html
"""
import html
import json
import re
from pathlib import Path

HERE = Path(__file__).parent
src = (HERE / "GIGS.md").read_text()
SCOPE = "Message me before ordering: free scope check and a fixed price.\n\n"
REQS = ["Please upload your file or a sample (dummy data is fine).",
        "What result do you need? Describe it or share an example.",
        "What is your deadline, and which software/version do you use (Excel, Google Sheets, etc.)?"]
IMAGES = {1: "gig1-clean-automate.png", 2: "gig2-dashboard.png", 3: "gig3-python.png", 4: "gig4-pdf-to-excel.png",
          5: "gig5-listings.png", 6: "gig6-landing-page.png", 7: "gig7-presentations.png"}


def block(text, label):
    m = re.search(rf"\*\*{re.escape(label)}\*\*\n```\n(.*?)```", text, re.S)
    return m.group(1).strip() if m else ""


def field(text, label):
    m = re.search(rf"\*\*{re.escape(label)}:\*\* (.+)", text)
    return m.group(1).strip() if m else ""


profile_txt = src.split("## GIG 1")[0]
profile = {
    "Kullanıcı adı (kalıcı)": "rowwisedata",
    "Display name": field(profile_txt, "Display name"),
    "One-liner": field(profile_txt, "One-liner"),
    "About": block(profile_txt, "About (≤600 chars):"),
    "Skills": field(profile_txt, "Skills"),
}

faq_txt = src.split("## FAQ (add to every gig)")[1].split("## Message templates")[0]
faq = [(q.strip(), a.strip()) for q, a in re.findall(r"- \*\*(.+?)\*\* (.+)", faq_txt)]

gigs = []
for n, part in enumerate(re.split(r"\n## GIG \d+ — ", src)[1:], 1):
    part = part.split("\n## FAQ")[0]
    name = part.splitlines()[0].strip()
    title = field(part, "Title")
    rows = {}
    for line in part.splitlines():
        if line.startswith("| ") and not line.startswith("| |") and not line.startswith("|---"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            rows[cells[0]] = cells[1:]
    includes = rows.get("Includes") or rows.get("What")
    names = rows.get("Name", ["Basic", "Standard", "Premium"])
    dr = [x.split("/") for x in rows["Delivery / Revisions"]]
    pk = []
    for i, tier in enumerate(["Basic", "Standard", "Premium"]):
        pk.append({"tier": tier, "name": names[i], "desc": includes[i],
                   "delivery": dr[i][0].strip(), "revisions": dr[i][1].strip(), "price": rows["Price"][i].replace("$", "")})
    gigs.append({"n": n, "name": name, "title": title.removeprefix("I will "), "category": field(part, "Category"),
                 "tags": field(part, "Tags"), "desc": SCOPE + block(part, "Description:"), "packages": pk,
                 "image": IMAGES[n]})

DATA = {"profile": profile, "gigs": gigs, "faq": faq, "reqs": REQS}

page = r"""<title>Fiverr Kurulum Paneli</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* Layout: one narrow column of steps; each Fiverr form field is a row with a copy button */
:root{--bg:#F6F4EE;--card:#FFFFFF;--ink:#13212E;--muted:#5E6873;--line:#DED9CC;--accent:#B9851F;--ok:#1C8A5E;--okbg:#DDF3E9;
--f-body:Inter,system-ui,sans-serif;--f-mono:"JetBrains Mono",ui-monospace,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#10171F;--card:#18222D;--ink:#EEF1F4;--muted:#9AA6B2;--line:#2A3846;--accent:#F2B33D;--ok:#3CC48C;--okbg:#173A2C;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#10171F;--card:#18222D;--ink:#EEF1F4;--muted:#9AA6B2;--line:#2A3846;--accent:#F2B33D;--ok:#3CC48C;--okbg:#173A2C;color-scheme:dark}
body{background:var(--bg);color:var(--ink);font-family:var(--f-body);font-size:15px;line-height:1.5;
padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:20px 48px}
.wrap{max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
h1{font-size:28px;font-weight:800;letter-spacing:-.5px;text-wrap:balance;margin:0}
.lead{color:var(--muted);margin:0}
.progress{display:flex;align-items:center;gap:12px;font-weight:600}
.bar{flex:1;height:8px;border-radius:99px;background:var(--line);overflow:hidden}.bar i{display:block;height:100%;background:var(--ok);width:0;transition:width .3s}
details{background:var(--card);border:1px solid var(--line);border-radius:14px}
summary{list-style:none;cursor:pointer;padding:14px 16px;display:flex;align-items:center;gap:12px;font-weight:700}
summary::-webkit-details-marker{display:none}
.num{flex:none;width:30px;height:30px;border-radius:8px;background:var(--ink);color:var(--bg);display:grid;place-items:center;font-size:14px;font-weight:800}
details.done .num{background:var(--ok)}
.sum-t{flex:1;min-width:0}.sum-t small{display:block;color:var(--muted);font-weight:500;font-size:13px}
.body{padding:0 16px 16px;display:flex;flex-direction:column;gap:12px}
.f{display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--line);padding-top:12px}
.fh{display:flex;align-items:center;justify-content:space-between;gap:10px}
.lab{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.val{white-space:pre-wrap;word-break:break-word;font-size:14px;min-width:0}
.val.mono{font-family:var(--f-mono);font-size:13px}
button.copy{flex:none;font:600 13px var(--f-body);border:1.5px solid var(--ink);background:transparent;color:var(--ink);border-radius:99px;padding:6px 14px;cursor:pointer;min-height:34px}
button.copy.ok{background:var(--ok);border-color:var(--ok);color:#fff}
button:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.pk{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.pkc{border:1px solid var(--line);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;min-width:0}
.pkc b{font-size:13px}
@media (max-width:560px){.pk{grid-template-columns:1fr}}
.mini{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px}
.mini span{min-width:0;word-break:break-word}
.mini button.copy{padding:4px 10px;min-height:30px;font-size:12px}
.tip{background:var(--okbg);border-radius:10px;padding:10px 12px;font-size:14px}
.done-btn{align-self:flex-start;font:700 14px var(--f-body);border:0;border-radius:10px;padding:10px 16px;background:var(--ink);color:var(--bg);cursor:pointer}
details.done .done-btn{background:var(--ok);color:#fff}
@media (prefers-reduced-motion:reduce){.bar i{transition:none}}
</style>
<div class="wrap">
  <h1>Fiverr Kurulum Paneli</h1>
  <p class="lead">Her alanın yanındaki <b>Kopyala</b>'ya bas, Fiverr'daki aynı alana yapıştır. Bitirdiğin adımı "Tamamlandı" ile işaretle.</p>
  <div class="progress"><div class="bar"><i id="barfill"></i></div><span id="count">0/9</span></div>
  <div id="steps"></div>
</div>
<script>
const D = __DATA__;
const store = {get(){try{return JSON.parse(localStorage.getItem('fvr-done')||'{}')}catch(e){return {}}},
  set(v){try{localStorage.setItem('fvr-done',JSON.stringify(v))}catch(e){}}};
let done = store.get();
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let clip = [];
function cbtn(text, small){ clip.push(text); return `<button class="copy" data-i="${clip.length-1}">Kopyala</button>`; }
function fieldRow(label, text, mono){ return `<div class="f"><div class="fh"><span class="lab">${label}</span>${cbtn(text)}</div><div class="val${mono?' mono':''}">${esc(text)}</div></div>`; }
function mini(label, text){ return `<div class="mini"><span><span class="lab">${label}</span> ${esc(text)}</span>${cbtn(text)}</div>`; }
function step(id, num, title, sub, inner){
  return `<details id="${id}" class="${done[id]?'done':''}"><summary><span class="num">${num}</span><span class="sum-t">${esc(title)}<small>${esc(sub)}</small></span></summary>
  <div class="body">${inner}<button class="done-btn" data-step="${id}">${done[id]?'✓ Tamamlandı':'Tamamlandı olarak işaretle'}</button></div></details>`;
}
let h = '';
h += step('s-account', 'A', 'Hesap ve profil', 'Kayıt ol → Become a Seller → profil alanları',
  `<div class="tip">fiverr.com'u Safari'de aç, "aA" → <b>Masaüstü Sitesini İste</b>. Profil fotoğrafı: yüzünün net göründüğü gerçek bir fotoğraf. Telefon ve kimlik doğrulamasını Fiverr isterse yap.</div>` +
  Object.entries(D.profile).map(([k,v]) => fieldRow(k, v, k.startsWith('Kullanıcı'))).join('') +
  fieldRow('Languages', 'Turkish — Native\nEnglish — Fluent'));
D.gigs.forEach(g => {
  let inner = `<div class="tip">Görsel: <b>${g.image}</b> (sohbette gönderildi). Fiverr başlığın başına "I will" yazısını kendisi koyar; aşağıdakini devamına yapıştır.</div>`;
  inner += fieldRow('1 · Title (I will …)', g.title);
  inner += fieldRow('1 · Category', g.category);
  inner += fieldRow('1 · Search tags (tek tek gir)', g.tags.split(',').map(s=>s.trim()).join('\n'), true);
  inner += `<div class="f"><span class="lab">2 · Pricing — "3 packages" aç</span><div class="pk">` + g.packages.map(p =>
    `<div class="pkc"><b>${p.tier}</b>${mini('Ad', p.name)}${mini('Açıklama', p.desc)}${mini('Teslim', p.delivery)}${mini('Revizyon', p.revisions)}${mini('Fiyat $', p.price)}</div>`).join('') + `</div></div>`;
  inner += fieldRow('3 · Description', g.desc);
  inner += D.faq.map((q,i) => fieldRow(`3 · FAQ ${i+1} soru`, q[0]) + fieldRow(`3 · FAQ ${i+1} cevap`, q[1])).join('');
  inner += D.reqs.map((r,i) => fieldRow(`4 · Requirement ${i+1}`, r)).join('');
  inner += `<div class="tip">5 · Gallery'ye <b>${g.image}</b> yükle → 6 · <b>Publish</b>.</div>`;
  h += step('g'+g.n, g.n, g.name, '$' + g.packages.map(p=>p.price).join(' / $'), inner);
});
h += step('s-pay', '✓', 'Ödeme ve bildirimler', 'Payoneer + Fiverr uygulaması',
  `<div class="tip">Profil → Earnings → Withdrawal: <b>Payoneer</b> bağla. Fiverr uygulamasını kur, <b>bildirimleri aç</b>, durumunu Online tut. Mesaj gelince ekran görüntüsünü bana gönder.</div>`);
document.getElementById('steps').innerHTML = h;
document.getElementById('steps').style.cssText = 'display:flex;flex-direction:column;gap:12px';
const ids = ['s-account', ...D.gigs.map(g=>'g'+g.n), 's-pay'];
function prog(){ const n = ids.filter(i=>done[i]).length; document.getElementById('count').textContent = n + '/' + ids.length;
  document.getElementById('barfill').style.width = (100*n/ids.length) + '%'; }
prog();
document.addEventListener('click', async e => {
  const b = e.target.closest('button.copy');
  if (b) { const t = clip[+b.dataset.i];
    try { await navigator.clipboard.writeText(t); }
    catch (err) { const v = b.closest('.f,.mini').querySelector('.val, span span:last-child') || b.closest('.f,.mini');
      const r = document.createRange(); r.selectNodeContents(b.closest('.f') ? b.closest('.f').querySelector('.val') : b.parentElement.firstElementChild);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    b.classList.add('ok'); b.textContent = 'Kopyalandı'; setTimeout(()=>{b.classList.remove('ok'); b.textContent='Kopyala';}, 1500); return; }
  const d = e.target.closest('button.done-btn');
  if (d) { const id = d.dataset.step; done[id] = !done[id]; store.set(done);
    const el = document.getElementById(id); el.classList.toggle('done', !!done[id]);
    d.textContent = done[id] ? '✓ Tamamlandı' : 'Tamamlandı olarak işaretle';
    if (done[id]) { el.open = false; const nx = el.nextElementSibling; if (nx) nx.open = true; } prog(); }
});
const first = ids.find(i=>!done[i]); if (first) document.getElementById(first).open = true;
</script>
"""
out = HERE / "fiverr-kurulum.html"
out.write_text(page.replace("__DATA__", json.dumps(DATA, ensure_ascii=False)))
print(out, len(gigs), "gigs")
for g in gigs:
    print(g["n"], g["title"][:50], [p["price"] for p in g["packages"]], len(g["desc"]))
