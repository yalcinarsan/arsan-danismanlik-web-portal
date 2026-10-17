-- admin_panel(): "Son kayıtlar" kartı için aday kimliği (id) eklenir ve liste 8'den 30'a çıkar.
-- Neden: panelde kart kaydırılabilir oldu ve her satır adayın kartını /kariyer/adaylar?aday=<id>
-- adresinde yeni sekmede açıyor. Değişiklik EKLEMELİ: diğer anahtarlar aynen; eski arayüz yeni
-- alanı yok sayar. Gövde canlıdaki tanımdan (pg_get_functiondef, 17 Eki 2026) alınıp yalnız
-- adaylar_son bölümü değiştirildi.

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
    )
  ) into v_res;

  return v_res;
end;
$function$;
