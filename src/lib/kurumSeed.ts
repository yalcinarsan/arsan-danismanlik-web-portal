// "Son kurum" otomatik-tamamlaması için TOHUM liste — Türkiye otomotivinin
// tanınan işveren adları. Aday yine dilediğini serbestçe yazabilir; bu yalnızca
// öneridir. Marka-distribütör eşleştirmesi değil, kurum adı listesidir.
//
// Düzenlemek için: aşağıdaki diziye ekle/çıkar. Adaylerın gerçekten yazdıkları
// (kurum_adlari RPC) bununla birleşiyor; tekrarlar (büyük/küçük harf gözetmeden)
// ayıklanıyor, tohumdaki kanonik yazım kazanıyor.
export const KURUM_SEED: string[] = [
  // Üreticiler
  'Ford Otosan', 'Tofaş', 'Oyak Renault', 'Toyota Türkiye', 'Hyundai Assan',
  'Mercedes-Benz Türk', 'Togg', 'Honda Türkiye', 'Karsan', 'Otokar', 'Temsa',
  'BMC', 'Anadolu Isuzu',
  // Distribütör / temsilci
  'Doğuş Otomotiv', 'Borusan Otomotiv', 'Çelik Motor', 'Renault Mais',
  'Suzuki Türkiye', 'Volvo Car Türkiye', 'Doğan Trend',
  // Büyük bayi / perakende grupları
  'Otokoç Otomotiv', 'DRD', 'Çetaş', 'ASF',
  // Ticari / ağır vasıta
  'Ford Trucks', 'MAN Türkiye',
  // Yan sanayi / tedarikçi
  'Bosch', 'Continental', 'Valeo', 'Brisa', 'Farplas', 'Coşkunöz', 'Martur',
  // Yağ / akaryakıt
  'Opet', 'Castrol', 'Shell', 'Petrol Ofisi', 'BP',
  // Yeni / EV oyuncuları (2026 doğrulandı)
  'Tesla Türkiye', 'BYD Türkiye', 'MG Motor Türkiye', 'Chery Türkiye',
];

const tohumAnahtar = new Set(KURUM_SEED.map((k) => k.toLocaleLowerCase('tr')));

/** Tohum listesi + adayların yazdıkları, tekrarları ayıklanmış (tohum önce). */
export function kurumOnerileri(adaylardan: string[]): string[] {
  return [
    ...KURUM_SEED,
    ...adaylardan.filter((k) => !tohumAnahtar.has(k.toLocaleLowerCase('tr'))),
  ];
}
