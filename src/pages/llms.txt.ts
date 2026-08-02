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

  out.push('## Danışmanlık hizmetleri');
  out.push('');
  out.push(
    'Arsan Danışmanlık, Türkiye merkezli, otomotiv ve ilişkili sektörlere odaklı bir yönetim danışmanlığı şirketidir (kuruluş: 2009). Dört ana hizmet:'
  );
  out.push('');
  out.push(
    `- [Yönetim Danışmanlığı](${BASE}/hizmetlerimiz/yonetim-danismanligi): Otomotiv ve ilişkili sektörlerde sorun çözme, planlama, değişim ve gelişime yönelik danışmanlık.`
  );
  out.push(
    `- [Elektrifikasyon Dönüşüm Danışmanlığı](${BASE}/hizmetlerimiz/elektrifikasyon-donusum-danismanligi): Elektrifikasyonun kurum için yarattığı risk ve fırsatları ortaya çıkarıp somut bir dönüşüm programına çevirme.`
  );
  out.push(
    `- [Elektrifikasyon Çalıştayı](${BASE}/hizmetlerimiz/elektrifikasyon-calistayi): Elektrikliye geçişi kurumsal ölçekte planlama çözümü — atölye formatında.`
  );
  out.push(
    `- [Vizyon & Misyon Yaratma Seansı](${BASE}/hizmetlerimiz/vizyon-misyon-yaratma-seansi): Temel amaç, temel değerler ve büyük hedef bileşimiyle kurumsal vizyon yaratma çalıştayı.`
  );
  out.push('');

  out.push('## Veri: Elektrikli araç pazar görünümü');
  out.push('');
  out.push(
    `- [EA (Elektrikli Araç) Verileri](${BASE}/ev-verileri): IEA Global EV Outlook verisiyle dünya, Avrupa ve Türkiye elektrikli araç pazarının interaktif görünümü. Kaynak: IEA (CC BY 4.0), düzenli güncellenir.`
  );
  out.push('');

  out.push('## Referanslar');
  out.push('');
  out.push(
    `- [Referanslarımız](${BASE}/referanslar): Bugüne kadar ortak çalışma yapılan marka ve kurumlar — aralarında Ford Otosan, Doğuş Otomotiv, Stellantis Türkiye, Volvo Türkiye, Audi Türkiye, OSD ve TAYSAD gibi kurumlar var.`
  );
  out.push('');

  out.push('## Kariyer: Otomotiv İnsanı');
  out.push('');
  out.push(
    `- [Otomotiv İnsanı](${BASE}/kariyer/otomotiv-insani): Otomotive özgü yetenek platformu — sektör profesyonelleri için görünürlük tercihi (açık / kapalı) sunan aday havuzu.`
  );
  out.push('');

  out.push('## İletişim');
  out.push('');
  out.push('- Kurucu: Yalçın Arsan, Yönetim Danışmanı');
  out.push('- E-posta: yalcinarsan@arsandanismanlik.com.tr');
  out.push('- Adres: Fatih Sultan Mehmet Mah, Buyaka İş Kule 3, 34771 Ümraniye / İstanbul');
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
