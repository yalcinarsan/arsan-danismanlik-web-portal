-- ============================================================================
-- Aday: "son kurumum beni görmesin" tercihi (mevcut-işveren koruması v1)
-- ============================================================================
-- Kayıt formunda, aday son kurumunu doldurunca varsayılan-işaretli bir kutu
-- ("Son kurumum beni bu havuzda görmesin") bu alanı yazar. Varsayılan true.
-- Beta'da: elle örtüşme taramasında dikkate alınır (bir kurumu devreye almadan
-- önce, son_kurum'u o kuruma denk gelen ve bu alanı true olan adaylar korunur).
-- İleride tam otomasyon: kurum_havuzu()'na listeleme-düzeyi filtre bağlanacak.
-- ============================================================================

alter table public.adaylar
  add column if not exists son_kurum_gizle boolean not null default true;

comment on column public.adaylar.son_kurum_gizle is
  'Aday, son kurumunun (mevcut/eski işveren) kendisini havuzda görmesini istemiyor. Varsayılan true.';
