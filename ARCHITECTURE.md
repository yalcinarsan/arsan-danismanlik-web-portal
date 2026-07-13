# Arsan Danışmanlık — Sistem Mimarisi ve Karar Günlüğü

Bu dosya iki şeyi bir arada tutar:

1. **Sistem Özeti** — bugün itibarıyla neyin nerede, nasıl çalıştığının güncel fotoğrafı. Bir şey değiştiğinde bu bölüm güncellenir (üzerine yazılır, eskisi git geçmişinde kalır).
2. **Karar Günlüğü** — önemli kararların tarihli kaydı: ne karar verildi, neden. Bu bölüm **eklene eklene büyür**, geçmiş girdiler silinmez/değiştirilmez.

Amaç: proje büyüdükçe "biz buna neden böyle karar vermiştik?" sorusuna geri dönüp bakabilmek.

---

## 1. Sistem Özeti

### Site & kod
- **Framework:** [Astro](https://astro.build) — statik site üretici (dil değil; JavaScript/TypeScript tabanlı bir framework). Sayfaların çoğu düz HTML olarak üretilir; etkileşim gereken yerlerde (grafikler, kayıt formu) **React** "island"ları gömülüdür, sadece o parçalar tarayıcıda canlanır. Stil: **Tailwind CSS**.
- **Repo:** [`yalcinarsan/arsan-danismanlik-web-portal`](https://github.com/yalcinarsan/arsan-danismanlik-web-portal) (public). Git kökü bu klasör (`arsandanismanlik-web/`).
- **Yayınlama akışı:** `main` dalına her `git push`, **Cloudflare Pages**'i otomatik tetikler (~1-2 dk içinde canlıya çıkar). Elle bir "yayınla" adımı yok — commit atmak = yayınlamak.
- **Yerel geliştirme:** `npm run dev` (port 4321).

### Hosting & domain
- **Site hosting:** Cloudflare Pages, **ücretsiz** katman.
- **DNS:** Cloudflare'de yönetiliyor (nameserver seviyesinde). Alan adının **registrar'ı (kayıt firması) Bulutino** — Cloudflare değil, sadece DNS yönlendirmesi orada.
- **E-posta: Cloudflare'in DIŞINDA, Güzel Hosting'de ve ÜCRETLİ** (yıllık ~750 TL, yenileme Ekim). Site hosting'i bedelsiz ama e-posta ayrı bir hizmet — biri diğerini kapsamıyor.

### İçerik modeli — CMS yok, git-tabanlı
- Makaleler `src/content/articles/` altında birer **markdown dosyası** (Astro "Content Collections" — hafif bir şema/liste sistemi, geleneksel bir CMS değil).
- Görsel/tablo eklemek elle: kaynaktan (Medium/X) indirilip `<figure>/<figcaption>` ile makaleye gömülüyor. **Kapak görseli kullanılmıyor** — sadece yazı-içi tablo/grafik.
- **Sıkı taşıma kuralı:** makaleler kaynağından **birebir tam metin** taşınıyor (özet/parafraz yok), **bold vurgular** da orijinaline birebir uyuyor.
- Bu yaklaşımın bilinçli sınırı: içerik düzenlemek git+markdown bilgisi (ya da bu oturum) gerektiriyor — tek başına tarayıcıdan "yaz-yayınla" yapılamıyor. Şu an (tek yazar, ayda birkaç makale) bu yeterli; ölçek büyürse git üzerine hafif bir arayüz (Keystatic, Decap CMS gibi) eklenebilir.

### SEO & keşfedilirlik
- `sitemap-index.xml` (otomatik üretiliyor), `robots.txt` (arama motorları + AI botları — GPTBot/ClaudeBot/PerplexityBot vb. — açıkça davetli), dinamik `/llms.txt` (AI'lara atıf politikasını anlatan makine-okunur metin).
- JSON-LD: her sayfada Organization/Person/WebSite; her makalede Article (yazar = Yalçın Arsan, lisans = CC BY 4.0).
- **İçerik lisansı:** CC BY 4.0 — "kullan, paylaş, üzerine kur, yeter ki atıfla." Her makalede görünür not olarak da var.
- Google Search Console'a kayıtlı ve sitemap gönderilmiş.

### Otomotiv İnsanı (İK/yetenek platformu) — ayrı iş modeli
- Danışmanlık hizmeti satışının dışında, **ikinci bir iş modeli** olarak kurgulanıyor.
- **Veritabanı: Supabase** (Frankfurt/EU bölgesi — KVKK gerekçesiyle bilinçli seçildi), proje ref `wwpkgwndgephkuwpnjov`.
- **Faz 1 (şu an):** yalnızca **aday (birey) tarafı** var — kürate aday havuzu. Kurum/işveren tarafı henüz yok (Faz 2).
- **Giriş modeli:** şifresiz e-posta (magic-link). Aday kendi kaydını görür/düzenler/siler (RLS ile korunan); public site sadece anonim toplam istatistik görebilir (`public_stats()`), tek tek kayıt hiçbir yerden okunamaz.
- **Ayırt edici özellik — kademeli görünürlük:** aday kaydını Açık / Tek-kör / Çift-kör olarak işaretleyebiliyor; çift-körde kimlikler ancak karşılıklı rızayla açılıyor (gizli executive search'ün ürünleşmiş hali).
- Sayfalar: `/kariyer` (herkese açık "çok yakında" tanıtım) → `/kariyer/otomotiv-insani` (koyu temalı manifesto sayfası, metni `src/icerik/otomotiv-insani.md`'den geliyor, koddan ayrı düzenlenebilir) → `/kariyer/kayit` (kayıt formu).
- **Canlıya alınmadan önce şart:** KVKK aydınlatma metni + açık rıza — taslağı yazıldı, hukukçu onayı bekliyor.

---

## 2. Bilinen kısıtlar / açık kararlar

- İçerik yayınlama tek başına (bensiz) yapılamıyor — git+markdown akışı gerekiyor.
- Otomotiv İnsanı "Aday havuzu" kayıt CTA'sı bilinçli olarak **pasif** ("çok yakında") — KVKK metni onaylanmadan herkese açık duyurulmayacak.
- Kurum (işveren) tarafı, eğitim işlevleri, tam pazar yeri — henüz tasarlanmadı (Faz 2-3).

---

## 3. Karar Günlüğü

**2026-07-07 — Site yeniden inşası, teknoloji seçimi**
Coda Sites'tan ayrılıp kod-tabanlı bir yapıya geçme kararı. Framework: **Astro** seçildi (içerik ağırlıklı, gerektiğinde React island). Yeni, tek bir repo (`arsandanismanlik-web`) açıldı.

**2026-07-10/11 — DNS/hosting geçişi: Cloudflare Pages**
Site Cloudflare Pages'e taşındı. Sebep: `*.pages.dev` adresleri Türkiye'de bazı ISP'ler tarafından DNS-hijack'liydi; custom domain (kendi alan adımız) bunu aştı. Kesintisiz geçiş için önce Coda'ya "köprü" DNS kayıtları kondu, sonra nameserver Cloudflare'e çevrildi. E-posta bilinçli olarak **Güzel'de bırakıldı**, sadece DNS kayıtları taşındı.

**2026-07-11 — SEO + AI-atıf katmanı**
Kullanıcı, yazdıklarının AI sistemleri tarafından **atıfla** kullanılmasını istiyor (yazdıklarının dolaşımı danışmanlık işine hizmet ediyor). Bu yüzden: robots.txt AI botlarına açık, CC BY 4.0 lisansı, `/llms.txt`, JSON-LD yazar bilgisi. Canonical, Medium/X yerine kendi siteye çevrildi (site = kaynak-ev kararı).

**2026-07-12 — Makale görsel kuralı: kapak yok**
İlk taşımalarda bazı makalelere kapak/banner görseli eklenmişti. Karar: **kapak görseli hiç kullanılmayacak**, sadece yazı-içi fonksiyonel tablo/grafik. Geriye dönük olarak var olan kapaklar kaldırıldı.

**2026-07-12 — Otomotiv İnsanı: üç fazlı ürün stratejisi**
Faz 1 = anonim vitrin + manuel/kürate eşleştirme (işveren kaydı yok) → Faz 2 = işveren self-servis sorgu → Faz 3 = iki taraflı pazar yeri. Faz 1'in asıl amacı: aday toplamadan önce **talep testi** ("bu fikre gerçekten ihtiyaç var mı?").

**2026-07-12 — Kademeli görünürlük modeli**
Otomotiv İnsanı'nın ana farklılaşması olarak Açık/Tek-kör/Çift-kör görünürlük seçeneği kararlaştırıldı. Gerekçe: otomotiv sektörü küçük ve sadakati yüksek — "mevcut işvereni duymadan fırsat keşfi" adaylar için en güçlü vaat.

**2026-07-12 — Veritabanı: Supabase, bölge: Frankfurt (EU)**
Alternatifler (Airtable/Notion/Coda) "kiralamak" olarak değerlendirildi; Supabase = kendi Postgres'imiz, taşınabilir, kilitlenme yok. Bölge özellikle **Frankfurt/EU** seçildi — KVKK'nın yurt dışı aktarım kurallarına göre Asya'dan çok daha savunulabilir.

**2026-07-12 — Giriş modeli: şifresiz magic-link (B seçeneği)**
Tartışılan seçenekler: (A) hiç doğrulama yok — hızlı ama ciddiyetsiz/spam riski; (B) şifresiz e-posta doğrulama — düşük sürtünme + doğrulanmış kimlik; (C) tam şifreli hesap — güvenilir ama yüksek sürtünme. **B seçildi**: niş, motive bir kitle için doğrulama önemli ama şifre gereksiz sürtünme.

**2026-07-13 — Cloudflare Pages build ortamı: Node 20 → 22**
Supabase istemci kütüphanesi build sırasında (statik ön-render aşamasında) çalıştırılıyor ve Node ≥22 gerektiriyor (native `WebSocket` desteği). Cloudflare'in varsayılan `NODE_VERSION=20` ortamı build'i patlatıyordu (`Node.js detected but native WebSocket not found`). Çözüm: proje ortam değişkeni `NODE_VERSION=22` yapıldı.
*Öğrenilen ders:* Astro statik build'de ortam değişkenleri **build zamanında** koda gömülüyor; Cloudflare paneline env eklenmeden yapılan push, git'te "başarılı" görünse de canlı deploy sessizce başarısız olabiliyor. Her önemli push sonrası Cloudflare'in **Deployments** listesinden durum kontrol edilmeli — push başarısı ≠ deploy başarısı.

**2026-07-13 — Otomotiv İnsanı sayfa yapısı: teaser + ayrı manifesto sayfası**
`/kariyer` sayfası orijinal açık-temalı "çok yakında" tanıtımı olarak kaldı; tam manifesto (koyu kil-kahve temalı) ayrı bir alt sayfaya (`/kariyer/otomotiv-insani`) taşındı, teaser'daki kutu ona bağlanan bir buton oldu. Gerekçe: iki farklı okuyucu niyeti (hızlı göz atma vs. derinlemesine okuma) ayrı sayfalarda daha iyi hizmet buluyor.
