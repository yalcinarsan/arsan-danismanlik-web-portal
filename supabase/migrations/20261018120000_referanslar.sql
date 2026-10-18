-- ============================================================================
-- Referans işlevi (18 Ekim 2026)
-- ============================================================================
-- Fikir: Esra Türegün (Çetaş), 1 Ekim toplantısı. Tasarım ve Yalçın'ın kararları:
-- cikti/taslaklar/referans-islevi-tasarim.md (proje kökünde, repo dışında).
--
-- Akış: aday profilinde en fazla 3 referans verir → profilim'de her biri için
-- "Referans talebi gönder"e kendisi basar → referansa kişiye özel (token'lı) link
-- e-postayla gider → referans girişsiz bir sayfada uzun serbest metin yazar,
-- KVKK aydınlatmasını okuyup açık rıza kutusunu işaretleyerek gönderir.
-- Yorumu aday görür (gizleyemez) ve adayın temas talebini KABUL ettiği kurumlar
-- görür (kurum ekranında "Görüşmeyi kabul eden adaylar"). Referansın iletişim
-- bilgisi kurumlarla paylaşılmaz; yalnız adı, kurumu/unvanı, ilişkisi ve yorumu.
--
-- Güvenlik: tabloya doğrudan yazma/okuma yetkisi yok (yalnız yönetici okur);
-- her şey SECURITY DEFINER fonksiyonlardan geçer. Token = tahmin edilemez uuid,
-- tek referansa bağlı (temas-yanit ile aynı desen). Aday kaydını silerse
-- referansları da silinir (on delete cascade; KVKK silme hakkı).
-- ============================================================================

create table if not exists public.referanslar (
  id          uuid primary key default gen_random_uuid(),
  aday_id     uuid not null references public.adaylar(id) on delete cascade,
  ad          text not null check (btrim(ad) <> ''),
  eposta      text not null check (eposta ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  telefon     text,
  kurum_unvan text,
  iliski      text not null check (iliski in ('yonetici', 'calisma_arkadasi', 'ekibinden', 'musteri_is_ortagi', 'diger')),
  token       uuid not null default gen_random_uuid(),
  talep_ts    timestamptz,             -- adayın son "talep gönder" anı (e-posta bu anda gider)
  talep_sayisi int not null default 0, -- aynı referansa en fazla 3 gönderim
  yorum       text,
  yorum_ts    timestamptz,
  riza_ts     timestamptz,             -- referansın açık rıza zamanı (yorumla birlikte)
  olusturuldu timestamptz not null default now()
);

create unique index if not exists referanslar_token_key on public.referanslar (token);
create index if not exists referanslar_aday_idx on public.referanslar (aday_id);

alter table public.referanslar enable row level security;

drop policy if exists "yalcin tum referanslari gorur" on public.referanslar;
create policy "yalcin tum referanslari gorur" on public.referanslar
  for select using ((auth.jwt() ->> 'email') = 'yalcinarsan@arsandanismanlik.com.tr');


-- ---------- yardımcı: oturumdaki adayın kaydı ------------------------------
create or replace function public.oturum_aday_id()
 returns uuid
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select a.id from public.adaylar a where a.user_id = auth.uid()
$function$;


-- ---------- aday: kendi referansları ----------------------------------------
create or replace function public.referanslarim()
 returns table (
   id uuid, ad text, eposta text, telefon text, kurum_unvan text, iliski text,
   talep_ts timestamptz, talep_sayisi int, yorum text, yorum_ts timestamptz
 )
 language sql
 security definer
 set search_path to 'public'
as $function$
  select r.id, r.ad, r.eposta, r.telefon, r.kurum_unvan, r.iliski,
         r.talep_ts, r.talep_sayisi, r.yorum, r.yorum_ts
  from public.referanslar r
  where r.aday_id = public.oturum_aday_id()
  order by r.olusturuldu
$function$;


-- ---------- aday: referans listesini kaydet ---------------------------------
-- p_liste: [{id?, ad, eposta, telefon?, kurum_unvan?, iliski}] — adayın DÜZENLENEBİLİR
-- referansları (yanıtlanmamış olanlar). Yanıtlanmış referanslar listede olsa da
-- olmasa da değişmez ve silinmez (aday gizleyemez — Yalçın kararı). Listede
-- olmayan yanıtlanmamış referanslar silinir. E-posta değişirse eski link geçersiz
-- olur (yeni token) ve talep yeniden gönderilmeli.
create or replace function public.referanslari_kaydet(p_liste jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_aday   uuid := public.oturum_aday_id();
  v_oge    jsonb;
  v_id     uuid;
  v_tutulan uuid[] := '{}';
  v_yanitli int;
begin
  if v_aday is null then
    raise exception 'Önce profilini kaydetmelisin.' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_liste, '[]'::jsonb)) <> 'array' then
    raise exception 'Geçersiz liste.' using errcode = '22023';
  end if;

  select count(*) into v_yanitli from public.referanslar where aday_id = v_aday and yorum is not null;
  if v_yanitli + jsonb_array_length(coalesce(p_liste, '[]'::jsonb)) > 3 then
    raise exception 'En fazla 3 referans ekleyebilirsin.' using errcode = '22023';
  end if;

  for v_oge in select * from jsonb_array_elements(coalesce(p_liste, '[]'::jsonb)) loop
    v_id := nullif(v_oge ->> 'id', '')::uuid;
    if v_id is not null and exists (
      select 1 from public.referanslar where id = v_id and aday_id = v_aday and yorum is null
    ) then
      update public.referanslar r set
        ad = btrim(v_oge ->> 'ad'),
        telefon = nullif(btrim(coalesce(v_oge ->> 'telefon', '')), ''),
        kurum_unvan = nullif(btrim(coalesce(v_oge ->> 'kurum_unvan', '')), ''),
        iliski = v_oge ->> 'iliski',
        -- e-posta değiştiyse eski link ölür, talep yeniden gönderilmeli
        token    = case when lower(r.eposta) <> lower(btrim(v_oge ->> 'eposta')) then gen_random_uuid() else r.token end,
        talep_ts = case when lower(r.eposta) <> lower(btrim(v_oge ->> 'eposta')) then null else r.talep_ts end,
        eposta = lower(btrim(v_oge ->> 'eposta'))
      where r.id = v_id;
      v_tutulan := v_tutulan || v_id;
    elsif v_id is null then
      insert into public.referanslar (aday_id, ad, eposta, telefon, kurum_unvan, iliski)
      values (
        v_aday,
        btrim(v_oge ->> 'ad'),
        lower(btrim(v_oge ->> 'eposta')),
        nullif(btrim(coalesce(v_oge ->> 'telefon', '')), ''),
        nullif(btrim(coalesce(v_oge ->> 'kurum_unvan', '')), ''),
        v_oge ->> 'iliski'
      )
      returning id into v_id;
      v_tutulan := v_tutulan || v_id;
    end if;
    -- id var ama yanıtlanmış ya da başkasının: sessizce yok sayılır
  end loop;

  delete from public.referanslar
  where aday_id = v_aday and yorum is null and not (id = any (v_tutulan));
end;
$function$;


-- ---------- aday: referans talebini gönder ----------------------------------
-- Dönüş: 'gonderildi' | 'yanitlandi' | 'bekle' (24 saat dolmadı) | 'sinir' (3 gönderim)
-- 'gonderildi'de talep_ts güncellenir; aşağıdaki tetik e-postayı gönderir.
create or replace function public.referans_talep_gonder(p_id uuid)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_aday uuid := public.oturum_aday_id();
  r public.referanslar%rowtype;
begin
  select * into r from public.referanslar where id = p_id and aday_id = v_aday;
  if not found then
    raise exception 'Referans bulunamadı.' using errcode = '42501';
  end if;
  if r.yorum is not null then return 'yanitlandi'; end if;
  if r.talep_ts is not null and r.talep_ts > now() - interval '24 hours' then return 'bekle'; end if;
  if r.talep_sayisi >= 3 then return 'sinir'; end if;

  update public.referanslar
  set talep_ts = now(), talep_sayisi = talep_sayisi + 1
  where id = p_id;
  return 'gonderildi';
end;
$function$;


-- ---------- referans sayfası (girişsiz, token'lı) ---------------------------
-- Yalnız sayfanın gösterdiği asgari bilgi: adayın ve referansın adı, yanıt durumu.
-- Talebi henüz gönderilmemiş referansın linki geçersiz sayılır.
create or replace function public.referans_sayfa(p_token uuid)
 returns table (aday_ad text, referans_ad text, yanitlandi boolean)
 language sql
 security definer
 set search_path to 'public'
as $function$
  select a.ad, r.ad, (r.yorum is not null)
  from public.referanslar r
  join public.adaylar a on a.id = r.aday_id
  where r.token = p_token and r.talep_ts is not null
$function$;

-- Dönüş: 'tamam' | 'zaten' (daha önce yanıtlanmış) | null (geçersiz link)
create or replace function public.referans_yanitla(p_token uuid, p_yorum text, p_riza boolean)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_yorum text := btrim(coalesce(p_yorum, ''));
  r public.referanslar%rowtype;
begin
  if p_riza is distinct from true then
    raise exception 'Göndermek için açık rıza kutusunu işaretlemelisiniz.' using errcode = '22023';
  end if;
  if char_length(v_yorum) < 20 then
    raise exception 'Görüşünüz en az birkaç cümle olmalı.' using errcode = '22023';
  end if;
  if char_length(v_yorum) > 5000 then
    raise exception 'Görüşünüz en fazla 5000 karakter olabilir.' using errcode = '22023';
  end if;

  select * into r from public.referanslar where token = p_token and talep_ts is not null;
  if not found then return null; end if;
  if r.yorum is not null then return 'zaten'; end if;

  update public.referanslar
  set yorum = v_yorum, yorum_ts = now(), riza_ts = now()
  where id = r.id;
  return 'tamam';
end;
$function$;


-- ---------- kurum: görüşmeyi kabul eden adaylar -----------------------------
-- Oturumdaki kurum hesabının (kurum_erisim, geçerli) gönderdiği ve aday tarafından
-- KABUL edilen talepler. Ad + pozisyon + kabul tarihi + yanıtlanmış referanslar.
-- İletişim bilgisi ve özgeçmiş YOK: onlar Yalçın'ın tanıştırma e-postasıyla gider.
create or replace function public.kurum_kabul_edenler()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_eposta text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if not exists (
    select 1 from public.kurum_erisim k
    where lower(btrim(k.eposta)) = v_eposta
      and (k.gecerlilik is null or k.gecerlilik > now())
  ) then
    raise exception 'Bu e-posta kurum görünümü için yetkili değil.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(x order by x.kabul_ts desc nulls last)
    from (
      select
        a.ad,
        a.son_pozisyon,
        a.kidem::text as kidem,
        a.fonksiyon::text[] as fonksiyon,
        coalesce(t.yanit_ts, t.olusturuldu) as kabul_ts,
        coalesce((
          select jsonb_agg(jsonb_build_object(
                   'ad', r.ad, 'kurum_unvan', r.kurum_unvan, 'iliski', r.iliski,
                   'yorum', r.yorum, 'yorum_ts', r.yorum_ts)
                 order by r.yorum_ts)
          from public.referanslar r
          where r.aday_id = a.id and r.yorum is not null
        ), '[]'::jsonb) as referanslar
      from public.temas_talepleri t
      join public.adaylar a on a.id = t.aday_id
      where lower(btrim(t.kurum_eposta)) = v_eposta and t.durum = 'kabul'
    ) x
  ), '[]'::jsonb);
end;
$function$;


-- ---------- yetkiler --------------------------------------------------------
revoke all on function public.oturum_aday_id() from public, anon;
grant execute on function public.oturum_aday_id()               to authenticated;
grant execute on function public.referanslarim()                to authenticated;
grant execute on function public.referanslari_kaydet(jsonb)     to authenticated;
grant execute on function public.referans_talep_gonder(uuid)    to authenticated;
grant execute on function public.referans_sayfa(uuid)           to anon, authenticated;
grant execute on function public.referans_yanitla(uuid, text, boolean) to anon, authenticated;
grant execute on function public.kurum_kabul_edenler()          to authenticated;


-- ---------- e-posta: talep gönderilince referansa link ----------------------
-- Diğer bildirimlerle aynı edge function'a gider (yeni-kayit-bildirim), sır Vault'tan.
create or replace function public.referans_talebi_bildirim_webhook()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $fn$
declare
  v_secret  text;
  v_aday_ad text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'webhook_secret';
  select a.ad into v_aday_ad from public.adaylar a where a.id = NEW.aday_id;
  perform net.http_post(
    url := 'https://wwpkgwndgephkuwpnjov.supabase.co/functions/v1/yeni-kayit-bildirim',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'type', 'REFERANS_TALEBI',
      'table', 'referanslar',
      'record', jsonb_build_object('ad', NEW.ad, 'eposta', NEW.eposta, 'token', NEW.token),
      'aday_ad', v_aday_ad
    )
  );
  return NEW;
end;
$fn$;

drop trigger if exists referans_talebi_bildirim_trg on public.referanslar;
create trigger referans_talebi_bildirim_trg
  after update of talep_ts on public.referanslar
  for each row
  when (NEW.talep_ts is not null and NEW.talep_ts is distinct from OLD.talep_ts)
  execute function public.referans_talebi_bildirim_webhook();
