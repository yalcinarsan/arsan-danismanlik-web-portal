/**
 * Sosyal medya paylaşım görselini üretir (og:image).
 *
 * Neden gerekli: og:image doğrudan logo-wordmark.png idi — 248x70 piksel.
 * Kart tipi summary_large_image olduğu için X ve LinkedIn 1200x630 bekliyor;
 * 248 piksellik bir wordmark o alana ya bulanık büyütülüyor ya da kayboluyor.
 *
 * Tasarım kararı: kapak görseli DEĞİL. Yalçın'ın istediği "küçük ve zarif bir
 * logo". O yüzden tuval marka zemini, logo ortada ve ölçülü — çerçeveyi
 * doldurmuyor. Boşluk kasıtlı.
 *
 * Ölçü gerekçesi: sosyal kartlar akışta ~500-600px genişlikte görünüyor.
 * Logo 1200'lük tuvalde 440px olunca ekranda ~220px'e denk geliyor, yani
 * kaynağın 248px'lik doğal çözünürlüğüne yakın. Büyütme kaynaklı bulanıklık
 * pratikte görünmüyor. Logoyu daha büyük yapmak hem bulanıklaştırır hem
 * "zarif" olmaktan çıkarır.
 *
 * Kullanım: npm run gorsel:og
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KAYNAK_LOGO = new URL('../public/images/logo-wordmark.png', import.meta.url);
const CIKTI = new URL('../public/images/og-arsan.png', import.meta.url);
const GECICI = new URL('../public/images/.og-gecici.html', import.meta.url);

const W = 1200, H = 630;
const LOGO_W = 440;              // bkz. yukarıdaki ölçü gerekçesi
const PAPER = '#faf7f2';         // marka zemini (tailwind.config.mjs)

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const b64 = readFileSync(fileURLToPath(KAYNAK_LOGO)).toString('base64');

const html = `<!doctype html><meta charset="utf-8">
<style>
  html,body { margin:0; padding:0; }
  body { width:${W}px; height:${H}px; background:${PAPER};
         display:flex; align-items:center; justify-content:center; }
  img { width:${LOGO_W}px; height:auto; display:block; }
</style>
<img src="data:image/png;base64,${b64}" alt="">`;

writeFileSync(fileURLToPath(GECICI), html, 'utf8');

execFileSync(CHROME, [
  '--headless', '--disable-gpu', `--window-size=${W},${H}`,
  '--default-background-color=00000000',
  `--screenshot=${fileURLToPath(CIKTI)}`,
  fileURLToPath(GECICI),
], { stdio: 'ignore' });

execFileSync('rm', ['-f', fileURLToPath(GECICI)]);
console.log(`✓ og-arsan.png yazıldı — ${W}x${H}, logo ${LOGO_W}px, zemin ${PAPER}`);
