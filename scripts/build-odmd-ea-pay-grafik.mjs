/**
 * Türkiye'de elektrikli otomobilin pazar payı: yıllara göre ODMD serisi.
 *
 * Neden ayrı script: ev-verileri sayfasındaki canlı Türkiye grafiği IEA'dan
 * besleniyor ve IEA'nın "EV" tanımı şarjlı hibriti (PHEV) de kapsıyor; ayrıca
 * IEA yıllık yayımladığı için en son 2025'te bitiyor. İçinde bulunduğumuz yılı
 * da gösterebilmek için seriyi tek kaynaktan, ODMD'nin dar tanımıyla (yalnızca
 * tam elektrikli) kuruyoruz. İki tanımın farkı deck'te ayrı bir slaytta
 * anlatılıyor — bu grafik o slaytla tutarlı olmak zorunda.
 *
 * Kaynak: her yılın ODMD Aralık bülteni (Ek 5, "Motor Tipine Göre" tablosu);
 * 2026 için 3 Kasım 2026 tarihli Ocak-Ekim bülteni. 2020-2022'de elektrikli
 * payı özet paragrafa girmeyecek kadar küçük olduğu için Ek 5'ten alındı.
 *
 * Kullanım: node scripts/build-odmd-ea-pay-grafik.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

// ————— VERİ: yeni dönemde yalnızca burası güncellenir —————
const CIKTI = 'public/sunumlar/audi-dim-ankara/odmd-ea-pay-2020-2026.svg';
const KAYNAK = 'Kaynak: ODMD yıllık bültenleri (Ek 5) · 2026: 3 Kasım 2026 bülteni';

const VERI = [
  { yil: '2020', pay: 0.1,  adet: 844,     kismi: false },
  { yil: '2021', pay: 0.5,  adet: 2846,    kismi: false },
  { yil: '2022', pay: 1.3,  adet: 7733,    kismi: false },
  { yil: '2023', pay: 7.5,  adet: 72179,   kismi: false },
  { yil: '2024', pay: 10.7, adet: 105315,  kismi: false },
  { yil: '2025', pay: 17.7, adet: 191960,  kismi: false },
  { yil: '2026', pay: 19.6, adet: 135979,  kismi: true  },
];

const TAVAN = 24;       // y ekseni üst sınırı (%)
const BASAMAK = 4;      // ızgara aralığı

// ————— Ölçü ve renkler: diğer deck grafikleriyle aynı dil —————
const W = 1000, H = 560;
const SOL = 88, SAG = 922, UST = 74, ALT = 448;
const PAPER = '#faf7f2', INK = '#2c2620', METIN = '#4a4238', GRID = '#e7ddcf', SOLUK = '#857a69';
const RENK = '#b5623c', RENK_KISMI = '#d8a88f';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const say = (n) => n.toLocaleString('tr-TR');
const yuzde = (v) => '%' + v.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
const y = (v) => ALT - (v / TAVAN) * (ALT - UST);

const p = [];
p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Türkiye'de elektrikli otomobilin pazar payı, 2020-2026">`);
p.push(`<rect width="${W}" height="${H}" fill="${PAPER}"/>`);
p.push(`<text x="${SOL}" y="30" font-family="Fraunces, Georgia, serif" font-size="19" font-weight="600" fill="${INK}">Türkiye'de elektrikli otomobilin pazar payı</text>`);
p.push(`<text x="${SOL}" y="50" font-family="Inter, sans-serif" font-size="12.5" fill="${SOLUK}">Yeni otomobil satışları içindeki pay · yalnızca tam elektrikli, şarjlı hibrit hariç · 2026 yılın ilk on ayı</text>`);

for (let v = 0; v <= TAVAN; v += BASAMAK) {
  const yy = y(v).toFixed(1);
  p.push(`<line x1="${SOL}" y1="${yy}" x2="${SAG}" y2="${yy}" stroke="${GRID}" stroke-width="1"/>`);
  p.push(`<text x="${SOL - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-family="Inter, sans-serif" font-size="12" fill="${METIN}">%${v}</text>`);
}

const GRUP = (SAG - SOL) / VERI.length;
const BAR = 62;
VERI.forEach((d, i) => {
  const orta = SOL + GRUP * (i + 0.5);
  const yy = y(d.pay);
  p.push(`<rect x="${(orta - BAR / 2).toFixed(1)}" y="${yy.toFixed(1)}" width="${BAR}" height="${(ALT - yy).toFixed(1)}" fill="${d.kismi ? RENK_KISMI : RENK}"/>`);
  p.push(`<text x="${orta.toFixed(1)}" y="${(yy - 9).toFixed(1)}" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="${INK}">${esc(yuzde(d.pay))}</text>`);
  p.push(`<text x="${orta.toFixed(1)}" y="474" text-anchor="middle" font-family="Inter, sans-serif" font-size="13.5" font-weight="500" fill="${INK}">${d.yil}${d.kismi ? '*' : ''}</text>`);
  // Kısmi dönemde adedi "10 ay" diye işaretliyoruz: on aylık bir sayı, tam yıl
  // sayılarının yanında etiketsiz durursa düşüş gibi okunuyor.
  const adetEtiket = d.kismi ? `${say(d.adet)} (10 ay)` : say(d.adet);
  p.push(`<text x="${orta.toFixed(1)}" y="493" text-anchor="middle" font-family="Inter, sans-serif" font-size="11.5" fill="${SOLUK}">${esc(adetEtiket)}</text>`);
});

p.push(`<line x1="${SOL}" y1="${ALT}" x2="${SAG}" y2="${ALT}" stroke="${SOLUK}" stroke-width="1"/>`);
p.push(`<text x="${SOL}" y="524" font-family="Inter, sans-serif" font-size="11.5" fill="${SOLUK}">Çubukların altındaki sayılar o dönemde satılan elektrikli otomobil adedi. * 2026: Ocak-Ekim</text>`);
p.push(`<text x="${SAG}" y="524" text-anchor="end" font-family="Inter, sans-serif" font-size="10.5" fill="${SOLUK}">${esc(KAYNAK)}</text>`);
p.push('</svg>');

mkdirSync(new URL(`../${CIKTI.slice(0, CIKTI.lastIndexOf('/'))}/`, import.meta.url), { recursive: true });
writeFileSync(new URL(`../${CIKTI}`, import.meta.url), p.join('\n'), 'utf8');
console.log(`✓ ${CIKTI} yazıldı (${VERI.length} yıl)`);
