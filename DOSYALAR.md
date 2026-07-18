# Dosya Rehberi — ne nerede?

Bu dosyayı **kenar panelinde açık tut**; düzenlemek istediğin her şeye buradan
tek tıkla ulaşırsın. Yukarı kaydırıp eski mesajlarda link aramana gerek kalmaz.

---

## 1. Sayfa metinleri — koda dokunmadan düzenlenebilir

Bunlar saf metin dosyaları. İçindeki yazıyı serbestçe değiştirebilirsin;
site otomatik olarak yeni metni kullanır.

| Dosya | Neyi kontrol eder |
|---|---|
| [src/icerik/ev-verileri.md](arsandanismanlik-web/src/icerik/ev-verileri.md) | **EA Verileri** sayfasının tüm metni — başlık, giriş, her grafiğin altındaki not |
| [src/icerik/otomotiv-insani.md](arsandanismanlik-web/src/icerik/otomotiv-insani.md) | **Otomotiv İnsanı manifestosu** — üstteki alanlar (başlık, slogan, buton yazıları, e-posta) + gövde metni |
| [src/icerik/kvkk.md](arsandanismanlik-web/src/icerik/kvkk.md) | **KVKK aydınlatma metni**. `taslak: true` olduğu sürece sayfada "hukukçu onayı bekleniyor" uyarısı çıkar ve sayfa arama motorlarına kapalıdır |

## 2. Makaleler

Her makale ayrı bir dosya. Görseller `public/images/articles/` altında, makale adıyla
aynı isimli klasörde.

| Dosya | |
|---|---|
| [src/content/articles/](arsandanismanlik-web/src/content/articles/) | **Tüm makaleler** — her biri bir `.md` dosyası |

Üstteki alanların anlamı: `durum: yayında` yayında demek (`taslak` yaparsan siteden kalkar),
`seriNo` serideki sırası, `ozet` liste sayfasında ve arama sonuçlarında görünen açıklama.

## 3. Metni hâlâ kodun içinde olan sayfalar

Bunlarda metin `.astro` dosyasının içine gömülü. Düzenlenebilir ama etrafındaki
kod işaretlerine (`<p class="...">` gibi) dokunmamak gerekir — emin değilsen bana söyle.

| Dosya | Sayfa |
|---|---|
| [src/pages/index.astro](arsandanismanlik-web/src/pages/index.astro) | Ana sayfa (Biz kimiz / Ne yaparız / Nasıl yaparız + kartlar) |
| [src/pages/hizmetlerimiz.astro](arsandanismanlik-web/src/pages/hizmetlerimiz.astro) | Hizmetlerimiz ana sayfası |
| [src/pages/hizmetlerimiz/](arsandanismanlik-web/src/pages/hizmetlerimiz/) | Dört hizmet alt sayfası |
| [src/pages/kariyer/index.astro](arsandanismanlik-web/src/pages/kariyer/index.astro) | Kariyer — "çok yakında" tanıtım sayfası |
| [src/pages/kariyer/kayit.astro](arsandanismanlik-web/src/pages/kariyer/kayit.astro) | Kayıt sayfasının başlık ve açıklaması |
| [src/pages/referanslar.astro](arsandanismanlik-web/src/pages/referanslar.astro) | Referanslar |
| [src/pages/makaleler/index.astro](arsandanismanlik-web/src/pages/makaleler/index.astro) | Makaleler listesi — seri başlıkları burada |

## 4. Kayıt formu ve profil (kod)

Metin değişikliği için bile bana söylemen daha güvenli — bunlar çalışan arayüzler.

| Dosya | |
|---|---|
| [src/components/KayitFormu.tsx](arsandanismanlik-web/src/components/KayitFormu.tsx) | Kayıt / profil güncelleme formu |
| [src/components/ProfilimGorunumu.tsx](arsandanismanlik-web/src/components/ProfilimGorunumu.tsx) | Profil görüntüleme + kayıt silme |
| [supabase/schema.sql](arsandanismanlik-web/supabase/schema.sql) | Veritabanı şeması (canlı veritabanının kaynağı) |

## 5. Proje hafızası

| Dosya | |
|---|---|
| [ARCHITECTURE.md](arsandanismanlik-web/ARCHITECTURE.md) | **Sistem özeti + karar günlüğü** — "bunu neden böyle yapmıştık?" sorusunun cevabı |

## 6. Taslaklar — siteye çıkmayan çalışmalar

Bunlar git'e dahil değil, siteye çıkmaz. Yayına hazır olmayan işler burada durur.

| Dosya | |
|---|---|
| [otomotiv-insani-eposta-metinleri.md](taslaklar/otomotiv-insani-eposta-metinleri.md) | **Adaylara giden e-postaların metinleri** — giriş bağlantısı e-postası (Supabase şablonu) ve karşılama e-postası |
| [kvkk-aydinlatma-riza.md](taslaklar/kvkk-aydinlatma-riza.md) | KVKK metninin ilk taslağı (yayına giden sürüm artık `src/icerik/kvkk.md`) |
| [otomotiv-insani-dagitim-icerigi.md](taslaklar/otomotiv-insani-dagitim-icerigi.md) | X / LinkedIn duyuru metinleri |
| [ik-portali-gerekcesi.md](taslaklar/ik-portali-gerekcesi.md) | Otomotiv İnsanı'nın gerekçesi |
| [taslaklar/](taslaklar/) | Klasörün tamamı (hizmet sayfası taslakları, IEA izin talebi vb.) |
