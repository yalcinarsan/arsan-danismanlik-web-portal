-- ============================================================================
-- kurum_erisim: Table Editor'den elle yönetimi güvenli hale getir
-- ============================================================================
-- Erişim vermenin yolu Supabase → Table Editor'de bu tabloya satır eklemek.
-- Elle giriş iki şeyi gerektiriyor:
--
--   1) E-posta normalizasyonu. Kopyala-yapıştırda sona boşluk kaçması ya da
--      "Kutay@..." diye büyük harfle yazılması çok olağan. Fonksiyonlar
--      saklanan değeri kırpmıyordu; sonuç sessiz bir hata olurdu — satır
--      tabloda görünür, kişi giremez, sebebi de belli olmaz.
--
--   2) Sütunların ne işe yaradığının panelde görünmesi. Supabase Table
--      Editor, sütun yorumlarını arayüzde gösteriyor.
-- ============================================================================


-- ---------- 1) Girilen e-postayı otomatik temizle ---------------------------
create or replace function public.kurum_erisim_normalize()
returns trigger
language plpgsql
as $$
begin
  new.eposta := lower(btrim(new.eposta));
  return new;
end
$$;

drop trigger if exists kurum_erisim_normalize_tg on public.kurum_erisim;

create trigger kurum_erisim_normalize_tg
  before insert or update on public.kurum_erisim
  for each row execute function public.kurum_erisim_normalize();

-- Mevcut satırlar da temizlensin (tetikleyici öncesi girilmiş olabilir).
update public.kurum_erisim
set eposta = lower(btrim(eposta))
where eposta is distinct from lower(btrim(eposta));


-- ---------- 2) Kontrolleri her iki tarafta da kırp --------------------------
-- Tetikleyici artık saklanan değeri temizliyor ama fonksiyonlar tek başına da
-- doğru davransın: tetikleyici bir gün kaldırılırsa sessizce bozulmasınlar.

create or replace function public.kurum_erisimi_var(p_eposta text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kurum_erisim k
    where lower(btrim(k.eposta)) = lower(btrim(coalesce(p_eposta, '')))
      and (k.gecerlilik is null or k.gecerlilik > now())
  )
$$;

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
begin
  if not exists (
    select 1
    from public.kurum_erisim k
    where lower(btrim(k.eposta)) = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
      and (k.gecerlilik is null or k.gecerlilik > now())
  ) then
    raise exception 'Bu e-posta kurum görünümü için yetkili değil.'
      using errcode = '42501';
  end if;

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
grant execute on function public.kurum_erisimi_var(text) to anon, authenticated;


-- ---------- 3) Panelde görünecek açıklamalar --------------------------------
comment on table public.kurum_erisim is
  'Kurum görünümünü açabilecek kişiler. SATIR EKLEMEK ERİŞİM VERMEKTİR, silmek erişimi anında keser. Süreli erişim için gecerlilik sütununa tarih yaz.';

comment on column public.kurum_erisim.eposta is
  'Giriş yapacak kişinin e-postası. Otomatik olarak küçük harfe çevrilir ve baştaki/sondaki boşluklar kırpılır — elle yazarken dert etme.';

comment on column public.kurum_erisim.kurum is
  'Hangi kurum adına erişiyor (örn. e-garaj). Yalnızca senin takibin için, kontrolü etkilemez.';

comment on column public.kurum_erisim.aciklama is
  'Serbest not (örn. "Beta görüşmesi"). İsteğe bağlı.';

comment on column public.kurum_erisim.gecerlilik is
  'Erişimin biteceği an. BOŞ BIRAKILIRSA SÜRESİZDİR. Tarih geçince erişim kendiliğinden kapanır, satırı silmene gerek kalmaz.';

comment on column public.kurum_erisim.olusturuldu is
  'Otomatik dolar, elleme.';
