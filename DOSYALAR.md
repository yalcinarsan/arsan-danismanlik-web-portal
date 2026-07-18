# Dosya Rehberi — ne nerede?

Bu dosyayı **kenar panelinde açık tut**; düzenlemek istediğin her şeye buradan
tek tıkla ulaşırsın. Yukarı kaydırıp eski mesajlarda link aramana gerek kalmaz.

---

## 1. Sayfa metinleri — koda dokunmadan düzenlenebilir

Bunlar saf metin dosyaları. İçindeki yazıyı serbestçe değiştirebilirsin;
site otomatik olarak yeni metni kullanır.

| Dosya | Neyi kontrol eder |
|---|---|
| [src/icerik/ev-verileri.md](src/icerik/ev-verileri.md) | **EA Verileri** sayfasının tüm metni — başlık, giriş, her grafiğin altındaki not |
| [src/icerik/otomotiv-insani.md](src/icerik/otomotiv-insani.md) | **Otomotiv İnsanı manifestosu** — üstteki alanlar (başlık, slogan, buton yazıları, e-posta) + gövde metni |
| [src/icerik/kvkk.md](src/icerik/kvkk.md) | **KVKK aydınlatma metni**. `taslak: true` olduğu sürece sayfada "hukukçu onayı bekleniyor" uyarısı çıkar ve sayfa arama motorlarına kapalıdır |

## 2. Makaleler

Her makale ayrı bir dosya. Görseller `public/images/articles/` altında, makale adıyla
aynı isimli klasörde.

| Dosya | |
|---|---|
| [src/content/articles/](src/content/articles/) | **Tüm makaleler** — her biri bir `.md` dosyası |

Üstteki alanların anlamı: `durum: yayında` yayında demek (`taslak` yaparsan siteden kalkar),
`seriNo` serideki sırası, `ozet` liste sayfasında ve arama sonuçlarında görünen açıklama.

## 3. Metni hâlâ kodun içinde olan sayfalar

Bunlarda metin `.astro` dosyasının içine gömülü. Düzenlenebilir ama etrafındaki
kod işaretlerine (`<p class="...">` gibi) dokunmamak gerekir — emin değilsen bana söyle.

| Dosya | Sayfa |
|---|---|
| [src/pages/index.astro](src/pages/index.astro) | Ana sayfa (Biz kimiz / Ne yaparız / Nasıl yaparız + kartlar) |
| [src/pages/hizmetlerimiz.astro](src/pages/hizmetlerimiz.astro) | Hizmetlerimiz ana sayfası |
| [src/pages/hizmetlerimiz/](src/pages/hizmetlerimiz/) | Dört hizmet alt sayfası |
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
| [supabase/schema.sql](supabase/schema.sql) | Veritabanı şeması (canlı veritabanının kaynağı) |

## 5. Proje hafızası

| Dosya | |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | **Sistem özeti + karar günlüğü** — "bunu neden böyle yapmıştık?" sorusunun cevabı |

## 6. Taslaklar — sitenin dışında

Bunlar git'e dahil değil, siteye çıkmaz. Yayına hazır olmayan çalışmalar burada durur.
Bu klasör deponun dışında olduğu için **tam yol** vermek gerekiyor:

`/Users/yalcinarsan/Claude Code Projects/arsan danışmanlık web portalı/taslaklar/`

İçindekiler: KVKK taslağı, e-posta metinleri, dağıtım içerikleri, hizmet sayfası taslakları.
