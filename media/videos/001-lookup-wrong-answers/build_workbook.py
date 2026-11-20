"""Builds the LF1 practice file: rowwise-lookups-practice.xlsx

Each sheet reproduces one silent lookup failure and its fix.
Run: python3 build_workbook.py [out_dir]
"""
import sys
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

INK, CORAL, GREEN, AMBER = "13212E", "E5533D", "1FA971", "F2B33D"
HDR = Font(bold=True, color="FFFFFF")
HDR_FILL = PatternFill("solid", fgColor=INK)
WRONG = PatternFill("solid", fgColor="FBE3DF")
RIGHT = PatternFill("solid", fgColor="DDF3E9")

# Unsorted price list (IDs deliberately out of order).
PRICES = [
    (1007, "Desk lamp", 39.00),
    (1002, "Monitor arm", 89.00),
    (1010, "Webcam", 64.00),
    (1001, "USB-C hub", 45.00),
    (1009, "Keyboard", 79.00),
    (1004, "Mouse", 29.00),
    (1008, "Headset", 119.00),
    (1003, "Laptop stand", 49.00),
    (1006, "Cable kit", 15.00),
    (1005, "Docking station", 189.00),
]


def header(ws, cols):
    ws.append(cols)
    for c in ws[1]:
        c.font, c.fill = HDR, HDR_FILL
    for i in range(1, len(cols) + 1):
        ws.column_dimensions[chr(64 + i)].width = 22


def price_table(ws, with_category=False):
    header(ws, ["Product ID", "Category", "Product", "Price"] if with_category else ["Product ID", "Product", "Price"])
    for pid, name, price in PRICES:
        ws.append([pid, "Accessories", name, price] if with_category else [pid, name, price])


def main(out_dir: Path) -> Path:
    wb = Workbook()

    # Case 1: approximate match by default
    # Sorted list where product 1004 was discontinued (row deleted). Approximate match then
    # silently returns the next-smaller ID's price instead of an error.
    ws = wb.active
    ws.title = "1 Approximate default"
    header(ws, ["Product ID", "Product", "Price"])
    for pid, name, price in sorted(p for p in PRICES if p[0] != 1004):
        ws.append([pid, name, price])
    ws["E1"], ws["F1"], ws["G1"] = "Look up ID", "VLOOKUP (3 args)", "VLOOKUP (FALSE)"
    for r, pid in enumerate([1007, 1004, 1012], start=2):
        ws[f"E{r}"] = pid
        ws[f"F{r}"] = f"=VLOOKUP(E{r},$A$2:$C$10,3)"
        ws[f"F{r}"].fill = WRONG
        ws[f"G{r}"] = f"=VLOOKUP(E{r},$A$2:$C$10,3,FALSE)"
        ws[f"G{r}"].fill = RIGHT
    ws["E7"] = ("Omitting the 4th argument means approximate match: a missing ID returns the price of the "
                "next-smaller ID, with no error.")

    # Case 2: hard-coded column index after inserting a column
    ws = wb.create_sheet("2 Inserted column")
    price_table(ws, with_category=True)
    ws["F1"], ws["G1"], ws["H1"] = "Look up ID", "VLOOKUP col 3 (written before Category existed)", "XLOOKUP"
    for r, pid in enumerate([1007, 1004], start=2):
        ws[f"F{r}"] = pid
        ws[f"G{r}"] = f"=VLOOKUP(F{r},$A$2:$D$11,3,FALSE)"
        ws[f"G{r}"].fill = WRONG
        ws[f"H{r}"] = f"=_xlfn.XLOOKUP(F{r},$A$2:$A$11,$D$2:$D$11)"
        ws[f"H{r}"].fill = RIGHT
    ws["F6"] = "Column 3 used to be Price. After 'Category' was inserted, it returns Product name instead."

    # Case 3: duplicates return the first match
    ws = wb.create_sheet("3 Duplicates")
    header(ws, ["Customer", "Date", "Plan"])
    for row in [("ACME", "2026-01-05", "Basic"), ("Birch", "2026-02-11", "Pro"),
                ("ACME", "2026-06-20", "Pro"), ("Cobalt", "2026-03-02", "Basic"),
                ("ACME", "2026-10-01", "Enterprise")]:
        ws.append(row)
    ws["E1"], ws["F1"], ws["G1"] = "Customer", "Current plan? (first match)", "Latest (search_mode -1)"
    ws["E2"] = "ACME"
    ws["F2"] = "=_xlfn.XLOOKUP(E2,$A$2:$A$6,$C$2:$C$6)"
    ws["F2"].fill = WRONG
    ws["G2"] = "=_xlfn.XLOOKUP(E2,$A$2:$A$6,$C$2:$C$6,\"not found\",0,-1)"
    ws["G2"].fill = RIGHT
    ws["E4"] = "Rows are in date order, so the LAST match is the current plan."

    # Case 4: numbers stored as text hidden by IFERROR
    ws = wb.create_sheet("4 Text vs number")
    price_table(ws)
    ws["E1"], ws["F1"], ws["G1"] = "Look up ID (pasted from CSV)", "IFERROR(...,0)", "Fixed: convert with --"
    # Only the middle ID came in as text with a trailing space; the others are real numbers.
    for r, pid in enumerate([1007, "1004 ", 1006], start=2):
        ws[f"E{r}"] = pid
        ws[f"F{r}"] = f"=IFERROR(VLOOKUP(E{r},$A$2:$C$11,3,FALSE),0)"
        ws[f"F{r}"].fill = WRONG
        ws[f"G{r}"] = f"=VLOOKUP(--TRIM(E{r}),$A$2:$C$11,3,FALSE)"
        ws[f"G{r}"].fill = RIGHT
    ws["F5"] = "=SUM(F2:F4)"
    ws["G5"] = "=SUM(G2:G4)"
    ws["E5"] = "Total"
    ws["E7"] = "IFERROR turns 'not found' into 0, so the total looks plausible and is wrong."

    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "rowwise-lookups-practice.xlsx"
    wb.save(out)
    return out


if __name__ == "__main__":
    print(main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent))
