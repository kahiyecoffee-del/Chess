"""Portfolio sample: supplier invoice PDFs -> one Excel table (real extraction with pdfplumber).

All companies and numbers are fictional. Run: python3 services/portfolio/build_pdf_to_excel.py
"""
import random
from pathlib import Path

import pdfplumber
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet

OUT = Path(__file__).parent
rng = random.Random(7)
SUPPLIERS = ["Harbor Textiles Ltd.", "Blue Pine Packaging Co.", "Meridian Hardware GmbH"]
ITEMS = [("Cotton tote bag", 2.40), ("Kraft mailer box S", 0.55), ("Steel hinge 40mm", 0.32),
         ("Woven label", 0.08), ("Shipping carton L", 1.10), ("Zipper 20cm", 0.21)]


def make_pdf(path: Path):
    ss = getSampleStyleSheet()
    story = []
    for n in range(3):
        sup = SUPPLIERS[n]
        inv = f"INV-2026-{1040 + n * 7}"
        story += [Paragraph(f"<b>{sup}</b>", ss["Title"]),
                  Paragraph(f"Invoice: {inv} &nbsp;&nbsp; Date: 2026-10-{12 + n * 5:02d}", ss["Normal"]), Spacer(1, 12)]
        rows = [["Item", "Qty", "Unit price (USD)", "Line total (USD)"]]
        for name, price in rng.sample(ITEMS, 4):
            q = rng.choice([200, 500, 1000, 2500])
            rows.append([name, f"{q:,}", f"{price:.2f}", f"{q * price:,.2f}"])
        t = Table(rows, colWidths=[200, 70, 110, 120])
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#13212E")),
                               ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                               ("ALIGN", (1, 1), (-1, -1), "RIGHT")]))
        story += [t, PageBreak()]
    SimpleDocTemplate(str(path), pagesize=A4).build(story)


def extract(path: Path):
    out = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if not text.strip():
                continue
            lines = text.splitlines()
            supplier = lines[0].strip()
            meta = next(l for l in lines if l.startswith("Invoice:"))
            inv = meta.split()[1]
            dt = meta.split("Date:")[1].strip()
            for table in page.extract_tables():
                for row in table[1:]:
                    item, qty, unit, total = row
                    out.append([supplier, inv, dt, item, int(qty.replace(",", "")), float(unit),
                                float(total.replace(",", ""))])
    return out


def main():
    pdf_path = OUT / "sample-supplier-invoices.pdf"
    make_pdf(pdf_path)
    rows = extract(pdf_path)
    wb = Workbook()
    ws = wb.active
    ws.title = "Invoice lines"
    hdr = ["Supplier", "Invoice", "Date", "Item", "Qty", "Unit price", "Line total"]
    ws.append(hdr)
    for c in ws[1]:
        c.font, c.fill = Font(bold=True, color="FFFFFF"), PatternFill("solid", fgColor="13212E")
    for r in rows:
        ws.append(r)
    n = len(rows) + 1
    ws.append([])
    ws.append(["Check", "", "", "Sum of line totals", "", "", f"=SUM(G2:G{n})"])
    ws.append(["Check", "", "", "Qty × unit = total (rows OK)", "", "",
               f'=SUMPRODUCT(--(ROUND(E2:E{n}*F2:F{n},2)=ROUND(G2:G{n},2)))&" / {n - 1}"'])
    for col, w in zip("ABCDEFG", (26, 16, 12, 30, 10, 12, 14)):
        ws.column_dimensions[col].width = w
    xlsx = OUT / "sample-supplier-invoices-extracted.xlsx"
    wb.save(xlsx)
    ok = sum(1 for r in rows if round(r[4] * r[5], 2) == round(r[6], 2))
    print(xlsx, f"{len(rows)} lines extracted, {ok}/{len(rows)} arithmetic checks pass, total ${sum(r[6] for r in rows):,.2f}")


if __name__ == "__main__":
    main()
