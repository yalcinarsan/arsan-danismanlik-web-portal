-- ============================================================================
-- Otomotiv İnsanı — Supabase şeması (Faz 1: aday havuzu)
-- ============================================================================
-- Bu dosyayı Supabase → SQL Editor'e yapıştırıp çalıştır.
-- Tasarım ilkeleri:
--   • Kişisel veri ASLA public okunamaz. Sadece sen (admin/service_role,
--     Supabase panelinden) tüm kayıtları görürsün.
--   • Public site yalnızca ANONİM AGREGAT görür (kaç kişi, dağılımlar) —
--     bunu güvenli bir fonksiyon (public_stats) sağlar, PII sızmaz.
--   • Form gönderimi (INSERT) giriş gerektirmez (tarayıcıdaki anon key ile),
--     ama sadece KVKK rızası verildiyse. Kimse tek tek kayıt OKUYAMAZ.
--   • user_id sütunu şimdilik boş — ileride aday hesapları (Supabase Auth)
--     eklenince kayıtlar kullanıcıya bağlanabilir. Faz 1 girişsiz çalışır.
-- ============================================================================

-- ---------- ENUM'lar (taksonomi) -------------------------------------------
create type deneyim_yili   as enum ('0-3', '4-7', '8-15', '15+');
create type kanal          as enum ('oem', 'distributor', 'bayi', 'yan_sanayi', 'diger');
create type fonksiyon       as enum (
  'satis', 'satis_sonrasi', 'pazarlama_iletisim', 'urun_planlama',
  'finans', 'ik', 'dijital_yazilim', 'genel_yonetim'
);
create type kidem          as enum ('uzman', 'orta_kademe', 'ust_duzey', 'direktor_plus');
create type elektrifikasyon as enum ('ev_deneyimim_var', 'gecmek_istiyorum', 'degerlendiriyorum');
create type calisma_tercihi as enum ('ofis', 'hibrit', 'uzaktan', 'farketmez');
create type aciklik         as enum ('aktif_ariyorum', 'acigim', 'sadece_ozel_firsat');
-- Kademeli görünürlük — platformun asıl farklılaşması:
--   acik     = aday + işveren birbirini görür
--   tek_kor  = aday anonim, işveren belli
--   cift_kor = her iki taraf anonim; kimlikler karşılıklı rıza ile açılır
create type gorunurluk      as enum ('acik', 'tek_kor', 'cift_kor');

-- ---------- Ana tablo: adaylar ---------------------------------------------
create table public.adaylar (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  -- B modeli: her kayıt, magic-link ile giriş yapmış adayın auth kullanıcısına
  -- bağlanır. Bir kullanıcı = bir profil (unique).
  user_id           uuid not null default auth.uid() unique
                      references auth.users (id) on delete cascade,

  -- İletişim
  ad                text not null,
  eposta            text not null,
  telefon           text,

  -- Deneyim
  deneyim_yili      deneyim_yili not null,
  son_pozisyon      text,
  son_kurum         text,

  -- Sınıflama (çoklu seçilebilenler dizi)
  kanal             kanal[] not null default '{}',
  fonksiyon         fonksiyon[] not null default '{}',
  kidem             kidem not null,
  elektrifikasyon   elektrifikasyon not null,
  markalar          text[] not null default '{}',            -- çoklu + serbest "diğer"
  diller            jsonb  not null default '[]',             -- [{ "dil": "İngilizce", "seviye": "İleri" }]

  -- Lokasyon & tercih
  sehir             text,
  calisma_tercihi   calisma_tercihi,
  aciklik           aciklik,

  -- Serbest metin & CV
  serbest_metin     text,                                     -- "Sizi en iyi ne anlatır?"
  cv_path           text,                                     -- private storage yolu (ops.)

  -- Görünürlük & KVKK
  gorunurluk        gorunurluk not null default 'tek_kor',
  kvkk_riza         boolean not null default false,
  kvkk_riza_tarihi  timestamptz
);

-- Aramalar için basit indeksler (sen filtreleyeceksin)
create index adaylar_kanal_idx           on public.adaylar using gin (kanal);
create index adaylar_fonksiyon_idx       on public.adaylar using gin (fonksiyon);
create index adaylar_elektrifikasyon_idx on public.adaylar (elektrifikasyon);
create index adaylar_created_at_idx      on public.adaylar (created_at desc);

-- ---------- Güvenlik (RLS) --------------------------------------------------
alter table public.adaylar enable row level security;

-- B modeli: aday önce magic-link ile giriş yapar, sonra kendi kaydını oluşturur.
-- Kayıt kendi auth kullanıcısına bağlanır ve KVKK rızası şarttır.
create policy "aday kendi kaydini ekler"
  on public.adaylar for insert
  to authenticated
  with check (user_id = auth.uid() and kvkk_riza = true);

-- Aday YALNIZCA kendi kaydını görür / günceller / siler.
-- (Silme = KVKK "unutulma / veri silme hakkı" — aday kendi verisini kaldırabilir.)
create policy "aday kendi kaydini gorur"
  on public.adaylar for select
  to authenticated using (user_id = auth.uid());

create policy "aday kendi kaydini gunceller"
  on public.adaylar for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "aday kendi kaydini siler"
  on public.adaylar for delete
  to authenticated using (user_id = auth.uid());

-- Public/anon HİÇBİR kaydı tek tek OKUYAMAZ. Tüm veriyi yalnızca sen
-- (service_role — Supabase panelin / sunucu tarafı) görürsün. Public site
-- yalnızca aşağıdaki public_stats() anonim agregatını görür.

-- ---------- Public anonim agregat (vitrin) ---------------------------------
-- PII döndürmez; yalnızca sayılar. security definer → RLS'i baypas eder
-- ama sadece toplamları verir. Public site bu fonksiyonu çağırır.
create or replace function public.public_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'toplam', (select count(*) from adaylar),
    'deneyim', (
      select coalesce(jsonb_object_agg(deneyim_yili, n), '{}')
      from (select deneyim_yili, count(*) n from adaylar group by 1) t
    ),
    'kidem', (
      select coalesce(jsonb_object_agg(kidem, n), '{}')
      from (select kidem, count(*) n from adaylar group by 1) t
    ),
    'elektrifikasyon', (
      select coalesce(jsonb_object_agg(elektrifikasyon, n), '{}')
      from (select elektrifikasyon, count(*) n from adaylar group by 1) t
    ),
    'kanal', (
      select coalesce(jsonb_object_agg(k, n), '{}')
      from (select unnest(kanal) k, count(*) n from adaylar group by 1) t
    ),
    'fonksiyon', (
      select coalesce(jsonb_object_agg(f, n), '{}')
      from (select unnest(fonksiyon) f, count(*) n from adaylar group by 1) t
    )
  );
$$;

grant execute on function public.public_stats() to anon, authenticated;

-- ---------- CV için private storage ----------------------------------------
-- "cv" adında PUBLIC OLMAYAN (private) bir bucket. Giriş yapmış aday kendi
-- klasörüne yükler (dosya yolu: {auth.uid()}/dosyaadi) ve yalnızca kendi
-- dosyasını görür. Tüm CV'leri sen (service_role) panelden görürsün.
insert into storage.buckets (id, name, public)
values ('cv', 'cv', false)
on conflict (id) do nothing;

create policy "cv yuklenebilir"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'cv' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "cv kendi dosyasini gorur"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'cv' and (storage.foldername(name))[1] = auth.uid()::text);
