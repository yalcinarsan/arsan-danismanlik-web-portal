// Özet kartlarının (OzetKart) beslendiği dağılım hesapları.

/** Tek/çoklu değerli bir alanın dağılımını (etiket → sayı), çoktan aza sıralı çıkarır. */
export function dagilimHesapla(degerler: (string | null | undefined)[], etiketFn?: (v: string) => string): [string, number][] {
  const sayac = new Map<string, number>();
  for (const d of degerler) {
    if (!d) continue;
    const etiket = etiketFn ? etiketFn(d) : d;
    sayac.set(etiket, (sayac.get(etiket) ?? 0) + 1);
  }
  return [...sayac.entries()].sort((a, b) => b[1] - a[1]);
}

/** Veritabanının hazır saydığı {değer: sayı} nesnesini aynı biçime çevirir (admin_panel, kurum_mercegi). */
export function sayimDagilimi(obj: Record<string, number> | undefined, etiketFn?: (v: string) => string): [string, number][] {
  if (!obj) return [];
  return Object.entries(obj)
    .map(([k, v]) => [etiketFn ? etiketFn(k) : k, v] as [string, number])
    .sort((a, b) => b[1] - a[1]);
}
