/**
 * Bir makaledeki markdown tablolarını X (Twitter) sürümü için PNG görsele çevirir.
 *
 * Neden var: X'in yazı editörü markdown tablo kabul etmiyor. Makale X'e
 * kopyala-yapıştır ile taşınırken tablolar görsel olarak eklenir.
 *
 * Her tablo için başlık sırasıyla şuradan alınır: tablonun üstündeki
 * "**Görsel N — …**" satırı, yoksa en yakın ara başlık, yoksa --baslik ile verilen metin.
 * Tablonun hemen altındaki "*Kaynak: …*" satırı görselin altına not olarak eklenir.
 *
 * Kullanım:
 *   node scripts/build-x-tablo-gorselleri.mjs <makale.md> <çıktı-klasörü> [--baslik 1="Başlık"]
 * Görseller sitenin paletini ve yazı tiplerini kullanır; çıktı klasörü repo dışında tutulur.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { marked } from 'marked';

const [makale, cikti, ...ek] = process.argv.slice(2);
if (!makale || !cikti) {
  console.error('Kullanım: node scripts/build-x-tablo-gorselleri.mjs <makale.md> <çıktı-klasörü> [--baslik 1="Başlık"]');
  process.exit(1);
}
const zorunluBaslik = {};
for (let i = 0; i < ek.length; i++) {
  if (ek[i] === '--baslik' && ek[i + 1]) {
    const [no, ...metin] = ek[++i].split('=');
    zorunluBaslik[Number(no)] = metin.join('=');
  }
}

const PAPER = '#faf7f2', INK = '#2c2620', SOLUK = '#857a69', KUM = '#f1e9dd', KENAR = '#e7ddcf';
const GENISLIK = 1200;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const satirlar = readFileSync(makale, 'utf8').replace(/^---[\s\S]*?\n---\n/, '').split('\n');

// Tablo bloklarını ve bağlamlarını bul
const tablolar = [];
for (let i = 0; i < satirlar.length; i++) {
  if (!satirlar[i].startsWith('|')) continue;
  const bas = i;
  while (i < satirlar.length && satirlar[i].startsWith('|')) i++;
  const md = satirlar.slice(bas, i).join('\n');

  let baslik = '';
  for (let j = bas - 1; j >= Math.max(0, bas - 12); j--) {
    const s = satirlar[j].trim();
    const gorsel = s.match(/^\*\*(Görsel \d+ — .+)\*\*$/);
    if (gorsel) { baslik = gorsel[1]; break; }
    if (/^#{2,4} /.test(s)) { baslik = s.replace(/^#+ /, ''); break; }
    if (s.startsWith('|')) break;
  }

  let not = '';
  for (let j = i; j < Math.min(satirlar.length, i + 3); j++) {
    const s = satirlar[j].trim();
    if (!s) continue;
    const m = s.match(/^\*(Kaynak:.+)\*$/);
    if (m) not = m[1];
    break;
  }
  tablolar.push({ md, baslik, not });
}

const slug = (s) => s.toLocaleLowerCase('tr-TR')
  .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c])
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

const font = (ad, dosya, agirlik = 400) => `@font-face{font-family:${ad};font-weight:${agirlik};src:url("file://${resolve('scripts/fontlar', dosya)}");}`;
const stil = `${font('Fraunces', 'Fraunces-1.ttf')}${font('Fraunces', 'Fraunces-2.ttf', 600)}${font('Inter', 'Inter-1.ttf')}${font('Inter', 'Inter-2.ttf', 600)}
html,body{margin:0;background:${PAPER};}
main{width:${GENISLIK}px;box-sizing:border-box;padding:56px 64px 48px;font-family:Inter;color:${INK};}
h1{font-family:Fraunces;font-weight:600;font-size:34px;line-height:1.25;margin:0 0 28px;}
table{width:100%;border-collapse:collapse;font-size:21px;line-height:1.4;}
th{background:${KUM};font-weight:600;}
th:not([align]),td:not([align]){text-align:left;}
th[align=right],td[align=right]{text-align:right;}
th,td{border:1.5px solid ${KENAR};padding:14px 16px;vertical-align:top;}
td strong{font-weight:600;}
.not{margin-top:18px;font-size:17px;color:${SOLUK};}
.imza{margin-top:28px;font-size:16px;color:${SOLUK};}`;

mkdirSync(cikti, { recursive: true });
const tmp = resolve('.x-tablo.html');
tablolar.forEach((t, n) => {
  const no = n + 1;
  const baslik = zorunluBaslik[no] || t.baslik || `Tablo ${no}`;
  const govde = marked.parse(t.md);
  const html = `<!doctype html><meta charset="utf-8"><style>${stil}</style><main><h1>${baslik}</h1>${govde}` +
    `${t.not ? `<div class="not">${t.not}</div>` : ''}<div class="imza">Yalçın Arsan · arsandanismanlik.com.tr</div></main>`;
  writeFileSync(tmp, html);
  const dosya = resolve(cikti, `${String(no).padStart(2, '0')}-${slug(baslik)}.png`);
  execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
    `--window-size=${GENISLIK},3000`, `--screenshot=${dosya}`, `file://${tmp}`], { stdio: 'ignore' });
  // Alttaki boş kâğıdı kırp
  execFileSync('python3', ['-c', `
from PIL import Image, ImageChops
im = Image.open(${JSON.stringify(dosya)}).convert("RGB")
bg = Image.new("RGB", im.size, im.getpixel((0, 0)))
kutu = ImageChops.difference(im, bg).getbbox()
im.crop((0, 0, im.width, min(im.height, kutu[3] + 96))).save(${JSON.stringify(dosya)})
`]);
  console.log('yazıldı:', dosya.split('/').slice(-2).join('/'));
});
rmSync(tmp);
