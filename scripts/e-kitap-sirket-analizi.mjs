/**
 * "Bilançonun Ötesinde" (Şirket Analizi) birleşik notunu markalı PDF e-kitaba çevirir.
 * e-kitap-pdf.mjs'in bu seriye uyarlanmış hali; ek olarak:
 *  - Her bölüm HERO açılışıyla başlar: tam-taşmalı (full-bleed) karakalem kapak,
 *    altında bölüm etiketi + başlık + alt başlık (kapak altyazısı).
 *  - Grafik/diyagram figürleri "kart" stiliyle (kum zemin, ince çerçeve, başlık).
 *  - Kardeş-bölüm [[atıf]]'ları belge-içi tıklanabilir linke döner; varlık
 *    linkleri düz metne.
 * Full-bleed hero'yu marjlı sayfayla birlikte kullanmak için: @page normal
 * marjlı, hero negatif marjla kenarlara taşıyor → sonraki sayfalar düzgün üst
 * marj alıyor (tek-belge, ayrı kapak yerine gövdenin ilk sayfası hero olabilir).
 *
 * Kullanım: node scripts/e-kitap-sirket-analizi.mjs  (sonra Chrome + numarala.py)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { marked } from 'marked';

const BURASI = dirname(fileURLToPath(import.meta.url));
const VAULT = process.env.KITAP_VAULT || '/Users/yalcinarsan/Documents/Projects/Kitap Projeleri/Yazma Projeleri';
const KAYNAK = process.env.KITAP_TEKPARCA || join(VAULT, 'Bilançonun Ötesinde - Tek Parça.md');
const CIKTI_DIZIN = resolve(BURASI, '../../cikti');

const KUNYE = {
  ustBaslik: 'Arsan Danışmanlık', baslik: 'Bilançonun Ötesinde',
  altBaslik: 'Bir Şirketi Anlamak', yazar: 'Yalçın Arsan',
  tarih: 'Mart – Eylül 2026', site: 'arsandanismanlik.com.tr',
};

const KENAR = 22, UST = 15, ALT = 18; // yan marj 0; UST/ALT @page üst/alt marjı, KENAR gövde yatay padding'i
const PUNTO = { govde: 11.5, satirArasi: 1.6, h1: 26, h2: 16.5, h3: 13, h4: 11.5, tablo: 9.5, tocBolum: 12.5, tocAlt: 10 };
const RENK = { kagit: '#faf7f2', murekkep: '#2c2620', metin: '#4a4238', vurgu: '#b5623c', kum: '#f1e9dd', kenarlik: '#e7ddcf', soluk: '#857a69', baglanti: '#8a5236' };

// Kardeş bölüm wikilink hedefi -> N (kitaptaki sıra).
const BOLUM_NO = new Map([
  ['Bir Şirketi Nasıl Okursunuz', 1], ['Bir Şirket Neye Sahiptir, Kime Borçludur', 2],
  ['Para Nereden Geliyor, Nereye Gidiyor', 3], ['Nakit Çok Şey Anlatır', 4],
  ['Aynı Kâr, Farklı Hikaye', 5],
  ['Kağıt Üstünde Sağlıklı, Gerçekte Sıkışık Şirketler - Verimlilik ve Likiditeyi Anlamak', 6],
  ['Bu Şirket Ucuz mu, Pahalı mı - Sermaye Yapısını ve Değerlemeyi Anlamak', 7],
  ['Batış Önceden Görülebilir mi - Başarının ve Başarısızlığın İşaretleri', 8],
  ['Rakamların Bittiği Yer - Dönüşüm Çağında Bir Şirketi Bütüncül Okumak', 9],
]);

function kimlik(metin, sira) {
  const t = metin.toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return `b${sira}-${t || 'bolum'}`;
}

// Wikilink -> kardeş bölüm için md linki (#bolum-N), varlık için düz metin. marked'dan ÖNCE.
function wikiCevir(md) {
  return md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, hedef, gor) => {
    const t = hedef.trim();
    if (BOLUM_NO.has(t)) { const n = BOLUM_NO.get(t); return `[${(gor || 'Bölüm ' + n)}](#bolum-${n})`; }
    return gor || t;
  });
}

function metniHazirla(ham) {
  return wikiCevir(ham.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/, '')).trim();
}

const govde = metniHazirla(readFileSync(KAYNAK, 'utf8'));

// Başlıkları render et + TOC topla. Bölüm H1'leri kararlı 'bolum-N' id alır.
const toc = [];
let sayac = 0, h1n = 0;
const renderer = new marked.Renderer();
renderer.heading = function (token) {
  const seviye = token.depth;
  const icHtml = this.parser.parseInline(token.tokens);
  const duz = String(token.text).replace(/<[^>]+>/g, '').trim();
  if (seviye === 1) {
    h1n += 1;
    if (h1n === 1) return `<h1 id="kitap-baslik">${icHtml}</h1>\n`;      // kitap başlığı (gövdeden çıkacak)
    const n = h1n - 1;
    toc.push({ level: 1, metin: `Bölüm ${n} — ${duz}`, id: `bolum-${n}` });
    return `<h1 id="bolum-${n}">${icHtml}</h1>\n`;
  }
  sayac += 1;
  const id = kimlik(duz, sayac);
  if (seviye === 2) toc.push({ level: 2, metin: duz, id });                // yalnızca H1+H2 içindekilerde
  return `<h${seviye} id="${id}">${icHtml}</h${seviye}>\n`;
};

marked.setOptions({ gfm: true, breaks: false });
let icerik = marked.parse(govde, { renderer });

// Kitap başlığı H1'ini gövdeden çıkar (kapakta var).
icerik = icerik.replace(/<h1 id="kitap-baslik">[\s\S]*?<\/h1>\s*/, '');

// Görsel yollarını mutlak yap (Chrome bulsun). Boyut için web-çözünürlüklü
// kopyaları kullan (IMG_DIR); yoksa vault attachments'a düş.
const IMG_DIR = resolve(BURASI, '../../cikti/kitap-gorsel'); // e-kitap-gorsel-hazirla.py çıktısı
const kaynakDizin = dirname(KAYNAK);
icerik = icerik.replace(/src="(?!https?:|file:)attachments\/([^"]+)"/g, (_m, f) => {
  const ad = decodeURIComponent(f);
  const kucuk = join(IMG_DIR, ad);
  const yol = existsSync(kucuk) ? kucuk : join(kaynakDizin, 'attachments', ad);
  return `src="${pathToFileURL(yol).href}"`;
});

// HERO açılış: her bölüm H1 + hemen ardından gelen karakalem figürünü birleştir.
let heroSay = 0;
icerik = icerik.replace(
  /<h1 id="bolum-(\d+)">([\s\S]*?)<\/h1>\s*<figure>\s*<img src="([^"]*karakalem[^"]*)"[^>]*>\s*(?:<figcaption>([\s\S]*?)<\/figcaption>\s*)?<\/figure>/g,
  (_m, n, baslik, src, cap) => {
    heroSay += 1;
    return `<section class="bolum-acilis" id="bolum-${n}">
  <div class="hero"><img src="${src}" alt=""></div>
  <div class="acilis-metin">
    <div class="etiket">Bölüm ${n}</div>
    <div class="cizgi-acilis"></div>
    <h1 class="acilis-h1">${baslik}</h1>
    ${cap ? `<div class="altbaslik">${cap}</div>` : ''}
  </div>
</section>`;
  });

// İçindekiler
const tocHtml = toc.map((t) => {
  const sinif = t.level === 1 ? 'toc-bolum' : 'toc-alt';
  return `<li class="${sinif}"><a href="#${t.id}">${t.metin}</a></li>`;
}).join('\n');

const stil = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Inter, -apple-system, Helvetica, sans-serif; font-size: ${PUNTO.govde}pt; line-height: ${PUNTO.satirArasi}; color: ${RENK.metin}; background: #fff; }

  /* Kapak */
  .kapak { width: 210mm; height: 297mm; background: ${RENK.murekkep}; color: ${RENK.kagit}; padding: 48mm 26mm 30mm; display: flex; flex-direction: column; justify-content: space-between; }
  .kapak .ust { font-size: 10pt; letter-spacing: .22em; text-transform: uppercase; color: ${RENK.vurgu}; font-weight: 600; }
  .kapak h1 { font-family: Fraunces, Georgia, serif; font-weight: 600; font-size: 40pt; line-height: 1.08; margin: 14mm 0 6mm; color: ${RENK.kagit}; }
  .kapak .alt { font-family: Fraunces, Georgia, serif; font-size: 17pt; color: #d3ccc1; line-height: 1.3; }
  .kapak .cizgi { width: 46mm; height: 3px; background: ${RENK.vurgu}; border-radius: 2px; margin: 12mm 0; }
  .kapak .kunye { font-size: 11pt; color: #cac2b7; line-height: 1.7; }

  /* İçindekiler */
  .toc { page-break-after: always; }
  .toc > h2 { font-family: Fraunces, Georgia, serif; font-size: 22pt; color: ${RENK.murekkep}; margin: 0 0 2mm; font-weight: 600; page-break-before: avoid; }
  .toc .cizgi { width: 100%; height: 2px; background: ${RENK.vurgu}; margin-bottom: 8mm; }
  .toc ul { list-style: none; margin: 0; padding: 0; }
  .toc a { color: inherit; text-decoration: none; }
  .toc-bolum { font-family: Fraunces, Georgia, serif; font-size: ${PUNTO.tocBolum}pt; font-weight: 600; color: ${RENK.murekkep}; margin: 5mm 0 1.5mm; }
  .toc-alt { font-size: ${PUNTO.tocAlt}pt; color: ${RENK.soluk}; margin: 0 0 .8mm 6mm; }

  /* Gövde yatay padding'i — yan marj @page'de 0, buradan geliyor */
  .pad { padding: 0 ${KENAR}mm; }

  /* Bölüm HERO açılışı — hero yalnızca YATAY negatif marjla tam sayfa genişliğine taşar
     (dikey negatif marj yok; sayfa kırılmasıyla çakışmıyor, sonraki sayfalar düzgün marj alıyor) */
  .bolum-acilis { page-break-before: always; }
  .hero { margin: 0 -${KENAR}mm 9mm; overflow: hidden; background: ${RENK.kenarlik}; }
  .hero img { width: 100%; height: auto; display: block; }
  .acilis-metin { padding-top: 2mm; }
  .etiket { font-weight: 600; font-size: 10.5pt; letter-spacing: .24em; text-transform: uppercase; color: ${RENK.vurgu}; margin: 0 0 4mm; }
  .cizgi-acilis { width: 26mm; height: 2.5px; background: ${RENK.vurgu}; border-radius: 2px; margin: 0 0 5mm; }
  h1.acilis-h1 { font-family: Fraunces, Georgia, serif; font-weight: 600; font-size: ${PUNTO.h1}pt; line-height: 1.12; color: ${RENK.murekkep}; margin: 0 0 5mm; page-break-after: avoid; }
  .altbaslik { font-family: Fraunces, Georgia, serif; font-style: italic; font-size: 13pt; color: ${RENK.soluk}; line-height: 1.38; margin: 0 0 8mm; }

  /* Gövde başlıkları — bölüm içi başlıklarda sayfa kırma YOK (akış) */
  h2 { font-family: Fraunces, Georgia, serif; font-weight: 600; font-size: ${PUNTO.h2}pt; color: ${RENK.murekkep}; margin: 8mm 0 3mm; page-break-after: avoid; }
  h3 { font-family: Fraunces, Georgia, serif; font-weight: 600; font-size: ${PUNTO.h3}pt; color: ${RENK.murekkep}; margin: 6mm 0 2mm; page-break-after: avoid; }
  h4 { font-family: Inter, sans-serif; font-weight: 600; font-size: ${PUNTO.h4}pt; color: ${RENK.murekkep}; margin: 5mm 0 1.5mm; page-break-after: avoid; }
  p { margin: 0 0 3.2mm; orphans: 3; widows: 3; }
  strong { color: ${RENK.murekkep}; font-weight: 600; }
  em { color: ${RENK.vurgu}; font-style: italic; }
  a { color: ${RENK.baglanti}; text-decoration: none; }

  ul, ol { margin: 0 0 3.5mm; padding-left: 6mm; }
  li { margin: 0 0 1.4mm; }
  li::marker { color: ${RENK.vurgu}; }

  blockquote { margin: 4mm 0; padding: 2mm 0 2mm 5mm; border-left: 2.5px solid ${RENK.vurgu}; color: ${RENK.murekkep}; font-style: italic; page-break-inside: avoid; }

  table { border-collapse: collapse; width: 100%; margin: 4mm 0; font-size: ${PUNTO.tablo}pt; page-break-inside: avoid; }
  th, td { border: 1px solid ${RENK.kenarlik}; padding: 2mm 2.5mm; text-align: left; vertical-align: top; }
  th { background: ${RENK.kum}; color: ${RENK.murekkep}; font-weight: 600; }

  /* Figür kartı (grafik/diyagram) */
  figure { margin: 6mm auto; text-align: center; background: ${RENK.kum}; border: 1px solid ${RENK.kenarlik}; border-radius: 6px; padding: 4mm 4mm 3mm; page-break-inside: avoid; }
  figure img { max-width: 100%; max-height: 150mm; margin: 0 auto; border-radius: 3px; display: block; }
  figcaption { font-size: 9pt; color: ${RENK.soluk}; font-style: italic; margin-top: 2.5mm; line-height: 1.4; }

  img { max-width: 100%; height: auto; display: block; margin: 5mm auto; }
  hr { border: none; border-top: 1px solid ${RENK.kenarlik}; margin: 7mm 0; }
  code { background: ${RENK.kum}; padding: .5mm 1mm; border-radius: 2px; font-size: 9pt; }
`;

const fontDizin = pathToFileURL(join(BURASI, 'fontlar')).href;
const FONT_CSS = `
@font-face { font-family: "Inter"; src: url("${fontDizin}/Inter-1.ttf") format("truetype"); font-weight: 400; }
@font-face { font-family: "Inter"; src: url("${fontDizin}/Inter-2.ttf") format("truetype"); font-weight: 600; }
@font-face { font-family: "Fraunces"; src: url("${fontDizin}/Fraunces-1.ttf") format("truetype"); font-weight: 400; }
@font-face { font-family: "Fraunces"; src: url("${fontDizin}/Fraunces-2.ttf") format("truetype"); font-weight: 600; }
`;

const KAFA = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${KUNYE.baslik}</title>`;

const kapakHtml = `${KAFA}
<style>@page { size: A4; margin: 0; }
${FONT_CSS}${stil}</style></head><body>
<section class="kapak">
  <div class="ust">${KUNYE.ustBaslik}</div>
  <div><h1>${KUNYE.baslik}</h1><div class="alt">${KUNYE.altBaslik}</div><div class="cizgi"></div></div>
  <div class="kunye">${KUNYE.yazar}<br>${KUNYE.tarih}<br>${KUNYE.site}</div>
</section></body></html>`;

const govdeHtml = `${KAFA}
<style>@page { size: A4; margin: ${UST}mm 0 ${ALT}mm 0; }
${FONT_CSS}${stil}</style></head><body>
<div class="pad">
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
</div>
</body></html>`;

mkdirSync(CIKTI_DIZIN, { recursive: true });
writeFileSync(join(CIKTI_DIZIN, 'kapak.html'), kapakHtml, 'utf8');
writeFileSync(join(CIKTI_DIZIN, 'govde.html'), govdeHtml, 'utf8');
writeFileSync(join(CIKTI_DIZIN, 'icindekiler.json'), JSON.stringify(toc), 'utf8');

console.log(`✓ kapak.html + govde.html + icindekiler.json → ${CIKTI_DIZIN}`);
console.log(`  ${toc.filter((t) => t.level === 1).length} bölüm · ${heroSay} hero açılış · ${toc.length} içindekiler girdisi`);
