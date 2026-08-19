"""
Chrome'un ürettiği ham PDF'e alt bilgi (marka + sayfa numarası) damgalar.

Neden ayrı adım: Chrome, CSS'in @page margin box'larını (sayfa numarası için
gereken `counter(page)`) desteklemiyor. Kendi header/footer'ı ise dosya yolunu
basıyor, kullanılamaz. Bu yüzden numara sonradan reportlab ile üstüne çiziliyor.

Yazı tipi Arial: Helvetica'da Türkçe glifler (İ, ş, ğ) eksik — bu projede daha
önce CV düzenlemesinde aynı sorun yaşandı, çözüm buydu.

Kullanım: python3 scripts/e-kitap-numarala.py <ham.pdf> <cikti.pdf>
"""
import sys
from io import BytesIO

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ARIAL = "/System/Library/Fonts/Supplemental/Arial.ttf"
SOLUK = HexColor("#857a69")
MARKA = "Otomotivde Elektrifikasyon · Arsan Danışmanlık"

# 20mm kenar boşluğu, alt bilgi sayfanın altından ~14mm yukarıda
MM = 72 / 25.4
SOL = 20 * MM
SAG = A4[0] - 20 * MM
ALT = 14 * MM


def damgala(kapak_yol: str, govde_yol: str, cikti_yol: str) -> None:
    pdfmetrics.registerFont(TTFont("Arial", ARIAL))

    # Kapak ve gövde ayrı basılıyor (kapak kenar boşluksuz, gövde boşluklu);
    # burada birleşiyorlar. Bkz. e-kitap-pdf.mjs'deki gerekçe.
    #
    # ÖNEMLİ: gövde clone_from ile açılıyor, sayfa sayfa kopyalanmıyor.
    # add_page belgenin /Names/Dests ağacını taşımıyor; içindekilerdeki 56
    # bağlantının hedefi kayboluyor ve TOC tıklanmaz hale geliyordu.
    # clone_from tüm belge yapısını koruyor, kapak da başa ekleniyor.
    # (Hedefler sayfaya dolaylı referansla bağlı olduğu için başa sayfa
    # eklemek numaralamayı bozmuyor.)
    yazici = PdfWriter(clone_from=govde_yol)
    kapak = PdfReader(kapak_yol)
    yazici.insert_page(kapak.pages[0], 0)

    toplam = len(yazici.pages)

    # Tüm alt bilgiler TEK bir katman belgesinde üretiliyor: yazı tipi böylece
    # bir kez gömülüyor. Sayfa başına ayrı canvas açmak dosyayı 3x şişiriyordu.
    tampon = BytesIO()
    c = canvas.Canvas(tampon, pagesize=A4)
    for i in range(1, toplam):
        c.setFont("Arial", 7.5)
        c.setFillColor(SOLUK)
        c.drawString(SOL, ALT, MARKA)
        c.drawRightString(SAG, ALT, str(i))
        c.showPage()
    c.save()
    tampon.seek(0)
    katmanlar = PdfReader(tampon).pages

    # Kapak (1. sayfa) numarasız kalır; numaralandırma kapaktan sonra 1'den başlar.
    for i, sayfa in enumerate(yazici.pages):
        if i > 0:
            sayfa.merge_page(katmanlar[i - 1])

    # merge_page içerik akışlarını açıp bırakıyor, dosya 3x şişiyor.
    # Sıkıştırma bunu ham çıktının bile altına indiriyor (7.7MB → 2.8MB, <1 sn).
    for sayfa in yazici.pages:
        sayfa.compress_content_streams()
    yazici.compress_identical_objects()

    with open(cikti_yol, "wb") as f:
        yazici.write(f)

    boyut = __import__("os").path.getsize(cikti_yol) / 1_000_000
    print(f"✓ {toplam} sayfa damgalandı → {cikti_yol}")
    print(f"  kapak numarasız, gövde 1–{toplam - 1} · {boyut:.1f} MB")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit("kullanım: e-kitap-numarala.py <kapak.pdf> <govde.pdf> <cikti.pdf>")
    damgala(sys.argv[1], sys.argv[2], sys.argv[3])
