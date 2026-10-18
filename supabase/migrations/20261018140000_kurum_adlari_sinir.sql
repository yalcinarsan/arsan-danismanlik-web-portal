-- ============================================================================
-- kurum_adlari(): yalnızca en az 3 adayda geçen kurum adları, yalnızca girişli kullanıcıya
-- ============================================================================
-- Sistem denetimi (18 Eki 2026, cikti/taslaklar/sistem-denetimi-2026-10-18.md, bulgu 1):
-- fonksiyon girişsiz ziyaretçiye de açıktı (Supabase varsayılanı anon'a da çalıştırma
-- izni veriyor; 20260831140000'deki "grant ... to authenticated" bunu kapatmıyordu) ve
-- havuzdaki TÜM son_kurum adlarını döndürüyordu. 50 adın 46'sı tek bir adaya aitti;
-- küçük bir işletmenin adı listede görünmek, oradan birinin havuzda olduğunu ele veriyor
-- — son_kurum_gizle'nin (55 adaydan 54'ü işaretli) korumaya çalıştığı bilginin kendisi.
--
-- Artık: (1) yalnızca en az 3 farklı adayda geçen adlar döner, (2) anon çalıştıramaz.
-- Otomatik-tamamlamanın asıl kaynağı zaten src/lib/kurumSeed.ts'deki elle hazırlanmış liste;
-- bu fonksiyon yalnızca orada olmayan, yaygınlaşmış yazımları ekler.
-- ============================================================================

create or replace function public.kurum_adlari()
 returns table (kurum text)
 language sql
 security definer
 set search_path to 'public'
as $fn$
  select son_kurum
  from public.adaylar
  where son_kurum is not null and btrim(son_kurum) <> ''
  group by son_kurum
  having count(distinct id) >= 3
  order by count(*) desc, son_kurum;
$fn$;

revoke all on function public.kurum_adlari() from public, anon;
grant execute on function public.kurum_adlari() to authenticated;
