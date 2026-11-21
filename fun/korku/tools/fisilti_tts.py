"""Turkish TTS (Piper, tr_TR-dfki-medium) -> whispered voice (WORLD vocoder with voicing removed).

Usage (venv with piper + pyworld):
  /opt/tts/bin/python fisilti_tts.py <text_file_or_-> <out.wav> [--speed 0.9]
Lines are synthesised one by one; blank lines become pauses. A line "[..N]" inserts N seconds of silence.
"""
import re
import sys
import wave
from pathlib import Path

import numpy as np
import pyworld as pw
from piper import PiperVoice

MODEL = "/opt/piper-voices/tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx"
_voice = None


def voice():
    global _voice
    if _voice is None:
        _voice = PiperVoice.load(MODEL)
    return _voice


def synth(text: str, speed: float) -> tuple[np.ndarray, int]:
    v = voice()
    from piper import SynthesisConfig
    cfg = SynthesisConfig(length_scale=1.0 / speed, noise_scale=0.5, noise_w_scale=0.6)
    chunks = [c.audio_float_array for c in v.synthesize(text, syn_config=cfg)]
    return np.concatenate(chunks).astype(np.float64), v.config.sample_rate


def whisperize(x: np.ndarray, sr: int) -> np.ndarray:
    f0, t = pw.harvest(x, sr)
    sp = pw.cheaptrick(x, f0, t, sr)
    ap = pw.d4c(x, f0, t, sr)
    y = pw.synthesize(np.zeros_like(f0), sp, np.ones_like(ap), sr)  # no pitch, fully aperiodic = whisper
    # gentle high-shelf lift for breathiness, then normalise
    y = np.append(y[0], y[1:] - 0.85 * y[:-1]) * 0.6 + y * 0.4
    return y / (np.max(np.abs(y)) + 1e-9) * 0.85


def render(lines: list[str], speed: float):
    out, sr = [], None
    for line in lines:
        line = line.strip()
        m = re.fullmatch(r"\[\.\.(\d+(?:\.\d+)?)\]", line)
        if not line or m:
            secs = float(m.group(1)) if m else 0.8
            out.append(np.zeros(int((sr or 22050) * secs)))
            continue
        x, sr = synth(line, speed)
        out.append(whisperize(x, sr))
        out.append(np.zeros(int(sr * 0.45)))
    return np.concatenate(out), sr


def main():
    src, dst = sys.argv[1], sys.argv[2]
    speed = float(sys.argv[sys.argv.index("--speed") + 1]) if "--speed" in sys.argv else 0.9
    text = sys.stdin.read() if src == "-" else Path(src).read_text()
    y, sr = render(text.splitlines(), speed)
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16)
    with wave.open(dst, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
    print(dst, f"{len(y) / sr:.1f}s")


if __name__ == "__main__":
    main()
