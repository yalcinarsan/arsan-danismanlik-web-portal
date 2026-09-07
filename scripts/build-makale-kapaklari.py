#!/usr/bin/env python3
"""Onaylanan karakalem makale kapaklarından web ve paylaşım sürümleri üretir."""

from pathlib import Path

from PIL import Image


KOK = Path(__file__).resolve().parents[1]
GORSEL_KOKU = KOK / "public" / "images" / "articles"
MASAUSTU_GENISLIK = 1774
MOBIL_GENISLIK = 960
PAYLASIM_BOYUTU = (1200, 630)
KAGIT_RENGI = (244, 239, 229)


def yeniden_boyutlandir(gorsel: Image.Image, genislik: int) -> Image.Image:
    yukseklik = round(gorsel.height * genislik / gorsel.width)
    return gorsel.resize((genislik, yukseklik), Image.Resampling.LANCZOS)


def kapak_surumu_uret(kaynak: Path) -> None:
    with Image.open(kaynak) as acilan:
        gorsel = acilan.convert("RGB")

        masaustu = kaynak.with_suffix(".webp")
        yeniden_boyutlandir(gorsel, MASAUSTU_GENISLIK).save(
            masaustu,
            "WEBP",
            quality=84,
            method=6,
        )

        mobil = kaynak.with_name(f"{kaynak.stem}-mobile.webp")
        yeniden_boyutlandir(gorsel, MOBIL_GENISLIK).save(
            mobil,
            "WEBP",
            quality=82,
            method=6,
        )

        paylasim = kaynak.with_name(f"{kaynak.stem}-og.jpg")
        paylasim_gorseli = yeniden_boyutlandir(gorsel, PAYLASIM_BOYUTU[0])
        tuval = Image.new("RGB", PAYLASIM_BOYUTU, KAGIT_RENGI)
        tuval.paste(paylasim_gorseli, (0, (PAYLASIM_BOYUTU[1] - paylasim_gorseli.height) // 2))
        tuval.save(
            paylasim,
            "JPEG",
            quality=88,
            optimize=True,
            progressive=True,
            subsampling=0,
        )

        print(f"Üretildi: {kaynak.relative_to(KOK)}")


def main() -> None:
    kaynaklar = sorted(GORSEL_KOKU.glob("*/00-karakalem-*.png"))
    if not kaynaklar:
        raise SystemExit("Onaylanmış karakalem kapak bulunamadı.")

    for kaynak in kaynaklar:
        kapak_surumu_uret(kaynak)


if __name__ == "__main__":
    main()
