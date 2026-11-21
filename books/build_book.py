"""Book 1: "300 Mate-in-2 Chess Puzzles" — select, re-verify and lay out puzzles from our own generator.

Every puzzle is re-checked independently with python-chess:
  * the side to move has NO mate in 1,
  * exactly ONE first move forces mate in 2 against every defence (unique key),
  * the stored solution line ends in checkmate.
Run with the venv that has python-chess:  /opt/tts/bin/python books/build_mate_in_2.py
Outputs books/out/mate-in-2-interior.html and puzzles.json (the PDF is printed by render_book.mjs).
"""
import glob
import json
from multiprocessing import Pool
from pathlib import Path

import chess
import chess.svg

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).parent / "out"
import sys
MODE = sys.argv[1] if len(sys.argv) > 1 else "mate2"      # mate1 | mate2
SLUG = sys.argv[2] if len(sys.argv) > 2 else "mate-in-2"
TITLE = sys.argv[3] if len(sys.argv) > 3 else "300 Mate-in-2<br>Chess Puzzles"
SUB = sys.argv[4] if len(sys.argv) > 4 else "Verified tactics for improving players<br>Full solutions included"
EXCLUDE = set()
for f in sys.argv[5:]:
    EXCLUDE |= {p["id"] for p in json.load(open(f))}
N = 300


def mate_in_1(b: chess.Board):
    for m in b.legal_moves:
        if b.gives_check(m):
            b.push(m)
            mate = b.is_checkmate()
            b.pop()
            if mate:
                return True
    return False


def forces_mate_in_2(b: chess.Board, m: chess.Move) -> bool:
    b.push(m)
    try:
        if b.is_checkmate():
            return True
        replies = list(b.legal_moves)
        if not replies:
            return False  # stalemate
        for r in replies:
            b.push(r)
            ok = mate_in_1(b)
            b.pop()
            if not ok:
                return False
        return True
    finally:
        b.pop()


def verify(p):
    pid, fen, moves, rating, themes = p
    b = chess.Board(fen)
    mv = moves.split()
    b.push_uci(mv[0])  # opponent's last move sets up the puzzle
    start = b.copy()
    if MODE == "mate1":
        mates = []
        for m in b.legal_moves:
            b.push(m)
            if b.is_checkmate():
                mates.append(m)
            b.pop()
        if len(mates) != 1 or mates[0].uci() != mv[1]:
            return None
        return {"id": pid, "fen": start.fen(), "rating": rating, "turn": "White" if start.turn else "Black",
                "san": [start.san(mates[0])], "last": mv[0]}
    if mate_in_1(b):
        return None
    keys = [m for m in b.legal_moves if forces_mate_in_2(b, m)]
    if len(keys) != 1 or keys[0].uci() != mv[1]:
        return None
    line = start.copy()
    san = []
    for u in mv[1:]:
        san.append(line.san(chess.Move.from_uci(u)))
        line.push_uci(u)
    if not line.is_checkmate():
        return None
    return {"id": pid, "fen": start.fen(), "rating": rating, "turn": "White" if start.turn else "Black",
            "san": san, "last": mv[0]}


def solution_text(p):
    s = p["san"]
    if len(s) == 1:
        return f"1. {s[0]}" if p["turn"] == "White" else f"1... {s[0]}"
    if p["turn"] == "White":
        return f"1. {s[0]} {s[1]} 2. {s[2]}"
    return f"1... {s[0]} 2. {s[1]} {s[2]}"


def board_svg(p):
    b = chess.Board(p["fen"])
    last = chess.Move.from_uci(p["last"])
    return chess.svg.board(b, orientation=b.turn, size=360, coordinates=True, lastmove=last,
                           colors={"square light": "#F1F1F1", "square dark": "#BDBDBD",
                                   "square light lastmove": "#DADADA", "square dark lastmove": "#A6A6A6",
                                   "margin": "#FFFFFF", "coord": "#333333"})


def main():
    cands = []
    for f in sorted(glob.glob(str(ROOT / "content/puzzles/*/*.json"))):
        for p in json.load(open(f))["puzzles"]:
            if ("mateIn1" if MODE == "mate1" else "mateIn2") in p[4].split() and p[0] not in EXCLUDE:
                cands.append(p)
    cands.sort(key=lambda p: p[3])
    step = max(1, len(cands) // 700)
    pool_in = cands[::step]
    with Pool(4) as pool:
        ok = [r for r in pool.map(verify, pool_in, chunksize=8) if r]
    print(f"candidates {len(cands)}, checked {len(pool_in)}, verified {len(ok)}")
    # even spread across the difficulty range
    pick = [ok[round(i * (len(ok) - 1) / (N - 1))] for i in range(N)]
    assert len({p["id"] for p in pick}) == N, "duplicate puzzle picked"
    for i, p in enumerate(pick, 1):
        p["n"] = i
    OUT.mkdir(exist_ok=True)
    json.dump(pick, open(OUT / f"{SLUG}-puzzles.json", "w"), indent=0)

    parts = [("Part 1", "Warm-up", 1, 100), ("Part 2", "Building strength", 101, 200), ("Part 3", "Challenge", 201, 300)]
    pages = []
    pages.append(f'<section class="page title"><div><p class="kicker">ROWWISE CHESS</p><h1>{TITLE}</h1>'
                 f'<p class="sub">{SUB}</p></div></section>')
    pages.append(f'<section class="page copy"><div class="bottom"><p>{TITLE.replace("<br>", " ")}</p><p>© 2026 Rowwise Chess. All rights reserved.</p>'
                 '<p>Every puzzle was generated by our own chess engine and independently re-verified: '
                 + ("exactly one move gives checkmate." if MODE == "mate1" else "no mate in one exists, exactly one first move forces mate in two against every defence, and the printed solution ends in checkmate.")
                 + '</p>'
                 '<p>Chess piece graphics: Colin M.L. Burnett, used under the BSD license.</p></div></section>')
    pages.append('<section class="page text"><h2>How to use this book</h2>'
                 '<p>Each diagram shows a real game position. The side to move is printed under the diagram and the board is shown from that side. '
                 'The shaded squares mark the opponent\'s last move.</p>'
                 + ('<p>Find the one move that gives checkmate right now. Every puzzle has exactly one mating move.</p>' if MODE == "mate1" else
                    '<p>Find a first move that forces checkmate on your next move, whatever the opponent replies. Every puzzle has exactly one such move.</p>') +
                 '<p>Write your answer down before checking the solutions at the back. Puzzles get harder through the book: '
                 'Part 1 warms you up, Part 2 builds strength, Part 3 is a real challenge.</p>'
                 '<p class="tip">Checks, captures, threats: look at every forcing move first. Then ask what your opponent can do after each one.</p></section>')
    for code, name, a, z in parts:
        pages.append(f'<section class="page divider"><div><p class="kicker">{code}</p><h2>{name}</h2><p>Puzzles {a}–{z}</p></div></section>')
        chunk = pick[a - 1:z]
        for i in range(0, len(chunk), 6):
            cells = "".join(f'<figure><div class="bd">{board_svg(p)}</div><figcaption><b>{p["n"]}</b> {p["turn"]} to move</figcaption></figure>'
                            for p in chunk[i:i + 6])
            pages.append(f'<section class="page grid">{cells}</section>')
    pages.append('<section class="page divider"><div><p class="kicker">ANSWERS</p><h2>Solutions</h2></div></section>')
    for i in range(0, N, 50):
        items = "".join(f'<li><b>{p["n"]}</b> {solution_text(p)}</li>' for p in pick[i:i + 50])
        pages.append(f'<section class="page sol"><ol>{items}</ol></section>')

    css = """
@page{size:6in 9in;margin:0}
*{margin:0;box-sizing:border-box}
body{font-family:Inter,sans-serif;color:#111}
.page{width:6in;height:9in;padding:0.55in 0.5in 0.55in 0.65in;page-break-after:always;position:relative;overflow:hidden}
.page:nth-child(even){padding:0.55in 0.65in 0.55in 0.5in}
.title{display:flex;align-items:center}.title h1{font-size:34pt;line-height:1.05;font-weight:800;letter-spacing:-1px;margin:10pt 0}
.kicker{font-size:9pt;letter-spacing:.18em;font-weight:700;color:#555}
.sub{font-size:12pt;color:#333}
.copy .bottom{position:absolute;bottom:0.6in;left:0.65in;right:0.6in;font-size:8.5pt;color:#333;display:flex;flex-direction:column;gap:6pt}
.text h2{font-size:18pt;margin-bottom:12pt}.text p{font-size:10.5pt;line-height:1.55;margin-bottom:9pt}
.tip{border-left:3px solid #111;padding-left:9pt;font-weight:600}
.divider{display:flex;align-items:center;justify-content:center;text-align:center}.divider h2{font-size:28pt;font-weight:800;margin:6pt 0}
.grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:0.12in 0.2in}
figure{display:flex;flex-direction:column;align-items:center;justify-content:center}
.bd svg{width:2.25in;height:2.25in;display:block}
figcaption{font-size:9pt;margin-top:3pt}figcaption b{font-size:10pt;margin-right:4pt}
.sol ol{list-style:none;columns:2;column-gap:0.3in;font-size:8.6pt;line-height:1.62;font-family:'JetBrains Mono',monospace}
.sol b{display:inline-block;width:2.2em;font-family:Inter,sans-serif}
"""
    html = f'<!doctype html><meta charset="utf-8"><title>{TITLE.replace("<br>", " ")}</title><style>{css}</style>' + "".join(pages)
    (OUT / f"{SLUG}-interior.html").write_text(html)
    print("pages", len(pages), "ratings", pick[0]["rating"], "→", pick[-1]["rating"])


if __name__ == "__main__":
    main()
