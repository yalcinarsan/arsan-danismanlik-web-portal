// Aday taksonomisi: veritabanı enum değeri -> Türkçe etiket eşlemesi.
// KayitFormu.tsx ve ProfilimGorunumu.tsx bu listeleri paylaşır.

export const DENEYIM = [['0-3', '0-3 yıl'], ['4-7', '4-7 yıl'], ['8-15', '8-15 yıl'], ['15+', '15+ yıl']];
export const KANAL = [['oem', 'OEM / Ana marka'], ['distributor', 'Distribütör'], ['bayi', 'Bayi'], ['yan_sanayi', 'Yan sanayi'], ['diger', 'Diğer']];
export const FONKSIYON = [
  ['satis', 'Satış'], ['satis_sonrasi', 'Satış sonrası'], ['pazarlama_iletisim', 'Pazarlama & iletişim'],
  ['urun_planlama', 'Ürün & planlama'], ['finans', 'Finans'], ['ik', 'İK'],
  ['dijital_yazilim', 'Dijital & yazılım'], ['genel_yonetim', 'Genel yönetim'],
];
export const KIDEM = [['uzman', 'Uzman'], ['orta_kademe', 'Orta kademe'], ['ust_duzey', 'Üst düzey'], ['direktor_plus', 'Direktör ve üzeri']];
export const ELEKTRIFIKASYON = [
  ['ev_deneyimim_var', 'Elektrifikasyon deneyimim var'],
  ['gecmek_istiyorum', 'Bu alana geçmek istiyorum'],
  ['degerlendiriyorum', 'Değerlendiriyorum'],
];
export const CALISMA = [['ofis', 'Ofis'], ['hibrit', 'Hibrit'], ['uzaktan', 'Uzaktan'], ['farketmez', 'Farketmez']];
export const ACIKLIK = [['aktif_ariyorum', 'Aktif arıyorum'], ['acigim', 'Açığım'], ['sadece_ozel_firsat', 'Sadece özel fırsat']];
export const GORUNURLUK: [string, string, string][] = [
  ['acik', 'Açık', 'Adın ve iletişimin işverene görünür.'],
  ['tek_kor', 'Tek Taraf Kör', 'Sen anonimsin; işveren seni yetkinliklerinle görür, kimliğin gizli.'],
  ['cift_kor', 'Çift Taraf Kör', 'Hem sen hem işveren anonim; kimlikler ancak iki taraf da isteyince açılır.'],
];

function etiketle(liste: (readonly string[])[], deger: string | null | undefined): string {
  return liste.find(([v]) => v === deger)?.[1] ?? deger ?? '—';
}

export function deneyimEtiket(v?: string | null) { return etiketle(DENEYIM, v); }
export function kanalEtiket(v?: string | null) { return etiketle(KANAL, v); }
export function fonksiyonEtiket(v?: string | null) { return etiketle(FONKSIYON, v); }
export function kidemEtiket(v?: string | null) { return etiketle(KIDEM, v); }
export function elektrifikasyonEtiket(v?: string | null) { return etiketle(ELEKTRIFIKASYON, v); }
export function calismaEtiket(v?: string | null) { return etiketle(CALISMA, v); }
export function aciklikEtiket(v?: string | null) { return etiketle(ACIKLIK, v); }
export function gorunurlukEtiket(v?: string | null) {
  return GORUNURLUK.find(([val]) => val === v)?.[1] ?? v ?? '—';
}
