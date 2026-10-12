-- Yönetici paneli (/kariyer/panel) için tek RPC: erişimler + havuz + temas özeti.
-- YALNIZCA yönetici (diğer admin RPC'lerle aynı e-posta kontrolü).
--  • kurumlar: her kurum_erisim satırı → kurum/eposta/kademe + son giriş + kaç kez
--    baktı + geçerlilik/aktiflik + o kuruma ait toplam/bekleyen temas sayısı.
--  • havuz: public_stats benzeri anlık görüntü.
--  • temas: toplam + durum dağılımı.
create or replace function public.admin_panel()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_eposta text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_res    jsonb;
begin
  if v_eposta <> 'yalcinarsan@arsandanismanlik.com.tr' then
    raise exception 'Bu islem yalnizca yonetici icindir.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'kurumlar', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.aktif desc, x.son_erisim desc nulls last, x.kurum), '[]'::jsonb)
      from (
        select
          k.kurum, k.eposta, k.kademe, k.aciklama,
          k.son_erisim, k.erisim_sayisi, k.gecerlilik,
          (k.gecerlilik is null or k.gecerlilik > now()) as aktif,
          (select count(*) from public.temas_talepleri t
             where lower(t.kurum_eposta) = lower(k.eposta)) as toplam_temas,
          (select count(*) from public.temas_talepleri t
             where lower(t.kurum_eposta) = lower(k.eposta) and t.durum = 'yeni') as bekleyen_temas
        from public.kurum_erisim k
      ) x
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
    )
  ) into v_res;

  return v_res;
end;
$$;

revoke all on function public.admin_panel() from anon, public;
grant execute on function public.admin_panel() to authenticated;
