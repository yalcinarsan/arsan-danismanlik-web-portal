# Dosya Rehberi — ne nerede?

**Bu bir referans, erişim kısayolu değil.** "Hangi dosya neyi kontrol ediyor?"
sorusunun cevabı burada. Bir dosyayı açman gerektiğinde linki Claude sana o anki
mesajın içinde verir — bu dosyayı bulmak için yukarı kaydırman gerekmez.

---

## 1. Sayfa metinleri — koda dokunmadan düzenlenebilir

Bunlar saf metin dosyaları. İçindeki yazıyı serbestçe değiştirebilirsin;
site otomatik olarak yeni metni kullanır.

| Dosya | Neyi kontrol eder |
|---|---|
> **`src/icerik/` dosyalarındaki alan adları:** `seo_` ile başlayan alanlar
> **sayfada görünmez** — tarayıcı sekmesinde, Google sonucunda ve sosyal medya
> paylaşımında çıkar. Geri kalan tüm alanlar sayfada görünür.
>
> Neden bazı görünür metinler gövdede değil de üstteki alanlarda: gövde şablona
> tek bir blok olarak giriyor, içine ayrı ayrı konumlanamıyor. Tasarımda kendi
> yeri olan her metin (başlık, slogan, buton etiketi, imza) adlandırılmış bir
> alan olmak zorunda. Kural: **paragrafsa gövdeye, tasarımda yuvası varsa üste.**

| [src/icerik/ev-verileri.md](src/icerik/ev-verileri.md) | **EA Verileri** sayfasının tüm metni — başlık, giriş, her grafiğin altındaki not |
| [src/icerik/otomotiv-insani.md](src/icerik/otomotiv-insani.md) | **Otomotiv İnsanı manifestosu** — üstteki alanlar (başlık, slogan, buton yazıları, e-posta) + gövde metni |
| [src/icerik/kvkk.md](src/icerik/kvkk.md) | **KVKK aydınlatma metni**. `taslak: true` olduğu sürece sayfada "hukukçu onayı bekleniyor" uyarısı çıkar ve sayfa arama motorlarına kapalıdır |
| [src/icerik/kariyer.md](src/icerik/kariyer.md) | **Kariyer** sayfası (/kariyer) — etiket, başlık, giriş, keşfet kutusu + gövde metni |

## 2. Makaleler

Her makale ayrı bir dosya. Görseller `public/images/articles/` altında, makale adıyla
aynı isimli klasörde.

| Dosya | Neyi kontrol eder |
|---|---|
| [src/content/articles/](src/content/articles/) | **Tüm makaleler** — her biri bir `.md` dosyası |
| [src/content/config.ts](src/content/config.ts) | Makale üst alanlarının şeması; isteğe bağlı `kapakGorseli` kullanılırsa `src`, `alt` ve `altyazi` birlikte zorunludur |
| [src/layouts/ArticleLayout.astro](src/layouts/ArticleLayout.astro) | Makale başlığı, geniş kapak, metin ve “Bu sayfada” navigasyonunun yerleşimi |
| [MAKALE-GORSEL-DILI.md](MAKALE-GORSEL-DILI.md) | Karakalem kapak dili, altyazı, erişilebilirlik, onay, web–vault eşleştirmesi ve yayın akışı |

Üstteki alanların anlamı: `durum: yayında` yayında demek (`taslak` yaparsan siteden kalkar),
`seriNo` serideki sırası, `ozet` liste sayfasında ve arama sonuçlarında görünen açıklama.
`kapakGorseli` isteğe bağlıdır; kullanıldığında görsel yolu, nesnel `alt` betimi ve kısa editoryal
altyazı birlikte yazılır. Onaylanan kapak ayrıca Yazma Projeleri vault’undaki özgün nota eklenir.

## 3. Metni hâlâ kodun içinde olan sayfalar

Bunlarda metin `.astro` dosyasının içine gömülü. Düzenlenebilir ama etrafındaki
kod işaretlerine (`<p class="...">` gibi) dokunmamak gerekir — emin değilsen bana söyle.

| Dosya | Sayfa |
|---|---|
| [src/pages/index.astro](src/pages/index.astro) | Ana sayfa (Biz kimiz / Ne yaparız / Nasıl yaparız + kartlar) |
| [src/pages/hizmetlerimiz.astro](src/pages/hizmetlerimiz.astro) | Hizmetlerimiz ana sayfası |
| [src/pages/hizmetlerimiz/](src/pages/hizmetlerimiz/) | Danışmanlık ve çalıştay alt sayfaları |
| [src/pages/otomotiv-satis-dagitim-sistemi.astro](src/pages/otomotiv-satis-dagitim-sistemi.astro) | Otomotiv Satış ve Dağıtım Sistemi ürün sayfası |
| [src/components/OtomotivSistemiKarti.astro](src/components/OtomotivSistemiKarti.astro) | Ana sayfa ve Hizmetlerimiz’deki kısa ürün kartı |
| [src/pages/kariyer/index.astro](src/pages/kariyer/index.astro) | Kariyer — "çok yakında" tanıtım sayfası |
| [src/pages/kariyer/kayit.astro](src/pages/kariyer/kayit.astro) | Kayıt sayfasının başlık ve açıklaması |
| [src/pages/referanslar.astro](src/pages/referanslar.astro) | Referanslar |
| [src/pages/makaleler/index.astro](src/pages/makaleler/index.astro) | Makaleler listesi — seri başlıkları burada |

## 4. Kayıt formu ve profil (kod)

Metin değişikliği için bile bana söylemen daha güvenli — bunlar çalışan arayüzler.

| Dosya | |
|---|---|
| [src/components/KayitFormu.tsx](src/components/KayitFormu.tsx) | Kayıt / profil güncelleme formu |
| [src/components/ProfilimGorunumu.tsx](src/components/ProfilimGorunumu.tsx) | Profil görüntüleme + kayıt silme |
| [supabase/BENIOKU.md](supabase/BENIOKU.md) | **Veritabanı değişikliği nasıl yapılır** — `npm run db:*` komutları ve tek seferlik kurulum. Şema artık panele elle yapıştırılmıyor. |
| [supabase/schema.sql](supabase/schema.sql) | Faz 1 şeması — **tarihî kayıt.** Yeni değişiklikler `supabase/migrations/` içine yazılır. |
| [supabase/kurum-erisim.sql](supabase/kurum-erisim.sql) | **Kurum görünümü davetli erişimi** — `kurum_erisim` listesi + maskeli `kurum_havuzu()` fonksiyonu. Kime erişim verileceği Supabase panelinden bu tabloya yazılır. |

## 5. Proje hafızası

| Dosya | |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | **Sistem özeti + karar günlüğü** — "bunu neden böyle yapmıştık?" sorusunun cevabı |

## 6. Taslaklar — siteye çıkmayan çalışmalar

Bunlar git'e dahil değil, siteye çıkmaz. Yayına hazır olmayan işler burada durur.

| Dosya | |
|---|---|
| [otomotiv-insani-eposta-metinleri.md](taslaklar/otomotiv-insani-eposta-metinleri.md) | **Adaylara giden e-postaların metinleri** — giriş bağlantısı e-postası (Supabase şablonu) ve karşılama e-postası |
| [kvkk-aydinlatma-riza.md](taslaklar/kvkk-aydinlatma-riza.md) | KVKK metninin ilk taslağı (yayına giden sürüm artık `src/icerik/kvkk.md`) |
| [otomotiv-insani-dagitim-icerigi.md](taslaklar/otomotiv-insani-dagitim-icerigi.md) | X / LinkedIn duyuru metinleri |
| [ik-portali-gerekcesi.md](taslaklar/ik-portali-gerekcesi.md) | Otomotiv İnsanı'nın gerekçesi |
| [taslaklar/](taslaklar/) | Klasörün tamamı (hizmet sayfası taslakları, IEA izin talebi vb.) |
