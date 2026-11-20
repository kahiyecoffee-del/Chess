"""Rowwise video pipeline: spreadsheet-scene renderer, local TTS narration, subtitles, assembly.

A video spec is a list of segments. Each segment has a chapter title and a list of beats:
    Beat(say="text spoken", sub="optional subtitle text", scene=<Scene or None>)
A beat's scene stays on screen until a later beat sets a new one.

Narration: Kokoro-82M (Apache-2.0), run locally in /opt/tts (see media/README.md).
"""
from __future__ import annotations

import json
import os
import subprocess
import wave
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1920, 1080, 30
INK, PAPER, GREEN, CORAL, AMBER, LINE = "#13212E", "#F6F4EE", "#1FA971", "#E5533D", "#F2B33D", "#D9D5CA"
WRONG_BG, RIGHT_BG, HIL_BG, HEAD_BG = "#FBE3DF", "#DDF3E9", "#FDF1D6", "#E9E6DD"
FONT = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-{}.ttf"


def font(weight: str, size: int, mono: bool = False):
    return ImageFont.truetype((MONO if mono else FONT).format(weight), size)


# ---------------------------------------------------------------- scenes
@dataclass
class Sheet:
    """A generic spreadsheet view (not a copy of any vendor UI)."""
    name: str
    widths: dict[str, int]                       # column letter -> px, in display order
    cells: dict[str, object]                     # "A1" -> value
    rows: int = 11
    formulas: dict[str, str] = field(default_factory=dict)
    select: str | None = None                    # active cell; its formula is shown in the bar
    fills: dict[str, str] = field(default_factory=dict)      # cell -> bg colour
    outlines: dict[str, str] = field(default_factory=dict)   # cell -> outline colour
    caption: str | None = None                   # lower-third key phrase
    caption_color: str = AMBER
    show_spaces: bool = False                    # render trailing spaces as a visible marker


@dataclass
class Card:
    title: str
    lines: list[str] = field(default_factory=list)
    kicker: str | None = None
    dark: bool = True
    numbered: bool = False


@dataclass
class Clip:
    path: Path                                   # pre-rendered mp4, frozen on last frame if narration runs longer


Scene = Sheet | Card | Clip


def _is_num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _fmt(v) -> str:
    if isinstance(v, float) and v.is_integer():
        return f"{v:,.0f}"
    return str(v)


def draw_sheet(s: Sheet) -> Image.Image:
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    f_cell, f_head, f_hdr = font("Medium", 34), font("SemiBold", 26), font("Bold", 30)
    f_bar, f_ref = font("Medium", 38, mono=True), font("SemiBold", 30)

    # formula bar
    ref = s.select or ""
    d.rounded_rectangle((60, 40, 260, 110), 10, fill="white", outline=LINE, width=3)
    d.text((80, 58), ref, font=f_ref, fill=INK)
    d.rounded_rectangle((280, 40, W - 60, 110), 10, fill="white", outline=LINE, width=3)
    d.text((300, 55), "fx", font=font("SemiBold", 34), fill="#8A877F")
    shown = s.formulas.get(ref, "" if s.cells.get(ref) is None else _fmt(s.cells.get(ref))) if ref else ""
    d.text((370, 52), shown, font=f_bar, fill=INK)

    # grid geometry
    top, left, rh, hdr_w = 150, 60, 62, 64
    cols = list(s.widths)
    scale = min(1.3, (W - 2 * left - hdr_w) / sum(s.widths.values()))
    xs = [left + hdr_w]
    for c in cols:
        xs.append(xs[-1] + round(s.widths[c] * scale))
    # column headers
    d.rectangle((left, top, xs[-1], top + 44), fill=HEAD_BG)
    for i, c in enumerate(cols):
        d.text(((xs[i] + xs[i + 1]) / 2, top + 22), c, font=f_head, fill="#6B6860", anchor="mm")
        d.line((xs[i], top, xs[i], top + 44 + rh * s.rows), fill=LINE, width=2)
    d.line((xs[-1], top, xs[-1], top + 44 + rh * s.rows), fill=LINE, width=2)
    y0 = top + 44
    for r in range(1, s.rows + 1):
        y = y0 + rh * (r - 1)
        d.rectangle((left, y, left + hdr_w, y + rh), fill=HEAD_BG)
        d.text((left + hdr_w / 2, y + rh / 2), str(r), font=f_head, fill="#6B6860", anchor="mm")
        for i, c in enumerate(cols):
            ref_c = f"{c}{r}"
            x1, x2 = xs[i], xs[i + 1]
            bg = s.fills.get(ref_c, "white")
            d.rectangle((x1, y, x2, y + rh), fill=bg, outline=LINE, width=1)
            v = s.cells.get(ref_c)
            if v is None:
                continue
            txt = _fmt(v)
            fnt = f_hdr if r == 1 else f_cell
            col = CORAL if isinstance(v, str) and v.startswith("#") else INK
            if s.show_spaces and isinstance(v, str) and v.endswith(" "):
                txt = v.rstrip() + "␣"
                col = CORAL
            if _is_num(v) or (isinstance(v, str) and v.startswith("$")):
                d.text((x2 - 16, y + rh / 2), txt, font=fnt, fill=col, anchor="rm")
            elif isinstance(v, str) and v.startswith("#"):
                d.text(((x1 + x2) / 2, y + rh / 2), txt, font=fnt, fill=col, anchor="mm")
            else:
                d.text((x1 + 16, y + rh / 2), _clip(d, txt, fnt, x2 - x1 - 24), font=fnt, fill=col, anchor="lm")
    # outlines and selection
    def box(ref_c):
        c, r = ref_c[0], int(ref_c[1:])
        i = cols.index(c)
        return (xs[i], y0 + rh * (r - 1), xs[i + 1], y0 + rh * r)
    if s.select and s.select[0] in cols and s.select not in s.outlines:
        d.rectangle(box(s.select), outline=INK, width=4)
    for ref_c, colr in s.outlines.items():
        d.rectangle(box(ref_c), outline=colr, width=7)

    # sheet tab
    ty = y0 + rh * s.rows + 14
    tw = d.textlength(s.name, font=font("SemiBold", 28)) + 48
    d.rounded_rectangle((left, ty, left + tw, ty + 50), 8, fill="white", outline=LINE, width=2)
    d.text((left + 24, ty + 25), s.name, font=font("SemiBold", 28), fill=INK, anchor="lm")

    if s.caption:
        _lower_third(d, s.caption, s.caption_color)
    return im


def _clip(d, txt, fnt, width):
    if d.textlength(txt, font=fnt) <= width:
        return txt
    while txt and d.textlength(txt + "…", font=fnt) > width:
        txt = txt[:-1]
    return txt + "…"


def _lower_third(d, text, color):
    f = font("Bold", 44)
    tw = d.textlength(text, font=f)
    x2 = W - 60
    d.rounded_rectangle((x2 - tw - 64, H - 130, x2, H - 46), 16, fill=INK)
    d.text((x2 - 32, H - 88), text, font=f, fill=color, anchor="rm")


def draw_card(c: Card) -> Image.Image:
    bg, fg = (INK, PAPER) if c.dark else (PAPER, INK)
    im = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(im)
    x, y = 180, 200
    if c.kicker:
        d.text((x, y), c.kicker.upper(), font=font("Bold", 40), fill=AMBER)
        y += 80
    for line in _wrap(d, c.title, font("ExtraBold", 96), W - 2 * x):
        d.text((x, y), line, font=font("ExtraBold", 96), fill=fg)
        y += 112
    y += 40
    f = font("Medium", 50)
    for i, line in enumerate(c.lines, 1):
        prefix = f"{i}" if c.numbered else "•"
        d.text((x, y), prefix, font=font("Bold", 50), fill=AMBER)
        for j, part in enumerate(_wrap(d, line, f, W - 2 * x - 90)):
            d.text((x + 90, y), part, font=f, fill=fg)
            y += 66
        y += 22
    return im


def _wrap(d, text, fnt, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=fnt) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    return lines + ([cur] if cur else [])


# ---------------------------------------------------------------- spec
@dataclass
class Beat:
    say: str
    sub: str | None = None
    scene: Scene | None = None


@dataclass
class Segment:
    chapter: str
    beats: list[Beat]


# ---------------------------------------------------------------- narration
TTS_PY = "/opt/tts/bin/python"
TTS_SCRIPT = r'''
import json, sys, numpy as np, soundfile as sf
from kokoro import KPipeline
items = json.load(open(sys.argv[1])); voice = sys.argv[2]; speed = float(sys.argv[3])
p = KPipeline(lang_code=voice[0])
for it in items:
    audio = np.concatenate([a for _, _, a in p(it["text"], voice=voice, speed=speed)])
    sf.write(it["out"], audio, 24000, subtype="PCM_16")
'''


def synthesize(beats: list[tuple[str, Path]], voice: str, speed: float, work: Path) -> None:
    todo = [{"text": t, "out": str(p)} for t, p in beats if not p.exists()]
    if not todo:
        return
    (work / "tts_jobs.json").write_text(json.dumps(todo))
    (work / "tts_run.py").write_text(TTS_SCRIPT)
    subprocess.run([TTS_PY, str(work / "tts_run.py"), str(work / "tts_jobs.json"), voice, str(speed)],
                   check=True, env={**os.environ, "HF_HUB_OFFLINE": "1"})


def wav_seconds(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


# ---------------------------------------------------------------- assembly
GAP_BEAT, GAP_SEGMENT, LEAD_IN = 0.30, 0.70, 0.40


def _ts(t: float) -> str:
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}".replace(",1000", ",999")


def build(segments: list[Segment], out_dir: Path, voice: str = "af_heart", speed: float = 1.0,
          end_card: Card | None = None, end_seconds: float = 15.0, name: str = "video") -> dict:
    work = out_dir / "build"
    (work / "tts").mkdir(parents=True, exist_ok=True)
    (work / "scenes").mkdir(exist_ok=True)

    # 1. narration per beat (cached by content hash)
    import hashlib
    jobs = []
    for seg in segments:
        for b in seg.beats:
            h = hashlib.sha1(f"{voice}|{speed}|{b.say}".encode()).hexdigest()[:16]
            jobs.append((b.say, work / "tts" / f"{h}.wav"))
    synthesize(jobs, voice, speed, work)

    # 2. timeline
    t = LEAD_IN
    timeline, subs, chapters, audio_parts = [], [], [], [("silence", LEAD_IN)]
    scene, ji = None, 0
    for si, seg in enumerate(segments):
        chapters.append((t if si else 0.0, seg.chapter))
        for bi, b in enumerate(seg.beats):
            wav = jobs[ji][1]; ji += 1
            dur = wav_seconds(wav)
            if b.scene is not None:
                scene = b.scene
            timeline.append((t, scene))
            subs.append((t, t + dur, b.sub or b.say))
            audio_parts.append(("wav", wav))
            t += dur
            gap = GAP_SEGMENT if bi == len(seg.beats) - 1 else GAP_BEAT
            audio_parts.append(("silence", gap))
            t += gap
    if end_card:
        timeline.append((t, end_card))
        audio_parts.append(("silence", end_seconds))
        t += end_seconds
    total = t

    # 3. audio track
    sr = 24000
    pcm = bytearray()
    for kind, v in audio_parts:
        if kind == "silence":
            pcm += b"\x00\x00" * int(round(v * sr))
        else:
            with wave.open(str(v)) as w:
                pcm += w.readframes(w.getnframes())
    raw = work / "narration_raw.wav"
    with wave.open(str(raw), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(bytes(pcm))

    # 4. video pieces (frame-accurate from cumulative times)
    merged = []
    for start, sc in timeline:
        if merged and merged[-1][1] is sc:
            continue
        merged.append((start, sc))
    pieces = []
    for i, (start, sc) in enumerate(merged):
        end = merged[i + 1][0] if i + 1 < len(merged) else total
        start_f = 0 if i == 0 else round(start * FPS)
        frames = round(end * FPS) - start_f
        piece = work / "scenes" / f"p{i:03d}.mp4"
        enc = ["-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", str(FPS), "-crf", "18",
               "-frames:v", str(frames)]
        if isinstance(sc, Clip):
            cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(sc.path),
                   "-vf", f"tpad=stop_mode=clone:stop_duration={frames / FPS + 1}", *enc, str(piece)]
        else:
            png = work / "scenes" / f"p{i:03d}.png"
            (draw_sheet(sc) if isinstance(sc, Sheet) else draw_card(sc)).save(png)
            cmd = ["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS), "-i", str(png), *enc, str(piece)]
        subprocess.run(cmd, check=True)
        pieces.append(piece)
    lst = work / "pieces.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in pieces))
    silent = work / "video_silent.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(silent)], check=True)

    # 5. mux with loudness normalisation (-14 LUFS), AAC 48 kHz
    out = out_dir / f"{name}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(silent), "-i", str(raw),
                    "-af", "highpass=f=70,loudnorm=I=-13:TP=-1.5:LRA=11,aresample=48000",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
                    "-movflags", "+faststart", "-shortest", str(out)], check=True)

    # 6. subtitles, chapters, narration text
    srt = out_dir / f"{name}.en.srt"
    srt.write_text("".join(f"{i}\n{_ts(a)} --> {_ts(b)}\n{txt}\n\n" for i, (a, b, txt) in enumerate(subs, 1)))
    chap = "\n".join(f"{int(c // 60)}:{int(c % 60):02d} {title}" for c, title in chapters)
    (out_dir / "chapters.txt").write_text(chap + "\n")
    (out_dir / "narration.txt").write_text(
        "\n\n".join(f"## {s.chapter}\n" + " ".join(b.say for b in s.beats) for s in segments) + "\n")
    return {"video": out, "srt": srt, "seconds": total, "chapters": chap}
