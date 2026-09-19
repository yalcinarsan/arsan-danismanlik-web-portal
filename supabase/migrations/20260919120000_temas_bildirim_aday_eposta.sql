-- temas_talebi bildirim webhook'u: edge function'ın ADAYA otomatik onay linki
-- yollayabilmesi için payload'a aday_eposta + aday_ad eklenir (adaylar'dan join).
-- Tetikleyici (temas_talebi_bildirim_trg) aynı kalır; yalnız gövde güncellenir.
-- Sır yine Vault'tan okunur (bkz. 20260830120000).
create or replace function public.temas_talebi_bildirim_webhook()
 returns trigger
 language plpgsql
 security definer
as $fn$
declare
  v_secret text;
  v_eposta text;
  v_ad     text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'webhook_secret';

  select a.eposta, a.ad into v_eposta, v_ad
  from public.adaylar a where a.id = NEW.aday_id;

  perform net.http_post(
    url := 'https://wwpkgwndgephkuwpnjov.supabase.co/functions/v1/yeni-kayit-bildirim',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT', 'table', TG_TABLE_NAME, 'record', row_to_json(NEW),
      'aday_eposta', v_eposta, 'aday_ad', v_ad
    )
  );
  return NEW;
end;
$fn$;
