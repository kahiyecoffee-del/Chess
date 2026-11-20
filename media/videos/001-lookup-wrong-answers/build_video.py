"""LF1 — VLOOKUP vs XLOOKUP: 4 ways your lookup silently returns the wrong answer.

Every value shown on screen comes from rowwise-lookups-practice.xlsx (recalculated and checked;
XLOOKUP results follow Microsoft's documented defaults). Run with the system python:
    python3 media/videos/001-lookup-wrong-answers/build_video.py
"""
import sys
from dataclasses import replace
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "tools"))
from rowwise_video import (AMBER, CORAL, GREEN, HIL_BG, RIGHT_BG, WRONG_BG, Beat, Card, Clip, Segment,  # noqa: E402
                           Sheet, build)

PRICES = [(1007, "Desk lamp", 39), (1002, "Monitor arm", 89), (1010, "Webcam", 64), (1001, "USB-C hub", 45),
          (1009, "Keyboard", 79), (1004, "Mouse", 29), (1008, "Headset", 119), (1003, "Laptop stand", 49),
          (1006, "Cable kit", 15), (1005, "Docking station", 189)]


def table(rows, cols="ABC", start=2, header=("ID", "Product", "Price")):
    cells = {f"{c}1": h for c, h in zip(cols, header)}
    for i, row in enumerate(rows, start):
        for c, v in zip(cols, row):
            cells[f"{c}{i}"] = v
    return cells


def S(base: Sheet, **kw) -> Sheet:
    """Copy a sheet with changes (dicts are merged, not replaced, for cells/fills/outlines/formulas)."""
    out = replace(base)
    for k, v in kw.items():
        if k in ("cells", "fills", "outlines", "formulas"):
            merged = dict(getattr(base, k)); merged.update(v); setattr(out, k, merged)
        else:
            setattr(out, k, v)
    return out


# ---------------------------------------------------------------- case 1 sheets
sorted_rows = sorted(p for p in PRICES if p[0] != 1004)
c1 = Sheet("1 Approximate default", {"A": 190, "B": 280, "C": 130, "D": 50, "E": 190, "F": 290, "G": 290},
           {**table(sorted_rows), "E1": "Find ID", "F1": "3 arguments",
            "E2": 1007, "E3": 1004, "E4": 1012, "F2": 39, "F3": 49, "F4": 64},
           formulas={"F2": "=VLOOKUP(E2,$A$2:$C$10,3)", "F3": "=VLOOKUP(E3,$A$2:$C$10,3)", "F4": "=VLOOKUP(E4,$A$2:$C$10,3)",
                     "G2": "=VLOOKUP(E2,$A$2:$C$10,3,FALSE)", "G3": "=VLOOKUP(E3,$A$2:$C$10,3,FALSE)",
                     "G4": "=VLOOKUP(E4,$A$2:$C$10,3,FALSE)"})
c1_fixed = S(c1, cells={"G1": "With FALSE", "G2": 39, "G3": "#N/A", "G4": "#N/A"},
             fills={"G2": RIGHT_BG, "G3": RIGHT_BG, "G4": RIGHT_BG})

# ---------------------------------------------------------------- case 2 sheets
c2_before = Sheet("2 Inserted column", {"A": 180, "B": 260, "C": 130, "D": 40, "E": 180, "F": 300, "G": 230, "H": 40},
                  {**table(PRICES), "E1": "Find ID", "F1": "VLOOKUP col 3", "E2": 1007, "E3": 1004,
                   "F2": 39, "F3": 29},
                  formulas={"F2": "=VLOOKUP(E2,$A$2:$C$11,3,FALSE)", "F3": "=VLOOKUP(E3,$A$2:$C$11,3,FALSE)"})
c2_after = Sheet("2 Inserted column", {"A": 110, "B": 220, "C": 250, "D": 120, "E": 30, "F": 150, "G": 260, "H": 190},
                 {**table([(p, "Accessories", n, pr) for p, n, pr in PRICES], cols="ABCD",
                          header=("ID", "Category", "Product", "Price")),
                  "F1": "Find ID", "G1": "VLOOKUP col 3", "F2": 1007, "F3": 1004,
                  "G2": "Desk lamp", "G3": "Mouse"},
                 formulas={"G2": "=VLOOKUP(F2,$A$2:$D$11,3,FALSE)", "G3": "=VLOOKUP(F3,$A$2:$D$11,3,FALSE)",
                           "H2": "=XLOOKUP(F2,$A$2:$A$11,$D$2:$D$11)", "H3": "=XLOOKUP(F3,$A$2:$A$11,$D$2:$D$11)"},
                 fills={f"B{r}": HIL_BG for r in range(1, 12)})
c2_x = S(c2_after, cells={"H1": "XLOOKUP", "H2": 39, "H3": 29}, fills={"H2": RIGHT_BG, "H3": RIGHT_BG})

# ---------------------------------------------------------------- case 3 sheets
dup_rows = [("ACME", "2026-01-05", "Basic"), ("Birch", "2026-02-11", "Pro"), ("ACME", "2026-06-20", "Pro"),
            ("Cobalt", "2026-03-02", "Basic"), ("ACME", "2026-10-01", "Enterprise")]
c3 = Sheet("3 Duplicates", {"A": 200, "B": 220, "C": 220, "D": 40, "E": 190, "F": 300, "G": 300},
           {**table(dup_rows, header=("Customer", "Date", "Plan")), "E1": "Customer", "F1": "First match",
            "E2": "ACME", "F2": "Basic"}, rows=7,
           formulas={"F2": '=XLOOKUP(E2,$A$2:$A$6,$C$2:$C$6)', "G2": '=XLOOKUP(E2,$A$2:$A$6,$C$2:$C$6,"not found",0,-1)'})
c3_last = S(c3, cells={"G1": "Last match", "G2": "Enterprise"}, fills={"G2": RIGHT_BG, "A6": HIL_BG, "B6": HIL_BG, "C6": HIL_BG})

# ---------------------------------------------------------------- case 4 sheets
c4 = Sheet("4 Text vs number", {"A": 180, "B": 260, "C": 120, "D": 40, "E": 300, "F": 230, "G": 280},
           {**table(PRICES), "E1": "ID from CSV", "F1": "IFERROR → 0",
            "E2": 1007, "E3": "1004 ", "E4": 1006, "F2": 39, "F3": 0, "F4": 15, "E5": "Total", "F5": 54},
           formulas={"F2": "=IFERROR(VLOOKUP(E2,$A$2:$C$11,3,FALSE),0)", "F3": "=IFERROR(VLOOKUP(E3,$A$2:$C$11,3,FALSE),0)",
                     "F4": "=IFERROR(VLOOKUP(E4,$A$2:$C$11,3,FALSE),0)", "F5": "=SUM(F2:F4)",
                     "G3": "=VLOOKUP(--TRIM(E3),$A$2:$C$11,3,FALSE)", "G5": "=SUM(G2:G4)"})
c4_fixed = S(c4, cells={"G1": "--TRIM fix", "G2": 39, "G3": 29, "G4": 15, "G5": 83},
             fills={"G2": RIGHT_BG, "G3": RIGHT_BG, "G4": RIGHT_BG, "G5": RIGHT_BG})

# ---------------------------------------------------------------- script
SEGMENTS = [
    Segment("A price for a product that doesn't exist", [
        Beat("This lookup says product ten oh four costs forty-nine dollars.",
             "This lookup says product 1004 costs $49.",
             S(c1, select="F3", outlines={"F3": CORAL})),
        Beat("Product ten oh four doesn't exist. It was discontinued and deleted from the price list.",
             "Product 1004 doesn't exist. It was discontinued and deleted from the price list.",
             S(c1, select="F3", outlines={"F3": CORAL}, fills={"A4": HIL_BG, "A5": HIL_BG}, caption="1004 isn't in the list")),
        Beat("There's no error and no warning. Just a believable number that's wrong."),
        Beat("Lookups fail like this all the time, and the dangerous failures are the quiet ones."),
        Beat("Here are four of them, why each one happens, and the one-line fix.",
             scene=Card("4 silent lookup errors", ["Approximate match is the default", "The column that moved",
                                                    "Duplicates return the first match", "Numbers stored as text"],
                        kicker="VLOOKUP vs XLOOKUP", numbered=True)),
        Beat("By the end, you'll know exactly when V-lookup lies, when X-lookup still can, and a thirty-second check you can run on any report.",
             "By the end, you'll know exactly when VLOOKUP lies, when XLOOKUP still can, and a 30-second check you can run on any report."),
        Beat("The practice file is linked in the description, so you can break these formulas yourself."),
    ]),
    Segment("1. Approximate match is the default", [
        Beat("Look at the formula. It has three arguments. The fourth one, range lookup, is missing.",
             "Look at the formula. It has three arguments. The fourth one, range_lookup, is missing.",
             S(c1, select="F3", outlines={"F3": CORAL}, caption="4th argument missing")),
        Beat("When you leave it out, V-lookup doesn't do an exact match. It does an approximate match.",
             "When you leave it out, VLOOKUP doesn't do an exact match. It does an approximate match."),
        Beat("Approximate match assumes the first column is sorted, and returns the largest value that is less than or equal to what you asked for.",
             scene=Clip(HERE / "anim_case1.mp4")),
        Beat("We asked for ten oh four. The largest ID that isn't bigger than ten oh four is ten oh three.",
             "We asked for 1004. The largest ID that isn't bigger than 1004 is 1003."),
        Beat("So you get the laptop stand's price."),
        Beat("Ask for ten twelve, an ID past the end of the list, and you get the last row's price. Still no error.",
             "Ask for 1012, an ID past the end of the list, and you get the last row's price. Still no error.",
             S(c1, select="F4", outlines={"F4": CORAL}, fills={"C10": WRONG_BG}, caption="1012 → last row's price")),
        Beat("And if the column isn't sorted at all, the result is unreliable."),
        Beat("The fix is one word: FALSE. Add it as the fourth argument.",
             scene=S(c1_fixed, select="G3", caption="add FALSE", caption_color=GREEN)),
        Beat("Now a missing product gives you the N-A error, which is exactly what you want.",
             "Now a missing product gives you #N/A, which is exactly what you want."),
        Beat("An error is a warning. A wrong number is a trap."),
        Beat("X-lookup flips the default. It does an exact match unless you ask for something else.",
             "XLOOKUP flips the default. It does an exact match unless you ask for something else.",
             Card("XLOOKUP default = exact match", ["match_mode 0 is the default", "No match → #N/A, not a neighbour's value"],
                  kicker="Fix")),
        Beat("If your version of Excel has it, that alone is a good reason to switch."),
    ]),
    Segment("2. The column that moved", [
        Beat("This formula was written when column three was the price.",
             "This formula was written when column 3 was the price.",
             S(c2_before, select="F2", outlines={"C1": AMBER})),
        Beat("Then someone inserted a category column.",
             scene=S(c2_after, select="G2", caption="new column B")),
        Beat("V-lookup's column number is just a typed number. Excel doesn't change it when the table changes.",
             "VLOOKUP's column number is just a typed number. Excel doesn't change it when the table changes."),
        Beat("So column three is now the product name, and our price column shows text.",
             "So column 3 is now the product name, and our price column shows text.",
             S(c2_after, select="G2", outlines={"G2": CORAL, "G3": CORAL, "C1": CORAL}, caption="column 3 = Product now")),
        Beat("If the new column had been numbers, you'd get a different number instead, and that's when nobody notices."),
        Beat("X-lookup doesn't count columns. You point at the lookup column and the return column directly.",
             "XLOOKUP doesn't count columns. You point at the lookup column and the return column directly.",
             S(c2_x, select="H2", caption="points at the Price column", caption_color=GREEN)),
        Beat("Because those are real references, inserting columns doesn't break it."),
        Beat("If you're stuck with V-lookup, replace the typed number with a MATCH on the header row. That version is in the practice file too.",
             "If you're stuck with VLOOKUP, replace the typed number with a MATCH on the header row. That version is in the practice file too."),
    ]),
    Segment("3. Duplicates return the first match", [
        Beat("Which plan is ACME on today? The formula says Basic.",
             scene=S(c3, select="F2", outlines={"F2": CORAL})),
        Beat("But ACME appears three times.",
             scene=S(c3, select="F2", outlines={"F2": CORAL}, fills={f"{c}{r}": HIL_BG for c in "ABC" for r in (2, 4, 6)})),
        Beat("Both V-lookup and X-lookup return the first match they find, searching from the top.",
             "Both VLOOKUP and XLOOKUP return the first match they find, searching from the top.",
             S(c3, select="F2", outlines={"F2": CORAL, "C2": CORAL}, caption="first match = oldest row")),
        Beat("Our rows are in date order, so the first match is the oldest record."),
        Beat("X-lookup has a search mode argument. Minus one searches from the last row upward, so you get the most recent record.",
             "XLOOKUP has a search_mode argument. -1 searches from the last row upward, so you get the most recent record.",
             S(c3_last, select="G2", outlines={"C6": GREEN}, caption="search_mode -1", caption_color=GREEN)),
        Beat("This only works if the data is sorted by date. If it isn't, sort it first, or pick the row with the latest date. That's coming in a separate video."),
    ]),
    Segment("4. Numbers stored as text", [
        Beat("The last one is the sneakiest. These IDs came from a CSV export, and the total says fifty-four dollars.",
             "The last one is the sneakiest. These IDs came from a CSV export, and the total says $54.",
             S(c4, select="F5", outlines={"F5": AMBER})),
        Beat("Looks fine. But the middle row returned zero.",
             scene=S(c4, select="F3", outlines={"F3": CORAL})),
        Beat("Look at the ID. It's aligned to the left. Excel aligns numbers to the right and text to the left, so this ID is text.",
             scene=S(c4, select="E3", outlines={"E3": CORAL}, caption="left-aligned = text")),
        Beat("And it has a trailing space.",
             scene=S(c4, select="E3", outlines={"E3": CORAL}, show_spaces=True, caption="trailing space")),
        Beat("To Excel, the number ten oh four and the text ten oh four with a space are different values, so the exact match fails.",
             "To Excel, the number 1004 and the text \"1004 \" are different values, so the exact match fails."),
        Beat("Normally that gives you the N-A error. But this formula is wrapped in if-error with a zero.",
             "Normally that gives you #N/A. But this formula is wrapped in IFERROR with a zero.",
             S(c4, select="F3", outlines={"F3": CORAL}, caption="IFERROR(…, 0) hides it")),
        Beat("So the error became a zero, and the zero disappeared into the total."),
        Beat("The fix: TRIM removes the extra space, and the double minus turns the text into a number.",
             scene=S(c4_fixed, select="G3", caption="--TRIM(E3)", caption_color=GREEN)),
        Beat("Now the total is eighty-three dollars.",
             "Now the total is $83.",
             S(c4_fixed, select="G5", outlines={"G5": GREEN, "F5": CORAL}, caption="$54 → $83", caption_color=GREEN)),
        Beat("And the lesson: don't use if-error to turn errors into zeros in anything that gets added up. Show a clear message like not found instead.",
             "And the lesson: don't use IFERROR to turn errors into zeros in anything that gets added up. Show a clear message like \"not found\" instead."),
    ]),
    Segment("The 30-second lookup check", [
        Beat("Before you trust any lookup column, run this check.",
             scene=Card("The 30-second lookup check", [
                 "Does every VLOOKUP end in FALSE?", "Is the column number typed by hand?",
                 "Can the key appear more than once?  →  COUNTIF", "Are the keys numbers on both sides?  →  ISTEXT"],
                 kicker="Before you trust a lookup", numbered=True)),
        Beat("One. Does every V-lookup end in FALSE?", "1. Does every VLOOKUP end in FALSE?"),
        Beat("Two. Is the column number typed by hand?", "2. Is the column number typed by hand?"),
        Beat("Three. Can the key appear more than once? Count-if on the key column will tell you.",
             "3. Can the key appear more than once? COUNTIF on the key column will tell you."),
        Beat("Four. Are the keys numbers on both sides? Is-text will tell you.",
             "4. Are the keys numbers on both sides? ISTEXT will tell you."),
    ]),
    Segment("Next: SQL joins that double your rows", [
        Beat("Every broken formula and every fix is in the practice file, so you can try it yourself."),
        Beat("And if your formulas are fine but your SQL joins return more rows than you started with, that's the same duplicate problem in a different tool. That's the next video."),
    ]),
]

END = Card("Next: SQL JOINs that double your rows", ["Free practice file in the description"], kicker="Rowwise")

if __name__ == "__main__":
    res = build(SEGMENTS, HERE, voice="af_heart", end_card=END, name="LF1-lookup-wrong-answers")
    print(f"{res['video']}  {res['seconds'] / 60:.1f} min\n{res['chapters']}")
