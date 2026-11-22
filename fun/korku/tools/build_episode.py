"""Builds one FISILTI clip: whispered narration + synthesized ambience + Blender shots -> mp4.

Run with the TTS venv:  /opt/tts/bin/python build_episode.py <episode_id>
Episode specs live in EPISODES below. Each beat is ("say", text) | ("pause", sec) | ("shot", name) | ("event", name).
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from fisilti_tts import synth, whisperize, full_whisper  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
FRAMES = BUILD / "frames"
OUT = ROOT / "player"
SR = 44100
SHOT_FPS = 12
GAMMA = {"kampus": 1.05, "telefon": 1.0, "mesaj": 1.0, "koridor": 1.1, "sabah": 1.2, "yol": 1.35, "koy_dis": 1.1,
         "ev_ic": 1.15, "hatice": 1.15, "esik": 1.1, "tavan_arasi": 1.15, "pencere": 1.25}

EPISODES = {
    "b1": {"title": "1. Bölüm — 03.00", "tail": 4.0, "beats": [
        ("shot", "tavan"), ("pause", 2.0), ("event", "radiator_on"),
        ("say", "Zehra… uyanık mısın?"), ("pause", 1.4),
        ("say", "Kıpırdama. Sadece gözlerini aç. Yavaşça."),
        ("say", "Saat üç. Hep üç oluyor, değil mi? Bunu fark etmiştin."),
        ("say", "Oda karanlık. Perdenin aralığından, sokak lambasının turuncu ışığı giriyor. Tavanda ince bir çizgi."),
        ("shot", "oda"),
        ("say", "Elif'in yatağı karşında. Yorganı kabarık. Uyuyor… öyle sanıyorsun."),
        ("say", "Göğsünde bir ağırlık var, Zehra. Sanki biri oturmuş."),
        ("say", "Nefes alıyorsun, ama hava yarıda kalıyor."),
        ("say", "Kollarını kaldırmak istiyorsun. Kalkmıyorlar."), ("say", "Parmaklarını oynatmak istiyorsun. Oynamıyorlar."),
        ("say", "Korkma. Bu sadece karabasan. Herkesin başına gelir."), ("pause", 0.8),
        ("say", "Ama bak… Elif'in yorganına bak."),
        ("shot", "yorgan"),
        ("say", "Yorgan kabarık, evet. Ama Elif akşam eve gitmişti. Hatırlıyor musun? Hafta sonu yokum, demişti."),
        ("say", "O zaman… yorganın altında yatan ne?"),
        ("event", "radiator_off"), ("pause", 2.6),
        ("say", "Şşş. Nefesini tut."), ("event", "breath_on"),
        ("say", "Yorgan… çok yavaş… iniyor. Kalkıyor. İniyor. Kalkıyor."),
        ("say", "Nefes alıyor, Zehra."), ("pause", 0.6),
        ("say", "Senin nefesinle aynı anda."),
        ("say", "Sen nefes verdiğinde, o da veriyor. Sen tuttuğunda, o da tutuyor."),
        ("shot", "ayakucu"), ("event", "heart_on"),
        ("say", "Ayak ucunda bir şey var şimdi. Görmüyorsun, ama yatağın çöktüğünü hissediyorsun. Biri oturdu."),
        ("say", "Ağırlık… yavaş yavaş… göğsüne doğru tırmanıyor."),
        ("say", "Bana güven. Seni henüz görmedi. Seni sadece duyuyor."), ("pause", 1.0),
        ("event", "drone_on"),
        ("say", "İki yolun var."),
    ]},
    "b2": {"title": "2. Bölüm — Kayıt", "tail": 4.0, "speed": 0.85, "beats": [
        ("shot", "sabah"), ("pause", 1.6),
        ("say", "Sabah oldu, Zehra."),
        ("say", "Pencereden gri bir ışık giriyor. Elif'in yatağı… dümdüz. Yorgan katlanmış, köşeleri gergin. Kimse yatmamış."),
        ("say", "Rüyaydı, diyorsun kendine. Karabasan. Herkesin başına gelir."),
        ("say", "Telefonuna uzanıyorsun."),
        ("shot", "telefon1"),
        ("say", "Bir ses kaydı var. Saat üçte başlamış. Üç dakika, yedi saniye."),
        ("say", "Sen kaydetmedin. Biliyorsun."), ("pause", 0.8),
        ("say", "Oynat'a basıyorsun."),
        ("shot", "telefon2"), ("event", "rec_breath"), ("pause", 2.5),
        ("say", "Önce kendi nefesini duyuyorsun. Uykudaki, yavaş nefesin."), ("pause", 1.0),
        ("say", "Sonra… bir nefes daha."), ("pause", 1.2),
        ("say", "Çok yakın. Mikrofonun dibinde."),
        ("say", "İkinci nefes seninkinden biraz hızlı. Sonra yavaşlıyor. Yavaşlıyor… ta ki seninkiyle aynı olana kadar."),
        ("event", "rec_stop"), ("say", "Kaydı durduruyorsun. Elin titriyor."),
        ("shot", "kampus"),
        ("say", "Gün boyu düşünmemeye çalışıyorsun. Derse giriyorsun. Kimse bir şey fark etmiyor."),
        ("say", "Ama akşam yurda dönerken… arkandan adım sesleri geliyor."), ("event", "steps"), ("pause", 3.0),
        ("say", "Sen durunca…"), ("event", "steps_stop"), ("pause", 0.6), ("say", "onlar da duruyor."), ("pause", 1.2),
        ("say", "Arkana bakıyorsun. Yol boş. Sadece sokak lambaları… ve lambaların birinin altında, biri."),
        ("say", "Kıpırdamıyor. Sana bakıyor. Yüzünü göremiyorsun, ama biliyorsun."),
        ("shot", "mesaj"), ("event", "buzz"), ("pause", 1.4),
        ("say", "Telefonun titriyor. Eray. Neredesin? Bir şey mi oldu?"),
        ("say", "Kaydın üç dakika yedi saniye olduğunu hatırlıyorsun. Sen sadece bir dakikasını dinledin."),
        ("say", "Bence dinlemelisin, Zehra. Bilmek… korkmaktan iyidir."), ("pause", 0.8),
        ("say", "Ama aklına anneannen geliyor. Köydeki ev. Hep derdi: Seni bir şey rahatsız ederse buraya gel. Bu ev seni korur."),
        ("event", "drone_on"), ("say", "İki yolun var."),
    ]},
    "s2b": {"title": "Son — Üçüncü Kez", "tail": 5.0, "speed": 0.85, "beats": [
        ("shot", "telefon3"), ("event", "rec_breath"), ("pause", 1.5),
        ("say", "Kulaklığını takıyorsun. Kaydı kaldığın yerden açıyorsun."), ("pause", 1.5),
        ("say", "İki nefes. Aynı anda. Sonra bir ses… çok alçak."), ("pause", 1.0),
        ("say_w", "Zehra."), ("pause", 1.2),
        ("say", "Kendi sesin. Uykunda konuşuyorsun sanıyorsun."), ("pause", 0.8),
        ("say_w", "Zehra."), ("pause", 1.0),
        ("say", "Bu sefer daha yakın. Sayaç üç dakika beşte. Kayıt neredeyse bitti."),
        ("say", "Üçüncü kez geldiğinde cevap verme. Bunu biliyorsun. Herkes bilir."), ("pause", 1.2),
        ("say_w", "Zehra."), ("pause", 0.9),
        ("say_c", "Efendim?"), ("pause", 1.2), ("event", "rec_stop"),
        ("shot", "oda"), ("event", "breath_on"),
        ("say", "Kendi ağzından çıktığını duyuyorsun."),
        ("say", "Kayıt bitti. Ama nefes sesi… devam ediyor."), ("pause", 1.0),
        ("say", "Kulaklığı çıkarıyorsun. Nefes sesi hâlâ orada."), ("pause", 1.2),
        ("event", "heart_on"), ("say", "Odanın içinde."),
    ]},
    "s1b": {"title": "Son — Sesin", "tail": 5.0, "beats": [
        ("shot", "ayakucu"), ("event", "heart_on"), ("pause", 0.8),
        ("say", "Bağırıyorsun, Zehra. Bütün gücünle."),
        ("say", "Ama ağzından hiçbir şey çıkmıyor."), ("event", "heart_off"),
        ("say", "Ses yok. Hiç yok."), ("pause", 1.0),
        ("say", "Göğsündeki ağırlık durdu. Dinliyor."), ("pause", 1.2),
        ("say", "Sonra kulağının dibinde… kendi sesin. Senin sesin."),
        ("say", "Az önce çıkmayan çığlık… şimdi onun ağzından çıkıyor."), ("event", "scream"), ("pause", 2.4),
        ("shot", "koridor"), ("event", "hum_on"),
        ("say", "Sabah koridorda kızlar konuşuyor."),
        ("say", "Gece Zehra'nın sesini duyduk. Saatlerce kapıları çaldı."), ("pause", 0.8),
        ("say", "Ama sen yatağındasın, Zehra. Gözlerin açık. Kıpırdayamıyorsun."), ("pause", 0.8),
        ("say", "Ve kapıları… çalmaya devam ediyor."), ("event", "knock"),
    ]},
}

rng = np.random.default_rng(7)


def to_sr(x, sr_in):
    n = int(len(x) * SR / sr_in)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)


def lowpass(x, a):
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc); y[i] = acc
    return y


def lp_fast(x, a):  # vectorised one-pole via cumulative trick on blocks (approximation good enough for noise beds)
    from scipy.signal import lfilter
    return lfilter([a], [1, a - 1], x)


def click(freq, dur, decay, amp):
    t = np.arange(int(SR * dur)) / SR
    return amp * np.sin(2 * np.pi * freq * t) * np.exp(-t * decay)


def place(buf, sig, t, ch=None, pan=0.0):
    i = int(t * SR)
    if i >= buf.shape[0]:
        return
    sig = sig[: buf.shape[0] - i]
    l, r = (1 - pan) / 2 + 0.25, (1 + pan) / 2 + 0.25
    buf[i:i + len(sig), 0] += sig * l
    buf[i:i + len(sig), 1] += sig * r


def ambience(total, events):
    from scipy.signal import butter, lfilter
    buf = np.zeros((int(total * SR), 2))
    n = buf.shape[0]
    # room tone
    b, a = butter(2, 300 / (SR / 2))
    tone = lfilter(b, a, rng.standard_normal(n)) * 0.02
    buf[:, 0] += tone; buf[:, 1] += np.roll(tone, 300)
    ev = {k: v for k, v in events}
    # clock: soft wooden tick every second, slightly right
    for t in np.arange(0.5, total, 1.0):
        place(buf, click(1800, 0.04, 180, 0.05) + click(900, 0.04, 120, 0.03), t, pan=0.5)
    # radiator ticks
    if "radiator_on" in ev:
        t, end = ev["radiator_on"], ev.get("radiator_off", total)
        while t < end:
            place(buf, click(rng.uniform(2400, 3600), 0.06, 70, 0.10), t, pan=-0.4)
            t += rng.uniform(0.7, 3.2)
    # breathing synced to the blanket loop (period 4 s): inhale 1.6 s, exhale 2.0 s
    if "breath_on" in ev:
        b2, a2 = butter(2, [250 / (SR / 2), 1800 / (SR / 2)], btype="band")
        start = ev["breath_on"]
        k = int(np.ceil(start / 4.0))
        while k * 4.0 < total:
            for off, dur, amp in ((0.0, 1.6, 0.10), (2.0, 2.0, 0.13)):
                seg = lfilter(b2, a2, rng.standard_normal(int(SR * dur)))
                env = np.sin(np.linspace(0, np.pi, len(seg))) ** 1.5
                place(buf, seg * env * amp, k * 4.0 + off, pan=0.6)
            k += 1
    # recording: two breaths, the second one faster, slowing until it matches the first
    if "rec_breath" in ev:
        b3, a3 = butter(2, [300 / (SR / 2), 2200 / (SR / 2)], btype="band")
        t0, end = ev["rec_breath"], ev.get("rec_stop", total)
        for period, amp, pan, conv in ((4.6, 0.08, -0.2, False), (3.2, 0.11, 0.35, True)):
            t, p = t0 + (1.5 if conv else 0), period
            while t < end:
                for off, dur, a_ in ((0.0, p * 0.4, amp), (p * 0.5, p * 0.45, amp * 1.2)):
                    seg = lfilter(b3, a3, rng.standard_normal(int(SR * dur)))
                    place(buf, seg * np.sin(np.linspace(0, np.pi, len(seg))) ** 1.5 * a_, t + off, pan=pan)
                t += p
                if conv: p = min(4.6, p + 0.25)
    # footsteps on a path: steady, then they stop when she stops
    if "steps" in ev:
        t, end = ev["steps"], ev.get("steps_stop", total)
        while t < end:
            place(buf, click(90, 0.12, 45, 0.18) + click(400, 0.12, 120, 0.04), t, pan=0.1); t += 0.62
    # phone vibration: two short buzzes
    if "buzz" in ev:
        for k in (0, 0.55):
            m = int(SR * 0.35); tt = np.arange(m) / SR
            place(buf, np.sign(np.sin(2 * np.pi * 170 * tt)) * 0.05 * np.sin(np.pi * tt / 0.35), ev["buzz"] + k, pan=0.4)
    # ringback tone (Turkey: 425 Hz, 1 s on / 3 s off), three rings
    if "ring" in ev:
        m = int(SR * 1.0); tt = np.arange(m) / SR
        tone = np.sin(2 * np.pi * 425 * tt) * 0.06 * np.minimum(1, np.minimum(tt, 1 - tt) * 40)
        for k in range(3):
            place(buf, tone, ev["ring"] + k * 4.0, pan=0.3)
    # call dropped: three short beeps
    if "beep" in ev:
        m = int(SR * 0.18); tt = np.arange(m) / SR
        for k in range(3):
            place(buf, np.sin(2 * np.pi * 950 * tt) * 0.06, ev["beep"] + k * 0.32, pan=0.3)
    # fingernail on glass: slow downward scrape, band-passed and gliding
    if "scratch" in ev:
        for k in range(3):
            d = 2.2; m = int(SR * d); seg = rng.standard_normal(m)
            out = np.zeros(m)
            for j in range(0, m, 2048):
                fc = 3200 - 1800 * j / m
                bb, aa = butter(2, [fc * 0.8 / (SR / 2), fc * 1.2 / (SR / 2)], btype="band")
                out[j:j + 2048] = lfilter(bb, aa, seg[j:j + 2048])
            env = np.sin(np.linspace(0, np.pi, m)) * (0.6 + 0.4 * np.sin(np.linspace(0, 40, m)))
            place(buf, out / (np.max(np.abs(out)) + 1e-9) * env * 0.12, ev["scratch"] + 0.5 + k * 3.1, pan=-0.2)
    # hummed lullaby (simple pentatonic tune), soft and close
    if "lullaby" in ev:
        notes = [(392, .6), (440, .6), (392, .6), (330, 1.2), (392, .6), (440, .6), (494, .6), (440, 1.2),
                 (392, .6), (330, .6), (294, .6), (330, 1.8)]
        t = ev["lullaby"]
        for f0, d in notes:
            m = int(SR * d); tt = np.arange(m) / SR
            vib = np.sin(2 * np.pi * 5 * tt) * 3
            tone = sum(np.sin(2 * np.pi * (f0 + vib) * h * tt) / h ** 1.4 for h in (1, 2, 3, 4))
            env = np.minimum(1, tt / 0.08) * np.minimum(1, (d - tt) / 0.15)
            place(buf, tone * env * 0.05, t); t += d
    # heartbeat 68 bpm
    if "heart_on" in ev:
        t, end = ev["heart_on"], ev.get("heart_off", total)
        while t < end:
            place(buf, click(52, 0.25, 18, 0.35), t); place(buf, click(46, 0.25, 20, 0.25), t + 0.28)
            t += 60 / 68
    # rising drone
    if "drone_on" in ev:
        t0 = ev["drone_on"]; m = int((total - t0) * SR); tt = np.arange(m) / SR
        dr = sum(np.sin(2 * np.pi * f * tt) for f in (55, 58.3, 82.4)) / 3 * np.linspace(0, 0.18, m)
        buf[int(t0 * SR):int(t0 * SR) + m, 0] += dr; buf[int(t0 * SR):int(t0 * SR) + m, 1] += dr
    # corridor hum
    if "hum_on" in ev:
        t0 = ev["hum_on"]; m = n - int(t0 * SR); tt = np.arange(m) / SR
        hum = (np.sin(2 * np.pi * 100 * tt) * 0.03 + np.sin(2 * np.pi * 200 * tt) * 0.012) * (1 + 0.3 * np.sin(2 * np.pi * 0.4 * tt))
        buf[int(t0 * SR):, 0] += hum; buf[int(t0 * SR):, 1] += hum
    # scream: shaped band-passed noise with a falling formant, close and wide
    if "scream" in ev:
        d = 1.6; m = int(SR * d)
        seg = rng.standard_normal(m)
        out = np.zeros(m)
        for f0, f1 in ((900, 600), (1500, 1100), (2800, 2200)):
            bb, aa = butter(2, [f0 * 0.85 / (SR / 2), f0 * 1.15 / (SR / 2)], btype="band")
            out += lfilter(bb, aa, seg)
        env = np.minimum(1, np.arange(m) / (0.05 * SR)) * np.exp(-np.arange(m) / (0.9 * SR))
        place(buf, out / np.max(np.abs(out)) * env * 0.55, ev["scream"])
    # knocking: three slow knocks, repeating, getting closer
    if "knock" in ev:
        t = ev["knock"] + 0.6
        for rep in range(3):
            for j in range(3):
                place(buf, click(110, 0.25, 30, 0.35 + 0.1 * rep) + click(220, 0.25, 60, 0.15), t + j * 0.55, pan=-0.3 + 0.3 * rep)
            t += 2.6
    return buf


def load_text_episode(eid):
    """bolumler/<eid>.txt: '#shot x', '#pause n', '#event x', '#say_w text', '#say_c text', '#title t', else narration."""
    beats, title = [], eid
    for line in (ROOT / "bolumler" / f"{eid}.txt").read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("#"):
            cmd, _, arg = line[1:].partition(" ")
            if cmd == "title":
                title = arg
            elif cmd == "pause":
                beats.append(("pause", float(arg)))
            elif cmd in ("shot", "event", "say_w", "say_c", "say_d", "say_p"):
                beats.append((cmd, arg))
        else:
            beats.append(("say", line))
    return {"title": title, "tail": 5.0, "speed": 0.84, "beats": beats}


def build(eid):
    spec = EPISODES[eid] if eid in EPISODES else load_text_episode(eid)
    work = BUILD / eid; work.mkdir(parents=True, exist_ok=True)
    narr, t = [], 0.0
    shots, events = [], []
    for kind, val in spec["beats"]:
        if kind == "shot":
            shots.append((t, val))
        elif kind == "event":
            events.append((val, t))
        elif kind == "pause":
            narr.append(np.zeros(int(SR * val))); t += val
        else:
            x, sr = synth(val, spec.get("speed", 0.88))
            if kind == "say_w":   # the thing's voice: full whisper, quieter
                w = to_sr(full_whisper(x, sr), sr) * 0.7
            elif kind == "say_c":  # Zehra's own voice: clean, no breath layer
                w = to_sr(whisperize(x, sr, 0.0), sr)
            elif kind in ("say_d", "say_p"):  # through a door / over the phone
                from scipy.signal import butter, lfilter
                c = to_sr(whisperize(x, sr, 0.0), sr)
                if kind == "say_d":
                    b_, a_ = butter(3, 900 / (SR / 2)); c = lfilter(b_, a_, c)
                    echo = np.zeros_like(c); d = int(0.045 * SR); echo[d:] = c[:-d] * 0.35; c = c + echo
                    c = c / (np.max(np.abs(c)) + 1e-9) * 0.75
                else:
                    b_, a_ = butter(3, [320 / (SR / 2), 3300 / (SR / 2)], btype="band"); c = lfilter(b_, a_, c)
                    c = np.tanh(c * 2.5); c = c / (np.max(np.abs(c)) + 1e-9) * 0.7
                w = c
            else:
                w = to_sr(whisperize(x, sr), sr)
            narr.append(w); narr.append(np.zeros(int(SR * 0.55)))
            t += len(w) / SR + 0.55
    total = t + spec["tail"]
    voice = np.concatenate(narr + [np.zeros(int(SR * spec["tail"]))])
    voice = np.pad(voice, (0, max(0, int(total * SR) - len(voice))))[: int(total * SR)]
    amb = ambience(total, [(k, v) for k, v in events])
    mix = amb * 0.9
    mix[:, 0] += voice * 0.95; mix[:, 1] += voice * 0.95  # whisper centred and close
    mix /= max(1.0, np.max(np.abs(mix)) / 0.95)
    with wave.open(str(work / "audio.wav"), "wb") as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
        wv.writeframes((mix * 32767).astype(np.int16).tobytes())

    # video: each shot looped for its duration, graded, grained, faded
    segs = []
    for i, (st, name) in enumerate(shots):
        en = shots[i + 1][0] if i + 1 < len(shots) else total
        dur = en - st
        seg = work / f"seg{i:02d}.mp4"
        loop = "breath" if name in ("oda", "yorgan") else "pingpong"
        src = f"{FRAMES}/{name}_%04d.png"
        if loop == "pingpong":
            filt = f"[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1,loop=loop=-1:size=9999,"
        else:
            filt = "[0:v]loop=loop=-1:size=9999,"
        filt += (f"fps=24,trim=duration={dur:.3f},setpts=PTS-STARTPTS,hqdn3d=4:3:6:6,"
                 f"eq=gamma={GAMMA.get(name.rstrip('0123456789'), 1.45)}:contrast=1.04:brightness=0.02:saturation=0.9,"
                 "noise=alls=6:allf=t,vignette=PI/5.5,"
                 f"fade=t=in:st=0:d=0.6,fade=t=out:st={max(0, dur - 0.5):.3f}:d=0.5[v]")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(SHOT_FPS), "-i", src,
                        "-filter_complex", filt, "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                        "-crf", "18", str(seg)], check=True)
        segs.append(seg)
    (work / "segs.txt").write_text("".join(f"file '{s}'\n" for s in segs))
    OUT.mkdir(exist_ok=True)
    out = OUT / f"{eid}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(work / "segs.txt"),
                    "-i", str(work / "audio.wav"), "-c:v", "libx264", "-crf", "30", "-maxrate", "320k", "-bufsize", "640k",
                    "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "80k", "-movflags", "+faststart",
                    "-shortest", str(out)], check=True)
    print(json.dumps({"episode": eid, "seconds": round(total, 1), "shots": shots, "file": str(out)}))


if __name__ == "__main__":
    for e in sys.argv[1:]:
        build(e)
