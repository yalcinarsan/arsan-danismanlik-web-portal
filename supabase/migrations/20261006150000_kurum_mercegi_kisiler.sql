-- Kurum merceğine "kisiler" eklendi: o kurum+gruptan eşleşen adayların LİSTESİ
-- (ad · son kurum · pozisyon · gizli/görünür). Yönetici listeyi tek tek taramasın
-- diye. YALNIZCA yönetici çağırabilir (fonksiyon zaten e-posta kontrollü) — bu
-- yüzden ad/son kurum döndürmek güvenli; Yalçın bu veriyi zaten /adaylar'da görür.
-- kurum_ayni_grup() yardımcısı değişmedi; yalnız kurum_mercegi'ye 'kisiler' eklendi.
create or replace function public.kurum_mercegi(p_kurum text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_eposta text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_norm   text;
  v_grup   text;
  v_res    jsonb;
begin
  if v_eposta <> 'yalcinarsan@arsandanismanlik.com.tr' then
    raise exception 'Bu islem yalnizca yonetici icindir.' using errcode = '42501';
  end if;

  v_norm := translate(public.kurum_normalize(p_kurum), 'çğıöşü', 'cgiosu');
  v_grup := split_part(coalesce(v_norm, ''), ' ', 1);

  select jsonb_build_object(
    'kurum', p_kurum,
    'grup', v_grup,
    'kaynak', jsonb_build_object(
      'toplam_gruptan', count(*) filter (where public.kurum_ayni_grup(a.son_kurum, v_norm)),
      'gizli',          count(*) filter (where public.kurum_ayni_grup(a.son_kurum, v_norm) and a.son_kurum_gizle),
      'gorunur',        count(*) filter (where public.kurum_ayni_grup(a.son_kurum, v_norm) and not a.son_kurum_gizle)
    ),
    'kisiler', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'ad', a3.ad, 'son_kurum', a3.son_kurum, 'son_pozisyon', a3.son_pozisyon,
        'gizli', a3.son_kurum_gizle, 'gorunurluk', a3.gorunurluk
      ) order by a3.son_kurum_gizle desc, a3.ad), '[]'::jsonb)
      from public.adaylar a3
      where public.kurum_ayni_grup(a3.son_kurum, v_norm)
    ),
    'uyum', jsonb_build_object(
      'gorunur_toplam', count(*) filter (where not (public.kurum_ayni_grup(a.son_kurum, v_norm) and a.son_kurum_gizle)),
      'fonksiyon', (select coalesce(jsonb_object_agg(f, n), '{}') from (
        select unnest(a2.fonksiyon) f, count(*) n from public.adaylar a2
        where not (public.kurum_ayni_grup(a2.son_kurum, v_norm) and a2.son_kurum_gizle) group by 1) t),
      'kidem', (select coalesce(jsonb_object_agg(kidem, n), '{}') from (
        select a2.kidem, count(*) n from public.adaylar a2
        where not (public.kurum_ayni_grup(a2.son_kurum, v_norm) and a2.son_kurum_gizle) group by 1) t),
      'deneyim', (select coalesce(jsonb_object_agg(deneyim_yili, n), '{}') from (
        select a2.deneyim_yili, count(*) n from public.adaylar a2
        where not (public.kurum_ayni_grup(a2.son_kurum, v_norm) and a2.son_kurum_gizle) group by 1) t),
      'elektrifikasyon', (select coalesce(jsonb_object_agg(elektrifikasyon, n), '{}') from (
        select a2.elektrifikasyon, count(*) n from public.adaylar a2
        where not (public.kurum_ayni_grup(a2.son_kurum, v_norm) and a2.son_kurum_gizle) group by 1) t),
      'kanal', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select unnest(a2.kanal) k, count(*) n from public.adaylar a2
        where not (public.kurum_ayni_grup(a2.son_kurum, v_norm) and a2.son_kurum_gizle) group by 1) t)
    )
  ) into v_res
  from public.adaylar a;

  return v_res;
end;
$$;
