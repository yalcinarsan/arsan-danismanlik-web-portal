-- kurum_havuzu(): boş son_kurum'lu adayların havuzdan düşmesini düzeltir.
--
-- HATA: işveren-gizleme filtresi
--   where not ( son_kurum_gizle and v_kurum_norm is not null
--               and kurum_normalize(a.son_kurum) = v_kurum_norm )
-- adayın son_kurum'u boşsa kurum_normalize(NULL) → NULL döndürüyordu; eşitlik
-- NULL, üçlü AND NULL, ve `not NULL` = NULL → WHERE satırı ELİYORDU. Sonuç:
-- son kurumunu yazmamış ama (varsayılan) gizle işaretli adaylar HİÇBİR kuruma
-- görünmüyordu. public_stats (vitrin) bunları saydığı için vitrin ile kurum
-- havuzu arasında sayı tutarsızlığı çıkıyordu (ör. satış sonrası 23 vs 22).
--
-- ÇÖZÜM: gizleme yüklemini `coalesce(..., false)` ile sarmalıyoruz; herhangi
-- bir NULL false'a düşer, `not false` = true, satır havuzda KALIR. Gizleme
-- yalnızca son_kurum gerçekten dolu ve sorgulayan kurumla eşleşince devreye girer.

create or replace function public.kurum_havuzu()
returns table (
  id uuid, created_at timestamptz, bolge text, deneyim_yili deneyim_yili,
  kanal kanal[], fonksiyon fonksiyon[], kidem kidem, elektrifikasyon elektrifikasyon,
  markalar text[], calisma_tercihi calisma_tercihi, aciklik aciklik,
  gorunurluk gorunurluk, sertifika_var boolean, cv_var boolean,
  ad text, son_kurum text, son_pozisyon text
)
language plpgsql
security definer
set search_path to 'public'
as $$
#variable_conflict use_column
declare
  v_eposta     text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_kademe     text;
  v_kurum      text;
  v_kurum_norm text;
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

  v_kurum_norm := public.kurum_normalize(v_kurum);

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
  where not coalesce(
    a.son_kurum_gizle
    and v_kurum_norm is not null
    and public.kurum_normalize(a.son_kurum) = v_kurum_norm
  , false)
  order by a.created_at desc;
end;
$$;
