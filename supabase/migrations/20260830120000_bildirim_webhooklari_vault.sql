-- ============================================================================
-- Bildirim webhook'ları — sır Vault'tan okunuyor (artık migration'a girebilir)
-- ============================================================================
-- Daha önce bu iki trigger fonksiyonu gövdelerinde `x-webhook-secret`'i DÜZ YAZI
-- taşıyordu; repo public olduğu için migration dışında (redakte referans dosyada)
-- tutuluyorlardı. 30 Ağustos'ta sır Supabase Vault'a taşındı:
--   vault.decrypted_secrets → name = 'webhook_secret'
-- Fonksiyonlar artık sırrı oradan okuyor, yani gövdeleri SIRSIZ → bu dosya
-- güvenle git'e ve normal migration akışına girebilir. Canlıya uygulanması da
-- güvenli: idempotent (create or replace / drop-create), kasadaki sırrı ezmez.
--
-- TAZE ORTAM KURULUMU (yalnızca bir kez, elle — gerçek değer git'te yok):
--   select vault.create_secret('<GERCEK_SECRET>', 'webhook_secret',
--     'yeni-kayit-bildirim edge function x-webhook-secret');
-- Değer, edge function'ın beklediği WEBHOOK_SECRET ile aynı olmalı
-- (supabase/functions/yeni-kayit-bildirim/index.ts, Deno.env.get('WEBHOOK_SECRET')).
-- ============================================================================

-- Gerekli eklentiler (Supabase'de genelde ikisi de zaten açık).
create extension if not exists pg_net;
create extension if not exists supabase_vault;


-- ---------- adaylar'a yeni kayıt → Yalçın'a bildirim ------------------------
create or replace function public.yeni_kayit_bildirim_webhook()
 returns trigger
 language plpgsql
 security definer
as $fn$
declare v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'webhook_secret';
  perform net.http_post(
    url := 'https://wwpkgwndgephkuwpnjov.supabase.co/functions/v1/yeni-kayit-bildirim',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object('type', 'INSERT', 'table', TG_TABLE_NAME, 'record', row_to_json(NEW))
  );
  return NEW;
end;
$fn$;

drop trigger if exists yeni_kayit_bildirim_trigger on public.adaylar;
create trigger yeni_kayit_bildirim_trigger
  after insert on public.adaylar
  for each row execute function public.yeni_kayit_bildirim_webhook();


-- ---------- temas_talepleri'ne yeni talep → Yalçın'a bildirim ---------------
create or replace function public.temas_talebi_bildirim_webhook()
 returns trigger
 language plpgsql
 security definer
as $fn$
declare v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'webhook_secret';
  perform net.http_post(
    url := 'https://wwpkgwndgephkuwpnjov.supabase.co/functions/v1/yeni-kayit-bildirim',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object('type', 'INSERT', 'table', TG_TABLE_NAME, 'record', row_to_json(NEW))
  );
  return NEW;
end;
$fn$;

drop trigger if exists temas_talebi_bildirim_trg on public.temas_talepleri;
create trigger temas_talebi_bildirim_trg
  after insert on public.temas_talepleri
  for each row execute function public.temas_talebi_bildirim_webhook();
