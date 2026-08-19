/**
 * Vault'taki tek parça yazıyı markalı bir PDF e-kitaba çevirir.
 *
 * Zincir: markdown -> (marked) HTML -> headless Chrome -> PDF
 *         -> sayfa numaraları Python tarafında damgalanır (e-kitap-numarala.py)
 *
 * Neden Chrome: pandoc/weasyprint/wkhtmltopdf kurulu değil, Chrome var ve
 * CSS'i (sayfa boyutu, kenar boşluğu, sayfa kırılmaları) tam destekliyor.
 * Chrome'un @page margin box'ları desteklememesi tek eksik — sayfa numarası
 * bu yüzden sonradan damgalanıyor.
 *
 * Kullanım: npm run e-kitap
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked } from 'marked';

const BURASI = dirname(fileURLToPath(import.meta.url));

const KAYNAK = '/Users/yalcinarsan/Documents/Projects/Kitap Projeleri/Yazma Projeleri/Otomotivde Elektrifikasyon - Tek Parça.md';
const CIKTI_DIZIN = resolve(BURASI, '../../cikti');

// Kapak ve künye bilgileri — metinden bağımsız, burada durur.
const KUNYE = {
  ustBaslik: 'Arsan Danışmanlık',
  baslik: 'Otomotivde Elektrifikasyon',
  altBaslik: 'Bir Sektörün Dönüşümü',
  yazar: 'Yalçın Arsan',
  tarih: 'Şubat – Temmuz 2026',
  site: 'arsandanismanlik.com.tr',
};

// Tipografi tek yerden ayarlanır. Gövdeyi değiştirirken başlıkları da
// orantılı taşı, yoksa h3 ile gövde birbirine girer.
// Sayfa yan boşluğu (mm). Büyütmek satır uzunluğunu kısaltır, okumayı
// rahatlatır; bedeli birkaç sayfa daha. 24mm'de satır ~78 karakter.
const KENAR = 24;

const PUNTO = {
  govde: 11.5,      // ana metin
  satirArasi: 1.6,
  h1: 25,           // bölüm başlığı
  h2: 18,
  h3: 13.5,         // alt başlık
  h4: 11.5,
  tablo: 9.5,
  tocBolum: 13,
  tocAlt: 10,
};

const RENK = {
  kagit: '#faf7f2',
  murekkep: '#2c2620',
  metin: '#4a4238',
  vurgu: '#b5623c',
  kum: '#f1e9dd',
  kenarlik: '#e7ddcf',
  soluk: '#857a69',
  // Bağlantılar için kısık terracotta. Tam vurgu rengi (#b5623c) gövde metninde
  // onlarca kez tekrarlanınca göz yoruyor; bu ton metinden ayırt ediliyor ama
  // bağırmıyor. Beyaz üstünde 6.3:1 — WCAG AA'nın üstünde.
  baglanti: '#8a5236',
};

/** Metin içi "…nci bölüm" göndermelerini bölüm sırasına çevirir. */
const SIRA_SAYISI = {
  birinci: 1, ikinci: 2, üçüncü: 3, dördüncü: 4, beşinci: 5, altıncı: 6,
};
// Büyük harfli biçimler ayrı yazılı: /i bayrağı Türkçe'de "İ"yi "i"ye eşlemiyor.
// Ek listesi UZUNDAN KISAYA sıralı — alternation ilk eşleşeni aldığı için "de"
// önce gelirse "bölümdeki"nin "ki"si bağlantının dışında kalıyor.
const GONDERME = /(Birinci|birinci|İkinci|ikinci|Üçüncü|üçüncü|Dördüncü|dördüncü|Beşinci|beşinci|Altıncı|altıncı)(\s+bölüm(?:deki|lerde|den|de|ler|ün|ü|e)?)/g;

/** Başlık metninden URL/anchor güvenli kimlik üretir (Türkçe karakterler dahil). */
function kimlik(metin, sira) {
  const t = metin
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `b${sira}-${t || 'bolum'}`;
}

/**
 * Metin içindeki "Birinci bölümde gösterdiğim gibi…" tarzı düz yazı
 * göndermelerini ilgili bölüme tıklanabilir hale getirir.
 *
 * Kaynak metinde hiç markdown linki yok; bağlantılar burada, üretim sırasında
 * kuruluyor. Böylece vault'taki yazı temiz kalıyor — Yalçın Obsidian'da
 * anchor id'leriyle uğraşmadan yazmaya devam ediyor.
 *
 * Yalnızca metin düğümlerinde çalışır (HTML etiketlerinin içine dokunmaz) ve
 * bölümün kendine gönderme yapmasını atlar.
 */
function icGondermeleriBagla(html, bolumler) {
  let suanki = null;   // içinde bulunduğumuz bölümün id'si
  let sayi = 0;
  const atlanan = [];

  const cikti = html.split(/(<[^>]+>)/).map((parca) => {
    if (parca.startsWith('<')) {
      const m = parca.match(/^<h1 id="([^"]+)"/);
      if (m) suanki = m[1];
      return parca;
    }
    return parca.replace(GONDERME, (tam, sira, kuyruk) => {
      const hedef = bolumler[SIRA_SAYISI[sira.toLocaleLowerCase('tr')] - 1];
      if (!hedef) return tam;
      if (hedef.id === suanki) { atlanan.push(tam.trim()); return tam; }
      sayi += 1;
      return `<a class="gonderme" href="#${hedef.id}">${sira}${kuyruk}</a>`;
    });
  }).join('');

  return { html: cikti, sayi, atlanan };
}

function metniTemizle(ham) {
  return ham
    // YAML frontmatter
    .replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/, '')
    // Obsidian wikilink: [[Hedef|Görünen]] ve [[Hedef]] -> düz metin
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .trim();
}

function uret() {
  const ham = readFileSync(KAYNAK, 'utf8');
  const govde = metniTemizle(ham);

  // Başlıklara kimlik ver, TOC'u aynı geçişte topla.
  // marked 18: renderer.heading tek bir token nesnesi alıyor ({depth, text, tokens}),
  // eski (text, level, raw) imzası değil. Sürüm yükselirse burası kırılan ilk yer olur.
  const toc = [];
  let sayac = 0;
  const renderer = new marked.Renderer();
  renderer.heading = function (token) {
    const seviye = token.depth;
    const icHtml = this.parser.parseInline(token.tokens);
    const duz = String(token.text).replace(/<[^>]+>/g, '').trim();
    if (seviye <= 3) {
      sayac += 1;
      const id = kimlik(duz, sayac);
      toc.push({ level: seviye, metin: duz, id });
      return `<h${seviye} id="${id}">${icHtml}</h${seviye}>\n`;
    }
    return `<h${seviye}>${icHtml}</h${seviye}>\n`;
  };

  marked.setOptions({ gfm: true, breaks: false });
  let icerik = marked.parse(govde, { renderer });

  // İlk H1 kapakta zaten var — gövdeden çıkar ki iki kez görünmesin.
  icerik = icerik.replace(/<h1 id="[^"]*">[\s\S]*?<\/h1>\s*/, '');
  const ilk = toc.findIndex((t) => t.level === 1);
  if (ilk === 0) toc.shift();

  // Görsel yolu vault'a göre göreli; Chrome'un bulabilmesi için mutlak yap.
  const kaynakDizin = dirname(KAYNAK);
  icerik = icerik.replace(/src="(?!https?:|file:)([^"]+)"/g, (_m, p) =>
    `src="${pathToFileURL(join(kaynakDizin, decodeURIComponent(p))).href}"`
  );

  // Bölümler sırayla: "birinci bölüm" = ilk H1, "ikinci bölüm" = ikinci H1 …
  const bolumler = toc.filter((t) => t.level === 1);
  const bagli = icGondermeleriBagla(icerik, bolumler);
  icerik = bagli.html;

  const tocHtml = toc.map((t) => {
    const sinif = t.level === 1 ? 'toc-bolum' : t.level === 2 ? 'toc-bolum' : 'toc-alt';
    return `<li class="${sinif}"><a href="#${t.id}">${t.metin}</a></li>`;
  }).join('\n');

  // Kapak ve gövde AYRI belgeler olarak üretiliyor, sonra pypdf ile birleşiyor.
  // Sebep: kapağın tam taşmalı (kenar boşluksuz) olması gerekiyor, gövdenin ise
  // kenar boşluklu. Chrome'da tek belge içinde bunu yapmanın yolu yok —
  // @page :first, isimli sayfa ve negatif margin denendi, üçü de işlemedi.
  // Ayrı basıp birleştirmek metni görsele çevirmediği için başlık aranabilir kalıyor.
  const stil = `

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Inter, -apple-system, Helvetica, sans-serif;
    font-size: ${PUNTO.govde}pt; line-height: ${PUNTO.satirArasi}; color: ${RENK.metin};
    background: #fff;
  }

  /* --- Kapak: tam sayfa, koyu zemin --- */
  .kapak {
    width: 210mm; height: 297mm;
    background: ${RENK.murekkep}; color: ${RENK.kagit};
    padding: 48mm 26mm 30mm;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .kapak .ust { font-size: 10pt; letter-spacing: .22em; text-transform: uppercase; color: ${RENK.vurgu}; font-weight: 600; }
  .kapak h1 { font-family: Fraunces, Georgia, serif; font-weight: 600; font-size: 40pt; line-height: 1.08; margin: 14mm 0 6mm; color: ${RENK.kagit}; }
  /* opacity KULLANMA: Chrome saydam metni glif glif konumlandırıyor, PDF'te
     "A l t ı" gibi bölünüyor ve arama çalışmıyor. Onun yerine hazır ton. */
  .kapak .alt { font-family: Fraunces, Georgia, serif; font-size: 17pt; color: #d3ccc1; line-height: 1.3; }
  .kapak .cizgi { width: 46mm; height: 3px; background: ${RENK.vurgu}; border-radius: 2px; margin: 12mm 0; }
  .kapak .kunye { font-size: 11pt; color: #cac2b7; line-height: 1.7; }

  /* --- İçindekiler --- */
  .toc { page-break-after: always; }
  .toc h2 { font-family: Fraunces, Georgia, serif; font-size: 22pt; color: ${RENK.murekkep}; margin: 0 0 2mm; font-weight: 600; }
  .toc .cizgi { width: 100%; height: 2px; background: ${RENK.vurgu}; margin-bottom: 8mm; }
  .toc ul { list-style: none; margin: 0; padding: 0; }
  .toc a { color: inherit; text-decoration: none; }
  .toc-bolum { font-family: Fraunces, Georgia, serif; font-size: ${PUNTO.tocBolum}pt; font-weight: 600; color: ${RENK.murekkep}; margin: 5mm 0 1.5mm; }
  .toc-alt { font-size: ${PUNTO.tocAlt}pt; color: ${RENK.soluk}; margin: 0 0 .8mm 6mm; }

  /* --- Gövde --- */
  h1 { font-family: Fraunces, Georgia, serif; font-weight: 600; font-size: ${PUNTO.h1}pt; line-height: 1.15;
       color: ${RENK.murekkep}; margin: 0 0 6mm; padding-top: 2mm; page-break-after: avoid; }
  h2 { font-family: Fraunces, Georgia, serif; font-weight: 600; font-size: ${PUNTO.h2}pt; color: ${RENK.murekkep};
       margin: 9mm 0 3mm; page-break-after: avoid; }
  /* Sayfa kırma YALNIZCA gövdedeki başlıklarda. Genel h1/h2 kuralına konunca
     kapaktaki ve içindekilerdeki başlıklara da uygulanıyor, kapak ikiye
     bölünüyordu (bu hata bir kez yaşandı, tekrarlamasın). */
  main h1 { page-break-before: always; }
  main h1::after { content: ""; display: block; width: 100%; height: 2.5px; background: ${RENK.vurgu}; margin-top: 4mm; border-radius: 2px; }
  main h2 { page-break-before: always; }
  h3 { font-family: Fraunces, Georgia, serif; font-weight: 600; font-size: ${PUNTO.h3}pt; color: ${RENK.murekkep};
       margin: 7mm 0 2mm; page-break-after: avoid; }
  h4 { font-family: Inter, sans-serif; font-weight: 600; font-size: ${PUNTO.h4}pt; color: ${RENK.murekkep}; margin: 5mm 0 1.5mm; page-break-after: avoid; }
  p { margin: 0 0 3.2mm; orphans: 3; widows: 3; }
  strong { color: ${RENK.murekkep}; font-weight: 600; }
  em { color: ${RENK.vurgu}; font-style: italic; }
  a { color: ${RENK.baglanti}; text-decoration: none; }
  /* Metin içi bölüm göndermeleri: kalınlık/altçizgi yok, yalnızca ton farkı —
     akıcı okumayı bozmadan tıklanabilir olduğunu belli etsin. */
  a.gonderme { color: ${RENK.baglanti}; }

  ul, ol { margin: 0 0 3.5mm; padding-left: 6mm; }
  li { margin: 0 0 1.4mm; }
  li::marker { color: ${RENK.vurgu}; }

  blockquote { margin: 4mm 0; padding: 2mm 0 2mm 5mm; border-left: 2.5px solid ${RENK.vurgu};
               color: ${RENK.murekkep}; font-style: italic; page-break-inside: avoid; }

  table { border-collapse: collapse; width: 100%; margin: 4mm 0; font-size: ${PUNTO.tablo}pt; page-break-inside: avoid; }
  th, td { border: 1px solid ${RENK.kenarlik}; padding: 2mm 2.5mm; text-align: left; vertical-align: top; }
  th { background: ${RENK.kum}; color: ${RENK.murekkep}; font-weight: 600; }

  img { max-width: 100%; height: auto; display: block; margin: 5mm auto; page-break-inside: avoid; }

  hr { border: none; border-top: 1px solid ${RENK.kenarlik}; margin: 7mm 0; }

  code { background: ${RENK.kum}; padding: .5mm 1mm; border-radius: 2px; font-size: 9pt; }
`;

  // Fontlar YEREL dosyadan yükleniyor, Google Fonts CDN'inden değil.
  // Sebep: CDN'den gelen webfont'ları Chrome'un print yolu Type3 (harfleri çizim
  // olarak gömen) fonta çeviriyordu; Türkçe karakterler yedek fonta düşüp metin
  // "DANI Ş MANLIK" gibi bölünüyordu — yani PDF'te arama çalışmıyordu.
  // Yerel TTF ile Type0 gömülüyor, metin aranabilir kalıyor. Fontlar OFL/Apache
  // lisanslı (Google Fonts), depoda scripts/fontlar/ altında.
  const fontDizin = pathToFileURL(join(BURASI, 'fontlar')).href;
  const FONT_CSS = `
@font-face { font-family: "Inter"; src: url("${fontDizin}/Inter-1.ttf") format("truetype"); font-weight: 400; }
@font-face { font-family: "Inter"; src: url("${fontDizin}/Inter-2.ttf") format("truetype"); font-weight: 600; }
@font-face { font-family: "Fraunces"; src: url("${fontDizin}/Fraunces-1.ttf") format("truetype"); font-weight: 400; }
@font-face { font-family: "Fraunces"; src: url("${fontDizin}/Fraunces-2.ttf") format("truetype"); font-weight: 600; }
`;

  const BASLIK_HTML = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>${KUNYE.baslik}</title>`;

  const kapakHtml = `${BASLIK_HTML}
<style>
  @page { size: A4; margin: 0; }
${FONT_CSS}
${stil}
</style>
</head>
<body>
<section class="kapak">
  <div class="ust">${KUNYE.ustBaslik}</div>
  <div>
    <h1>${KUNYE.baslik}</h1>
    <div class="alt">${KUNYE.altBaslik}</div>
    <div class="cizgi"></div>
  </div>
  <div class="kunye">
    ${KUNYE.yazar}<br>
    ${KUNYE.tarih}<br>
    ${KUNYE.site}
  </div>
</section>
</body>
</html>`;

  const govdeHtml = `${BASLIK_HTML}
<style>
  @page { size: A4; margin: 22mm ${KENAR}mm 24mm ${KENAR}mm; }
${FONT_CSS}
${stil}
</style>
</head>
<body>
<section class="toc">
  <h2>İçindekiler</h2>
  <div class="cizgi"></div>
  <ul>
${tocHtml}
  </ul>
</section>

<main>
${icerik}
</main>
</body>
</html>`;

  mkdirSync(CIKTI_DIZIN, { recursive: true });
  writeFileSync(join(CIKTI_DIZIN, 'kapak.html'), kapakHtml, 'utf8');
  writeFileSync(join(CIKTI_DIZIN, 'govde.html'), govdeHtml, 'utf8');

  // Başlık hiyerarşisi yalnızca burada biliniyor — Chrome'un bastığı PDF'te
  // geriye sadece hedef adları (`/Names/Dests`) kalıyor, hangi başlığın hangi
  // başlığın altı olduğu kayboluyor. Yer imi ağacını e-kitap-numarala.py
  // kuruyor; ihtiyacı olan seviye bilgisini bu dosyadan okuyor.
  writeFileSync(join(CIKTI_DIZIN, 'icindekiler.json'), JSON.stringify(toc), 'utf8');

  const bolumSayisi = toc.filter((t) => t.level <= 2).length;
  console.log(`✓ kapak.html + govde.html + icindekiler.json yazıldı → ${CIKTI_DIZIN}`);
  console.log(`  ${bolumSayisi} bölüm, ${toc.length} başlık içindekilerde · yan boşluk ${KENAR}mm · gövde ${PUNTO.govde}pt`);
  console.log(`  ${bagli.sayi} metin içi bölüm göndermesi bağlandı`);
  if (bagli.atlanan.length) {
    console.log(`  ! kendine gönderme atlandı: ${bagli.atlanan.join(', ')}`);
  }
}

uret();
