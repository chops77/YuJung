#!/usr/bin/env python3
"""Generate the print-ready bilingual memorial website poster."""

from io import BytesIO
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageOps
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "downloads"
OUTPUT = OUTPUT_DIR / "yu-jung-memorial-poster.pdf"
PORTRAIT = ROOT / "public" / "media" / "uploads" / "grandma.jpg"

ZH_URL = "https://chops77.github.io/YuJung/zh-tw/"
EN_URL = "https://chops77.github.io/YuJung/en/"

PARCHMENT = HexColor("#F7F3EC")
PARCHMENT_DEEP = HexColor("#EFE8DB")
INK = HexColor("#2B2926")
GOLD = HexColor("#B08D57")
GOLD_DEEP = HexColor("#8A6A38")
SAGE = HexColor("#8A9B84")


def make_qr(url: str) -> ImageReader:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="#2B2926", back_color="#FFFFFF").convert("RGB")
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)
    return ImageReader(buffer)


def make_oval_portrait(path: Path, size: tuple[int, int] = (900, 1125)) -> ImageReader:
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.42))

    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size[0] - 1, size[1] - 1), fill=255)
    image.putalpha(mask)

    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)
    return ImageReader(buffer)


def centered_text(pdf: canvas.Canvas, text: str, y: float, font: str, size: float, color=INK) -> None:
    pdf.setFillColor(color)
    pdf.setFont(font, size)
    pdf.drawCentredString(A4[0] / 2, y, text)


def draw_qr_card(
    pdf: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    qr_image: ImageReader,
    language: str,
    subtitle: str,
    url: str,
) -> None:
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.setStrokeColor(PARCHMENT_DEEP)
    pdf.setLineWidth(0.8)
    pdf.roundRect(x, y, width, 184, 10, fill=1, stroke=1)

    qr_size = 116
    qr_x = x + (width - qr_size) / 2
    pdf.drawImage(qr_image, qr_x, y + 55, qr_size, qr_size, preserveAspectRatio=True, mask="auto")

    pdf.setFillColor(INK)
    pdf.setFont("STSong-Light", 11)
    pdf.drawCentredString(x + width / 2, y + 38, language)
    pdf.setFillColor(GOLD_DEEP)
    pdf.setFont("Helvetica", 7.5)
    pdf.drawCentredString(x + width / 2, y + 25, subtitle)
    pdf.setFillColor(HexColor("#69635C"))
    pdf.setFont("Helvetica", 5.8)
    pdf.drawCentredString(x + width / 2, y + 11, url.replace("https://", ""))

    # Preserve the destination as a clickable link in digital copies, too.
    pdf.linkURL(url, (qr_x, y + 55, qr_x + qr_size, y + 55 + qr_size), relative=0)


def build_poster() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))

    width, height = A4
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    pdf.setTitle("In Loving Memory of YuJung Chao | 永懷 曹玉蓉")
    pdf.setAuthor("The Chao Family")
    pdf.setSubject("Memorial website and Memory Wall invitation")

    pdf.setFillColor(PARCHMENT)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)

    # Quiet botanical forms echo the website's warm, organic background.
    pdf.setFillColor(PARCHMENT_DEEP)
    pdf.circle(42, height - 62, 118, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#E8E9DF"))
    pdf.circle(width + 12, 28, 142, fill=1, stroke=0)

    margin = 31
    pdf.setStrokeColor(GOLD)
    pdf.setLineWidth(0.7)
    pdf.rect(margin, margin, width - 2 * margin, height - 2 * margin, fill=0, stroke=1)
    pdf.setStrokeColor(SAGE)
    pdf.setLineWidth(0.35)
    pdf.rect(margin + 5, margin + 5, width - 2 * margin - 10, height - 2 * margin - 10, fill=0, stroke=1)

    centered_text(pdf, "IN LOVING MEMORY", height - 67, "Helvetica", 9, GOLD_DEEP)
    pdf.setStrokeColor(GOLD)
    pdf.setLineWidth(0.7)
    pdf.line(width / 2 - 76, height - 76, width / 2 - 18, height - 76)
    pdf.circle(width / 2, height - 76, 2, fill=0, stroke=1)
    pdf.line(width / 2 + 18, height - 76, width / 2 + 76, height - 76)

    portrait_width = 126
    portrait_height = 157.5
    portrait_x = (width - portrait_width) / 2
    portrait_y = height - 252
    pdf.setFillColor(GOLD)
    pdf.ellipse(portrait_x - 3, portrait_y - 3, portrait_x + portrait_width + 3, portrait_y + portrait_height + 3, fill=1, stroke=0)
    pdf.drawImage(
        make_oval_portrait(PORTRAIT),
        portrait_x,
        portrait_y,
        portrait_width,
        portrait_height,
        preserveAspectRatio=True,
        mask="auto",
    )

    centered_text(pdf, "曹玉蓉", height - 289, "STSong-Light", 29)
    centered_text(pdf, "YuJung Chao", height - 311, "Times-Roman", 17, GOLD_DEEP)
    centered_text(pdf, "1926  ·  2026", height - 333, "Helvetica", 9, HexColor("#69635C"))
    centered_text(pdf, "一生溫柔，滿載恩慈。", height - 359, "STSong-Light", 12, INK)
    centered_text(pdf, "A life measured in kindness.", height - 377, "Times-Italic", 10.5, HexColor("#69635C"))

    pdf.setStrokeColor(GOLD)
    pdf.setLineWidth(0.6)
    pdf.line(112, height - 397, width - 112, height - 397)

    centered_text(pdf, "誠摯邀請您造訪紀念網站", height - 426, "STSong-Light", 16)
    centered_text(pdf, "Please visit her memorial website", height - 447, "Times-Roman", 13, INK)
    centered_text(pdf, "回顧玉蓉的一生、照片與珍貴時光", height - 470, "STSong-Light", 10, HexColor("#5C5751"))
    centered_text(pdf, "Remember her life through stories, photos, and treasured moments.", height - 486, "Helvetica", 8.5, HexColor("#5C5751"))

    card_width = 178
    gap = 22
    cards_y = 117
    left_x = (width - 2 * card_width - gap) / 2
    draw_qr_card(pdf, left_x, cards_y, card_width, make_qr(ZH_URL), "繁體中文", "SCAN FOR CHINESE", ZH_URL)
    draw_qr_card(pdf, left_x + card_width + gap, cards_y, card_width, make_qr(EN_URL), "ENGLISH", "SCAN FOR ENGLISH", EN_URL)

    pdf.setFillColor(PARCHMENT_DEEP)
    pdf.roundRect(76, 62, width - 152, 40, 9, fill=1, stroke=0)
    centered_text(pdf, "也歡迎前往「回憶牆」留下想說的話或珍貴回憶", 86, "STSong-Light", 10.5)
    centered_text(pdf, "Visit the Memory Wall to share a message or a treasured memory.", 70, "Helvetica", 8.5, GOLD_DEEP)

    pdf.showPage()
    pdf.save()


if __name__ == "__main__":
    build_poster()
    print(OUTPUT)
