"""Build the downloadable CV from the published HTML content."""

from html import escape
from pathlib import Path

from lxml import html
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent
SITE = ROOT.parent
OUTPUT = ROOT / "leandro-velasques-cv-actualizado.pdf"
TREE = html.parse(str(ROOT / "index.html"))

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("ArialBold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("GeorgiaItalic", r"C:\Windows\Fonts\georgiai.ttf"))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="ArialBold")

GREEN = colors.HexColor("#285A47")
DARK = colors.HexColor("#25302C")
MINT = colors.HexColor("#A8D5C1")
FOG = colors.HexColor("#EDEDED")
COPPER = colors.HexColor("#B86F4D")
MUTED = colors.HexColor("#4F4C4D")
WHITE = colors.white
PAGE_W, PAGE_H = A4
CONTENT_W = PAGE_W - 104


def text(node):
    return " ".join(" ".join(node.itertext()).split())


def first(path):
    return TREE.xpath(path)[0]


styles = {
    "eyebrow": ParagraphStyle("eyebrow", fontName="ArialBold", fontSize=8, leading=11, textColor=GREEN, spaceAfter=9),
    "name": ParagraphStyle("name", fontName="ArialBold", fontSize=31, leading=33, textColor=DARK, spaceAfter=12),
    "role": ParagraphStyle("role", fontName="ArialBold", fontSize=13, leading=18, textColor=GREEN, spaceAfter=9),
    "lead": ParagraphStyle("lead", fontName="Arial", fontSize=10, leading=15, textColor=MUTED, spaceAfter=14),
    "section": ParagraphStyle("section", fontName="ArialBold", fontSize=17, leading=21, textColor=DARK, spaceBefore=16, spaceAfter=10),
    "body": ParagraphStyle("body", fontName="Arial", fontSize=9.3, leading=14.4, textColor=DARK, spaceAfter=8),
    "small": ParagraphStyle("small", fontName="Arial", fontSize=8.5, leading=12.5, textColor=MUTED),
    "date": ParagraphStyle("date", fontName="ArialBold", fontSize=8.5, leading=12, textColor=COPPER),
    "item": ParagraphStyle("item", fontName="ArialBold", fontSize=11.2, leading=14, textColor=DARK, spaceAfter=3),
    "org": ParagraphStyle("org", fontName="GeorgiaItalic", fontSize=9.4, leading=13, textColor=GREEN, spaceAfter=5),
    "course": ParagraphStyle("course", fontName="Arial", fontSize=8.5, leading=12, textColor=DARK),
}


def para(value, style="body"):
    return Paragraph(escape(value), styles[style])


def heading(label, title):
    return [para(label, "eyebrow"), para(title, "section")]


def card(content, top=False):
    table = Table([[content]], colWidths=[CONTENT_W], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCD4CF")),
        ("LINEABOVE", (0, 0), (-1, 0), 2.5 if top else 1.5, COPPER),
        ("LEFTPADDING", (0, 0), (-1, -1), 13),
        ("RIGHTPADDING", (0, 0), (-1, -1), 13),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return table


def draw_page(canvas, doc):
    canvas.saveState()
    logo = SITE / "assets" / "logo-oficial.png"
    canvas.drawImage(ImageReader(str(logo)), 52, PAGE_H - 58, width=151, height=40, preserveAspectRatio=True, anchor="sw", mask="auto")
    canvas.setStrokeColor(MINT)
    canvas.setLineWidth(1)
    canvas.line(52, PAGE_H - 65, PAGE_W - 52, PAGE_H - 65)
    canvas.setFont("Arial", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(52, 30, "www.leandrovelasques.com.ar/cv/")
    canvas.drawRightString(PAGE_W - 52, 30, f"Lic. Leandro Velasques  |  {doc.page}")
    canvas.restoreState()


story = []
story.append(Spacer(1, 16))
hero = first('//section[contains(@class,"cv-hero")]')
profile = first('//section[contains(@class,"cv-profile")]')
story.append(para("CV PROFESIONAL  ·  CONSULTORA IA", "eyebrow"))
photo = Image(str(SITE / "assets" / "leandro-perfil.jpg"), width=88, height=88)
photo.hAlign = "RIGHT"
role_node = hero.xpath('.//p[contains(@class,"cv-role")]')[0]
role_lines = [escape(" ".join((role_node.text or "").split()))]
role_lines += [escape(" ".join((break_node.tail or "").split())) for break_node in role_node.xpath('./br')]
hero_copy = [
    para(text(hero.xpath('.//h1')[0]), "name"),
    Paragraph("<br/>".join(role_lines), styles["role"]),
]
hero_row = Table([[hero_copy, photo]], colWidths=[CONTENT_W - 105, 105], hAlign="LEFT")
hero_row.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 0),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
]))
story += [hero_row, para(text(hero.xpath('.//p[contains(@class,"cv-lead")]')[0]), "lead")]
story += heading("PERFIL PROFESIONAL", text(profile.xpath('.//h2')[0]))
for item in profile.xpath('.//div[contains(@class,"cv-profile-copy")]/p'):
    story.append(para(text(item)))

focus = first('//section[contains(@class,"cv-focus")]')
story += heading("ÁREAS DE TRABAJO", text(focus.xpath('.//h2')[0]))
area_cells = []
for article in focus.xpath('.//div[contains(@class,"cv-focus-grid")]/article'):
    area_cells.append([para(text(article.xpath('./h3')[0]), "item"), para(text(article.xpath('./p')[0]), "small")])
for start in (0, 2):
    row = Table([[area_cells[start], area_cells[start + 1]]], colWidths=[(CONTENT_W - 12) / 2] * 2, hAlign="LEFT")
    row.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), FOG),
        ("LINEABOVE", (0, 0), (-1, 0), 2, COPPER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    story += [row, Spacer(1, 10)]

experience = first('//section[contains(@class,"cv-experience")]')
story += heading("TRAYECTORIA PROFESIONAL", "Experiencia en gestión, procesos y transformación digital")
for index, article in enumerate(experience.xpath('.//article[contains(@class,"cv-timeline-item")]')):
    if index == 1:
        story += [PageBreak(), para("TRAYECTORIA PROFESIONAL · CONTINUACIÓN", "eyebrow"), Spacer(1, 5)]
    parts = [para(text(article.xpath('./span')[0]), "date"), para(text(article.xpath('.//h3')[0]), "item")]
    parts.append(para(text(article.xpath('.//p[contains(@class,"cv-company")]')[0]), "org"))
    parts.append(para(text(article.xpath('.//div/p[last()]')[0]), "small"))
    story += [card(parts, top=True), Spacer(1, 4)]
other = experience.xpath('.//div[contains(@class,"cv-other-experience")]/p')
story.append(para("OTRAS EXPERIENCIAS", "eyebrow"))
for item in other:
    story.append(para(text(item), "small"))

volunteer = first('//section[contains(@class,"cv-volunteer")]')
story += heading("PARTICIPACIÓN INSTITUCIONAL", "Voluntariado y trabajo en comunidad")
for article in volunteer.xpath('.//div[contains(@class,"cv-volunteer-grid")]/article'):
    parts = [para(text(article.xpath('./span')[0]), "date"), para(text(article.xpath('./h3')[0]), "item")]
    parts.append(para(text(article.xpath('./p[contains(@class,"cv-volunteer-org")]')[0]), "org"))
    parts.append(para(text(article.xpath('./p[last()]')[0]), "small"))
    story += [card(parts), Spacer(1, 4)]

story.append(PageBreak())
education = first('//section[contains(@class,"cv-education")]')
story += heading("FORMACIÓN Y ACTUALIZACIÓN", "Administración, marketing, calidad e inteligencia artificial")
for article in education.xpath('.//div[contains(@class,"cv-education-list")]/article'):
    parts = [para(text(article.xpath('./span')[0]), "date"), para(text(article.xpath('./h3')[0]), "item")]
    parts.append(para(text(article.xpath('./p')[0]), "small"))
    story += [card(parts), Spacer(1, 9)]

story += heading("CURSOS Y CERTIFICACIONES COMPLEMENTARIAS", "Formación complementaria")
for item in education.xpath('.//div[contains(@class,"cv-course-grid")]/p'):
    story += [para(text(item), "course"), Spacer(1, 4)]

story += [Spacer(1, 12), HRFlowable(width="100%", thickness=1, color=MINT), Spacer(1, 8)]
story.append(Paragraph('<link href="https://www.linkedin.com/in/leandrojvelasques/" color="#285A47">LinkedIn</link>  ·  <link href="https://www.leandrovelasques.com.ar/" color="#285A47">Sitio web</link>', styles["small"]))

doc = SimpleDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    leftMargin=52,
    rightMargin=52,
    topMargin=83,
    bottomMargin=55,
    title="CV profesional - Lic. Leandro Velasques",
    author="Lic. Leandro Velasques",
    subject="Experiencia, voluntariado y formación",
)
doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
print(OUTPUT)
