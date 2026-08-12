/**
 * Deck'lerdeki canlı Plotly grafiklerinin statik SVG önizlemesini üretir.
 *
 * Neden var: sunum md dosyaları Obsidian'da düzenleniyor; Obsidian Plotly
 * çizemediği için canlı grafik slaytları orada boş görünüyordu. Bu script
 * grafiklerin birer SVG kopyasını çıkarıyor, md dosyası onu normal bir görsel
 * olarak gömüyor. Sitede o slayt yine canlı grafikle değiştiriliyor
 * (bkz. src/pages/sunumlar/*.astro içindeki CANLI_DESENI).
 *
 * Veri yolu sitenin kullandığının aynısı: ev-data.json -> buildPlotlyFigure().
 * Yani önizlemedeki sayılar canlı grafikle birebir aynı; yalnızca çizim
 * (yazı tipi, tam piksel yerleşimi) yaklaşık.
 *
 * Kullanım: npm run grafik:onizleme
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { buildPlotlyFigure } from '../src/components/charts/evDataTransforms.ts';
import * as configs from '../src/components/charts/chartConfigs.ts';

// md'deki [[CANLI-GRAFIK:anahtar]] / ![CANLI-GRAFIK:anahtar](...) anahtarları
// ile deck sayfalarındaki kayıt aynı olmalı.
const GRAFIKLER = {
  'dunya-toplam-pazar': configs.worldTotalMarketConfig,
  'dunya-guc-unitesi': configs.worldPowertrainConfig,
  'pazar-payi': configs.regionShareConfig,
  'turkiye-satis': configs.turkiyeSatisConfig,
};

const CIKTI = new URL('../public/sunumlar/grafik-onizleme/', import.meta.url);

const W = 1000, H = 560;
const M = { t: 54, r: 78, b: 92, l: 88 };
const PAPER = '#faf7f2', INK = '#2c2620', METIN = '#4a4238', GRID = '#e7ddcf', SOLUK = '#857a69';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Eksen etiketi: 84000000 -> "84M", 240000 -> "240k", yüzde ekseninde "%25". */
function etiketle(v, yuzde) {
  if (yuzde) return '%' + Math.round(v);
  const a = Math.abs(v);
  if (a >= 1e6) return +(v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
  if (a >= 1e3) return +(v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'k';
  return String(+v.toFixed(2));
}

/** Üstte biraz boşluk bırakan, yuvarlak adımlı eksen üst sınırı. */
function eksenTavani(maks) {
  if (maks <= 0) return 1;
  const ham = maks * 1.08;
  const buyukluk = Math.pow(10, Math.floor(Math.log10(ham)));
  for (const k of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    if (buyukluk * k >= ham) return buyukluk * k;
  }
  return buyukluk * 10;
}

function svgOlustur(fig, baslik) {
  const cizimW = W - M.l - M.r, cizimH = H - M.t - M.b;

  // x ekseni kategorik: tüm serilerdeki yılların birleşimi, sıralı.
  const yillar = [...new Set(fig.data.flatMap((t) => t.x ?? []))].sort((a, b) => a - b);
  const xKonum = (y) => M.l + ((yillar.indexOf(y) + 0.5) / yillar.length) * cizimW;

  const sagVar = !!fig.layout.yaxis2;
  const solTraceler = fig.data.filter((t) => t.yaxis !== 'y2');
  const sagTraceler = fig.data.filter((t) => t.yaxis === 'y2');

  const maksDeger = (ts) => Math.max(0, ...ts.flatMap((t) => (t.y ?? []).filter((v) => typeof v === 'number')));
  const solTavan = eksenTavani(maksDeger(solTraceler));
  const sagTavan = sagVar ? eksenTavani(maksDeger(sagTraceler)) : 1;

  const solYuzde = !!fig.layout.yaxis?.ticksuffix;
  const yKonum = (v, sag) => M.t + cizimH - (v / (sag ? sagTavan : solTavan)) * cizimH;

  const parca = [];
  parca.push(`<rect width="${W}" height="${H}" fill="${PAPER}"/>`);
  parca.push(
    `<text x="${M.l}" y="30" font-family="Fraunces, Georgia, serif" font-size="19" font-weight="600" fill="${INK}">${esc(baslik)}</text>`
  );

  // yatay ızgara + sol eksen etiketleri
  for (let i = 0; i <= 5; i++) {
    const v = (solTavan / 5) * i;
    const y = yKonum(v, false);
    parca.push(`<line x1="${M.l}" y1="${y.toFixed(1)}" x2="${M.l + cizimW}" y2="${y.toFixed(1)}" stroke="${GRID}" stroke-width="1"/>`);
    parca.push(
      `<text x="${M.l - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-family="Inter, sans-serif" font-size="12" fill="${METIN}">${esc(etiketle(v, solYuzde))}</text>`
    );
  }
  // sağ eksen etiketleri (her zaman yüzde)
  if (sagVar) {
    for (let i = 0; i <= 5; i++) {
      const v = (sagTavan / 5) * i;
      parca.push(
        `<text x="${M.l + cizimW + 10}" y="${(yKonum(v, true) + 4).toFixed(1)}" font-family="Inter, sans-serif" font-size="12" fill="${METIN}">${esc(etiketle(v, true))}</text>`
      );
    }
  }

  // x etiketleri: kalabalıksa seyreltilir
  const atla = Math.ceil(yillar.length / 12);
  yillar.forEach((yil, i) => {
    if (i % atla) return;
    parca.push(
      `<text x="${xKonum(yil).toFixed(1)}" y="${M.t + cizimH + 22}" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="${METIN}">${yil}</text>`
    );
  });

  // seriler
  const barTraceler = fig.data.filter((t) => t.type === 'bar');
  const barGenislik = (cizimW / yillar.length) * 0.62;
  for (const t of barTraceler) {
    const renk = t.marker?.color ?? SOLUK;
    t.x.forEach((yil, i) => {
      const v = t.y[i];
      if (typeof v !== 'number') return;
      const y = yKonum(v, t.yaxis === 'y2');
      parca.push(
        `<rect x="${(xKonum(yil) - barGenislik / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barGenislik.toFixed(1)}" height="${(M.t + cizimH - y).toFixed(1)}" fill="${renk}" opacity="0.85"/>`
      );
    });
  }

  for (const t of fig.data) {
    if (t.type === 'bar') continue;
    const renk = t.line?.color ?? t.marker?.color ?? INK;
    const sag = t.yaxis === 'y2';
    const noktalar = (t.x ?? [])
      .map((yil, i) => [xKonum(yil), t.y[i]])
      .filter(([, v]) => typeof v === 'number')
      .map(([x, v]) => `${x.toFixed(1)},${yKonum(v, sag).toFixed(1)}`);
    if (!noktalar.length) continue;

    if ((t.mode ?? '').includes('lines') && noktalar.length > 1) {
      const kesikli = t.line?.dash ? ' stroke-dasharray="3,5"' : '';
      parca.push(`<polyline points="${noktalar.join(' ')}" fill="none" stroke="${renk}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"${kesikli}/>`);
    }
    if ((t.mode ?? '').includes('markers')) {
      for (const n of noktalar) {
        const [x, y] = n.split(',');
        parca.push(`<circle cx="${x}" cy="${y}" r="3.5" fill="${renk}"/>`);
      }
    }
  }

  // gösterge (legend)
  let lx = M.l;
  const ly = H - 30;
  for (const t of fig.data) {
    if (!t.name || t.showlegend === false) continue;
    const renk = t.marker?.color ?? t.line?.color ?? INK;
    parca.push(`<rect x="${lx}" y="${ly - 9}" width="12" height="12" rx="2" fill="${renk}"/>`);
    parca.push(`<text x="${lx + 18}" y="${ly + 1}" font-family="Inter, sans-serif" font-size="12.5" fill="${METIN}">${esc(t.name)}</text>`);
    lx += 30 + t.name.length * 6.6;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(baslik)}">\n${parca.join('\n')}\n</svg>\n`;
}

const { rows } = JSON.parse(readFileSync(new URL('../src/data/ev-data.json', import.meta.url), 'utf8'));
mkdirSync(CIKTI, { recursive: true });

for (const [anahtar, config] of Object.entries(GRAFIKLER)) {
  const fig = buildPlotlyFigure(rows, config);
  const svg = svgOlustur(fig, config.title);
  writeFileSync(new URL(`${anahtar}.svg`, CIKTI), svg);
  console.log(`✓ ${anahtar}.svg  (${config.title})`);
}
console.log(`\n${Object.keys(GRAFIKLER).length} önizleme yazıldı: public/sunumlar/grafik-onizleme/`);
