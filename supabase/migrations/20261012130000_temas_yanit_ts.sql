-- temas_talepleri'ne yanıt zamanı eklendi; temas_yanit_ver yanıt verildiğinde
-- yanit_ts = now() damgalar. Böylece "kabul/ret ne zaman geldi" her zaman belli
-- olur (Yakup belirsizliği gibi durumlar tekrar yaşanmasın). Eski kayıtlarda
-- yanit_ts NULL kalır (geçmişe dönük bilmiyoruz).
alter table public.temas_talepleri add column if not exists yanit_ts timestamptz;

create or replace function public.temas_yanit_ver(p_token uuid, p_karar text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_durum text;
begin
  if p_karar not in ('kabul', 'ret') then
    raise exception 'Gecersiz karar: %', p_karar using errcode = '22023';
  end if;

  select durum into v_durum
  from public.temas_talepleri
  where yanit_token = p_token;

  if not found then
    return null;  -- gecersiz/eskimis token
  end if;

  if v_durum in ('yeni', 'iletildi') then
    update public.temas_talepleri
    set durum = p_karar, yanit_ts = now()
    where yanit_token = p_token;
    return p_karar;
  end if;

  return v_durum;  -- zaten yanitlanmis ya da iptal
end;
$function$;
