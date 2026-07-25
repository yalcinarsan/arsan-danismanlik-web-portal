# Arsan Danışmanlık — arsandanismanlik-web

Astro 4.16 + Tailwind + React island'lar. Bu dosya git kökü (`arsandanismanlik-web/`).

- **Sistem özeti + karar günlüğü:** [ARCHITECTURE.md](ARCHITECTURE.md) — "neden böyle karar verdik" sorusunun cevabı orada, tarihli.
- **Hangi dosya neyi kontrol ediyor:** [DOSYALAR.md](DOSYALAR.md) — özellikle koda dokunmadan düzenlenebilir metin dosyaları.

Bu dosyayı ARCHITECTURE.md/DOSYALAR.md ile senkron tut — biri güncellenirken diğeri unutulmasın.

## Komutlar

```bash
npm run dev      # yerel geliştirme, port 4321
npm run build    # astro check && astro build — push'tan önce mutlaka çalıştır
npm run preview  # build çıktısını yerel sun
```

## Deploy akışı — kritik

`main`'e her push, Cloudflare Pages'i otomatik tetikler (~1-2 dk). **Push başarısı ≠ deploy başarısı** — env değişkeni eksikliği veya Node sürüm uyuşmazlığı gibi hatalar git'te görünmez, sessizce canlıda eski sürüm kalır. Önemli bir push sonrası Cloudflare **Deployments** listesinden son deployment'ın gerçekten başarılı olduğunu kontrol et.

Astro statik build'de env değişkenleri (`PUBLIC_SUPABASE_URL` vb.) **build zamanında** koda gömülür — yeni bir env değişkeni eklerken hem `.env` hem Cloudflare Pages → Settings → Variables'a eklenmesi gerekir.

## Git — bu projeye özgü tuzaklar

- **Push'tan önce her zaman kullanıcıdan onay al** ("push edeyim mi?") — otomatik push yok.
- **Kullanıcı bazen doğrudan GitHub arayüzünden commit atıyor.** Bir push `non-fast-forward` ile reddedilirse veya bir değişikliğin "unutulmuş" göründüğünü düşünürsen önce `git log`/`git diff` ile gerçek durumu doğrula — varsayımla ilerleme. Çakışma yoksa `git pull --rebase origin main` güvenli.
- **Commit mesajlarını heredoc yerine dosyaya yazıp `git commit -F <dosya>` ile gönder.** Türkçe metinde apostrof (`'`) `<<'EOF'` heredoc'unu bazen bozuyor (bu projede birkaç kez yaşandı) — dosya + `-F` bunu tamamen ortadan kaldırıyor.
- Aynı repoda eşzamanlı iki süreç (agent + ana oturum) çalışıyorsa dosya alanlarını ayır, push öncesi rebase.

## Doğrulama beklentisi

Kod/içerik değişikliğinden sonra "bitti" demeden önce:
1. `npm run build` temiz geçmeli (TypeScript hataları `astro check` aşamasında yakalanır).
2. Görsel/UI değişikliğiyse Browser pane ile canlı kontrol et — **mobil VE masaüstü** ikisi de (bu site mobil-ağırlıklı trafik alıyor, nav gibi düzen sorunları masaüstünde görünmez).
3. Supabase'e yazan bir değişiklikse (form alanları, RLS) mümkünse gerçek bir test kaydıyla uçtan uca doğrula.

## Bilinen teknik tuzaklar

- **Plotly SSR'da patlar** ("self is not defined") — Plotly içeren bileşenlerde `client:only="react"` şart, `client:load` değil.
- **Markdown'da tek `~` metni üstü çizili render eder** — tilde kullanma, "yaklaşık" yaz.
- **Sticky header, anchor linklerini kapatıyor** — `prose-headings:scroll-mt-20` ile telafi ediliyor, yeni prose alanı eklerken unutma.
- **`@astrojs/sitemap` 3.2.1'e kilitli** — 3.7.x, Astro 4.16 ile `reduce of undefined` hatası veriyor. Yükseltme denemeden önce bunu hatırla.
- **Cloudflare Pages `NODE_VERSION=22`** — Supabase istemcisi build sırasında Node ≥22 native `WebSocket` istiyor, varsayılan 20 build'i patlatır.
- **Supabase Edge Functions deploy'u Claude'un kendi başına yapamayacağı bir iş** — `supabase login` tarayıcı OAuth istiyor, kullanıcının kendi terminalinde çalıştırması gerekiyor. Kod hazırlanır, deploy komutları verilir, kullanıcı çalıştırır.
- **Resend/Supabase Auth e-posta linkleri kendi domainimizden geçmeli** — `{{ .ConfirmationURL }}` yerine `{{ .TokenHash }}` + `/kariyer/dogrula` sayfası kullanılıyor (bkz. ARCHITECTURE.md 2026-07-23 kaydı). Yeni bir auth e-posta akışı eklenirse aynı deseni kullan, `{{ .ConfirmationURL }}`'e geri dönme — bazı kurumsal e-posta geçitleri from-domain/link-domain uyuşmazlığını phishing sinyali sayıp maili sessizce karantinaya alıyor (gerçek vakada doğrulandı).

## İçerik ve metin kuralları

- **Makaleler kaynağından birebir tam metin taşınır** — özet/parafraz yok, bold vurgular orijinaline birebir uyar.
- **KVKK / yasal metinlerde fidelity kritik** — avukattan gelen metin kelimesi kelimesine kullanılır, yorumlanıp yeniden yazılmaz. `kvkk.md`'deki `taslak: true/false` alanı hem "hukukçu onayı bekleniyor" uyarısını hem `noindex`'i kontrol eder — canlıya almadan önce tüm `[…]` placeholder'ların dolu olduğunu doğrula.
- **Kullanıcı arayüzü metinlerinde sentence case** — "Kaydını tamamla", "Kaydını Tamamla" değil. Marka imzası formatı: "Otomotiv İnsanı · Arsan Danışmanlık". "no-reply" tarzı gönderen adı kullanılmıyor.

## Dokunma

- **Güzel Hosting e-posta hesabı** (Ekonomi-2, yenileme 18.10.2026) — iptal etme, mevcut kurumsal mail (MX/SPF/DKIM) buna bağlı. Resend sadece auth/kayıt e-postaları için, Güzel'in yerini almadı.
- **`send.arsandanismanlik.com.tr` altındaki SPF/MX kayıtları** Resend'e ait — kök domainin SPF/MX'iyle karışmasın diye bilinçli olarak alt domainde tutuluyor, kök domaine taşıma.

## Alt-ajanlar (2026-07-24 kuruldu)

Deniz'in hazırladığı 8 uzman alt-ajan `.claude/agents/`'da (proje kökünün bir üstünde, `arsan danışmanlık web portalı/.claude/agents/` — Claude Code'un asıl çalışma dizini orası). Tasarım/SEO takımı: **EGE** (tasarımcı-üretici), **MELİS** (grafiker), **ARDA** (tasarım/erişilebilirlik denetçisi, bloke edebilir), **KEREM** (SEO/AEO/GEO denetçisi). İçerik takımı: **HALUK** (gazeteci, dışarıdan bakış), **MURAT** (sektör içinden mühendis-yönetici), **EDA** (gündem/trend takipçisi) — üçü de yalnızca öneri/sparring yapar, yazmaz; **SELİN** (Türkçe dil denetçisi, birebir çeviri/kalque avcısı, bloke edebilir). Detaylı rol tarifi ve önerilen akışlar için Deniz'in `BENIOKU.md`'sine bak (bu repoda değil, ayrı tutuluyor).

<!-- ARSAN-ILKELERI:START -->
## Arsan Danışmanlık — İçerik ve Tasarım İlkeleri (ortak referans)

Bu bölüm tüm ajanların ortak referansıdır (EGE, MELİS, ARDA, KEREM, SELİN, HALUK, MURAT, EDA) ve her ajanın "özel ayarlar" kısmını besler. Ajanlar burada yazanı esas alır.

### Kurum kimliği
- **Kurum:** Arsan Danışmanlık — otomotiv ve elektrifikasyon odaklı yönetim danışmanlığı.
- **Kurucu:** Yalçın Arsan, Yönetim Danışmanı. İsim aynen yazılır; unvan çevrilebilir, isim çevrilmez.
- **Site:** arsandanismanlik.com.tr — Astro (statik), Türkçe.

### Hedef okur
- Otomotiv sektörü karar vericileri, yöneticiler; B2B. Otomotiv İnsanı tarafında ayrıca sektör profesyonelleri (aday havuzu) — Türkiye öncelikli.

### Marka sesi ve ton
- Otoriter ama okunur, veri-temelli, güven veren, abartısız.
- Profesyonel ama soğuk/bürokratik değil.
- **Sentence case başlık/buton metinleri** ("Kaydını tamamla", "Kaydını Tamamla" değil).
- Marka imzası formatı: "Otomotiv İnsanı · Arsan Danışmanlık" (alt marka · ana kurum). "no-reply" tarzı soğuk gönderen adı kullanılmaz.

### İçerik ilkeleri
- **Kanıt önce:** her ciddi iddianın arkasında sayı, kaynak, tarih; veriyi yorumdan ayır.
- **Hook önce:** ilk cümlede yakala; okur-önce yaz.
- **Dürüstlük:** hype üretme, uydurma, tek kaynağa güvenme; emin değilsen "doğrulanmalı" de.
- **Yalçın yazar/sahiptir:** ajanlar önerir ve taslak verir; son söz onun. (Taslak yazma akışı: Tana → Obsidian arşiv, bkz. kullanıcının kişisel hafıza sistemi — ajanlar bu akışı değiştirmez, besler.)
- **Makale fidelity:** kaynağından taşınan metin birebir tam metin, özet/parafraz yok (yukarıdaki "İçerik ve metin kuralları" ile aynı).

### Yazım / yasak laf listesi (doğal, insan gibi Türkçe)
- Yapay zekâ/çeviri kokan kalıp yok; aşırı em dash (—/–) yok.
- Şablon geçiş yok: "Günümüzde...", "Sonuç olarak...", "Unutmayın ki...", "Bilindiği üzere...", "Şunu belirtmek gerekir ki...".
- Boş klişe yok: "sektör lideri", "yenilikçi çözümler", "oyunu değiştiren", "müşteri odaklı yaklaşım", "katma değer" (somutla).
- Şişme/bürokratik yok: "gerçekleştirmek" → yap; "...sahiptir" → var; "adreslemek" → ele almak; "-e yönelik olarak", "...ile ilgili olarak".
- Gereksiz İngilizce: Türkçesi varken kullanma (meeting → toplantı, deadline → son tarih); sektör standardı terim korunur.
- Kuruma özel yasak kelime/rakip adı listesi: **belirlenmedi** — Yalçın'a sorulmadı, gerekirse ekleyecek.

### Tasarım kuralları
- **TREN TASARIM YASAK:** tekrarlayan bölümler alt alta tam genişlik değil; her zaman yan yana **kart grid**, dengeli satır (8 öğe = 4+4). (Site zaten bu deseni kullanıyor: `pillars`/`kimizNeYapariz` grid'leri, referanslar listesi.)
- **MOBİL AYRI TASARLANIR:** masaüstü tasarımını mobile dayatma; mobil hız, okunabilirlik ve parmak erişimi için gerekince farklı bir desene geç (nav'daki hamburger menü geçişi bu ilkenin uygulanmış hâli, bkz. ARCHITECTURE.md).
- **Erişilebilirlik:** WCAG 2.2 AA (kontrast 4.5:1, dokunma hedefi 44px, görünür focus, semantik HTML).
- **Görsel:** profesyonel çizgi + etkili; AI-slop ve klişe stok yok; WebP/AVIF, mobil için gerekirse ayrı kırpma.
- **Palet/tipografi (`tailwind.config.mjs` → `theme.extend`):** zemin `#faf7f2` (paper), metin `#2c2620` (ink), vurgu `#b5623c` (accent), ikincil zemin `#f1e9dd` (sand), kenarlık `#e7ddcf` (warm-border), nötr ton skalası `warm-700..400`. Başlık **Fraunces**, gövde **Inter**.

### Arama görünürlüğü (SEO/AEO/GEO)
- **Hedef sorgular:** "otomotiv elektrifikasyon danışmanlığı", "EV pazarı Türkiye", "otomotiv yönetim danışmanlığı" — kesinleşmiş resmi bir liste değil, KEREM ilk denetiminde mevcut sayfa içeriğinden (hizmetlerimiz, makaleler, ev-verileri) daha kesin bir küme çıkarabilir.
- Her sayfa: özgün title + meta description; tek H1 + soru-biçimli H2; FAQ; uygun schema (Organization, Person, Service, Article, FAQPage, Dataset); `llms.txt`.
- Beyaz şapka; uydurma metrik yok; kaynak ve tarih verilir.
- Mevcut durum (KEREM'in ilk denetiminde referans alacağı): sitemap + robots.txt + llms.txt + JSON-LD (Organization/Person/WebSite/Article) zaten kurulu, GSC'ye kayıtlı (bkz. ARCHITECTURE.md 2026-07-11/12 kararları) — sıfırdan değil, geliştirme denetimi.
<!-- ARSAN-ILKELERI:END -->

