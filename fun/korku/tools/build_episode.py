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
from fisilti_tts import synth, whisperize  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
FRAMES = BUILD / "frames"
OUT = ROOT / "player"
SR = 44100
SHOT_FPS = 12

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


def build(eid):
    spec = EPISODES[eid]
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
            x, sr = synth(val, 0.88)
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
                 "eq=gamma=1.45:contrast=1.04:brightness=0.02:saturation=0.9,"
                 "noise=alls=9:allf=t,vignette=PI/5.5,"
                 f"fade=t=in:st=0:d=0.6,fade=t=out:st={max(0, dur - 0.5):.3f}:d=0.5[v]")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(SHOT_FPS), "-i", src,
                        "-filter_complex", filt, "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                        "-crf", "18", str(seg)], check=True)
        segs.append(seg)
    (work / "segs.txt").write_text("".join(f"file '{s}'\n" for s in segs))
    OUT.mkdir(exist_ok=True)
    out = OUT / f"{eid}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(work / "segs.txt"),
                    "-i", str(work / "audio.wav"), "-c:v", "libx264", "-crf", "28", "-maxrate", "650k", "-bufsize", "1300k",
                    "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
                    "-shortest", str(out)], check=True)
    print(json.dumps({"episode": eid, "seconds": round(total, 1), "shots": shots, "file": str(out)}))


if __name__ == "__main__":
    for e in sys.argv[1:]:
        build(e)
