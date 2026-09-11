#!/usr/bin/env python3
"""
Kitap (PDF + Word) için görselleri hazırlar -> cikti/kitap-gorsel/.

- Grafikler/diyagramlar: canlı sitedeki TEMIZ PNG'ler doğrudan kopyalanır
  (public/images/articles/<slug>/NN-ad.png). Bunlar zaten web için optimize,
  keskin ve okunur. (Vault'taki eski/kuantize sürümleri KULLANMA — bulanık.)
- Karakalem bölüm kapakları: vault attachments'tan küçültülür (hero için).
  Çizim oldukları için 256-renk paleti sorun değil, boyutu düşürür.

Dosya adları vault referanslarıyla uyumlu: bts-<bölüm>-<NN>-<ad>.png

Kullanım: python3 scripts/e-kitap-gorsel-hazirla.py
Yol override: KITAP_VAULT
"""
import os, glob, shutil
from PIL import Image

BURASI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(BURASI)                                    # arsandanismanlik-web
SITE = os.path.join(REPO, "public", "images", "articles")
VAULT = os.environ.get("KITAP_VAULT",
                       "/Users/yalcinarsan/Documents/Projects/Kitap Projeleri/Yazma Projeleri")
ATT = os.path.join(VAULT, "attachments")
OUT = os.path.abspath(os.path.join(REPO, "..", "cikti", "kitap-gorsel"))

# Bölüm no -> sitedeki görsel klasörü (slug'ın "beyond-the-balance-sheet-0N-" öneki atılmış hali)
FOLDERS = {
    1: "bir-sirketi-nasil-okursunuz",
    2: "bir-sirket-neye-sahiptir-kime-borcludur",
    3: "para-nereden-geliyor-nereye-gidiyor",
    4: "nakit-cok-sey-anlatir",
    5: "ayni-kar-farkli-hikaye",
    6: "verimlilik-ve-likidite",
    7: "sermaye-yapisi-ve-degerleme",
    8: "basari-ve-basarisizlik-isaretleri",
    9: "rakamlarin-bittigi-yer",
}

os.makedirs(OUT, exist_ok=True)
for f in glob.glob(os.path.join(OUT, "*.png")) + glob.glob(os.path.join(OUT, "*.jpg")) + glob.glob(os.path.join(OUT, "*.jpeg")):
    os.remove(f)

grafik = 0
for cc, fol in FOLDERS.items():
    d = os.path.join(SITE, fol)
    if not os.path.isdir(d):
        print(f"  ! klasör yok: {fol}")
        continue
    dosyalar = sorted(glob.glob(os.path.join(d, "[0-9][0-9]-*.png"))
                      + glob.glob(os.path.join(d, "[0-9][0-9]-*.jpg"))
                      + glob.glob(os.path.join(d, "[0-9][0-9]-*.jpeg")))
    for p in dosyalar:
        b = os.path.basename(p)
        if b[:2] == "00":          # karakalem kapak (sitede .webp) — aşağıda vault'tan
            continue
        shutil.copy(p, os.path.join(OUT, f"bts-{cc:02d}-{b}"))
        grafik += 1

kapak = 0
for p in glob.glob(os.path.join(ATT, "bts-*-00-karakalem*.png")):
    im = Image.open(p)
    W = 1200
    if im.width > W:
        im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    im.convert("RGB").quantize(colors=256, method=Image.FASTOCTREE).save(
        os.path.join(OUT, os.path.basename(p)), optimize=True)
    kapak += 1

toplam = sum(os.path.getsize(os.path.join(OUT, x)) for x in os.listdir(OUT)) / 1024 / 1024
print(f"✓ grafik (temiz site): {grafik} · karakalem (küçültülmüş): {kapak} · toplam {toplam:.1f} MB -> {OUT}")
