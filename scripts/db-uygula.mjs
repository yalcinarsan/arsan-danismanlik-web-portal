// Bir migration dosyasını canlı veritabanına uygular VE aynı işlemde
// supabase_migrations.schema_migrations kaydına işler. İkisi tek işlem içinde:
// biri başarısız olursa hiçbiri olmaz.
//
// Neden: `supabase db push` tarayıcı girişi ve veritabanı şifresi istiyor; pratikte
// değişiklikler Management API ile uygulandı ve kayda işlenmedi. 18 Ekim 2026'daki
// denetimde 22 dosyadan yalnızca 4'ünün kayıtlı olduğu görüldü (bkz. supabase/BENIOKU.md).
//
// Kullanım:
//   npm run db:dosya -- supabase/migrations/<dosya>.sql            # uygula + kayda işle
//   npm run db:dosya -- --dene supabase/migrations/<dosya>.sql     # uygula, sonra GERİ AL
//   npm run db:dosya -- --yalniz-kayit supabase/migrations/<...>   # zaten uygulanmışı kayda işle
//   npm run db:dosya -- --durum                                    # kayıtlı olmayan dosyaları listele
//
// .env.local içinde SUPABASE_ACCESS_TOKEN ve SUPABASE_PROJECT_REF gerekir.
import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(kok, '.env.local'), 'utf8').split('\n')
    .map((s) => s.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);
const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref } = env;
if (!token || !ref) { console.error('.env.local: SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF eksik'); process.exit(1); }

async function sorgu(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const govde = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(govde.message ?? `HTTP ${res.status}`);
  return govde;
}

const kayitliSurumler = async () =>
  new Set((await sorgu('select version from supabase_migrations.schema_migrations')).map((r) => r.version));

const args = process.argv.slice(2);
const bayrak = (b) => args.includes(b);
const dosyalar = args.filter((a) => !a.startsWith('--'));

if (bayrak('--durum')) {
  const kayitli = await kayitliSurumler();
  const klasor = join(kok, 'supabase/migrations');
  const eksik = readdirSync(klasor).filter((f) => f.endsWith('.sql') && !kayitli.has(f.split('_')[0]));
  console.log(eksik.length ? `Kayıtlı OLMAYAN ${eksik.length} dosya:\n  ${eksik.join('\n  ')}` : 'Bütün dosyalar kayıtlı.');
  process.exit(0);
}
if (!dosyalar.length) { console.error('Dosya ver. Kullanım için betiğin başına bak.'); process.exit(1); }

const kayitli = await kayitliSurumler();
for (const yol of dosyalar) {
  const ad = basename(yol, '.sql');
  const [surum, ...parca] = ad.split('_');
  if (!/^\d{14}$/.test(surum)) { console.error(`${ad}: dosya adı 14 haneli tarihle başlamalı`); process.exit(1); }
  if (kayitli.has(surum) && !bayrak('--dene')) { console.log(`${ad}: zaten kayıtlı, atlandı`); continue; }

  const kayit = `insert into supabase_migrations.schema_migrations (version, name) values ('${surum}', '${parca.join('_').replace(/'/g, "''")}') on conflict (version) do nothing;`;
  const sql = bayrak('--yalniz-kayit')
    ? kayit
    : `begin;\n${readFileSync(yol, 'utf8')}\n;\n${kayit}\n${bayrak('--dene') ? 'rollback' : 'commit'};`;
  try {
    await sorgu(sql);
    console.log(`${ad}: ${bayrak('--dene') ? 'denendi, geri alındı' : bayrak('--yalniz-kayit') ? 'kayda işlendi' : 'uygulandı ve kayda işlendi'}`);
  } catch (e) {
    console.error(`${ad}: HATA, hiçbir şey değişmedi → ${e.message}`);
    process.exit(1);
  }
}
