# Veritabanı değişiklikleri

Bu klasör canlı veritabanının kaynağıdır. Amaç: **şema değişikliği panele elle
yapıştırılmasın, kodla birlikte gitsin.**

## Neden değişti

Önceki yöntemde `schema.sql` elle bakımlanıyor, değişiklikler Supabase → SQL
Editor'e kopyalanıyordu. Sorun kolaylık değil, **sapma**: dosya 18 Temmuz'da
kalmışken kurum demo ekranı Ağustos'ta yazıldı ve canlı veritabanının o
dosyayla aynı olup olmadığı kimse tarafından bilinmiyordu. Elle taşınan şema,
er geç gerçeği yansıtmayı bırakır.

Artık Supabase CLI, `migrations/` klasöründeki dosyaların hangilerinin canlıya
uygulandığını kendi tutuyor. Bir dosyayı iki kez uygulamak ya da uygulamayı
unutmak mümkün değil.

## Tek seferlik kurulum

```bash
npm run db:giris     # tarayıcı açılır, Supabase hesabınla giriş yaparsın
npm run db:bagla     # projeyi bağlar (veritabanı şifresini ister)
```

`db:giris` tarayıcı üzerinden çalıştığı için **senin yapman gerekiyor**;
Claude bu adımı yapamaz ve yapmamalı.

## Günlük kullanım

```bash
npm run db:durum     # hangi değişiklik uygulandı, hangisi bekliyor
npm run db:cek       # CANLIDAN oku: mevcut şemayı migrations/ içine yazar
npm run db:uygula    # BEKLEYENLERİ canlıya uygula
```

`db:uygula` bilerek otomatik değil. Şema değişikliği geri alması en zor
işlemdir; her push'ta kendiliğinden çalışması, yanlış bir migration'ın
fark edilmeden canlıya gitmesi demek olurdu. Komutu sen çalıştırırsın.

## İlk seferde sıra

1. `npm run db:giris` ve `npm run db:bagla`
2. `npm run db:cek` — canlının bugünkü hâli `migrations/` içine bir temel
   dosya olarak yazılır. **Bu aynı zamanda `adaylar` tablosundaki gerçek RLS
   politikalarını da gösterir** — `schema.sql` ile aynı mı, orada görülür.
3. Bekleyen `kurum-erisim.sql` bir migration dosyasına dönüştürülür
4. `npm run db:uygula`

## Dosyalar

| Dosya | Ne |
|---|---|
| `migrations/` | Uygulanan/bekleyen değişiklikler. Sıra dosya adındaki tarihe göre. |
| `schema.sql` | **Tarihî kayıt.** Faz 1'in elle bakımlanan şeması. Artık buraya yazma; yeni değişiklik `migrations/` içine gider. |
| `kurum-erisim.sql` | Kurum görünümü davetli erişimi. Henüz uygulanmadı; migration'a dönüşecek. |
| `config.toml` | CLI ayarları. |
| `functions/` | Edge Functions. Deploy'u ayrı (`supabase functions deploy`) ve tarayıcı girişi ister. |

## Panel hâlâ çalışıyor

Acil bir durumda `kurum-erisim.sql`'i Supabase → SQL Editor'e yapıştırmak da
işe yarar; dosya idempotent, iki kez çalıştırmak güvenli. Ama o yolu
kullanırsan `migrations/` geride kalır — sonra `npm run db:cek` ile senkronla.
