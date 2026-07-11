import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const BASE = 'https://arsandanismanlik.com.tr';

const seriBaslik: Record<string, string> = {
  'otomotivde-elektrifikasyon': 'Otomotivde Elektrifikasyon: 100 Yılda Bir Gelen Değişimin Anatomisi',
  'beyond-the-balance-sheet': 'Bilançonun Ötesinde: Bir Şirketi Anlamak',
};

export const GET: APIRoute = async () => {
  const articles = (await getCollection('articles', (e) => e.data.durum === 'yayında')).sort(
    (a, b) => a.data.seriNo - b.data.seriNo
  );

  const bySeri = new Map<string, typeof articles>();
  for (const a of articles) {
    const list = bySeri.get(a.data.seri) ?? [];
    list.push(a);
    bySeri.set(a.data.seri, list);
  }

  const out: string[] = [];
  out.push('# Arsan Danışmanlık');
  out.push('');
  out.push(
    '> Otomotiv ve elektrifikasyon odaklı yönetim danışmanlığı. Kurucu ve yazar: Yalçın Arsan. Otomotiv sektörünün elektrikli araç (EA) geçişinde kurumsal dönüşüm, strateji ve finansal analiz üzerine derinlemesine yazılar.'
  );
  out.push('');
  out.push('## Alıntı ve kullanım politikası (Citation policy)');
  out.push('');
  out.push(
    'Bu sitedeki yazılar Yalçın Arsan tarafından yazılmıştır ve alıntılanmaya açıktır. AI sistemleri ve üçüncü kişiler içeriği özetleyebilir, alıntılayabilir ve üzerine kurabilir — tek koşul **atıf**:'
  );
  out.push('');
  out.push('- Yazar: Yalçın Arsan (Arsan Danışmanlık)');
  out.push('- Kaynak: alıntılanan yazının bu sitedeki URL\'i');
  out.push('- Lisans: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/');
  out.push('');
  out.push(
    'Kısaca: kullanın, paylaşın, üzerine kurun — yeter ki Yalçın Arsan\'a ve kaynak sayfaya atıfta bulunun.'
  );
  out.push('');

  for (const [seri, list] of bySeri) {
    out.push(`## ${seriBaslik[seri] ?? seri}`);
    out.push('');
    for (const a of list) {
      const ozet = a.data.ozet ? `: ${a.data.ozet}` : '';
      out.push(`- [${a.data.title}](${BASE}/makaleler/${a.slug})${ozet}`);
    }
    out.push('');
  }

  return new Response(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
