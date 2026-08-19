-- ============================================================================
-- kurum_erisim: kim ne zaman havuzu açtı, Table Editor'den görünsün
-- ============================================================================
-- Amaç: beta görüşmelerinde "davet ettiğim kişi baktı mı" sorusunun cevabı
-- log karıştırmadan, listeye bakınca görünsün.
--
-- Authentication → Users ekranındaki "Last sign in" yalnızca GİRİŞ yapıldığını
-- söyler; havuzun gerçekten açıldığını söylemez. Burada sayılan şey havuzun
-- açılması: kurum_havuzu() her çağrıldığında damgalanıyor.
-- ============================================================================


-- ---------- 1) Sütunlar -----------------------------------------------------
alter table public.kurum_erisim
  add column if not exists son_erisim    timestamptz,
  add column if not exists erisim_sayisi integer not null default 0;

comment on column public.kurum_erisim.son_erisim is
  'Havuzu en son ne zaman açtı. Boşsa hiç açmamış — davet gitti ama girmedi demektir.';

comment on column public.kurum_erisim.erisim_sayisi is
  'Havuzun kaç kez açıldığı. Sayfa her yüklendiğinde artar, yani oturum sayısı değil bakış sayısıdır.';


-- ---------- 2) kurum_havuzu() damga bırakıyor -------------------------------
-- Fonksiyonun geri kalanı 20260819141500 ile aynı; tek fark yetki kontrolünden
-- SONRA gelen update. Sırası önemli: yetkisi olmayan birinin çağrısı damga
-- bırakmamalı (zaten exception ile çıkıyor).
create or replace function public.kurum_havuzu()
returns table (
  id               uuid,
  created_at       timestamptz,
  bolge            text,
  deneyim_yili     deneyim_yili,
  kanal            kanal[],
  fonksiyon        fonksiyon[],
  kidem            kidem,
  elektrifikasyon  elektrifikasyon,
  markalar         text[],
  calisma_tercihi  calisma_tercihi,
  aciklik          aciklik,
  gorunurluk       gorunurluk,
  sertifika_var    boolean,
  cv_var           boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_eposta text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if not exists (
    select 1
    from public.kurum_erisim k
    where lower(btrim(k.eposta)) = v_eposta
      and (k.gecerlilik is null or k.gecerlilik > now())
  ) then
    raise exception 'Bu e-posta kurum görünümü için yetkili değil.'
      using errcode = '42501';
  end if;

  update public.kurum_erisim k
  set son_erisim    = now(),
      erisim_sayisi = k.erisim_sayisi + 1
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
    nullif(btrim(coalesce(a.cv_path, '')), '') is not null
  from public.adaylar a
  order by a.created_at desc;
end
$$;

revoke all on function public.kurum_havuzu() from public, anon;
grant execute on function public.kurum_havuzu() to authenticated;
