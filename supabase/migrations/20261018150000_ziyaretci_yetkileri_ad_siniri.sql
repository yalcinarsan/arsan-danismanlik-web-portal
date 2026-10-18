-- ============================================================================
-- Girişsiz ziyaretçi (anon) yetkilerini daraltma + ad uzunluk sınırları
-- ============================================================================
-- Sistem denetimi (18 Eki 2026, cikti/taslaklar/sistem-denetimi-2026-10-18.md, bulgu 5 ve 9).
--
-- Sorun (5): Supabase public şemadaki her fonksiyona varsayılan olarak herkese (PUBLIC) ve
-- anon'a çalıştırma izni veriyor. Migration'larda yazan "grant ... to authenticated" bunu
-- kapatmıyordu; 30 fonksiyonun hepsi girişsiz çağrılabiliyordu. Bugün bir açık yoktu, çünkü
-- her fonksiyon içeride kendi kontrolünü yapıyor (kurum_adlari hariç, o 20261018140000'de
-- kapatıldı). Ama koruma tek katmandaydı ve yazılan niyetle tutarsızdı.
--
-- Artık: anon yalnızca aşağıdaki 6 fonksiyonu çalıştırabilir. Bunlar giriş yapılmadan
-- açılan sayfaların ihtiyacı:
--   public_stats()                 → havuz vitrini (sayılar, kişisel veri yok)
--   kurum_erisimi_var(text)        → kurum giriş ekranı, bağlantı istemeden önceki kontrol
--   referans_sayfa(uuid)           → /kariyer/referans (token'lı)
--   referans_yanitla(uuid,text,boolean)
--   temas_yanit_bilgi(uuid)        → /kariyer/temas-yanit (token'lı)
--   temas_yanit_ver(uuid,text)
-- Tablolara anon'un doğrudan hiçbir izni kalmıyor (RLS zaten engelliyordu; bu ikinci katman).
-- Gelecekte oluşturulacak fonksiyon ve tablolar da varsayılan olarak anon'a kapalı doğar:
-- girişsiz çağrılması gereken YENİ bir fonksiyon eklenirse migration'ına açıkça
-- "grant execute on function ... to anon;" yazılmalı (bkz. supabase/BENIOKU.md).
--
-- (9): Adayın adı referans e-postasının konusuna, referansın adı selamlamaya giriyor.
-- Uzunluk sınırı yoktu; bir hesap açan biri adını uzun bir mesaja çevirerek sitenin
-- adresinden e-posta gönderebilirdi. Bugünkü en uzun aday adı 21 karakter.
-- ============================================================================

-- ---------- 1) Fonksiyonlar: önce herkesten al, girişli kullanıcıya geri ver --------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as imza
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from public, anon', f.imza);
    execute format('grant execute on function %s to authenticated, service_role', f.imza);
  end loop;
end $$;

-- Girişsiz sayfaların ihtiyacı olan 6 fonksiyon
grant execute on function public.public_stats()                          to anon;
grant execute on function public.kurum_erisimi_var(text)                 to anon;
grant execute on function public.referans_sayfa(uuid)                    to anon;
grant execute on function public.referans_yanitla(uuid, text, boolean)   to anon;
grant execute on function public.temas_yanit_bilgi(uuid)                 to anon;
grant execute on function public.temas_yanit_ver(uuid, text)             to anon;

-- ---------- 2) Tablolar: anon'un doğrudan izni yok ------------------------------------
revoke all on table public.adaylar, public.kurum_erisim, public.temas_talepleri, public.referanslar
  from anon;

-- ---------- 3) Gelecekte oluşturulacaklar varsayılan olarak anon'a kapalı ------------
-- Fonksiyonlarda PUBLIC'e verilen izin Postgres'in genel varsayılanı; yalnızca şema
-- düzeyinde kaldırılamıyor, bu yüzden ilk satır şemasız.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;

-- ---------- 4) Ad uzunluk sınırları ---------------------------------------------------
alter table public.adaylar
  add constraint adaylar_ad_uzunluk check (char_length(btrim(ad)) between 2 and 80);
alter table public.referanslar
  add constraint referanslar_ad_uzunluk check (char_length(ad) <= 80);
alter table public.referanslar
  add constraint referanslar_kurum_unvan_uzunluk check (kurum_unvan is null or char_length(kurum_unvan) <= 120);
