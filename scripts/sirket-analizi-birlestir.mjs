/**
 * "Bilançonun Ötesinde" (Şirket Analizi) 9 bölümlük diziyi tek parça
 * bir vault notuna birleştirir — PDF ve Word e-kitap üretiminin ortak kaynağı.
 *
 * İlke (elektrifikasyon Tek Parça ile aynı): vault notu Obsidian-temiz kalır.
 *  - Bölüm-arası atıflar [[wikilink]] olarak durur; render scriptleri bunları
 *    belge-içi çıpaya (kardeş bölüm) ya da düz metne (varlık notu) çevirir.
 *  - Görseller ![[embed]] -> <figure><img src="attachments/..."><figcaption>
 *    biçimine çevrilir; başlık site sürümündeki figcaption'dan gelir.
 *  - Her bölüm sonundaki gezinme listesi, imza, "bir sonraki bölümde" teşviki
 *    ve tekrar eden alt not ("Bu seri ... zenginleştirilmiştir") atılır.
 *
 * Kullanım: node scripts/sirket-analizi-birlestir.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));

// Yollar env ile geçersiz kılınabilir (taşınabilirlik + test için).
const VAULT = process.env.KITAP_VAULT || '/Users/yalcinarsan/Documents/Projects/Kitap Projeleri/Yazma Projeleri';
const SITE = resolve(BURASI, '../src/content/articles');   // repoya göreli
const CIKTI = process.env.KITAP_TEKPARCA || join(VAULT, 'Bilançonun Ötesinde - Tek Parça.md');

// Bölümler sırayla: vault dosya adı + eşleşen site slug'ı (figcaption haritası için).
const BOLUMLER = [
  ['Bir Şirketi Nasıl Okursunuz', 'beyond-the-balance-sheet-01-bir-sirketi-nasil-okursunuz'],
  ['Bir Şirket Neye Sahiptir, Kime Borçludur', 'beyond-the-balance-sheet-02-bir-sirket-neye-sahiptir-kime-borcludur'],
  ['Para Nereden Geliyor, Nereye Gidiyor', 'beyond-the-balance-sheet-03-para-nereden-geliyor-nereye-gidiyor'],
  ['Nakit Çok Şey Anlatır', 'beyond-the-balance-sheet-04-nakit-cok-sey-anlatir'],
  ['Aynı Kâr, Farklı Hikaye', 'beyond-the-balance-sheet-05-ayni-kar-farkli-hikaye'],
  ['Kağıt Üstünde Sağlıklı, Gerçekte Sıkışık Şirketler - Verimlilik ve Likiditeyi Anlamak', 'beyond-the-balance-sheet-06-verimlilik-ve-likidite'],
  ['Bu Şirket Ucuz mu, Pahalı mı - Sermaye Yapısını ve Değerlemeyi Anlamak', 'beyond-the-balance-sheet-07-sermaye-yapisi-ve-degerleme'],
  ['Batış Önceden Görülebilir mi - Başarının ve Başarısızlığın İşaretleri', 'beyond-the-balance-sheet-08-basari-ve-basarisizlik-isaretleri'],
  ['Rakamların Bittiği Yer - Dönüşüm Çağında Bir Şirketi Bütüncül Okumak', 'beyond-the-balance-sheet-09-rakamlarin-bittigi-yer'],
];

/** Site .md'lerinden görsel başlık haritası: "MM-ad" (uzantısız) -> {alt, caption}. */
function figcaptionHaritasi() {
  const harita = new Map();
  for (const [, slug] of BOLUMLER) {
    let metin;
    try { metin = readFileSync(join(SITE, slug + '.md'), 'utf8'); } catch { continue; }
    // <figure><img src="/images/articles/<slug>/NN-ad.ext" alt="..."/><figcaption>...</figcaption>
    const re = /<img[^>]*src="\/images\/articles\/[^"]*\/([^"\/]+?)\.(?:png|jpe?g|webp)"[^>]*alt="([^"]*)"[^>]*>\s*<figcaption>([\s\S]*?)<\/figcaption>/g;
    let m;
    while ((m = re.exec(metin))) {
      harita.set(m[1], { alt: m[2].trim(), caption: m[3].replace(/\s+/g, ' ').trim() });
    }
    // Kapak (karakalem) altyazısı frontmatter'dan: kapakGorseli.altyazi + src dosya adı
    const kap = metin.match(/kapakGorseli:\s*[\s\S]*?src:\s*"[^"]*\/([^"\/]+?)\.(?:png|jpe?g|webp)"[\s\S]*?altyazi:\s*"([^"]*)"/);
    if (kap) harita.set(kap[1], { alt: '', caption: kap[2].replace(/\s+/g, ' ').trim() });
  }
  return harita;
}

const FIG = figcaptionHaritasi();

/** vault embed dosya adı "bts-NN-MM-ad.ext" -> site anahtarı "MM-ad" (uzantısız). */
function siteAnahtar(dosya) {
  const govde = dosya.replace(/\.(png|jpe?g|webp)$/i, '');       // bts-06-03-isletme-...
  const m = govde.match(/^bts-\d+-(.+)$/);                        // 03-isletme-...
  return m ? m[1] : govde;
}

/** Bir görseli figüre çevirir; altyazı öncelik: vault italik satırı > site figcaption. */
function figHtml(dosya, cap) {
  const bilgi = FIG.get(siteAnahtar(dosya)) || {};
  const altSat = bilgi.alt ? ` alt="${bilgi.alt.replace(/"/g, '&quot;')}"` : ' alt=""';
  const c = (cap || bilgi.caption || '').trim();
  const capSat = c ? `\n<figcaption>${c}</figcaption>` : '';
  return `<figure>\n<img src="attachments/${dosya}"${altSat} />${capSat}\n</figure>`;
}

/**
 * ![[bts-...png]] -> <figure>. Vault'ta her görseli, hemen ardından gelen italik
 * "*altyazı*" satırı izliyor; onu figcaption'a alıp gövdeden kaldırıyoruz (yoksa
 * altyazı iki kez görünür). Ardından italik satırı olmayan çıplak embed'leri işliyoruz.
 */
function gorselleriCevir(metin) {
  return metin
    .replace(/^!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\][ \t]*\n(?:[ \t]*\n)?[ \t]*\*(?!\*)([^\n]+?)\*[ \t]*$/gm,
      (tam, dosya, cap) => figHtml(dosya.trim(), cap))
    .replace(/^!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\][ \t]*$/gm,
      (tam, dosya) => figHtml(dosya.trim(), ''));
}

/** Bir bölüm dosyasını kitaba hazır gövdeye indirger. */
function bolumHazirla(dosyaAdi, no) {
  const ham = readFileSync(join(VAULT, dosyaAdi + '.md'), 'utf8');
  // frontmatter
  const fmMatch = ham.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  const fm = fmMatch ? fmMatch[1] : '';
  const baslikM = fm.match(/^title:\s*"?(.*?)"?\s*$/m);
  const baslik = baslikM ? baslikM[1].trim() : dosyaAdi;
  let govde = fmMatch ? ham.slice(fmMatch[0].length) : ham;

  // Satır bazlı temizlik: gezinme listesi, imza, teşvik, alt not, seri başlığı
  govde = govde.split(/\r?\n/).filter((s) => {
    const t = s.trim();
    if (/^- Bölüm \d+:/.test(t)) return false;                                   // gezinme listesi
    if (/^\*\*Bilançonun Ötesinde — Bir Şirketi Anlamak \(seri\):\*\*$/.test(t)) return false;
    if (/^Yalçın Arsan\s*[—–-]\s*.*\d{4}\.?$/.test(t)) return false;               // imza
    if (/^_?Bu seri, klasik finansal analiz.*zenginleştirilmiştir\.?_?$/.test(t)) return false; // alt not
    if (/^[_*]?\s*Bir sonraki bölümde/i.test(t)) return false;                     // teşvik (genelde italik)
    if (/^Selam ve sevgilerimle,?$/.test(t)) return false;                          // bölüm-sonu selamı (kitap sonunda tek sefer KAPANIS'te)
    return true;
  }).join('\n');

  // Bölüm etiketi önekini liderden düşür ("**Bölüm 8: ...**" -> "**...**")
  govde = govde.replace(/^\*\*Bölüm \d+:\s*/m, '**');

  // Görselleri figüre çevir
  govde = gorselleriCevir(govde);
  // Figürden hemen sonra boş satır olmazsa markdown başlığı render etmiyor — garanti altına al
  govde = govde.replace(/<\/figure>\n(?=\S)/g, '</figure>\n\n');

  // Fazla boş satır ve dangling "---" temizliği
  govde = govde
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(?:\n\s*---\s*)+\s*$/g, '')   // sondaki yatay çizgiler
    .trim();

  return `# ${baslik}\n\n${govde}`;
}

// --- Kitap girişi + bölüm haritası -----------------------------------------
const GIRIS = `# Bilançonun Ötesinde: Bir Şirketi Anlamak

*Yalçın Arsan | Mart – Eylül 2026*

Bu metin, Mart 2026'dan Eylül 2026'ya kadar, [Arsan Danışmanlık web sitesinde](https://arsandanismanlik.com.tr/makaleler/) dokuz ayrı yazı halinde yayımlanan "Bilançonun Ötesinde: Bir Şirketi Anlamak" dizisinin tek parça haline getirilmiş biçimi. İçerik, mali tabloların temellerinden başlayıp yorumlamaya, kârlılık ve verimliliğe, değerlemeye ve nihayet dönüşüm çağında klasik analiz araçlarını kullanarak bütüncül bir okuma yapmaya destek olmak amacıyla hazırlandı.

## Bu Kitapta Neler Var — Dokuz Bölümün Haritası

Dokuz bölüm, bir şirketi okumanın araçlarını sırayla kurar; sona geldiğimizde hepsi tek bir bütüncül bakışta birleşir.

**Bölüm 1 — Bir Şirketi Nasıl Okursunuz?** Faaliyet raporunun ne olduğu ve ne olmadığı; temel muhasebe ilkeleri, denetim, kurumsal yönetişim ve analistin üç altın kuralı.

**Bölüm 2 — Bir Şirket Neye Sahiptir, Kime Borçludur?** Bilançonun mantığı: kırılmaz denklem, beş yapı taşı, amortisman, defter değeri ile piyasa değeri farkı ve dönüşümde atıl varlıklar.

**Bölüm 3 — Para Nereden Geliyor, Nereye Gidiyor?** Gelir tablosu: cirodan net kâra uzanan katmanlar, olağandışı kalemler, "düzeltilmiş" kâr tuzağı ve mükemmel bir gelir tablosunun gizleyebildikleri (Kodak).

**Bölüm 4 — Nakit Çok Şey Anlatır.** Nakit akış tablosu, serbest nakit akışı, uyarı işaretleri; stratejik nakit yakma ile terminal nakit yakma farkı (Tesla ve Carillion).

**Bölüm 5 — Aynı Kâr, Farklı Hikaye.** Kârlılığı tek rakamla değil oranlarla okumak: marjlar, ROTA, DuPont, ROE; stratejik ile yapısal negatif marj ayrımı (Uber/Spotify ve WeWork).

**Bölüm 6 — Verimlilik ve Likidite.** Nakit dönüşüm döngüsü, likidite oranları, aynı oranın sektöre göre değişen anlamı; işletme sermayesinin bir rekabet silahına dönüşmesi (Amazon, Tesla).

**Bölüm 7 — Sermaye Yapısı ve Değerleme.** Kaldıraç, faiz karşılama, F/K ve DCF'in sınırları; düşük F/K her zaman ucuz mudur? (Tesla, Toyota, Volkswagen).

**Bölüm 8 — Çöküşün Sinyalleri.** Göstergeleri bir erken uyarı sistemine çevirmek: Altman Z-skoru, yönetişim kırmızı bayrakları, Türkiye'nin konkordato dalgası ve Northvolt paradoksu.

**Bölüm 9 — Rakamların Bittiği Yer.** Bütün araçların ortak kör noktası, stratejik–yapısal usta kalıp (BYD ve Northvolt), dört katmanlı bütüncül çerçeve ve Üç Altın Kural'a eklenen dördüncü kural.

Dokuz bölümün ortak paydası tek bir cümleye iniyor: **Rakam bir şirketin geçmişini anlatır; onu gerçekten anlamak için sayının bittiği yerden — iş modelinden, stratejiden, sektörün yönünden — devam etmek gerekir.**`;

// --- Üret --------------------------------------------------------------------
// Kitap kapanışı — tek sefer, en sonda (bölüm-içi selamlar yukarıda temizlendi).
const KAPANIS = `Selam ve sevgilerimle,\n\nYalçın Arsan<br>Mart – Eylül 2026`;

const parcalar = [GIRIS];
BOLUMLER.forEach(([dosya], i) => parcalar.push(bolumHazirla(dosya, i + 1)));
parcalar.push(KAPANIS);

const FM = `---
tip: yazı
title: "Bilançonun Ötesinde: Bir Şirketi Anlamak"
tarih: 2026-09-10
kaynak: "Yazı Dizisi Derlemesi — arsandanismanlik.com.tr"
dil: tr
kategori: sirket-analizi
seri: beyond-the-balance-sheet
durum: taslak
ozet: "Mart–Eylül 2026 arasında yayımlanan dokuz yazılık 'Bilançonun Ötesinde: Bir Şirketi Anlamak' dizisinin tek parça hali: faaliyet raporundan bilanço, gelir tablosu, nakit akışı, kârlılık, verimlilik, sermaye yapısı ve değerleme, çöküş sinyalleri ve dönüşüm çağında bütüncül okumaya uzanan bütünsel derleme."
---

`;

const cikti = FM + parcalar.join('\n\n') + '\n';
writeFileSync(CIKTI, cikti, 'utf8');

// Özet rapor
const kelime = cikti.split(/\s+/).length;
const figSay = (cikti.match(/<figure>/g) || []).length;
const wikiSay = (cikti.match(/\[\[/g) || []).length;
console.log(`Yazıldı: ${CIKTI}`);
console.log(`Bölüm: ${BOLUMLER.length}  ~kelime: ${kelime}  figür: ${figSay}  kalan [[wikilink]]: ${wikiSay}`);
console.log(`figcaption haritası girdisi: ${FIG.size}`);
