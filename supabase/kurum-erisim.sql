-- ============================================================================
-- Kurum görünümü — davetli erişim (Faz 1.5)
-- ============================================================================
-- Bu dosyayı Supabase → SQL Editor'e yapıştırıp çalıştır. Idempotent: tekrar
-- çalıştırmak güvenli. schema.sql'i DEĞİŞTİRMEZ, üstüne ekler.
--
-- ---------------------------------------------------------------------------
-- NEDEN BU DOSYA VAR
-- ---------------------------------------------------------------------------
-- Kurum demo ekranı bugüne kadar `adaylar` tablosunu `select('*')` ile çekip
-- maskelemeyi TARAYICIDA yapıyordu. Ekranı yalnızca Yalçın açtığı sürece bu
-- sorun değildi. Dışarıdan biri (kurum temsilcisi) girecekse artık sorun:
--
--   • Tarayıcıdaki maskeleme güvenlik sınırı DEĞİLDİR. Ham satır tarayıcıya
--     indiyse, DevTools açan kişi ad/e-posta/telefon/CV yolunu görür.
--   • KurumDemo.tsx'teki sabit e-posta kontrolü de sınır değildir; JavaScript
--     karşılaştırmasıdır, istemci tarafında atlanabilir.
--
-- Çözüm, public_stats()'ta zaten kullanılan desen: `security definer` bir
-- fonksiyon RLS'i baypas eder ama YALNIZCA güvenli alanları döndürür. Fark,
-- bunun agregat değil satır döndürmesi — o yüzden bir de davetli listesi var.
--
-- Bu kurulumdan sonra kişisel veri sınırı veritabanındadır: hassas sütunlar
-- fonksiyonun dönüş tipinde HİÇ YOKTUR, dolayısıyla arayüzdeki bir hata bile
-- onları sızdıramaz.
-- ============================================================================


-- ---------- 1) Davetli kurum listesi ----------------------------------------
-- Kimin kurum görünümünü açabileceği burada durur. Kayıt eklemek/silmek
-- yalnızca senin işin (Supabase paneli).
create table if not exists public.kurum_erisim (
  eposta       text primary key,
  kurum        text not null,
  aciklama     text,
  -- null = süresiz. Demo erişimleri için tarih vermen önerilir.
  gecerlilik   timestamptz,
  olusturuldu  timestamptz not null default now()
);

alter table public.kurum_erisim enable row level security;

-- Bilerek HİÇBİR politika tanımlanmadı: RLS açık + politika yok =
-- anon ve authenticated bu tabloyu hiç okuyamaz. Yalnızca service_role
-- (Supabase panelin) ve aşağıdaki security definer fonksiyon görür.


-- ---------- 2) Şehir -> bölge -----------------------------------------------
-- src/lib/adayMaskeleme.ts'deki BOLGELER ile aynı liste. İkisi ayrışırsa
-- kurum görünümü ile aday tarafı farklı bölge gösterir — birlikte güncelle.
create or replace function public.bolge(sehir text)
returns text
language sql
immutable
as $$
  select case
    when sehir is null or btrim(sehir) = '' then '—'
    when sehir = 'Yurt dışı' then 'Yurt dışı'
    when sehir = any (array['İstanbul','Kocaeli','Bursa','Balıkesir','Çanakkale','Edirne','Kırklareli','Tekirdağ','Yalova','Sakarya','Bilecik']) then 'Marmara'
    when sehir = any (array['İzmir','Aydın','Denizli','Muğla','Manisa','Afyonkarahisar','Kütahya','Uşak']) then 'Ege'
    when sehir = any (array['Ankara','Konya','Kayseri','Eskişehir','Sivas','Yozgat','Aksaray','Karaman','Kırıkkale','Kırşehir','Nevşehir','Niğde','Çankırı']) then 'İç Anadolu'
    when sehir = any (array['Antalya','Adana','Mersin','Hatay','Isparta','Burdur','Kahramanmaraş','Osmaniye']) then 'Akdeniz'
    when sehir = any (array['Samsun','Trabzon','Ordu','Rize','Giresun','Zonguldak','Bolu','Düzce','Kastamonu','Sinop','Amasya','Çorum','Tokat','Bartın','Karabük','Artvin','Gümüşhane','Bayburt']) then 'Karadeniz'
    when sehir = any (array['Erzurum','Van','Malatya','Elazığ','Erzincan','Ağrı','Kars','Ardahan','Iğdır','Bingöl','Bitlis','Hakkari','Muş','Tunceli']) then 'Doğu Anadolu'
    when sehir = any (array['Gaziantep','Şanlıurfa','Diyarbakır','Mardin','Batman','Siirt','Şırnak','Adıyaman','Kilis']) then 'Güneydoğu Anadolu'
    else 'Türkiye'
  end
$$;


-- ---------- 3) Kurum havuzu görünümü ----------------------------------------
-- DÖNÜŞ TİPİNE DİKKAT: ad, eposta, telefon, son_kurum, son_pozisyon,
-- sertifikalar (metin), serbest_metin, cv_path, user_id ve kvkk_* sütunları
-- burada YOKTUR. Bilerek. Bir arayüz hatası bile onları döndüremez.
--
-- Şehir yerine bölge dönüyor. Gerekçe: 34 kişilik bir havuzda
-- şehir + kanal + kıdem + fonksiyon + marka birleşimi, sektörü tanıyan birinin
-- kimliği tahmin etmesine yetebilir. Kendi ekranından gösterirken şehir
-- görüyordun; dışarıya açarken bir kademe geri çekiliyoruz.
-- Şehri geri istersen: aşağıdaki public.bolge(a.sehir) yerine a.sehir yaz
-- ve KurumDemo.tsx'teki lokasyon filtresini şehre çevir.
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
-- returns table(...) her sütunu aynı adla bir plpgsql değişkeni yapar.
-- Aşağıdaki sorguda her şey a.* ile nitelenmiş durumda, yine de çakışma
-- olursa kolon kazansın:
#variable_conflict use_column
begin
  if not exists (
    select 1
    from public.kurum_erisim k
    where lower(k.eposta) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (k.gecerlilik is null or k.gecerlilik > now())
  ) then
    -- 42501 = insufficient_privilege -> PostgREST bunu HTTP 403 yapar.
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
    -- Serbest metin alanları kimlik sızdırabilir; yalnızca "var mı" bilgisi.
    nullif(btrim(coalesce(a.sertifikalar, '')), '') is not null,
    nullif(btrim(coalesce(a.cv_path, '')), '') is not null
  from public.adaylar a
  order by a.created_at desc;
end
$$;

-- anon çağıramaz. Giriş yapmış kullanıcı çağırabilir ama listede yoksa 403 alır.
revoke all on function public.kurum_havuzu() from public, anon;
grant execute on function public.kurum_havuzu() to authenticated;


-- ---------- 4) Giriş bağlantısı gönderilmeden önce liste kontrolü -----------
-- Amaç: magic link YALNIZCA erişim tanımlı adreslere gitsin. Listede olmayan
-- birine hiç e-posta çıkmasın, Supabase'de gereksiz hesap açılmasın.
--
-- Bu bir GÜVENLİK SINIRI DEĞİL, akış kontrolüdür. Asıl sınır kurum_havuzu()
-- içindeki kontroldür: birisi bu adımı atlayıp kendine link yollatsa bile
-- giriş yaptığında 403 alır, veri görmez. Bu yüzden burada yalnızca boolean
-- dönüyoruz — liste dışarı sızmıyor, "bu adres tanımlı mı" cevabı veriyoruz.
create or replace function public.kurum_erisimi_var(p_eposta text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kurum_erisim k
    where lower(k.eposta) = lower(btrim(coalesce(p_eposta, '')))
      and (k.gecerlilik is null or k.gecerlilik > now())
  )
$$;

grant execute on function public.kurum_erisimi_var(text) to anon, authenticated;


-- ---------- 5) Erişim verme / alma ------------------------------------------
-- Yalçın'ın kendi erişimi (ekran paylaşımıyla gösterirken de bu yoldan geçer,
-- böylece arayüzde ayrıcalıklı bir kod yolu kalmıyor):
insert into public.kurum_erisim (eposta, kurum, aciklama)
values ('yalcinarsan@arsandanismanlik.com.tr', 'Arsan Danışmanlık', 'Yönetici')
on conflict (eposta) do nothing;

-- Bir kuruma süreli erişim vermek için örnek (tarihi kendin belirle):
--   insert into public.kurum_erisim (eposta, kurum, aciklama, gecerlilik)
--   values ('ornek@kurum.com.tr', 'Kurum Adı', 'Beta görüşmesi',
--           now() + interval '30 days')
--   on conflict (eposta) do update
--     set gecerlilik = excluded.gecerlilik, kurum = excluded.kurum;
--
-- Erişimi anında kesmek için:
--   delete from public.kurum_erisim where eposta = 'ornek@kurum.com.tr';
--
-- Kimler erişebiliyor:
--   select eposta, kurum, gecerlilik from public.kurum_erisim order by olusturuldu;
