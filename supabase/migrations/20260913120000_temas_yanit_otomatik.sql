-- ============================================================================
-- Otomatik aktarim: adayin GIRISSIZ temas-talebi onayi
-- ============================================================================
-- Bir kurum temas talebi gonderince aday, e-postadaki tokenli bir linkle
-- (/kariyer/temas-yanit?token=...) girise gerek kalmadan Kabul/Ret verir;
-- durum kendiliginden guncellenir. Kimlik korumasi aynen: aday "ret" derse
-- kimligi kuruma hic gitmez; "kabul"de Yalcin'in sicak tanistirmasiyla acilir.
--
-- Guvenlik: token = tahmin edilemez uuid, tek talebe bagli. Fonksiyonlar
-- SECURITY DEFINER; RLS-politikasiz temas_talepleri'ne yalnizca bu kapidan
-- yazilir. Token e-postada gittigi icin "giris" yerine gecer (klasik e-posta
-- eylem-linki deseni; unsubscribe gibi).
-- ============================================================================

-- 1) Yanit token'i — mevcut satirlar da default ile token alir.
alter table public.temas_talepleri
  add column if not exists yanit_token uuid not null default gen_random_uuid();

create unique index if not exists temas_talepleri_yanit_token_key
  on public.temas_talepleri (yanit_token);


-- 2) temas_yanit_bilgi(token) — yanit sayfasinin gosterecegi ASGARI bilgi.
-- Yalnizca kurum adi + adayin adi (kendi verisi) + durum doner; baska PII yok.
create or replace function public.temas_yanit_bilgi(p_token uuid)
 returns table (kurum text, aday_ad text, durum text, yanitlanabilir boolean)
 language sql
 security definer
 set search_path to 'public'
as $function$
  select
    t.kurum,
    a.ad,
    t.durum,
    (t.durum in ('yeni', 'iletildi')) as yanitlanabilir
  from public.temas_talepleri t
  left join public.adaylar a on a.id = t.aday_id
  where t.yanit_token = p_token
$function$;


-- 3) temas_yanit_ver(token, karar) — adayin karari. Idempotent:
-- bekleyen bir talebi kabul/ret yapar; zaten yanitlanmissa mevcut durumu doner
-- (cift tiklama hata vermesin). Gecersiz token'da null doner.
create or replace function public.temas_yanit_ver(p_token uuid, p_karar text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_durum text;
begin
  if p_karar not in ('kabul', 'ret') then
    raise exception 'Gecersiz karar: %', p_karar using errcode = '22023';
  end if;

  select durum into v_durum
  from public.temas_talepleri
  where yanit_token = p_token;

  if not found then
    return null;  -- gecersiz/eskimis token
  end if;

  if v_durum in ('yeni', 'iletildi') then
    update public.temas_talepleri
    set durum = p_karar
    where yanit_token = p_token;
    return p_karar;
  end if;

  return v_durum;  -- zaten yanitlanmis ya da iptal
end;
$function$;

-- Token'in kendisi kimlik dogruladigi icin anon cagirabilir.
grant execute on function public.temas_yanit_bilgi(uuid)   to anon, authenticated;
grant execute on function public.temas_yanit_ver(uuid, text) to anon, authenticated;


-- 4) admin_talepleri() donusune yanit_token eklendi (yonetici ekraninda
-- adaya gidecek onay linkini gostermek/kopyalamak icin). Donus tipi degistigi
-- icin once drop gerekiyor.
drop function if exists public.admin_talepleri();
create or replace function public.admin_talepleri()
 returns table (
   id uuid, olusturuldu timestamptz, durum text, kurum text, kurum_eposta text,
   aciklama text, aday_id uuid, aday_ad text, aday_eposta text, aday_telefon text,
   aday_son_kurum text, aday_son_pozisyon text, aday_gorunurluk gorunurluk, aday_sehir text,
   yanit_token uuid
 )
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_eposta text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if v_eposta <> 'yalcinarsan@arsandanismanlik.com.tr' then
    raise exception 'Bu islem yalnizca yonetici icindir.' using errcode = '42501';
  end if;
  return query
  select t.id, t.olusturuldu, t.durum, t.kurum, t.kurum_eposta, t.aciklama,
    t.aday_id, a.ad, a.eposta, a.telefon, a.son_kurum, a.son_pozisyon, a.gorunurluk, a.sehir,
    t.yanit_token
  from public.temas_talepleri t
  left join public.adaylar a on a.id = t.aday_id
  order by t.olusturuldu desc;
end;
$function$;
