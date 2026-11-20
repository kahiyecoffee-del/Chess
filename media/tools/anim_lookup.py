"""Rowwise signature 'animated grid': approximate-match VLOOKUP walking a sorted table.

Renders 1920x1080 @30fps frames with PIL and encodes with ffmpeg.
Run: python3 media/tools/anim_lookup.py <out.mp4>
"""
import subprocess
import sys
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1920, 1080, 30
INK, PAPER, GREEN, CORAL, AMBER, LINE = "#13212E", "#F6F4EE", "#1FA971", "#E5533D", "#F2B33D", "#D9D5CA"
F = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf"
f_cell = ImageFont.truetype(F.format("Medium"), 40)
f_head = ImageFont.truetype(F.format("Bold"), 34)
f_cap = ImageFont.truetype(F.format("SemiBold"), 50)
f_mono = ImageFont.truetype(MONO, 54)

ROWS = [(1001, "USB-C hub", 45), (1002, "Monitor arm", 89), (1003, "Laptop stand", 49),
        (1005, "Docking station", 189), (1006, "Cable kit", 15), (1007, "Desk lamp", 39),
        (1008, "Headset", 119), (1009, "Keyboard", 79), (1010, "Webcam", 64)]
X0, Y0, RH = 240, 250, 78
COLS = [(X0, 220, "Product ID"), (X0 + 220, 440, "Product"), (X0 + 660, 200, "Price")]
LOOKUP = 1004


def lerp(a, b, t):
    return a + (b - a) * max(0.0, min(1.0, t))


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def frame(t: float) -> Image.Image:
    """t in seconds. Timeline: 0-1 intro, 1-4 pointer walks rows 0..3, 4-5 overshoot flash, 5-6 step back, 6-8 result."""
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    # formula bar
    d.rounded_rectangle((X0, 90, X0 + 1440, 180), 16, fill="white", outline=INK, width=4)
    d.text((X0 + 30, 103), "=VLOOKUP(1004, A2:C10, 3)", font=f_mono, fill=INK)
    # header
    for x, w, name in COLS:
        d.rectangle((x, Y0, x + w, Y0 + RH), fill=INK)
        d.text((x + 20, Y0 + 20), name, font=f_head, fill=PAPER)
    # pointer position (row index as float)
    if t < 1:
        pos = -1
    elif t < 4:
        pos = lerp(0, 3, ease((t - 1) / 3))
    elif t < 5:
        pos = 3
    else:
        pos = lerp(3, 2, ease((t - 5) / 0.8))
    for i, (pid, name, price) in enumerate(ROWS):
        y = Y0 + RH * (i + 1)
        fill = "white"
        if pos >= 0 and abs(pos - i) < 0.5:
            fill = "#FBE3DF" if (4 <= t < 5 and i == 3) else "#FDF1D6"
        for (x, w, _), val in zip(COLS, (pid, name, f"${price}")):
            d.rectangle((x, y, x + w, y + RH), fill=fill, outline=LINE, width=2)
            d.text((x + 20, y + 18), str(val), font=f_cell, fill=INK)
    # result highlight
    if t >= 6:
        y = Y0 + RH * 3
        d.rectangle((COLS[2][0], y, COLS[2][0] + 200, y + RH), outline=CORAL, width=8)
    # lookup chip + caption (right side)
    cx = X0 + 980
    d.rounded_rectangle((cx, Y0, cx + 520, Y0 + 130), 18, fill=INK)
    d.text((cx + 30, Y0 + 32), f"looking for {LOOKUP}", font=f_cap, fill=AMBER)
    caps = [
        (1.0, "wants the largest ID that is ≤ 1004…"),
        (4.0, "1005 is bigger than 1004 →"),
        (5.0, "steps back to the last one ≤ 1004"),
        (6.0, "returns $49. No error."),
    ]
    text = next((c for s, c in reversed(caps) if t >= s), "")
    col = CORAL if t >= 6 else INK
    yy = Y0 + 190
    for line in _wrap(d, text, f_cap, 520):
        d.text((cx, yy), line, font=f_cap, fill=col)
        yy += 66
    return im


def _wrap(d, text, font, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if d.textlength(test, font=font) <= width:
            cur = test
        else:
            lines.append(cur)
            cur = w
    return lines + ([cur] if cur else [])


def main(out: Path) -> None:
    dur = 9.0
    with tempfile.TemporaryDirectory() as tmp:
        for n in range(int(dur * FPS)):
            frame(n / FPS).save(f"{tmp}/f{n:05d}.png")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", f"{tmp}/f%05d.png",
                        "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "18", str(out)], check=True)
    frame(7.0).save(out.with_suffix(".png"))
    print(out)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
