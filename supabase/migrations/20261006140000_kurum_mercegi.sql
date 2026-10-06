-- Kurum merceği (yönetici aracı): bir kurum adı için havuzu iki açıdan özetler.
--  • KAYNAK: o kurum+gruptan havuzda kaç aday var; kaçı o kuruma gizli / görünür.
--  • UYUM:   o kurumun GÖRECEĞİ (kendisinden gizli olmayan) adayların dağılımı
--            (fonksiyon / kıdem / deneyim / elektrifikasyon / kanal) — "ne kadar
--            insan işe alabilir" tablosu.
-- Grup mantığı kurum_havuzu() ile aynı: ad normalize + Türkçe karakter sadeleştirme
-- (çğıöşü→cgiosu); grup adı = ilk kelime; grup adı (>=4 harf) adayın son_kurum'unda
-- herhangi bir kelime olarak geçerse "aynı grup" sayılır (+ kısa adlar için birebir).
-- YALNIZCA yönetici çağırabilir (diğer admin RPC'lerle aynı e-posta kontrolü).

-- Ortak eşleşme yardımcısı (kurum_havuzu'yla tutarlı; p_abone_norm zaten
-- sadeleştirilmiş/normalize edilmiş abone adıdır).
create or replace function public.kurum_ayni_grup(p_son_kurum text, p_abone_norm text)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select case
    when p_son_kurum is null or coalesce(p_abone_norm, '') = '' then false
    else (
      translate(public.kurum_normalize(p_son_kurum), 'çğıöşü', 'cgiosu') = p_abone_norm
      or (
        length(split_part(p_abone_norm, ' ', 1)) >= 4
        and split_part(p_abone_norm, ' ', 1) = any(
          string_to_array(translate(public.kurum_normalize(p_son_kurum), 'çğıöşü', 'cgiosu'), ' ')
        )
      )
    )
  end
$$;

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

revoke all on function public.kurum_mercegi(text) from anon, public;
grant execute on function public.kurum_mercegi(text) to authenticated;
