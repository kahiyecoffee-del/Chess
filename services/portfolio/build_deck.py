"""Portfolio sample: 6-slide pitch deck (PowerPoint) for a fictional company.
Run: python3 services/portfolio/build_deck.py
"""
from pathlib import Path

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE
from pptx.enum.shapes import MSO_SHAPE
from pptx.util import Inches, Pt

NAVY, TEAL, SAND, WHITE, GREY = (RGBColor(0x10, 0x2A, 0x43), RGBColor(0x14, 0xA0, 0x8C), RGBColor(0xF5, 0xF1, 0xEA),
                                 RGBColor(0xFF, 0xFF, 0xFF), RGBColor(0x6B, 0x72, 0x80))
prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]


def bg(slide, color):
    f = slide.background.fill
    f.solid()
    f.fore_color.rgb = color


def text(slide, x, y, w, h, s, size, color, bold=False):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    for i, line in enumerate(s.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.font.size, p.font.bold, p.font.color.rgb, p.font.name = Pt(size), bold, color, "Inter"
        p.space_after = Pt(8)
    return tb


def header(slide, kicker, title):
    bg(slide, SAND)
    text(slide, 0.8, 0.5, 11, 0.5, kicker.upper(), 14, TEAL, True)
    text(slide, 0.8, 0.9, 11.5, 1.2, title, 36, NAVY, True)


s = prs.slides.add_slide(BLANK); bg(s, NAVY)
text(s, 0.8, 2.3, 11, 1.4, "Lumen Freight", 60, WHITE, True)
text(s, 0.8, 3.6, 11, 1, "Live shipment tracking for small importers — one dashboard, every carrier.", 24, RGBColor(0xC8, 0xD3, 0xDE))
text(s, 0.8, 6.5, 11, 0.5, "Seed round · 2026 · fictional company, sample deck by Rowwise Data", 14, TEAL)

s = prs.slides.add_slide(BLANK); header(s, "The problem", "Small importers track shipments in 6 places")
for i, (n, t) in enumerate([("6+", "carrier portals checked by hand"), ("3 h", "per week spent on status emails"),
                            ("1 in 5", "delays noticed only after the customer complains")]):
    box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i * 4.1), Inches(2.6), Inches(3.8), Inches(3))
    box.fill.solid(); box.fill.fore_color.rgb = WHITE; box.line.color.rgb = RGBColor(0xE2, 0xDC, 0xD2)
    text(s, 1.1 + i * 4.1, 2.9, 3.3, 1, n, 54, TEAL, True)
    text(s, 1.1 + i * 4.1, 4.2, 3.3, 1.2, t, 20, NAVY)
text(s, 0.8, 6.4, 11, 0.5, "Illustrative figures for this sample deck.", 12, GREY)

s = prs.slides.add_slide(BLANK); header(s, "The solution", "One timeline for every container")
text(s, 0.8, 2.4, 6, 4, "• Connect carriers once\n• Live ETA and delay alerts\n• Auto-updates to your customers\n• Landed-cost per shipment", 24, NAVY)
card = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.4), Inches(2.3), Inches(5.1), Inches(4.2))
card.fill.solid(); card.fill.fore_color.rgb = NAVY; card.line.fill.background()
text(s, 7.8, 2.6, 4.4, 4, "MSKU 4471203\nShanghai → Mersin\nETA 14 Dec · on time ✓\n\nTGHU 9020118\nNingbo → Hamburg\nETA 19 Dec · 2 days late ⚠", 20, WHITE)

s = prs.slides.add_slide(BLANK); header(s, "Traction", "Monthly active importers")
cd = CategoryChartData(); cd.categories = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]; cd.add_series("Importers", (12, 19, 31, 44, 63, 88))
ch = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(0.8), Inches(2.2), Inches(11.7), Inches(4.6), cd).chart
ch.has_legend = False; ch.has_title = False; ch.plots[0].series[0].format.fill.solid(); ch.plots[0].series[0].format.fill.fore_color.rgb = TEAL
ch.value_axis.has_major_gridlines = False; ch.category_axis.tick_labels.font.size = Pt(16)

s = prs.slides.add_slide(BLANK); header(s, "Business model", "Simple monthly plans")
for i, (name, price, desc) in enumerate([("Starter", "$49", "up to 20 shipments/mo"), ("Growth", "$149", "up to 100 shipments/mo"),
                                         ("Pro", "$399", "unlimited + API")]):
    box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i * 4.1), Inches(2.4), Inches(3.8), Inches(3.6))
    box.fill.solid(); box.fill.fore_color.rgb = NAVY if i == 1 else WHITE; box.line.color.rgb = RGBColor(0xE2, 0xDC, 0xD2)
    col = WHITE if i == 1 else NAVY
    text(s, 1.1 + i * 4.1, 2.7, 3.3, 0.6, name, 22, TEAL, True)
    text(s, 1.1 + i * 4.1, 3.4, 3.3, 1, price, 48, col, True)
    text(s, 1.1 + i * 4.1, 4.6, 3.3, 1, desc, 18, col)

s = prs.slides.add_slide(BLANK); bg(s, NAVY)
text(s, 0.8, 2.4, 11, 1, "Raising $600k to reach 1,000 importers", 40, WHITE, True)
text(s, 0.8, 3.6, 11, 2, "45% product · 35% sales · 20% operations\nhello@lumenfreight.example", 24, RGBColor(0xC8, 0xD3, 0xDE))

out = Path(__file__).parent / "sample-pitch-deck.pptx"
prs.save(out)
print(out)
