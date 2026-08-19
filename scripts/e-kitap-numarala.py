"""
Chrome'un ürettiği ham PDF'e alt bilgi (marka + sayfa numarası) damgalar ve
kenar çubuğunu besleyen yer imi (outline) ağacını kurar.

Neden ayrı adım: Chrome, CSS'in @page margin box'larını (sayfa numarası için
gereken `counter(page)`) desteklemiyor. Kendi header/footer'ı ise dosya yolunu
basıyor, kullanılamaz. Bu yüzden numara sonradan reportlab ile üstüne çiziliyor.
Chrome ayrıca başlıklardan yer imi de üretmiyor; o da burada ekleniyor.

Yazı tipi Arial: Helvetica'da Türkçe glifler (İ, ş, ğ) eksik — bu projede daha
önce CV düzenlemesinde aynı sorun yaşandı, çözüm buydu.

Kullanım: python3 scripts/e-kitap-numarala.py <kapak.pdf> <govde.pdf> <cikti.pdf>
"""
import json
import os
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


def yer_imlerini_kur(yazici: PdfWriter, govde_yol: str, kaydirma: int) -> None:
    """
    PDF okuyucuların kenar çubuğundaki "Yer imleri" panelini besleyen outline
    ağacını kurar. Küçük resim şeridinin altına bölüm adı yazmanın PDF'teki
    karşılığı `/PageLabels`'dır ama o yalnızca "önek + numara" alıyor (B1-1
    gibi) ve her okuyucu göstermiyor; yer imi ağacı hem tam başlığı taşıyor hem
    de her okuyucuda çalışıyor. Bu yüzden `/PageLabels`'a girilmedi.

    Hedef sayfalar zaten `/Names/Dests` içinde hazır — yeniden hesaplanmıyor,
    gövdeden okunuyor. `kaydirma`, gövdenin başına eklenen kapak sayfası kadar
    (1) ileri kaydırır: hedefler gövde belgesindeki indekse göre çözülüyor.

    Başlık hiyerarşisi PDF'te yok, `icindekiler.json`'dan geliyor (üreteç
    e-kitap-pdf.mjs yazıyor, gövde PDF'iyle aynı dizinde).
    """
    toc_yol = os.path.join(os.path.dirname(os.path.abspath(govde_yol)), "icindekiler.json")
    if not os.path.exists(toc_yol):
        print(f"  ! {os.path.basename(toc_yol)} yok — yer imi ağacı atlandı")
        return

    with open(toc_yol, encoding="utf-8") as f:
        toc = json.load(f)

    okuyucu = PdfReader(govde_yol)
    hedefler = okuyucu.named_destinations

    son_bolum = None
    atlanan = []

    for giris in toc:
        hedef = hedefler.get(f"/{giris['id']}") or hedefler.get(giris["id"])
        if hedef is None:
            atlanan.append(giris["id"])
            continue

        # Basılı içindekiler iki kademeli: level<=2 "bölüm", level 3 "alt
        # başlık" (bkz. e-kitap-pdf.mjs'deki toc-bolum / toc-alt sınıfları).
        # Yer imi ağacı da aynı modeli izliyor ki iki liste birbirini tutsun.
        #
        # Markdown seviyesine birebir uyulsaydı metnin sonundaki "Kaynaklar ve
        # Referanslar" (H2) son bölümün ALTINA düşerdi — oysa kardeşi.
        bolum_mu = giris["level"] <= 2

        oge = yazici.add_outline_item(
            giris["metin"],
            okuyucu.get_destination_page_number(hedef) + kaydirma,
            parent=None if bolum_mu else son_bolum,
        )

        if bolum_mu:
            son_bolum = oge

    # Belge açılırken kenar çubuğu doğrudan yer imi panelinde açılsın —
    # istenen "kenar çubuğunu navigasyon öğesi gibi kullanmak" bu.
    yazici.page_mode = "/UseOutlines"

    print(f"  {len(toc) - len(atlanan)}/{len(toc)} başlık yer imi ağacına eklendi")
    if atlanan:
        print(f"  ! hedefi bulunamayan başlık: {', '.join(atlanan)}")


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

    # Kapak başa eklendiği için gövdedeki hedef sayfa indeksleri 1 kayıyor.
    yer_imlerini_kur(yazici, govde_yol, kaydirma=1)

    # merge_page içerik akışlarını açıp bırakıyor, dosya 3x şişiyor.
    # Sıkıştırma bunu ham çıktının bile altına indiriyor (7.7MB → 2.8MB, <1 sn).
    for sayfa in yazici.pages:
        sayfa.compress_content_streams()
    yazici.compress_identical_objects()

    with open(cikti_yol, "wb") as f:
        yazici.write(f)

    boyut = os.path.getsize(cikti_yol) / 1_000_000
    print(f"✓ {toplam} sayfa damgalandı → {cikti_yol}")
    print(f"  kapak numarasız, gövde 1–{toplam - 1} · {boyut:.1f} MB")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit("kullanım: e-kitap-numarala.py <kapak.pdf> <govde.pdf> <cikti.pdf>")
    damgala(sys.argv[1], sys.argv[2], sys.argv[3])
