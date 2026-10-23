/**
 * "Otomotiv Distribütörü Nasıl Para Kazanır?" yazısının ana grafiği:
 * Her 1 milyon liralık satıştan distribütöre kalan faaliyet kârı ve brüt marjdaki
 * bir puanın (10 bin TL) bu kârdaki payı, yıllara göre.
 *
 * Veri: çok markalı bir distribütör grubunun halka açık, enflasyon muhasebesine göre
 * düzeltilmiş tabloları. Faaliyet kârı = brüt kâr − satış, yönetim ve garanti giderleri
 * (diğer faaliyet gelir ve giderleri hariç). 2026: ilk yarı. Hesaplar vault'taki
 * "Strateji Nasıl Kurulur Bölüm 2 — Hazırlık Notları"nda.
 *
 * Biçim: vurgu grafiği. Kârın geri kalanı nötr gri, bir puanlık dilim vurgu renginde;
 * renkler dataviz doğrulayıcısından geçti (gri yalnızca bağlam, etiketler görünür).
 *
 * Kullanım: node scripts/build-bir-puan-grafik.mjs [çıktı.png]
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';

// ————— VERİ —————
const YILLAR = [
  { etiket: '2022', kar: 143 },
  { etiket: '2023', kar: 157 },
  { etiket: '2024', kar: 77 },
  { etiket: '2025', kar: 45 },
  { etiket: '2026*', kar: 43 },
];
const PUAN = 10; // brüt marjda bir puan = 1 milyon liralık satışta 10 bin TL
const CIKTI = process.argv[2] || '../cikti/gorseller/strateji-02-taslak/01-bir-puanin-agirligi.png';

// ————— Ölçü ve renkler: sitenin paleti —————
const W = 1200, H = 700;
const SOL = 110, SAG = 1110, UST = 150, ALT = 570;
const YMAX = 175;
const PAPER = '#faf7f2', INK = '#2c2620', METIN = '#4a4238', GRID = '#e7ddcf', SOLUK = '#857a69';
const GRI = '#bdb8b0', VURGU = '#b5623c';
const BAR = 64, BOSLUK = 2, YARICAP = 4;

const y = (v) => ALT - (v / YMAX) * (ALT - UST);
const p = [];
p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
p.push(`<rect width="${W}" height="${H}" fill="${PAPER}"/>`);
p.push(`<text x="${SOL}" y="52" font-family="Fraunces" font-size="28" font-weight="600" fill="${INK}">Aynı bir puan, küçülen kâr</text>`);
p.push(`<text x="${SOL}" y="84" font-family="Inter" font-size="16" fill="${SOLUK}">Her 1 milyon liralık satıştan distribütöre kalan faaliyet kârı (bin TL) ve brüt marjdaki bir puanın (10 bin TL) bu kârdaki payı</text>`);

// açıklama (lejant): iki dilim
const lx = SOL, ly = 116;
p.push(`<rect x="${lx}" y="${ly - 11}" width="14" height="14" rx="3" fill="${GRI}"/>`);
p.push(`<text x="${lx + 22}" y="${ly + 1}" font-family="Inter" font-size="14" fill="${METIN}">Faaliyet kârının geri kalanı</text>`);
p.push(`<rect x="${lx + 236}" y="${ly - 11}" width="14" height="14" rx="3" fill="${VURGU}"/>`);
p.push(`<text x="${lx + 258}" y="${ly + 1}" font-family="Inter" font-size="14" fill="${METIN}">Brüt marjdaki bir puan (10 bin TL)</text>`);

// ızgara ve y ekseni
for (let v = 0; v <= 150; v += 50) {
  const yy = y(v).toFixed(1);
  p.push(`<line x1="${SOL}" y1="${yy}" x2="${SAG}" y2="${yy}" stroke="${v === 0 ? SOLUK : GRID}" stroke-width="1"/>`);
  p.push(`<text x="${SOL - 12}" y="${(y(v) + 5).toFixed(1)}" text-anchor="end" font-family="Inter" font-size="14" fill="${METIN}">${v}</text>`);
}

// sütunlar: altta gri gövde, 2px boşluk, üstte bir puanlık vurgu dilimi (üst köşeler yuvarlak)
const adim = (SAG - SOL) / YILLAR.length;
YILLAR.forEach((d, i) => {
  const cx = SOL + adim * (i + 0.5);
  const x0 = cx - BAR / 2;
  const govdeUst = y(d.kar - PUAN);
  p.push(`<rect x="${x0}" y="${govdeUst.toFixed(1)}" width="${BAR}" height="${(ALT - govdeUst).toFixed(1)}" fill="${GRI}"/>`);
  const ust = y(d.kar), alt = govdeUst - BOSLUK;
  const h = alt - ust;
  p.push(`<path d="M${x0},${alt.toFixed(1)} V${(ust + YARICAP).toFixed(1)} Q${x0},${ust.toFixed(1)} ${x0 + YARICAP},${ust.toFixed(1)} H${x0 + BAR - YARICAP} Q${x0 + BAR},${ust.toFixed(1)} ${x0 + BAR},${(ust + YARICAP).toFixed(1)} V${alt.toFixed(1)} Z" fill="${VURGU}"/>`);
  const pay = Math.round((PUAN / d.kar) * 100);
  p.push(`<text x="${cx}" y="${(ust - 34).toFixed(1)}" text-anchor="middle" font-family="Inter" font-size="22" font-weight="600" fill="${INK}">%${pay}</text>`);
  p.push(`<text x="${cx}" y="${(ust - 12).toFixed(1)}" text-anchor="middle" font-family="Inter" font-size="14" fill="${METIN}">${d.kar} bin TL</text>`);
  p.push(`<text x="${cx}" y="${ALT + 28}" text-anchor="middle" font-family="Inter" font-size="16" fill="${METIN}">${d.etiket}</text>`);
  if (h < 8) console.warn('dilim çok ince:', d.etiket);
});
p.push(`<text x="${SOL}" y="${ALT + 58}" font-family="Inter" font-size="14" fill="${SOLUK}">Sütunun üstündeki yüzde: Brüt marjdaki bir puanlık değişim, o yılın faaliyet kârının yüzde kaçı?</text>`);
p.push(`<text x="${SOL}" y="${H - 42}" font-family="Inter" font-size="13" fill="${SOLUK}">Tutarlar gerçek TL değil: Her yılın satışı 1 milyon liraya eşitlenerek oranlar gösteriliyor, bu yüzden karşılaştırma enflasyondan etkilenmiyor.</text>`);
p.push(`<text x="${SOL}" y="${H - 20}" font-family="Inter" font-size="13" fill="${SOLUK}">*2026: ilk yarı. Kaynak: Çok markalı bir distribütör grubunun halka açık, enflasyon muhasebesine göre düzeltilmiş tabloları; diğer faaliyet gelir ve giderleri hariç.</text>`);
p.push('</svg>');

// ————— PNG'ye çevir: yerel yazı tipleriyle Chrome —————
mkdirSync(dirname(resolve(CIKTI)), { recursive: true });
const font = (ad, dosya, agirlik = 400) => `@font-face{font-family:${ad};font-weight:${agirlik};src:url("file://${resolve('scripts/fontlar', dosya)}");}`;
const html = `<!doctype html><meta charset="utf-8"><style>${font('Fraunces', 'Fraunces-1.ttf')}${font('Fraunces', 'Fraunces-2.ttf', 600)}${font('Inter', 'Inter-1.ttf')}${font('Inter', 'Inter-2.ttf', 600)}html,body{margin:0;background:${PAPER}}</style>${p.join('\n')}`;
const tmp = resolve('.bir-puan-grafik.html');
writeFileSync(tmp, html);
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
  `--window-size=${W},${H}`, `--screenshot=${resolve(CIKTI)}`, `file://${tmp}`,
], { stdio: 'ignore' });
rmSync(tmp);
console.log('yazıldı:', CIKTI);
