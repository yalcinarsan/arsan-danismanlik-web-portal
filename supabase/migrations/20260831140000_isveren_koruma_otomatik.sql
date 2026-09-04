-- ============================================================================
-- Mevcut-işveren koruması: otomatik gizleme + kurum adı normalizasyonu
-- ============================================================================
-- (a) kurum_adlari(): kayıt formundaki son_kurum otomatik-tamamlamasını besler
--     (havuzdaki mevcut kurum adları, sık olan üstte) → yazım varyantları zamanla
--     tek değere yakınsar.
-- (b) kurum_normalize(): eşleştirme için sadeleştirir (küçük harf, Türkçe İ'nin
--     bıraktığı birleştirici nokta, noktalama ve yaygın tüzel ekler: A.Ş./Ltd./
--     Şti./San./Tic./Sanayi/Ticaret/ve...). "Ford Otomotiv San. A.Ş." = "ford otomotiv".
-- (c) kurum_havuzu(): son_kurum_gizle işaretli VE adayın son kurumu = sorgulayan
--     kurum ise, aday o kuruma LİSTEDE BİLE görünmez (garanti buradan gelir).
--
-- ÖNEMLİ (operasyonel): filtre, sorgulayan kurumun `kurum_erisim.kurum` alanına
-- bakar. Bir kurumu abone yaparken bu alan DOLU ve adayların yazdığı ada yakın
-- olmalı; boşsa filtre çalışmaz (kimse gizlenmez). Eşleşme normalizasyon-eşitliği
-- üzerinden; anlamsal eşdeğerlik (ör. "Ford Otosan" = "Ford Otomotiv") beklenmez,
-- onu otomatik-tamamlama yakınsaması + beta elle taraması kapatır.
-- ============================================================================


-- ---------- (a) Otomatik-tamamlama kaynağı ----------------------------------
create or replace function public.kurum_adlari()
 returns table (kurum text)
 language sql
 security definer
 set search_path to 'public'
as $fn$
  select son_kurum
  from public.adaylar
  where son_kurum is not null and btrim(son_kurum) <> ''
  group by son_kurum
  order by count(*) desc, son_kurum;
$fn$;

grant execute on function public.kurum_adlari() to authenticated;


-- ---------- (b) Kurum adı normalizasyonu ------------------------------------
create or replace function public.kurum_normalize(p text)
 returns text
 language sql
 immutable
as $fn$
  select nullif(btrim(
    regexp_replace(
      regexp_replace(
        ' ' || regexp_replace(
                 regexp_replace(
                   replace(lower(coalesce(p, '')), chr(775), ''),
                   '[^0-9a-zğüşıöç]+', ' ', 'g'),
                 '\s+', ' ', 'g') || ' ',
        ' (a ş|aş|as|ltd|şti|sti|san|tic|sanayi|ticaret|ve|inc|gmbh|co|holding)(?= )', '', 'g'),
      '\s+', ' ', 'g')
  ), '');
$fn$;


-- ---------- (c) kurum_havuzu(): otomatik gizleme filtresi -------------------
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
as $fn$
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
  where not (
    coalesce(a.son_kurum_gizle, false)
    and v_kurum_norm is not null
    and public.kurum_normalize(a.son_kurum) = v_kurum_norm
  )
  order by a.created_at desc;
end;
$fn$;
