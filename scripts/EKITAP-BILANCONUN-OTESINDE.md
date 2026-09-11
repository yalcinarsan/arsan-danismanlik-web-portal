# E-kitap: "Bilançonun Ötesinde" (Şirket Analizi serisi)

9 bölümlük "Bilançonun Ötesinde: Bir Şirketi Anlamak" dizisini tek parça bir
**PDF** ve **Word (.docx)** e-kitaba çeviren pipeline. (Elektrifikasyon serisi için
olan `e-kitap-pdf.mjs` + `npm run e-kitap` ile aynı mantık; bu, 9 bölümlük seriye
uyarlanmış ve hero açılış + Word çıktısı eklenmiş hali.)

## Tek komut

```bash
npm run kitap
```

Sırayla şunları çalıştırır (tek tek de çağrılabilir):

| Adım | Komut | Ne yapar |
|---|---|---|
| 1 | `npm run kitap:birlestir` | 9 vault bölümünü tek "Tek Parça" notuna toplar (`sirket-analizi-birlestir.mjs`) |
| 2 | `npm run kitap:gorsel` | Kitap görsellerini hazırlar → `../cikti/kitap-gorsel/` (`e-kitap-gorsel-hazirla.py`) |
| 3 | `npm run kitap:pdf` | Markdown → HTML → headless Chrome → PDF, sonra sayfa no + yer imi (`e-kitap-sirket-analizi.mjs` + `e-kitap-numarala.py`) |
| 4 | `npm run kitap:word` | Aynı nottan tıklanabilir TOC'lu, iç köprülü Word (`e-kitap-word.mjs`) |

Çıktılar (repo DIŞINDA, `arsan danışmanlık web portalı/cikti/`):
`Bilanconun-Otesinde.pdf`, `Bilanconun-Otesinde.docx`.

## Akış / kaynak-of-truth

- **Kanonik kaynak = 9 ayrı vault bölüm notu** (site makaleleriyle aynı metin).
  Bir bölümü değiştirmek için o vault notunu düzenle, sonra `npm run kitap`.
- **Kitap-düzeyi metinler** (giriş + "Dokuz Bölümün Haritası" + kapanış imzası)
  `sirket-analizi-birlestir.mjs` içindeki `GIRIS` / `KAPANIS` sabitlerinde durur.
- Birleştirme her bölümün sonundaki gezinme listesi, imza, "bir sonraki bölümde"
  teşviki ve tekrar eden alt notu temizler; `[[wikilink]]` kardeş-bölüm atıflarını
  render sırasında belge-içi linke çevirir.

## Görseller — önemli

- **Grafik/diyagramlar canlı sitedeki temiz PNG/JPG'lerden** alınır
  (`public/images/articles/<slug>/NN-ad.*`). Bunlar keskin ve okunur.
  Vault attachments'taki sürümleri (ya da kuantize kopyaları) KULLANMA — bulanık olabilir.
- **Karakalem bölüm kapakları** vault attachments'tan küçültülür (hero için).

## Gereksinimler

- Node paketleri (kurulu): `marked`, `docx`, `image-size` (devDependencies).
- Python 3 + `pypdf`, `reportlab`, `Pillow` (sayfa numarası/yer imi ve görsel küçültme).
- Google Chrome (macOS'ta `/Applications/Google Chrome.app`) — PDF baskısı için.
- Vault: `~/Documents/Projects/Kitap Projeleri/Yazma Projeleri` (env ile değişebilir).

## Yol override (taşınabilirlik/test)

- `KITAP_VAULT` — vault kök dizini.
- `KITAP_TEKPARCA` — birleşik notun yolu (varsayılan: vault içinde).

Örn. birleştirmeyi notu ezmeden test etmek:
```bash
KITAP_TEKPARCA=/tmp/test.md npm run kitap:birlestir
```
