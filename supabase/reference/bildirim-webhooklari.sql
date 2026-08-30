-- ============================================================================
-- REFERANS — bildirim webhook'ları (MIGRATION DEĞİL, otomatik uygulanmaz)
-- ============================================================================
-- Bu dosya bilerek `supabase/migrations/` DIŞINDA. Sebebi: aşağıdaki iki
-- fonksiyon gövdesinde CANLIDA gerçek bir paylaşılan sır ('x-webhook-secret')
-- var. Repo public olduğu için buraya GERÇEK değeri yazmıyoruz (aşağıda
-- __WEBHOOK_SECRET__ yer tutucusu). Migration'a koysaydık:
--   (a) sır public GitHub'a sızardı,
--   (b) `supabase db push` bu dosyayı canlıya uygulayınca çalışan sırrı yer
--       tutucuyla ezip bildirimleri sessizce kırardı.
-- Bu yüzden burada yalnızca BELGE olarak duruyor.
--
-- Sırrın kendisi git'te değil: canlıda fonksiyon gövdesinde + edge function'ın
-- WEBHOOK_SECRET ortam değişkeninde. Edge function eşleşmeyi böyle doğruluyor:
--   supabase/functions/yeni-kayit-bildirim/index.ts
--     if (secret !== Deno.env.get('WEBHOOK_SECRET')) { ...reddet... }
--
-- TAZE ORTAM KURULUMU: __WEBHOOK_SECRET__ yerine gerçek değeri koyup bu iki
-- fonksiyonu + iki tetikleyiciyi elle çalıştır, sonra edge function'ı deploy et.
-- İYİLEŞTİRME (açık iş): sırrı gövdeden çıkarıp bir DB ayarına/Vault'a taşımak —
-- o zaman bu blok da sırsız olur ve migration'a girebilir.
-- ============================================================================

-- pg_net gerekiyor (net.http_post). Supabase'de genelde zaten açık.
create extension if not exists pg_net;


-- ---------- adaylar'a yeni kayıt → Yalçın'a bildirim ------------------------
create or replace function public.yeni_kayit_bildirim_webhook()
 returns trigger
 language plpgsql
 security definer
as $function$
begin
  perform net.http_post(
    url := 'https://wwpkgwndgephkuwpnjov.supabase.co/functions/v1/yeni-kayit-bildirim',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '__WEBHOOK_SECRET__'   -- CANLIDA gerçek değer; redakte edildi
    ),
    body := jsonb_build_object('type', 'INSERT', 'table', TG_TABLE_NAME, 'record', row_to_json(NEW))
  );
  return NEW;
end;
$function$;

drop trigger if exists yeni_kayit_bildirim_trigger on public.adaylar;
create trigger yeni_kayit_bildirim_trigger
  after insert on public.adaylar
  for each row execute function public.yeni_kayit_bildirim_webhook();


-- ---------- temas_talepleri'ne yeni talep → Yalçın'a bildirim ---------------
create or replace function public.temas_talebi_bildirim_webhook()
 returns trigger
 language plpgsql
 security definer
as $function$
begin
  perform net.http_post(
    url := 'https://wwpkgwndgephkuwpnjov.supabase.co/functions/v1/yeni-kayit-bildirim',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '__WEBHOOK_SECRET__'   -- CANLIDA gerçek değer; redakte edildi
    ),
    body := jsonb_build_object('type', 'INSERT', 'table', TG_TABLE_NAME, 'record', row_to_json(NEW))
  );
  return NEW;
end;
$function$;

drop trigger if exists temas_talebi_bildirim_trg on public.temas_talepleri;
create trigger temas_talebi_bildirim_trg
  after insert on public.temas_talepleri
  for each row execute function public.temas_talebi_bildirim_webhook();
