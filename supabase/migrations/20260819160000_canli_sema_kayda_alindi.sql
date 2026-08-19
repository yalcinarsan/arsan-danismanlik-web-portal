-- ============================================================================
-- Canlıda olup hiçbir dosyada olmayan iki şey kayda alınıyor
-- ============================================================================
-- 19 Ağustos 2026'da `pg_policies` ve `pg_views` sorgulanınca çıktı: canlı
-- veritabanı `schema.sql`'den farklıydı. Bu migration farkı sürüm kontrolüne
-- alıyor ki taze bir ortam üretimle aynı olsun.
--
-- Not: burası tam bir temel dosya DEĞİL. `adaylar` tablosunun kendisi hâlâ
-- yalnızca `schema.sql`'de. Tam temel için `npm run db:cek` gerekiyor, o da
-- Docker Desktop istiyor (bkz. BENIOKU.md).
-- ============================================================================


-- ---------- 1) aday_listesi view'ının erişimi kapalı kalsın -----------------
-- BULGU (19 Ağustos): `aday_listesi` view'ı anonim isteklere 35 aday kaydını
-- ad/e-posta/telefon dahil döndürüyordu. `adaylar` tablosu doğru korunuyordu
-- (anon -> 0 kayıt) ama view onu baypas ediyordu: Postgres'te bir view
-- varsayılan olarak SAHİBİNİN yetkisiyle çalışır, alttaki tablonun RLS'i
-- devreye girmez. Anon anahtarı sitenin JavaScript'inde açık olduğu için
-- veri fiilen herkese açıktı.
--
-- View kodda, `schema.sql`'de ve migration'larda hiç geçmiyor — panelden elle
-- açılıp unutulmuş olmalı. Tanımı `adaylar`ın düz bir kopyası:
--   select id, ad, eposta, telefon, sehir, calisma_tercihi, aciklik,
--          deneyim_yili, kidem, kanal, fonksiyon, elektrifikasyon, markalar,
--          diller, sertifikalar, serbest_metin, gorunurluk, cv_path, created_at
--   from adaylar order by created_at desc
--
-- Erişim 19 Ağustos'ta panelden kesildi. Burada tekrarlanıyor ki kayıtta
-- kalsın ve taze bir ortamda da kapalı doğsun.
do $$
begin
  if exists (select 1 from pg_views where schemaname = 'public' and viewname = 'aday_listesi') then
    revoke all on public.aday_listesi from anon, authenticated, public;
  end if;
end $$;

-- ÖNERİ — view tümüyle kaldırılmalı. Hiçbir yerde kullanılmıyor ve durduğu
-- sürece gizli bir risk: ileride biri `grant select on all tables in schema
-- public to anon` gibi toplu bir yetki verirse açık kendiliğinden geri gelir.
-- Bilerek yorumda bırakıldı; silme kararı Yalçın'ın.
--   drop view if exists public.aday_listesi;


-- ---------- 2) Yönetici okuma politikası ------------------------------------
-- `adaylar` üzerinde `schema.sql`'de olmayan beşinci bir politika var. Kurum
-- demosunun neden çalıştığının cevabı bu: Yalçın girince devreye giriyor ve
-- `select('*')` bütün havuzu döndürüyor.
--
-- Korkulan "giriş yapan herkes okur" durumu YOK — koşul tek bir e-postaya
-- bağlı. Aşağıdaki tanım canlıdan birebir alındı.
--
-- GÖZLEM (bilerek değiştirilmedi): politika `to public` ile tanımlı, diğer
-- dördü `to authenticated`. Pratikte fark yok — anon jetonunda `email` claim'i
-- olmadığı için koşul anon için zaten sağlanmıyor. Yine de `to authenticated`
-- daha dar ve tutarlı olurdu. Çalışan bir yetki politikasını gerekçesiz
-- değiştirmemek için olduğu gibi kaydedildi; daraltmak ayrı bir karar.
--
-- DİKKAT: yönetici e-postası iki yerde sabit — burada ve
-- `src/components/AdaylarListesi.tsx` içinde. Adres değişirse ikisi de
-- güncellenmeli, yoksa yönetici kendi listesini göremez.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'adaylar'
      and policyname = 'yalcin tum kayitlari gorur'
  ) then
    create policy "yalcin tum kayitlari gorur"
      on public.adaylar for select
      to public
      using ((auth.jwt() ->> 'email'::text) = 'yalcinarsan@arsandanismanlik.com.tr'::text);
  end if;
end $$;
