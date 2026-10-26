-- ============================================================================
-- Abone kurumlara yeni profil bildirimi (anlık + haftalık) · paneldeki referans sayıları
-- ============================================================================
-- Yalçın, 25 Eki 2026: "Anlık gitsin, haftalık da özet gitsin. Deneme hesapları da alsın.
-- ... sadece görebileceği adaylar bildirilsin." + "Panel sayfamızda referanslarla ilgili bir
-- göstergemiz yoksa ekleyelim."
--
-- 1) İşveren koruması kuralı tek fonksiyona taşındı: aday_kuruma_gizli(). kurum_havuzu()
--    ve bildirimler aynı kuralı kullanıyor; bir kurum e-postada ancak kendi ekranında
--    görebileceği adayı görür. (Kural metni 20261006120000'deki kurum_havuzu ile birebir.)
-- 2) Anlık: adaylar INSERT → kurum_yeni_kayit_bildir() → e-posta fonksiyonu, alıcı başına
--    bir e-posta. Hata kaydı engellemesin diye tetikleyici hatayı yutar (uyarı yazar).
-- 3) Haftalık: pg_cron, pazartesi 06:00 UTC (09:00 TSİ; ilk özet bir kez 27 Ekim salı) → son
--    özetten (en çok 7 gün) bu yana katılan ve kurumun
--    görebildiği profiller. Tüm kurumlar tek istekte gider; e-posta fonksiyonu sırayla yollar
--    (Resend saniyede 2 istek sınırı).
-- 4) kurum_erisim.bildirim: kurum "istemiyorum" derse false yapılır (şimdilik elle).
--    kurum_erisim.hitap: e-postadaki selam ("Esra Hanım").
-- 5) admin_panel(): 'referanslar' bölümü.
-- E-posta metni: supabase/functions/_shared/kurumBildirimi.ts.
-- ============================================================================

alter table public.kurum_erisim add column if not exists bildirim boolean not null default true;
-- E-postadaki selam: "Merhaba Esra Hanım," (boşsa "Merhaba,"). İleride tanıştırma metni de kullanabilir.
alter table public.kurum_erisim add column if not exists hitap text;
update public.kurum_erisim set hitap = 'Esra Hanım'  where eposta = 'esraturegun@cetas.com.tr'    and hitap is null;
update public.kurum_erisim set hitap = 'Ferah Hanım' where eposta = 'fpercin@ford.com.tr'         and hitap is null;
update public.kurum_erisim set hitap = 'Damla Hanım' where eposta = 'dakinalp@dogusoto.com'       and hitap is null;
update public.kurum_erisim set hitap = 'Doğan Bey'   where eposta = 'dkumsar@dogusotomotiv.com.tr' and hitap is null;

-- ---------- 1) Görünürlük kuralı ---------------------------------------------------------
create or replace function public.aday_kuruma_gizli(p_son_kurum text, p_gizle boolean, p_kurum text)
 returns boolean
 language sql
 stable
 set search_path to 'public'
as $fn$
  -- Aday "mevcut işverenim görmesin" dediyse ve son kurumu bu kurumla (sadeleştirilmiş adla
  -- birebir ya da kurumun grup adı — ilk kelime, >=4 harf — adayın son kurumunda bir kelime
  -- olarak geçiyorsa) eşleşiyorsa true. Korumadan yana hata yapar: fazla gizler, ifşa etmez.
  with n as (
    select translate(public.kurum_normalize(p_kurum), 'çğıöşü', 'cgiosu')     as kurum_norm,
           translate(public.kurum_normalize(p_son_kurum), 'çğıöşü', 'cgiosu') as aday_norm
  )
  select coalesce(
    p_gizle
    and n.kurum_norm is not null and n.kurum_norm <> ''
    and p_son_kurum is not null
    and (
      n.aday_norm = n.kurum_norm
      or (
        length(split_part(n.kurum_norm, ' ', 1)) >= 4
        and split_part(n.kurum_norm, ' ', 1) = any(string_to_array(n.aday_norm, ' '))
      )
    )
  , false)
  from n;
$fn$;

create or replace function public.kurum_havuzu()
 returns table(id uuid, created_at timestamp with time zone, bolge text, deneyim_yili deneyim_yili, kanal kanal[], fonksiyon fonksiyon[], kidem kidem, elektrifikasyon elektrifikasyon, markalar text[], calisma_tercihi calisma_tercihi, aciklik aciklik, gorunurluk gorunurluk, sertifika_var boolean, cv_var boolean, ad text, son_kurum text, son_pozisyon text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_eposta text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_kademe text;
  v_kurum  text;
begin
  select k.kademe, k.kurum into v_kademe, v_kurum
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
  where not public.aday_kuruma_gizli(a.son_kurum, a.son_kurum_gizle, v_kurum)
  order by a.created_at desc;
end;
$function$;

-- ---------- 2) Bildirim yapı taşları ------------------------------------------------------
-- Kurum ekranındaki kapalı-profil kartında görünen alanlar; ad, son kurum, serbest metin YOK.
create or replace function public.kurum_aday_ozeti(p_aday_id uuid)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'public'
as $fn$
  select jsonb_build_object(
    'id', a.id, 'kidem', a.kidem, 'fonksiyon', a.fonksiyon, 'kanal', a.kanal,
    'deneyim_yili', a.deneyim_yili, 'bolge', public.bolge(a.sehir), 'katilim', a.created_at)
  from public.adaylar a
  where a.id = p_aday_id;
$fn$;

-- Bildirim alan kurumlar ve her birinin ekranında görünen toplam profil sayısı.
create or replace function public.kurum_havuz_sayisi(p_kurum text)
 returns integer
 language sql
 stable
 security definer
 set search_path to 'public'
as $fn$
  select count(*)::int from public.adaylar x
  where not public.aday_kuruma_gizli(x.son_kurum, x.son_kurum_gizle, p_kurum);
$fn$;

create or replace function public.kurum_bildirim_alicilari(p_aday_id uuid)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'public'
as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
           'eposta', k.eposta, 'kurum', k.kurum, 'hitap', k.hitap, 'havuz', public.kurum_havuz_sayisi(k.kurum))
         order by k.eposta), '[]'::jsonb)
  from public.kurum_erisim k
  join public.adaylar a on a.id = p_aday_id
  where k.kademe = 'abone'
    and k.bildirim
    and (k.gecerlilik is null or k.gecerlilik > now())
    and not public.aday_kuruma_gizli(a.son_kurum, a.son_kurum_gizle, k.kurum);
$fn$;

create or replace function public.kurum_bildirimi_gonder(p_govde jsonb)
 returns bigint
 language plpgsql
 security definer
 set search_path to 'public'
as $fn$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'webhook_secret';
  return net.http_post(
    url := 'https://wwpkgwndgephkuwpnjov.supabase.co/functions/v1/yeni-kayit-bildirim',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    body := p_govde || jsonb_build_object('table', 'kurum_bildirimi'),
    -- birden çok kuruma sırayla gönderim birkaç saniye sürebilir
    timeout_milliseconds := 30000
  );
end;
$fn$;

-- ---------- 3) Anlık: yeni kayıt --------------------------------------------------------------
create or replace function public.kurum_yeni_kayit_bildir(p_aday_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $fn$
declare
  v_alicilar jsonb := public.kurum_bildirim_alicilari(p_aday_id);
begin
  if jsonb_array_length(v_alicilar) = 0 then
    return 0;
  end if;
  perform public.kurum_bildirimi_gonder(jsonb_build_object(
    'type', 'KURUM_YENI_KAYIT',
    'aday', public.kurum_aday_ozeti(p_aday_id),
    'alicilar', v_alicilar));
  return jsonb_array_length(v_alicilar);
end;
$fn$;

create or replace function public.kurum_yeni_kayit_tetik()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $fn$
begin
  begin
    perform public.kurum_yeni_kayit_bildir(new.id);
  exception when others then
    -- Bildirim hatası adayın kaydını asla engellememeli.
    raise warning 'kurum_yeni_kayit_bildir: %', sqlerrm;
  end;
  return new;
end;
$fn$;

drop trigger if exists kurum_yeni_kayit_trg on public.adaylar;
create trigger kurum_yeni_kayit_trg
  after insert on public.adaylar
  for each row execute function public.kurum_yeni_kayit_tetik();

-- ---------- 4) Haftalık özet ------------------------------------------------------------------
-- Her özet buraya yazılır; bir sonraki özet ancak bundan sonra katılanları kapsar (en çok 7 gün).
-- Böylece ilk özetin salı, sonrakilerin pazartesi gitmesi aynı profili iki kez listelemez.
create table if not exists public.kurum_ozet_gonderimleri (
  gonderim     timestamptz primary key default now(),
  kurum_sayisi integer not null
);
alter table public.kurum_ozet_gonderimleri enable row level security;
revoke all on table public.kurum_ozet_gonderimleri from anon, authenticated;

create or replace function public.kurum_haftalik_ozet_gonder()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $fn$
declare
  v_ozetler jsonb;
  v_baslangic timestamptz := greatest(
    now() - interval '7 days',
    coalesce((select max(g.gonderim) from public.kurum_ozet_gonderimleri g), '-infinity'::timestamptz));
begin
  select coalesce(jsonb_agg(o), '[]'::jsonb) into v_ozetler
  from (
    select jsonb_build_object(
             'alici', jsonb_build_object('eposta', k.eposta, 'kurum', k.kurum, 'hitap', k.hitap,
                                         'havuz', public.kurum_havuz_sayisi(k.kurum)),
             'adaylar', (
               select jsonb_agg(public.kurum_aday_ozeti(a.id) order by a.created_at desc)
               from public.adaylar a
               where a.created_at > v_baslangic
                 and not public.aday_kuruma_gizli(a.son_kurum, a.son_kurum_gizle, k.kurum)
             )) as o
    from public.kurum_erisim k
    where k.kademe = 'abone'
      and k.bildirim
      and (k.gecerlilik is null or k.gecerlilik > now())
  ) t
  where t.o -> 'adaylar' <> 'null'::jsonb;

  if jsonb_array_length(v_ozetler) = 0 then
    return 0;
  end if;
  perform public.kurum_bildirimi_gonder(jsonb_build_object('type', 'KURUM_HAFTALIK_OZET', 'ozetler', v_ozetler));
  insert into public.kurum_ozet_gonderimleri (kurum_sayisi) values (jsonb_array_length(v_ozetler));
  return jsonb_array_length(v_ozetler);
end;
$fn$;

-- Saatler UTC: 06:00 = 09:00 TSİ. Yalçın (26 Eki): "İlk haftalık özet yarın (salı) 09:00'da
-- gitsin, sonrası her pazartesi." İlk iş 27 Ekim'de bir kez çalışıp kendini siler.
create extension if not exists pg_cron;
select cron.schedule('kurum-haftalik-ozet', '0 6 * * 1', 'select public.kurum_haftalik_ozet_gonder()');
select cron.schedule('kurum-haftalik-ozet-ilk', '0 6 27 10 *',
  'select public.kurum_haftalik_ozet_gonder(); select cron.unschedule(''kurum-haftalik-ozet-ilk'');');

-- Bu fonksiyonları yalnızca veritabanının kendisi (tetikleyici, zamanlayıcı, diğer
-- fonksiyonlar) çağırır; ne ziyaretçi ne girişli kullanıcı.
revoke all on function
  public.aday_kuruma_gizli(text, boolean, text),
  public.kurum_aday_ozeti(uuid),
  public.kurum_havuz_sayisi(text),
  public.kurum_bildirim_alicilari(uuid),
  public.kurum_bildirimi_gonder(jsonb),
  public.kurum_yeni_kayit_bildir(uuid),
  public.kurum_yeni_kayit_tetik(),
  public.kurum_haftalik_ozet_gonder()
from public, anon, authenticated;

-- ---------- 5) Yönetici paneli: referanslar ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_panel()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_eposta text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_res    jsonb;
begin
  if v_eposta <> 'yalcinarsan@arsandanismanlik.com.tr' then
    raise exception 'Bu islem yalnizca yonetici icindir.' using errcode = '42501';
  end if;

  with kurum_s as (
    select
      k.kurum, k.eposta, k.kademe, k.aciklama,
      k.son_erisim, k.erisim_sayisi, k.gecerlilik,
      (k.gecerlilik is null or k.gecerlilik > now()) as aktif,
      case
        when lower(k.eposta) = 'yalcinarsan@arsandanismanlik.com.tr' then 'yonetici'
        when k.kurum ilike '%test%' or k.aciklama ilike '%test%'      then 'test'
        when k.kademe = 'abone'
             and (k.aciklama is null or k.aciklama not ilike '%deneme%') then 'ucretli'
        else 'demo'
      end as tur,
      (select count(*) from public.temas_talepleri t
         where lower(t.kurum_eposta) = lower(k.eposta)) as toplam_temas,
      (select count(*) from public.temas_talepleri t
         where lower(t.kurum_eposta) = lower(k.eposta) and t.durum in ('yeni','iletildi')) as bekleyen_temas
    from public.kurum_erisim k
  ),
  -- Kurumların temas talebi gönderdiği adaylar; iç hesapların (yönetici, test) talepleri hariç.
  talep_s as (
    select t.durum, t.kurum, t.aday_id,
           a.fonksiyon, a.kanal, a.kidem, a.elektrifikasyon, public.bolge(a.sehir) as bolge
    from public.temas_talepleri t
    join public.adaylar a on a.id = t.aday_id
    where not exists (
      select 1 from kurum_s k
      where lower(k.eposta) = lower(t.kurum_eposta) and k.tur in ('yonetici','test')
    )
  )
  select jsonb_build_object(
    'ozet', jsonb_build_object(
      'aday_toplam',    (select count(*) from public.adaylar),
      'kurum_dis',      (select count(*) from kurum_s where tur in ('demo','ucretli')),
      'kurum_aktif',    (select count(*) from kurum_s where tur in ('demo','ucretli') and aktif),
      'ucretli',        (select count(*) from kurum_s where tur = 'ucretli'),
      'demo',           (select count(*) from kurum_s where tur = 'demo'),
      'demo_aktif',     (select count(*) from kurum_s where tur = 'demo' and aktif),
      'ic_hesap',       (select count(*) from kurum_s where tur in ('yonetici','test')),
      'temas_toplam',   (select count(*) from public.temas_talepleri),
      'temas_bekleyen', (select count(*) from public.temas_talepleri where durum in ('yeni','iletildi')),
      'temas_kabul',    (select count(*) from public.temas_talepleri where durum = 'kabul'),
      'temas_ret',      (select count(*) from public.temas_talepleri where durum = 'ret')
    ),
    'kurumlar', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.aktif desc, x.son_erisim desc nulls last, x.kurum), '[]'::jsonb)
      from kurum_s x
    ),
    'havuz', jsonb_build_object(
      'toplam', (select count(*) from public.adaylar),
      'deneyim', (select coalesce(jsonb_object_agg(deneyim_yili, n), '{}') from (select deneyim_yili, count(*) n from public.adaylar group by 1) t),
      'kidem', (select coalesce(jsonb_object_agg(kidem, n), '{}') from (select kidem, count(*) n from public.adaylar group by 1) t),
      'fonksiyon', (select coalesce(jsonb_object_agg(f, n), '{}') from (select unnest(fonksiyon) f, count(*) n from public.adaylar group by 1) t),
      'kanal', (select coalesce(jsonb_object_agg(kn, n), '{}') from (select unnest(kanal) kn, count(*) n from public.adaylar group by 1) t),
      'elektrifikasyon', (select coalesce(jsonb_object_agg(elektrifikasyon, n), '{}') from (select elektrifikasyon, count(*) n from public.adaylar group by 1) t)
    ),
    'temas', jsonb_build_object(
      'toplam', (select count(*) from public.temas_talepleri),
      'durumlar', (select coalesce(jsonb_object_agg(durum, n), '{}') from (select durum, count(*) n from public.temas_talepleri group by 1) t)
    ),
    'temas_son', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.olusturuldu desc), '[]'::jsonb)
      from (
        select t.kurum, a.ad as aday_ad, t.durum, t.olusturuldu, t.yanit_ts
        from public.temas_talepleri t
        join public.adaylar a on a.id = t.aday_id
        order by t.olusturuldu desc
        limit 12
      ) r
    ),
    'adaylar_son', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
      from (
        select a.id, a.ad, a.son_pozisyon, a.sehir, a.created_at
        from public.adaylar a
        order by a.created_at desc
        limit 30
      ) r
    ),
    'talep_profilleri', jsonb_build_object(
      'talep', (select count(*) from talep_s),
      'aday', (select count(distinct aday_id) from talep_s),
      'kurum', (select count(distinct kurum) from talep_s),
      'kabul', (select count(*) from talep_s where durum = 'kabul'),
      'fonksiyon', (select coalesce(jsonb_object_agg(f, n), '{}') from (select unnest(fonksiyon) f, count(*) n from talep_s group by 1) x),
      'kanal', (select coalesce(jsonb_object_agg(kn, n), '{}') from (select unnest(kanal) kn, count(*) n from talep_s group by 1) x),
      'kidem', (select coalesce(jsonb_object_agg(kidem, n), '{}') from (select kidem, count(*) n from talep_s group by 1) x),
      'bolge', (select coalesce(jsonb_object_agg(bolge, n), '{}') from (select bolge, count(*) n from talep_s group by 1) x),
      'elektrifikasyon', (select coalesce(jsonb_object_agg(elektrifikasyon, n), '{}') from (select elektrifikasyon, count(*) n from talep_s group by 1) x)
    ),
    -- Referanslar (25 Eki 2026): kaç aday ekledi, kaç talep gitti, kaç görüş geldi + son hareketler.
    'referanslar', jsonb_build_object(
      'aday',   (select count(distinct r.aday_id) from public.referanslar r),
      'toplam', (select count(*) from public.referanslar r),
      'talep',  (select count(*) from public.referanslar r where r.talep_ts is not null),
      'gorus',  (select count(*) from public.referanslar r where r.yorum is not null),
      'son', (
        select coalesce(jsonb_agg(to_jsonb(x) order by x.ts desc), '[]'::jsonb)
        from (
          select r.aday_id, a.ad as aday_ad, r.ad,
                 case when r.yorum is not null then 'gorus'
                      when r.talep_ts is not null then 'talep'
                      else 'eklendi' end as durum,
                 coalesce(r.yorum_ts, r.talep_ts, r.olusturuldu) as ts
          from public.referanslar r
          join public.adaylar a on a.id = r.aday_id
          order by coalesce(r.yorum_ts, r.talep_ts, r.olusturuldu) desc
          limit 10
        ) x
      )
    )
  ) into v_res;

  return v_res;
end;
$function$;
