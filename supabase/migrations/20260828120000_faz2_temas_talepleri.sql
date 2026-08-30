-- ============================================================================
-- Faz 2 · Kurum akışı: temas talepleri + abone açık profil
-- ============================================================================
-- Bu değişiklikler 28 Ağustos 2026'da CANLIYA Management API ile doğrudan
-- uygulandı; migration dosyasına o gün alınmadı. Bu dosya o sapmayı kapatır —
-- taze bir ortam artık üretimle aynı olsun diye. 30 Ağustos'ta canlı tanımlar
-- okunup birebir buraya yazıldı.
--
-- NOT (bildirim tetikleyicileri): temas_talepleri'ne INSERT olunca ve adaylar'a
-- yeni kayıt gelince Yalçın'a e-posta atan iki webhook fonksiyonu + tetikleyici
-- CANLIDA var ama gövdelerinde gömülü bir 'x-webhook-secret' taşıyor. Repo
-- public olduğu için onları BURAYA koymuyoruz (sır sızmasın + bu dosya yanlışlıkla
-- canlıya uygulanınca çalışan sırrı ezmesin). Redakte edilmiş referansları:
--   supabase/reference/bildirim-webhooklari.sql
-- Taze ortam kurulurken bildirimleri oradan (gerçek secret ile) kur.
-- ============================================================================


-- ---------- 1) temas_talepleri tablosu --------------------------------------
-- Abone bir kurum bir aday için "temas talebi" gönderdiğinde satır burada açılır.
-- Aday kimliği açılmadan önce Yalçın'ın elinden geçer (kurum akışı v1).
create table if not exists public.temas_talepleri (
  id            uuid        primary key default gen_random_uuid(),
  aday_id       uuid        not null references public.adaylar(id) on delete cascade,
  kurum_eposta  text        not null,
  kurum         text,
  aciklama      text,
  durum         text        not null default 'yeni',
  olusturuldu   timestamptz not null default now()
);

-- RLS açık ama BİLEREK politikasız: kurum_erisim'deki desenin aynısı — tabloya
-- yalnızca service_role ve aşağıdaki security definer fonksiyonlar erişir.
-- Anon/authenticated doğrudan okuyup yazamaz; her şey fonksiyon kapısından geçer.
alter table public.temas_talepleri enable row level security;


-- ---------- 2) kurum_havuzu() — abone açık profil dönüyor -------------------
-- Faz 2'de değişti: dönüş tipine ad/son_kurum/son_pozisyon eklendi ve bunlar
-- YALNIZCA çağıran 'abone' kademesindeyse VE adayın görünürlüğü 'acik' ise
-- dolu döner; aksi halde null. Dönüş tipi değiştiği için önce drop gerekiyor
-- (create or replace dönüş tipini değiştiremez).
drop function if exists public.kurum_havuzu();
create or replace function public.kurum_havuzu()
 returns table (
   id uuid, created_at timestamptz, bolge text, deneyim_yili deneyim_yili,
   kanal kanal[], fonksiyon fonksiyon[], kidem kidem, elektrifikasyon elektrifikasyon,
   markalar text[], calisma_tercihi calisma_tercihi, aciklik aciklik, gorunurluk gorunurluk,
   sertifika_var boolean, cv_var boolean, ad text, son_kurum text, son_pozisyon text
 )
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_eposta text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_kademe text;
begin
  select k.kademe into v_kademe
  from public.kurum_erisim k
  where lower(btrim(k.eposta)) = v_eposta
    and (k.gecerlilik is null or k.gecerlilik > now());
  if not found then
    raise exception 'Bu e-posta kurum görünümü için yetkili değil.' using errcode = '42501';
  end if;

  update public.kurum_erisim k
  set son_erisim = now(), erisim_sayisi = k.erisim_sayisi + 1
  where lower(btrim(k.eposta)) = v_eposta;

  return query
  select
    a.id,
    a.created_at,
    public.bolge(a.sehir),
    a.deneyim_yili,
    a.kanal,
    a.fonksiyon,
    a.kidem,
    a.elektrifikasyon,
    a.markalar,
    a.calisma_tercihi,
    a.aciklik,
    a.gorunurluk,
    nullif(btrim(coalesce(a.sertifikalar, '')), '') is not null,
    nullif(btrim(coalesce(a.cv_path, '')), '') is not null,
    case when v_kademe = 'abone' and a.gorunurluk = 'acik' then a.ad           else null end,
    case when v_kademe = 'abone' and a.gorunurluk = 'acik' then a.son_kurum    else null end,
    case when v_kademe = 'abone' and a.gorunurluk = 'acik' then a.son_pozisyon else null end
  from public.adaylar a
  order by a.created_at desc;
end;
$function$;


-- ---------- 3) kurum_kademem() — çağıranın kademesi -------------------------
-- Ön yüz "bu kullanıcı abone mi demo mu" ayrımını bununla yapıyor.
create or replace function public.kurum_kademem()
 returns text
 language sql
 security definer
 set search_path to 'public'
as $function$
  select k.kademe
  from public.kurum_erisim k
  where lower(btrim(k.eposta)) = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
    and (k.gecerlilik is null or k.gecerlilik > now())
  limit 1
$function$;


-- ---------- 4) temas_talebi_gonder() — abone kurum talep açar ---------------
-- Abone doğrulaması SUNUCUDA: çağıran 'abone' kademesinde ve geçerli değilse
-- 42501 ile reddedilir. Aday kimliği bu adımda kuruma AÇILMAZ; sadece talep düşer.
create or replace function public.temas_talebi_gonder(p_aday_id uuid, p_aciklama text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_eposta text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_kurum  text;
begin
  select k.kurum into v_kurum
  from public.kurum_erisim k
  where lower(btrim(k.eposta)) = v_eposta
    and (k.gecerlilik is null or k.gecerlilik > now())
    and k.kademe = 'abone';
  if not found then
    raise exception 'Bu islem icin abone kurum yetkisi gerekli.' using errcode = '42501';
  end if;

  insert into public.temas_talepleri (aday_id, kurum_eposta, kurum, aciklama)
  values (p_aday_id, v_eposta, v_kurum, nullif(btrim(coalesce(p_aciklama, '')), ''));
end;
$function$;


-- ---------- 5) admin_talepleri() — yönetici tam liste -----------------------
-- Yalnızca Yalçın. Talepleri adayın GERÇEK kimliğiyle (maskesiz) döndürür;
-- /kariyer/talepler ekranı bunu kullanıyor.
create or replace function public.admin_talepleri()
 returns table (
   id uuid, olusturuldu timestamptz, durum text, kurum text, kurum_eposta text,
   aciklama text, aday_id uuid, aday_ad text, aday_eposta text, aday_telefon text,
   aday_son_kurum text, aday_son_pozisyon text, aday_gorunurluk gorunurluk, aday_sehir text
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
    t.aday_id, a.ad, a.eposta, a.telefon, a.son_kurum, a.son_pozisyon, a.gorunurluk, a.sehir
  from public.temas_talepleri t
  left join public.adaylar a on a.id = t.aday_id
  order by t.olusturuldu desc;
end;
$function$;


-- ---------- 6) admin_talep_durum() — yönetici durum günceller ---------------
create or replace function public.admin_talep_durum(p_id uuid, p_durum text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_eposta text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if v_eposta <> 'yalcinarsan@arsandanismanlik.com.tr' then
    raise exception 'Bu islem yalnizca yonetici icindir.' using errcode = '42501';
  end if;
  if p_durum not in ('yeni', 'iletildi', 'kabul', 'ret', 'iptal') then
    raise exception 'Gecersiz durum: %', p_durum;
  end if;
  update public.temas_talepleri set durum = p_durum where id = p_id;
end;
$function$;
