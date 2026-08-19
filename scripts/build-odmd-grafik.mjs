/**
 * ODMD motor tipi kırılımını statik SVG grafiğe çevirir (Audi DİM deck'i).
 *
 * Neden ayrı script: grafik-onizleme'deki grafikler IEA'nın ev-data.json'ından
 * besleniyor ve dünya/bölge verisi. ODMD'nin Türkiye motor tipi kırılımı o veri
 * setinde yok — aylık basın bülteninden elle giriliyor. Bültenin yerini alacak
 * bir API yok, o yüzden VERI aşağıda duruyor: gelecek dönem güncellenirken
 * yalnızca o blok değişir, çizim koduna dokunmaya gerek yok.
 *
 * Kaynak: ODMD Basın Bülteni, 4 Ağustos 2026 — Ek 5 "Motor Tipine Göre
 * Adetler, Paylar ve Değişimler Tablosu" (s.15, Ocak-Temmuz karşılaştırması).
 *
 * Kullanım: node scripts/build-odmd-grafik.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

// ————— VERİ: yeni dönemde yalnızca burası güncellenir —————
const DONEM_ONCEKI = 'Ocak-Temmuz 2025';
const DONEM = 'Ocak-Temmuz 2026';
const KAYNAK = 'Kaynak: ODMD Basın Bülteni, 4 Ağustos 2026 (Ek 5)';
const CIKTI = 'public/sunumlar/audi-dim-egitimi/odmd-2026-oca-tem-motor-tipi.svg';

const VERI = [
  { ad: 'Benzinli',   onceki: 259473, simdi: 208046, degisim: -19.8 },
  { ad: 'Hibrit',     onceki: 160377, simdi: 165924, degisim: 3.5 },
  { ad: 'Elektrikli', onceki: 103310, simdi: 94046,  degisim: -9.0 },
  { ad: 'Dizel',      onceki: 45286,  simdi: 30790,  degisim: -32.0 },
  { ad: 'Otogazlı',   onceki: 3752,   simdi: 3906,   degisim: 4.1 },
];

const TAVAN = 300_000;      // y ekseni üst sınırı
const BASAMAK = 60_000;     // ızgara aralığı

// ————— Ölçü ve renkler: grafik-onizleme'dekilerle aynı dil —————
const W = 1000, H = 560;
const SOL = 88, SAG = 922, UST = 66, ALT = 462;
const PAPER = '#faf7f2', INK = '#2c2620', METIN = '#4a4238', GRID = '#e7ddcf', SOLUK = '#857a69';
const ONCEKI_RENK = '#d8cbb8', SIMDI_RENK = '#b5623c';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const say = (n) => n.toLocaleString('tr-TR');
const yuzde = (d) => `${d > 0 ? '+' : '−'}%${Math.abs(d).toLocaleString('tr-TR', { minimumFractionDigits: 1 })}`;
const y = (v) => ALT - (v / TAVAN) * (ALT - UST);

const p = [];
p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Türkiye otomobil pazarı, motor tipine göre: ${DONEM_ONCEKI} ve ${DONEM} karşılaştırması">`);
p.push(`<rect width="${W}" height="${H}" fill="${PAPER}"/>`);
p.push(`<text x="${SOL}" y="28" font-family="Fraunces, Georgia, serif" font-size="19" font-weight="600" fill="${INK}">Türkiye otomobil pazarı, motor tipine göre</text>`);
p.push(`<text x="${SOL}" y="48" font-family="Inter, sans-serif" font-size="12.5" fill="${SOLUK}">${esc(DONEM_ONCEKI)} · ${esc(DONEM)} · toplam pazar 572.198 → 502.712 adet (−%12,1)</text>`);

// ızgara
for (let v = 0; v <= TAVAN; v += BASAMAK) {
  const yy = y(v).toFixed(1);
  p.push(`<line x1="${SOL}" y1="${yy}" x2="${SAG}" y2="${yy}" stroke="${GRID}" stroke-width="1"/>`);
  p.push(`<text x="${SOL - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-family="Inter, sans-serif" font-size="12" fill="${METIN}">${v ? `${v / 1000}k` : '0'}</text>`);
}

// gruplanmış çubuklar
const GRUP = (SAG - SOL) / VERI.length;
const BAR = 54, ARA = 8;
VERI.forEach((d, i) => {
  const orta = SOL + GRUP * (i + 0.5);
  const x1 = orta - BAR - ARA / 2, x2 = orta + ARA / 2;

  for (const [x, deger, renk, kalin] of [[x1, d.onceki, ONCEKI_RENK, METIN], [x2, d.simdi, SIMDI_RENK, INK]]) {
    const yy = y(deger), yuk = ALT - yy;
    p.push(`<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${BAR}" height="${yuk.toFixed(1)}" fill="${renk}"/>`);
    p.push(`<text x="${(x + BAR / 2).toFixed(1)}" y="${(yy - 7).toFixed(1)}" text-anchor="middle" font-family="Inter, sans-serif" font-size="11.5" fill="${kalin}">${say(deger)}</text>`);
  }

  p.push(`<text x="${orta.toFixed(1)}" y="486" text-anchor="middle" font-family="Inter, sans-serif" font-size="13.5" font-weight="500" fill="${INK}">${esc(d.ad)}</text>`);
  p.push(`<text x="${orta.toFixed(1)}" y="505" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="${SOLUK}">${yuzde(d.degisim)}</text>`);
});

p.push(`<line x1="${SOL}" y1="${ALT}" x2="${SAG}" y2="${ALT}" stroke="${SOLUK}" stroke-width="1"/>`);

// gösterge
let lx = SOL;
for (const [renk, etiket] of [[ONCEKI_RENK, DONEM_ONCEKI], [SIMDI_RENK, DONEM]]) {
  p.push(`<rect x="${lx}" y="529" width="13" height="13" fill="${renk}"/>`);
  p.push(`<text x="${lx + 19}" y="540" font-family="Inter, sans-serif" font-size="12.5" fill="${METIN}">${esc(etiket)}</text>`);
  lx += 24 + etiket.length * 7.2;
}
p.push(`<text x="${SAG}" y="540" text-anchor="end" font-family="Inter, sans-serif" font-size="10.5" fill="${SOLUK}">${esc(KAYNAK)}</text>`);
p.push('</svg>');

mkdirSync(new URL('../public/sunumlar/audi-dim-egitimi/', import.meta.url), { recursive: true });
const hedef = new URL(`../${CIKTI}`, import.meta.url);
writeFileSync(hedef, p.join('\n'), 'utf8');
console.log(`✓ ${CIKTI} yazıldı (${VERI.length} motor tipi, ${DONEM})`);
