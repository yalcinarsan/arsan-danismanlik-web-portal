-- İşveren koruması: birebir eşleşme → GRUP (grup-adı kelimesi) eşleşmesi.
--
-- NEDEN: Bir aday mevcut işvereninden gizlenmek istediğinde, bugüne kadar yalnız
-- adayın yazdığı son_kurum, abone kurumun adıyla BİREBİR (normalize sonrası)
-- eşleşirse gizleniyordu. Ama gerçek hayatta aynı grup farklı tüzel adlarla yazılır:
--   "Doğuş Otomotiv" (dağıtıcı) · "Doğuş Oto İzmir / Ankara / Kartal" (bayi iştirakleri)
-- Bunlar ayrı şirket ama yakın ilişkili (iştirak). Dahası aday grup adını adın
-- başında değil ORTASINDA yazabilir (ör. "Audi Doğuş Oto Maslak") ve Türkçe
-- karakter kullanmayabilir ("Dogus"). Birebir eşleşme tüm bunları kaçırıyor →
-- gizlenmek isteyen kişi gruba ifşa oluyordu.
--
-- ÇÖZÜM: Abone kurumun GRUP ADI = normalize edilmiş adının ilk kelimesi (yöneticinin
-- kurum_erisim.kurum'a grup adını yazması esas; ör. "Doğuş Otomotiv" → grup "dogus").
-- Türkçe karakterler sadeleştirilir (çğıöşü→cgiosu). Aday gizlenmek istiyorsa ve bu
-- grup adı, adayın son_kurum'unda HERHANGİ BİR KELİME olarak geçiyorsa gizlenir.
--   abone "doğuş otomotiv" → grup "dogus" → son_kurumunda "dogus" kelimesi geçen
--   (başta/ortada, Türkçe karakterli/karaktersiz) tüm gizlenmek-isteyenler gizlenir.
-- Birebir (sadeleştirilmiş) eşleşme de korunur — grup adı 4 karakterden kısaysa
-- (ör. "DRD", "ASF") yalnız birebir kullanılır; "oto" gibi jenerik kısa kelimeler
-- yanlışlıkla her şeyi gizlemesin.
--
-- YÖN: Kural bilinçli olarak KORUMADAN YANA hata yapar. Bir adayı yanlışlıkla
-- (aynı grubun alakasız bir şirketi yüzünden) gizlemek, gizlenmek isteyen birini
-- yanlışlıkla ifşa etmekten iyidir. Fazla-gizleme yalnız o kuruma bir adayı
-- göstermez; asla korunan birini açığa çıkarmaz.
--
-- Fonksiyonun geri kalanı 20260907120000 ile aynı; yalnız WHERE yüklemi değişti.
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
  v_kurum_norm text;  -- sadeleştirilmiş tam ad (birebir eşleşme için)
  v_grup       text;  -- sadeleştirilmiş grup adı (ilk kelime; grup eşleşmesi için)
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

  v_kurum_norm := translate(public.kurum_normalize(v_kurum), 'çğıöşü', 'cgiosu');
  v_grup       := split_part(coalesce(v_kurum_norm, ''), ' ', 1);

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
    and v_kurum_norm is not null and v_kurum_norm <> ''
    and a.son_kurum is not null
    and (
      -- birebir (sadeleştirilmiş) eşleşme — kısa tek-kelime adlar da dahil
      translate(public.kurum_normalize(a.son_kurum), 'çğıöşü', 'cgiosu') = v_kurum_norm
      -- ya da grup adı, adayın son_kurum'unda bir kelime olarak geçiyorsa
      or (
        length(v_grup) >= 4
        and v_grup = any(
          string_to_array(
            translate(public.kurum_normalize(a.son_kurum), 'çğıöşü', 'cgiosu'),
            ' '
          )
        )
      )
    )
  , false)
  order by a.created_at desc;
end;
$$;
