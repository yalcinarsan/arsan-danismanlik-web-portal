// Aday, kurum ve yönetici ekranlarının paylaştığı küçük görünüm parçaları.

/** Etiket–değer satırı. Değer boşsa satır hiç görünmez.
 *  `genis`: profil sayfasındaki daha ferah görünüm. */
export function Satir({ etiket, deger, genis = false }: { etiket: string; deger?: React.ReactNode; genis?: boolean }) {
  if (!deger) return null;
  return (
    <div className={`grid grid-cols-3 gap-4 border-b ${genis ? 'py-3 border-warm-border' : 'py-2 border-warm-border/60'}`}>
      <dt className="text-sm text-warm-500">{etiket}</dt>
      <dd className={`col-span-2 text-ink ${genis ? '' : 'text-sm'}`}>{deger}</dd>
    </div>
  );
}

/** Dağılım kartı: etiket ve sayı listesi. `cubuk`: her satırın altında oran çubuğu (yönetici paneli). */
export function OzetKart({ baslik, veri, cubuk = false }: { baslik: string; veri: [string, number][]; cubuk?: boolean }) {
  if (veri.length === 0) return null;
  const enYuksek = veri[0]?.[1] || 1;
  return (
    <div className="rounded-lg border border-warm-border p-4">
      <p className={`text-sm font-medium text-ink ${cubuk ? 'mb-2.5' : 'mb-2'}`}>{baslik}</p>
      <ul className={cubuk ? 'space-y-1.5' : 'space-y-1'}>
        {veri.map(([etiket, sayi]) => cubuk ? (
          <li key={etiket} className="text-sm text-warm-600">
            <div className="flex justify-between gap-3">
              <span>{etiket}</span><span className="text-warm-400 tabular-nums">{sayi}</span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-sand overflow-hidden">
              <div className="h-full rounded-full bg-accent/50" style={{ width: `${Math.round((sayi / enYuksek) * 100)}%` }} />
            </div>
          </li>
        ) : (
          <li key={etiket} className="flex justify-between gap-3 text-sm text-warm-600">
            <span>{etiket}</span>
            <span className="text-warm-400 tabular-nums">{sayi}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Göze çarpan hata kutusu. Düz renkli bir satır gözden kaçıyordu (canlı test, 18 Eki). */
export function HataKutusu({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="alert" className={`rounded-md border-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800 ${className}`}>
      {children}
    </div>
  );
}
