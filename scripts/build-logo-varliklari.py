"""
Bütün logo türevlerini tek bir master dosyadan üretir.

Master: src/varliklar/logo-master.png — 3543x990, RGBA, gerçek şeffaflık.
Yalçın'ın arşivinden geldi (2012 tarihli orijinal). Sitedeki eski 248x70 ve
70x70 dosyalar da bunun küçültülmüşleriydi; artık türevler burada, tek
kaynaktan ve tekrarlanabilir şekilde üretiliyor.

Neden script: logo bir gün değişirse tek dosyayı değiştirip bunu çalıştırmak
yeterli. Elle küçültmede hangi dosyanın nereden geldiği kayboluyor — nitekim
kayıptı.

Kullanım: npm run gorsel:logo
"""
import os

from PIL import Image

BURASI = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(BURASI)
MASTER = os.path.join(KOK, 'src/varliklar/logo-master.png')
GORSEL = os.path.join(KOK, 'public/images')

PAPER = (250, 247, 242, 255)   # marka zemini, tailwind.config.mjs

# Amblemin master içindeki sınırı (ölçülerek bulundu, sabit).
AMBLEM = (158, 102, 1231, 847)


def yaz(im, ad):
    yol = os.path.join(GORSEL, ad)
    im.save(yol, 'PNG', optimize=True)
    print(f'  ✓ {ad:<28} {im.size[0]}x{im.size[1]}  {os.path.getsize(yol) // 1024} KB')


def olcekle(im, yukseklik):
    o = yukseklik / im.size[1]
    return im.resize((round(im.size[0] * o), yukseklik), Image.LANCZOS)


def kare_yerlestir(icerik, kenar, zemin, dolgu_orani=0.72):
    """İçeriği oranını bozmadan kare tuvale ortalar."""
    hedef = round(kenar * dolgu_orani)
    o = min(hedef / icerik.size[0], hedef / icerik.size[1])
    kucuk = icerik.resize((round(icerik.size[0] * o), round(icerik.size[1] * o)), Image.LANCZOS)
    tuval = Image.new('RGBA', (kenar, kenar), zemin)
    tuval.alpha_composite(kucuk, ((kenar - kucuk.size[0]) // 2, (kenar - kucuk.size[1]) // 2))
    return tuval


master = Image.open(MASTER).convert('RGBA')
amblem = master.crop(AMBLEM)
print(f'master {master.size[0]}x{master.size[1]} · amblem {amblem.size[0]}x{amblem.size[1]}')

# --- Nav logosu. Oran master'la aynı; eski dosya da tam tuval küçültmesiydi,
#     yani çözünürlük artıyor, yerleşim değişmiyor. Nav'da h-9 (36px) ile
#     gösteriliyor, 280px kaynak 3x retinada bile fazlasıyla yeterli.
yaz(olcekle(master, 280), 'logo-wordmark.png')

# --- Favicon. Şeffaf zemin: tarayıcı sekmesi açık da olsa koyu da olsa uyar.
yaz(kare_yerlestir(amblem, 256, (0, 0, 0, 0), 0.86), 'logo-mark.png')

# --- apple-touch-icon. Şeffaflık YOK: iOS şeffaf pikselleri siyaha çeviriyor,
#     o yüzden marka zeminine oturtuluyor. 180x180 Apple'ın istediği ölçü.
yaz(kare_yerlestir(amblem, 180, PAPER, 0.62).convert('RGB'), 'apple-touch-icon.png')

# --- Paylaşım görseli (og:image). Kapak değil: marka zemininde ölçülü logo.
#     Sosyal kartlar akışta ~500-600px görünüyor; 1200'lük tuvalde 440px logo
#     ekranda ~220px'e denk geliyor. Artık master'dan geldiği için tam net.
og = Image.new('RGBA', (1200, 630), PAPER)
logo = olcekle(master, round(440 * master.size[1] / master.size[0]))
og.alpha_composite(logo, ((1200 - logo.size[0]) // 2, (630 - logo.size[1]) // 2))
yaz(og.convert('RGB'), 'og-arsan.png')
