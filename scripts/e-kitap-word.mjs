/**
 * "Bilançonun Ötesinde" birleşik notunu tıklanabilir TOC'li, iç köprülü,
 * figürlü bir Word (.docx) belgesine çevirir. Kaynak = vault Tek Parça notu.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  TableOfContents, InternalHyperlink, ExternalHyperlink, Bookmark, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, UnderlineType,
  Footer, PageNumber, PageBreak,
} from 'docx';
import is from 'image-size';
const imageSize = is.imageSize || is.default || is;

const BURASI = dirname(fileURLToPath(import.meta.url));
const VAULT = process.env.KITAP_VAULT || '/Users/yalcinarsan/Documents/Projects/Kitap Projeleri/Yazma Projeleri';
const KAYNAK = process.env.KITAP_TEKPARCA || join(VAULT, 'Bilançonun Ötesinde - Tek Parça.md');
const ATT = resolve(BURASI, '../../cikti/kitap-gorsel');   // e-kitap-gorsel-hazirla.py çıktısı
const CIKTI = resolve(BURASI, '../../cikti/Bilanconun-Otesinde.docx');

const INK = '2c2620', METIN = '3a3229', SOLUK = '857a69', VURGU = 'b5623c', LINK = '8a5236', KUM = 'f1e9dd', KENAR = 'e7ddcf';

// Bölüm sıra haritası (wikilink hedefi -> N). Sıra, kitaptaki bölüm sırasıyla aynı.
const BOLUM_NO = new Map([
  ['Bir Şirketi Nasıl Okursunuz', 1],
  ['Bir Şirket Neye Sahiptir, Kime Borçludur', 2],
  ['Para Nereden Geliyor, Nereye Gidiyor', 3],
  ['Nakit Çok Şey Anlatır', 4],
  ['Aynı Kâr, Farklı Hikaye', 5],
  ['Kağıt Üstünde Sağlıklı, Gerçekte Sıkışık Şirketler - Verimlilik ve Likiditeyi Anlamak', 6],
  ['Bu Şirket Ucuz mu, Pahalı mı - Sermaye Yapısını ve Değerlemeyi Anlamak', 7],
  ['Batış Önceden Görülebilir mi - Başarının ve Başarısızlığın İşaretleri', 8],
  ['Rakamların Bittiği Yer - Dönüşüm Çağında Bir Şirketi Bütüncül Okumak', 9],
]);

// ---- satır içi ayrıştırma ----------------------------------------------------
const TOKEN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_|`([^`]+)`/g;

function wikiRun(hedef, gorunen) {
  const t = hedef.trim();
  if (BOLUM_NO.has(t)) {
    const n = BOLUM_NO.get(t);
    return new InternalHyperlink({
      anchor: 'bolum' + n,
      children: [new TextRun({ text: gorunen || ('Bölüm ' + n), color: LINK, underline: { type: UnderlineType.SINGLE, color: LINK } })],
    });
  }
  return new TextRun({ text: gorunen || t }); // varlık notu -> düz metin
}

function inline(text) {
  const segs = String(text).split(/<br\s*\/?>/i);
  const out = [];
  segs.forEach((s, i) => { if (i > 0) out.push(new TextRun({ break: 1 })); out.push(...inlineCore(s)); });
  return out.length ? out : [new TextRun({ text: '' })];
}
function inlineCore(text) {
  const runs = [];
  let son = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text))) {
    if (m.index > son) runs.push(new TextRun({ text: text.slice(son, m.index) }));
    if (m[1] !== undefined) runs.push(wikiRun(m[1], m[2]));
    else if (m[3] !== undefined) runs.push(new ExternalHyperlink({ link: m[4], children: [new TextRun({ text: m[3], color: LINK, underline: { type: UnderlineType.SINGLE, color: LINK } })] }));
    else if (m[5] !== undefined) runs.push(new TextRun({ text: m[5], bold: true }));
    else if (m[6] !== undefined) runs.push(new TextRun({ text: m[6], italics: true }));
    else if (m[7] !== undefined) runs.push(new TextRun({ text: m[7], italics: true }));
    else if (m[8] !== undefined) runs.push(new TextRun({ text: m[8], font: 'Consolas' }));
    son = m.index + m[0].length;
  }
  if (son < text.length) runs.push(new TextRun({ text: text.slice(son) }));
  return runs.length ? runs : [new TextRun({ text: '' })];
}

// ---- görsel ------------------------------------------------------------------
function figur(dosya, alt, caption) {
  const yol = join(ATT, dosya);
  let buf; try { buf = readFileSync(yol); } catch { return []; }
  let dim; try { dim = imageSize(buf); } catch { dim = { width: 1000, height: 700 }; }
  const ext = (dosya.split('.').pop() || 'png').toLowerCase();
  const tip = ext === 'jpeg' ? 'jpg' : ext;
  const MAXW = 560, MAXH = 700;
  let w = dim.width, h = dim.height, s = Math.min(1, MAXW / w);
  w = Math.round(w * s); h = Math.round(h * s);
  if (h > MAXH) { const s2 = MAXH / h; w = Math.round(w * s2); h = Math.round(h * s2); }
  const bloklar = [new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 220, after: caption ? 60 : 220 },
    keepNext: !!caption, children: [new ImageRun({ data: buf, type: tip, transformation: { width: w, height: h } })],
  })];
  if (caption) bloklar.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 220 },
    children: [new TextRun({ text: caption, italics: true, size: 18, color: SOLUK })],
  }));
  return bloklar;
}

// ---- tablo -------------------------------------------------------------------
function tablo(satirlar) {
  const parse = (s) => s.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const baslik = parse(satirlar[0]);
  const veri = satirlar.slice(2).map(parse);
  const KOL = Math.round(9026 / baslik.length);
  const kenar = { style: BorderStyle.SINGLE, size: 4, color: KENAR };
  const kenarlar = { top: kenar, bottom: kenar, left: kenar, right: kenar };
  const hucre = (metin, head) => new TableCell({
    width: { size: KOL, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 90, right: 90 },
    shading: head ? { type: ShadingType.CLEAR, fill: KUM, color: 'auto' } : undefined,
    children: [new Paragraph({ spacing: { after: 0 }, children: inline(metin).map((r) => r) })],
  });
  const rows = [new TableRow({ tableHeader: true, children: baslik.map((c) => hucre(c, true)) })];
  for (const r of veri) rows.push(new TableRow({ children: r.map((c) => hucre(c, false)) }));
  return new Table({ columnWidths: baslik.map(() => KOL), width: { size: 9026, type: WidthType.DXA },
    borders: { ...kenarlar, insideHorizontal: kenar, insideVertical: kenar }, rows });
}

// ---- ana ayrıştırma ----------------------------------------------------------
const ham = readFileSync(KAYNAK, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/, '');
const satir = ham.split(/\r?\n/);
const cocuk = [];
let bolumSay = 0, h2Say = 0, baslikGoruldu = false, tocKondu = false, altBaslikBekle = false;

// Ön tarama: başlıkları topla (TOC'yi elle kuracağız — Word field'i yok, uyarı yok).
const tocModel = [];
{
  let cn = 0, seen = false, h2i = 0;
  for (const raw of satir) {
    const t = raw.trim();
    if (t.startsWith('# ')) { if (!seen) { seen = true; continue; } cn++; tocModel.push({ n: cn, title: t.slice(2).trim(), sections: [] }); }
    else if (t.startsWith('## ') && cn > 0) {
      h2i++;
      const tt = t.slice(3).trim().replace(/[*`]/g, '').replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, a, b) => b || a);
      tocModel[cn - 1].sections.push({ anchor: 'h2_' + h2i, title: tt });
    }
  }
}

function tocEkle() {
  cocuk.push(new Paragraph({ spacing: { before: 120, after: 140 },
    children: [new TextRun({ text: 'İçindekiler', font: 'Georgia', bold: true, size: 32, color: INK })] }));
  for (const b of tocModel) {
    cocuk.push(new Paragraph({ spacing: { before: 90, after: 20 },
      children: [new InternalHyperlink({ anchor: 'bolum' + b.n,
        children: [new TextRun({ text: `Bölüm ${b.n} — ${b.title}`, bold: true, color: INK })] })] }));
    for (const s of b.sections) {
      cocuk.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 12 },
        children: [new InternalHyperlink({ anchor: s.anchor,
          children: [new TextRun({ text: s.title, color: SOLUK, size: 20 })] })] }));
    }
  }
  cocuk.push(new Paragraph({ children: [new PageBreak()] })); // TOC sonrası sayfa sonu
  tocKondu = true;
}

for (let i = 0; i < satir.length; i++) {
  let s = satir[i];
  const t = s.trim();
  if (!t) continue;

  // Figür bloğu
  if (t === '<figure>') {
    let src = '', alt = '', cap = '';
    for (i++; i < satir.length && satir[i].trim() !== '</figure>'; i++) {
      const l = satir[i];
      const ms = l.match(/src="attachments\/([^"]+)"/); if (ms) src = ms[1];
      const ma = l.match(/alt="([^"]*)"/); if (ma) alt = ma[1];
      const mc = l.match(/<figcaption>([\s\S]*?)<\/figcaption>/); if (mc) cap = mc[1].trim();
    }
    if (src) cocuk.push(...figur(src, alt, cap));
    altBaslikBekle = false;
    continue;
  }

  // Başlıklar
  if (t.startsWith('# ')) {
    const metin = t.slice(2).trim();
    if (!baslikGoruldu) { // kitap başlığı
      baslikGoruldu = true; altBaslikBekle = true;
      cocuk.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 60 },
        children: [new TextRun({ text: metin, font: 'Georgia', bold: true, size: 52, color: INK })] }));
    } else { // bölüm
      bolumSay++;
      cocuk.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, spacing: { after: 160 },
        children: [new Bookmark({ id: 'bolum' + bolumSay, children: [new TextRun('Bölüm ' + bolumSay + ' — ' + metin)] })] }));
    }
    continue;
  }
  if (t.startsWith('## ')) {
    const mt = t.slice(3).trim();
    let kids;
    if (bolumSay > 0) { h2Say++; kids = [new Bookmark({ id: 'h2_' + h2Say, children: inline(mt) })]; }
    else kids = inline(mt);
    cocuk.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: kids }));
    altBaslikBekle = false; continue;
  }
  if (t.startsWith('### ')) {
    cocuk.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: inline(t.slice(4).trim()) }));
    continue;
  }

  // Kitap alt başlığı (başlıktan hemen sonraki italik satır) + ardından TOC
  if (altBaslikBekle) {
    const ib = t.replace(/^\*(.*)\*$/, '$1');
    cocuk.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
      children: [new TextRun({ text: ib, italics: true, size: 24, color: SOLUK })] }));
    altBaslikBekle = false;
    if (!tocKondu) tocEkle();
    continue;
  }

  // Tablo
  if (t.startsWith('|') && i + 1 < satir.length && /^\s*\|?\s*:?-{2,}/.test(satir[i + 1])) {
    const blok = [s];
    for (i++; i < satir.length && satir[i].trim().startsWith('|'); i++) blok.push(satir[i]);
    i--;
    cocuk.push(tablo(blok));
    cocuk.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun('')] }));
    continue;
  }

  // Yatay çizgi
  if (/^-{3,}$/.test(t) || /^\*{3,}$/.test(t)) continue;

  // Blockquote
  if (t.startsWith('>')) {
    const metin = t.replace(/^>\s?/, '');
    cocuk.push(new Paragraph({ indent: { left: 360 }, spacing: { before: 80, after: 80 },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: VURGU, space: 12 } },
      children: inline(metin).map((r) => r) }));
    continue;
  }

  // Madde listesi
  if (/^[-*]\s+/.test(t)) {
    cocuk.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: inline(t.replace(/^[-*]\s+/, '')) }));
    continue;
  }
  // Numaralı liste (manuel önek)
  const num = t.match(/^(\d+)\.\s+(.*)$/);
  if (num) {
    cocuk.push(new Paragraph({ spacing: { after: 60 }, indent: { left: 360, hanging: 240 },
      children: [new TextRun({ text: num[1] + '. ', bold: true }), ...inline(num[2])] }));
    continue;
  }

  // Normal paragraf (blok halinde birleştir)
  let blok = t;
  while (i + 1 < satir.length && satir[i + 1].trim() && !/^(#|<figure>|>|[-*]\s|\d+\.\s|\|)/.test(satir[i + 1].trim()) && !/^-{3,}$/.test(satir[i + 1].trim())) {
    blok += ' ' + satir[++i].trim();
  }
  cocuk.push(new Paragraph({ spacing: { after: 140 }, children: inline(blok) }));
}

// ---- belge -------------------------------------------------------------------
const doc = new Document({
  creator: 'Yalçın Arsan', title: 'Bilançonun Ötesinde: Bir Şirketi Anlamak',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22, color: METIN } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Georgia', size: 34, bold: true, color: INK }, paragraph: { spacing: { before: 240, after: 140 }, keepNext: true } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Georgia', size: 27, bold: true, color: INK }, paragraph: { spacing: { before: 220, after: 100 }, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Georgia', size: 23, bold: true, color: '4a4238' }, paragraph: { spacing: { before: 160, after: 80 }, keepNext: true } },
      { id: 'Normal', name: 'Normal', run: { font: 'Calibri', size: 22, color: METIN }, paragraph: { spacing: { line: 288 } } },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], color: SOLUK, size: 18 })] })] }) },
    children: cocuk,
  }],
});

const buf = await Packer.toBuffer(doc);
writeFileSync(CIKTI, buf);
console.log('Yazıldı:', CIKTI, '(' + Math.round(buf.length / 1024) + ' KB)');
console.log('Bölüm:', bolumSay, ' toplam blok:', cocuk.length, ' TOC kondu:', tocKondu);
