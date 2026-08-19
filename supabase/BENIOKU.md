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

## Docker gerektiren komutlar

`db:cek` (ve `supabase db dump`/`db diff`) yerel bir "gölge veritabanı"
kurduğu için **Docker Desktop** ister; bu makinede Docker yok, o yüzden
çalışmıyorlar. `db:durum` ve `db:uygula` doğrudan bağlanıyor, Docker
istemiyor — günlük iş bunlarla dönüyor.

Sonucu: canlı şemayı dosyaya çekemiyoruz. `adaylar` tablosundaki gerçek RLS
politikalarının `schema.sql` ile aynı olup olmadığı **hâlâ doğrulanmadı.**
Docker kurulursa `npm run db:cek` bunu tek komutta çözer; kurulmayacaksa
Supabase panelinde şu sorgu aynı cevabı verir:

```sql
select policyname, cmd, qual from pg_policies where tablename = 'adaylar';
```

## Dosyalar

| Dosya | Ne |
|---|---|
| `migrations/` | Uygulanan/bekleyen değişiklikler. Sıra dosya adındaki tarihe göre. |
| `schema.sql` | **Tarihî kayıt.** Faz 1'in elle bakımlanan şeması. Artık buraya yazma; yeni değişiklik `migrations/` içine gider. |
| `migrations/20260819133918_kurum_erisim.sql` | Kurum görünümü davetli erişimi. **19 Ağustos 2026'da canlıya uygulandı.** |
| `config.toml` | CLI ayarları. |
| `functions/` | Edge Functions. Deploy'u ayrı (`supabase functions deploy`) ve tarayıcı girişi ister. |

## Panel hâlâ çalışıyor

Acil bir durumda migration dosyasını Supabase → SQL Editor'e yapıştırmak da
işe yarar; dosyalar idempotent yazılıyor, iki kez çalıştırmak güvenli. Ama o
yolu kullanırsan `migrations/` geride kalır ve CLI o değişikliği "uygulanmamış"
sayar — mümkünse `npm run db:uygula` kullan.
