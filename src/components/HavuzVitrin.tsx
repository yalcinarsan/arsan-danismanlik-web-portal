import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { KANAL, FONKSIYON } from '../lib/adayTaksonomi';

// Kurum-demo sayfasının başındaki CANLI havuz vitrini. Her açılışta
// public_stats() RPC'sini çağırır (anon; PII döndürmez — yalnızca sayılar),
// böylece katılım arttıkça redeploy gerekmeden otomatik güncellenir.
// Veri gelene kadar / hata durumunda hiçbir şey göstermez.

interface HavuzStats {
  toplam: number;
  deneyim: Record<string, number>;
  kidem: Record<string, number>;
  elektrifikasyon: Record<string, number>;
  kanal: Record<string, number>;
  fonksiyon: Record<string, number>;
}

function dagilim(harita: readonly (readonly string[])[], veri: Record<string, number> | undefined) {
  if (!veri) return [] as { label: string; n: number }[];
  return harita
    .map(([v, label]) => ({ label, n: veri[v] ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
}

function Dagilim({ baslik, satirlar }: { baslik: string; satirlar: { label: string; n: number }[] }) {
  const max = Math.max(...satirlar.map((x) => x.n), 1);
  return (
    <div className="rounded-lg border border-warm-border bg-white p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-accent mb-4">{baslik}</h3>
      <div className="space-y-3">
        {satirlar.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ink">{s.label}</span>
              <span className="text-ink font-medium tabular-nums">{s.n}</span>
            </div>
            <div className="h-1.5 rounded-full bg-sand">
              <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.round((s.n / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HavuzVitrin() {
  const [stats, setStats] = useState<HavuzStats | null>(null);

  useEffect(() => {
    let iptal = false;
    supabase.rpc('public_stats').then(({ data, error }) => {
      if (iptal || error || !data || typeof data.toplam !== 'number' || data.toplam <= 0) return;
      setStats(data as HavuzStats);
    });
    return () => { iptal = true; };
  }, []);

  if (!stats) return null;

  const t = stats.toplam;
  const yuzde = (n: number) => (t > 0 ? Math.round((n / t) * 100) : 0);

  const vurgular = [
    { deger: `%${yuzde(stats.deneyim['15+'] ?? 0)}`, etiket: '15+ yıl deneyimli' },
    {
      deger: `%${yuzde((stats.kidem['orta_kademe'] ?? 0) + (stats.kidem['ust_duzey'] ?? 0) + (stats.kidem['direktor_plus'] ?? 0))}`,
      etiket: 'orta kademe ve üzeri',
    },
    { deger: `%${yuzde(stats.elektrifikasyon['ev_deneyimim_var'] ?? 0)}`, etiket: 'elektrifikasyonda saha deneyimli' },
  ];

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold text-ink mb-2">Havuz bir bakışta</h2>
      <p className="text-warm-600 mb-6">
        Havuzdaki profesyoneller — hepsi anonim, tümü sektörün içinden. Sayılar canlıdır;
        havuz büyüdükçe otomatik güncellenir.
      </p>

      <div className="flex items-baseline gap-3 mb-6">
        <span className="font-serif text-5xl text-ink tabular-nums leading-none">{t}</span>
        <span className="text-lg text-warm-600">otomotiv profesyoneli</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {vurgular.map((v) => (
          <div key={v.etiket} className="rounded-lg border border-warm-border bg-white p-5 text-center">
            <div className="font-serif text-4xl text-accent tabular-nums">{v.deger}</div>
            <div className="mt-1.5 text-sm text-warm-600 leading-snug">{v.etiket}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Dagilim baslik="Değer zinciri (kanal)" satirlar={dagilim(KANAL, stats.kanal)} />
        <Dagilim baslik="Uzmanlık (fonksiyon)" satirlar={dagilim(FONKSIYON, stats.fonksiyon)} />
      </div>

      <p className="mt-4 text-xs text-warm-500">
        Bir profesyonel birden fazla kanal veya fonksiyon seçebildiği için bu sayılar kişi sayısıdır, yüzde değil.
      </p>
    </section>
  );
}
