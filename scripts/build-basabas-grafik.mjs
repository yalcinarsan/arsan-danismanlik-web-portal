/**
 * "Otomotiv Bayisi Nasıl Para Kazanır?" yazısındaki Görsel 3'ün grafiğini üretir:
 * 60 bin TL marjın faizsiz vade bittikten sonra üç faiz seviyesinde nasıl eridiği.
 *
 * Hesap yazıdaki tabloyla birebir aynı: günlük faiz = alış bedeli × yıllık faiz ÷ 365,
 * kalan marj = marj − günlük faiz × (satış günü − faizsiz vade).
 * Başabaş günü = faizsiz vade + marj ÷ günlük faiz.
 *
 * Çıktı: önce SVG çizilir, sonra Chrome ile (sitenin Fraunces/Inter yazı tipleriyle)
 * 2x PNG'ye çevrilir. Makalede PNG kullanılır; SVG ara dosyadır, repoya girmez.
 *
 * Kullanım: node scripts/build-basabas-grafik.mjs
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// ————— VERİ: yazıdaki varsayımlar —————
const ALIS = 1_500_000;   // vergiler hariç alış bedeli (TL)
const MARJ = 60_000;      // brüt marj (TL), %4
const VADE = 21;          // faizsiz vade (gün)
const FAIZLER = [
  { oran: 0.35,  etiket: '%35 faiz',   renk: '#857a69', kesik: '' },
  { oran: 0.408, etiket: '%40,8 faiz', renk: '#b5623c', kesik: '' },
  { oran: 0.486, etiket: '%48,6 faiz', renk: '#2c2620', kesik: '7 5' },
];
const KLASOR = 'public/images/articles/otomotiv-bayisi-nasil-para-kazanir';
const CIKTI = `${KLASOR}/01-basabas-grafigi.png`;

// ————— Ölçü ve renkler: sitenin paleti —————
const W = 1200, H = 700;
const SOL = 110, SAG = 990, UST = 130, ALT = 580;
const XMAX = 90, YMIN = -80_000, YMAX = 70_000;
const PAPER = '#faf7f2', INK = '#2c2620', METIN = '#4a4238', GRID = '#e7ddcf', SOLUK = '#857a69', KUM = '#f1e9dd';

const x = (gun) => SOL + (gun / XMAX) * (SAG - SOL);
const y = (tl) => ALT - ((tl - YMIN) / (YMAX - YMIN)) * (ALT - UST);
const bin = (tl) => `${Math.round(tl / 1000).toLocaleString('tr-TR')}`;

const p = [];
p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
p.push(`<rect width="${W}" height="${H}" fill="${PAPER}"/>`);
p.push(`<text x="${SOL}" y="52" font-family="Fraunces" font-size="28" font-weight="600" fill="${INK}">60 bin TL marj kaç gün dayanır?</text>`);
p.push(`<text x="${SOL}" y="84" font-family="Inter" font-size="16" fill="${SOLUK}">Vergiler hariç 1,5 milyon TL'ye mal olan araç · %4 brüt marj · 21 gün faizsiz vade</text>`);

// zarar bölgesi
p.push(`<rect x="${SOL}" y="${y(0)}" width="${SAG - SOL}" height="${ALT - y(0)}" fill="${KUM}"/>`);
p.push(`<text x="${SOL + 14}" y="${y(0) + 26}" font-family="Inter" font-size="14" fill="${SOLUK}">Zarar bölgesi: faiz marjı aştı</text>`);

// yatay ızgara + y ekseni
for (let v = YMIN; v <= YMAX; v += 20_000) {
  const yy = y(v).toFixed(1);
  p.push(`<line x1="${SOL}" y1="${yy}" x2="${SAG}" y2="${yy}" stroke="${v === 0 ? SOLUK : GRID}" stroke-width="${v === 0 ? 1.6 : 1}"/>`);
  p.push(`<text x="${SOL - 12}" y="${(y(v) + 5).toFixed(1)}" text-anchor="end" font-family="Inter" font-size="14" fill="${METIN}">${bin(v)}</text>`);
}
p.push(`<text transform="translate(34 ${(UST + ALT) / 2}) rotate(-90)" text-anchor="middle" font-family="Inter" font-size="14" fill="${SOLUK}">Kalan marj (bin TL)</text>`);

// x ekseni
for (let g = 0; g <= XMAX; g += 15) {
  p.push(`<text x="${x(g).toFixed(1)}" y="${ALT + 26}" text-anchor="middle" font-family="Inter" font-size="14" fill="${METIN}">${g}</text>`);
}
p.push(`<text x="${(SOL + SAG) / 2}" y="${ALT + 54}" text-anchor="middle" font-family="Inter" font-size="14" fill="${SOLUK}">Aracın satıldığı gün</text>`);

// faizsiz vade çizgisi
p.push(`<line x1="${x(VADE)}" y1="${UST - 6}" x2="${x(VADE)}" y2="${ALT}" stroke="${SOLUK}" stroke-width="1.2" stroke-dasharray="4 4"/>`);
p.push(`<text x="${x(VADE) + 8}" y="${UST + 8}" font-family="Inter" font-size="14" fill="${METIN}">Faizsiz vade biter (21. gün)</text>`);

// eğriler, başabaş noktaları ve sağ uç etiketleri
const basabas = [];
for (const f of FAIZLER) {
  const gunluk = (ALIS * f.oran) / 365;
  const son = MARJ - gunluk * (XMAX - VADE);
  const be = VADE + MARJ / gunluk;
  basabas.push({ ...f, be });
  const d = `M${x(0)},${y(MARJ)} L${x(VADE)},${y(MARJ)} L${x(XMAX)},${y(son).toFixed(1)}`;
  p.push(`<path d="${d}" fill="none" stroke="${f.renk}" stroke-width="${f.oran === 0.408 ? 3.2 : 2.4}" stroke-linejoin="round" stroke-linecap="round"${f.kesik ? ` stroke-dasharray="${f.kesik}"` : ''}/>`);
  p.push(`<text x="${SAG + 12}" y="${(y(son) + 5).toFixed(1)}" font-family="Inter" font-size="15" font-weight="600" fill="${f.renk}">${f.etiket}</text>`);
}
// başabaş noktaları: sıfır çizgisinde nokta, aşağıya ince çizgi, gün etiketi alt kısımda
const ETIKET_Y = ALT - 16;
basabas.forEach((b) => {
  const bx = x(b.be).toFixed(1);
  p.push(`<line x1="${bx}" y1="${y(0)}" x2="${bx}" y2="${ETIKET_Y - 20}" stroke="${b.renk}" stroke-width="1.2" stroke-dasharray="2 4"/>`);
  p.push(`<circle cx="${bx}" cy="${y(0)}" r="6" fill="${b.renk}" stroke="${PAPER}" stroke-width="2.5"/>`);
  p.push(`<text x="${bx}" y="${ETIKET_Y}" text-anchor="middle" font-family="Inter" font-size="14" font-weight="600" fill="${b.renk}">${Math.round(b.be)}. gün</text>`);
});
p.push(`<text x="${(x(basabas[2].be) - 44).toFixed(1)}" y="${ETIKET_Y}" text-anchor="end" font-family="Inter" font-size="14" fill="${SOLUK}">Başabaş günü:</text>`);

p.push(`<text x="${SOL}" y="${H - 22}" font-family="Inter" font-size="13" fill="${SOLUK}">Prim, sigorta, aksesuar, işletme gideri ve vergi dahil değil; liste fiyatı sabit varsayıldı. Faiz seviyeleri: halka açık finansal tablolar ve TCMB ticari kredi ortalaması (Eylül 2026).</text>`);
p.push('</svg>');

// ————— PNG'ye çevir: yerel yazı tipleriyle Chrome —————
mkdirSync(KLASOR, { recursive: true });
const font = (ad, dosya, agirlik = 400) => `@font-face{font-family:${ad};font-weight:${agirlik};src:url("file://${resolve('scripts/fontlar', dosya)}");}`;
const html = `<!doctype html><meta charset="utf-8"><style>${font('Fraunces', 'Fraunces-1.ttf')}${font('Fraunces', 'Fraunces-2.ttf', 600)}${font('Inter', 'Inter-1.ttf')}${font('Inter', 'Inter-2.ttf', 600)}html,body{margin:0;background:${PAPER}}</style>${p.join('\n')}`;
const tmp = resolve('.basabas-grafik.html');
writeFileSync(tmp, html);
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
  `--window-size=${W},${H}`, `--screenshot=${resolve(CIKTI)}`, `file://${tmp}`,
], { stdio: 'ignore' });
rmSync(tmp);
console.log('yazıldı:', CIKTI, '| başabaş:', basabas.map((b) => `${b.etiket} ${b.be.toFixed(1)}`).join(', '));
