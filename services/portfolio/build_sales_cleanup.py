"""Portfolio sample 1: messy sales export -> clean table + summary + dashboard (Excel).

All data is synthetic (seeded) — no real company or customer data.
Run: python3 services/portfolio/build_sales_cleanup.py
"""
import random
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils.dataframe import dataframe_to_rows

OUT = Path(__file__).parent
INK, AMBER = "13212E", "F2B33D"
rng = random.Random(42)

REGIONS = ["North", "South", "East", "West"]
PRODUCTS = {"Desk lamp": 39, "Monitor arm": 89, "Webcam": 64, "USB-C hub": 45, "Keyboard": 79, "Headset": 119}
REPS = ["Ayla Demir", "John Carter", "Maria Lopez", "Kenji Sato", "Emma Novak"]


def messy_rows(n=420):
    rows, start = [], date(2026, 1, 1)
    for i in range(n):
        d = start + timedelta(days=rng.randint(0, 303))
        prod = rng.choice(list(PRODUCTS))
        qty = rng.randint(1, 12)
        rep = rng.choice(REPS)
        region = rng.choice(REGIONS)
        # inject the typical export problems
        ds = d.isoformat() if rng.random() < 0.6 else (d.strftime("%d/%m/%Y") if rng.random() < 0.5 else d.strftime("%m-%d-%Y"))
        rep_s = rep.upper() if rng.random() < 0.1 else (f" {rep} " if rng.random() < 0.15 else rep)
        region_s = region.lower() if rng.random() < 0.2 else region
        qty_s = str(qty) if rng.random() < 0.25 else qty
        price = PRODUCTS[prod]
        price_s = f"${price:.2f}" if rng.random() < 0.3 else price
        rows.append({"Order ID": f"SO-{10000 + i}", "Date": ds, "Region": region_s, "Rep": rep_s,
                     "Product": prod, "Qty": qty_s, "Unit price": price_s})
    # duplicates (re-exported rows) and blanks
    rows += [dict(rows[rng.randrange(len(rows))]) for _ in range(18)]
    for _ in range(6):
        rows[rng.randrange(len(rows))]["Region"] = None
    rng.shuffle(rows)
    return pd.DataFrame(rows)


def parse_date(s):
    s = str(s)
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m-%d-%Y"):
        try:
            return pd.to_datetime(s, format=fmt)
        except ValueError:
            pass
    return pd.NaT


def clean(raw: pd.DataFrame):
    log = []
    df = raw.copy()
    n0 = len(df)
    df = df.drop_duplicates()
    log.append(f"Removed {n0 - len(df)} duplicate rows (re-exported orders).")
    df["Date"] = df["Date"].map(parse_date)
    log.append("Unified 3 date formats (ISO, DD/MM/YYYY, MM-DD-YYYY) into real dates.")
    df["Rep"] = df["Rep"].str.strip().str.title()
    log.append("Trimmed spaces and fixed capitalisation in rep names.")
    df["Region"] = df["Region"].str.title()
    missing = df["Region"].isna().sum()
    df["Region"] = df["Region"].fillna("Unassigned")
    log.append(f"Standardised region names; {missing} blank regions flagged as 'Unassigned'.")
    df["Qty"] = pd.to_numeric(df["Qty"])
    df["Unit price"] = pd.to_numeric(df["Unit price"].astype(str).str.replace("$", "", regex=False))
    log.append("Converted quantities and prices stored as text (incl. '$' signs) to numbers.")
    df["Revenue"] = df["Qty"] * df["Unit price"]
    df["Month"] = df["Date"].dt.to_period("M").astype(str)
    df = df.sort_values("Date").reset_index(drop=True)
    return df, log


def style_header(ws, ncols):
    for c in ws[1][:ncols]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=INK)
    for col in ws.columns:
        ws.column_dimensions[col[0].column_letter].width = 16


def main():
    raw = messy_rows()
    df, log = clean(raw)
    raw_rev_naive = "can't be summed (text values)"
    wb = Workbook()

    ws = wb.active
    ws.title = "Dashboard"
    ws["A1"] = "Sales dashboard — Jan–Oct 2026 (synthetic sample data)"
    ws["A1"].font = Font(bold=True, size=16, color=INK)
    kpis = [("Total revenue", df["Revenue"].sum(), '"$"#,##0'), ("Orders", len(df), "#,##0"),
            ("Avg order value", df["Revenue"].mean(), '"$"#,##0.00'), ("Units sold", int(df["Qty"].sum()), "#,##0")]
    for i, (label, val, fmt) in enumerate(kpis):
        col = 1 + i * 2
        ws.cell(3, col, label).font = Font(bold=True, color="6B6860")
        cell = ws.cell(4, col, float(val))
        cell.number_format = fmt
        cell.font = Font(bold=True, size=18, color=INK)

    for col in "ABCDEFGH":
        ws.column_dimensions[col].width = 18
    by_month = df.groupby("Month", as_index=False)["Revenue"].sum()
    by_region = df.groupby("Region", as_index=False)["Revenue"].sum().sort_values("Revenue", ascending=False)
    by_rep = df.groupby("Rep", as_index=False)["Revenue"].sum().sort_values("Revenue", ascending=False)

    summ = wb.create_sheet("Summary")
    r = 1
    anchors = {}
    for title, t in [("Revenue by month", by_month), ("Revenue by region", by_region), ("Revenue by rep", by_rep)]:
        summ.cell(r, 1, title).font = Font(bold=True, size=13)
        r += 1
        start = r
        for row in dataframe_to_rows(t, index=False, header=True):
            for j, v in enumerate(row, 1):
                summ.cell(r, j, v)
            r += 1
        anchors[title] = (start, r - 1)
        for rr in range(start + 1, r):
            summ.cell(rr, 2).number_format = '"$"#,##0'
        r += 1
    summ.column_dimensions["A"].width = 20
    summ.column_dimensions["B"].width = 16

    s, e = anchors["Revenue by month"]
    line = LineChart(); line.title = "Revenue by month"; line.height, line.width = 8, 16
    line.add_data(Reference(summ, min_col=2, min_row=s, max_row=e), titles_from_data=True)
    line.set_categories(Reference(summ, min_col=1, min_row=s + 1, max_row=e)); line.legend = None
    for ser in line.series:
        ser.smooth = False
    ws.add_chart(line, "A7")
    s, e = anchors["Revenue by region"]
    bar = BarChart(); bar.title = "Revenue by region"; bar.height, bar.width = 8, 12
    bar.add_data(Reference(summ, min_col=2, min_row=s, max_row=e), titles_from_data=True)
    bar.set_categories(Reference(summ, min_col=1, min_row=s + 1, max_row=e)); bar.legend = None
    ws.add_chart(bar, "J7")
    s, e = anchors["Revenue by rep"]
    bar2 = BarChart(); bar2.type = "bar"; bar2.title = "Revenue by rep"; bar2.height, bar2.width = 8, 16
    bar2.add_data(Reference(summ, min_col=2, min_row=s, max_row=e), titles_from_data=True)
    bar2.set_categories(Reference(summ, min_col=1, min_row=s + 1, max_row=e)); bar2.legend = None
    ws.add_chart(bar2, "A24")

    clean_ws = wb.create_sheet("Clean data")
    out = df.copy(); out["Date"] = out["Date"].dt.date
    for row in dataframe_to_rows(out, index=False, header=True):
        clean_ws.append(row)
    style_header(clean_ws, out.shape[1])
    clean_ws.freeze_panes = "A2"
    clean_ws.auto_filter.ref = clean_ws.dimensions

    raw_ws = wb.create_sheet("Raw export (before)")
    for row in dataframe_to_rows(raw, index=False, header=True):
        raw_ws.append(row)
    style_header(raw_ws, raw.shape[1])

    log_ws = wb.create_sheet("Cleaning log")
    log_ws["A1"] = "What was fixed"; log_ws["A1"].font = Font(bold=True, size=13)
    for i, line_txt in enumerate(log, 3):
        log_ws.cell(i, 1, f"{i - 2}. {line_txt}").alignment = Alignment(wrap_text=False)
    log_ws.column_dimensions["A"].width = 110

    path = OUT / "sample-sales-cleanup-dashboard.xlsx"
    wb.save(path)
    print(path)
    print(f"raw rows {len(raw)} -> clean rows {len(df)}; revenue ${df['Revenue'].sum():,.0f}; raw revenue {raw_rev_naive}")
    print("\n".join(log))


if __name__ == "__main__":
    main()
