// Kurum tarafına gösterilecek aday profilinin maskelenmesi.
//
// Neden ayrı dosya: maskeleme, ürünün gizlilik vaadinin teknik karşılığı.
// Kurum demo ekranı bugün bunu kullanıyor; Faz 2'de gerçek kurum arayüzü de
// aynı fonksiyonu kullanacak. Kural tek yerde dursun ki iki yerde ayrışmasın.
//
// Temel tehlike (2026-08-02 tasarım kararı): ismi gizlemek YETMEZ.
// `son_kurum` + `son_pozisyon` + `şehir` üçlüsü, herkesin birbirini tanıdığı
// bir sektörde kimliği tek başına ele verir. Gerçek örnek: "Genel Müdür" +
// "OneIngage" + "İstanbul" — küçük şirkette tek kişidir, saniyede bulunur.
// Bu yüzden kapalı profillerde bu üçlü ham hâliyle hiç gösterilmez;
// yapılandırılmış (ve tek başına kimliğe götürmeyen) karşılıkları gösterilir:
// kurum yerine kanal tipi, serbest-metin pozisyon yerine kıdem + fonksiyon,
// şehir yerine bölge.

export type MaskeMod =
  /** Demo/tanıtım: kurum henüz abone değil, hiçbir şey imzalamadı — herkes maskeli. */
  | 'demo'
  /** Faz 2 gerçek kurum görünümü: adayın kendi görünürlük tercihine uyulur. */
  | 'abone';

/** Şehir -> coğrafi bölge. Kapalı profillerde şehir yerine bu gösterilir. */
const BOLGELER: Record<string, string[]> = {
  Marmara: ['İstanbul', 'Kocaeli', 'Bursa', 'Balıkesir', 'Çanakkale', 'Edirne', 'Kırklareli', 'Tekirdağ', 'Yalova', 'Sakarya', 'Bilecik'],
  Ege: ['İzmir', 'Aydın', 'Denizli', 'Muğla', 'Manisa', 'Afyonkarahisar', 'Kütahya', 'Uşak'],
  'İç Anadolu': ['Ankara', 'Konya', 'Kayseri', 'Eskişehir', 'Sivas', 'Yozgat', 'Aksaray', 'Karaman', 'Kırıkkale', 'Kırşehir', 'Nevşehir', 'Niğde', 'Çankırı'],
  Akdeniz: ['Antalya', 'Adana', 'Mersin', 'Hatay', 'Isparta', 'Burdur', 'Kahramanmaraş', 'Osmaniye'],
  Karadeniz: ['Samsun', 'Trabzon', 'Ordu', 'Rize', 'Giresun', 'Zonguldak', 'Bolu', 'Düzce', 'Kastamonu', 'Sinop', 'Amasya', 'Çorum', 'Tokat', 'Bartın', 'Karabük', 'Artvin', 'Gümüşhane', 'Bayburt'],
  'Doğu Anadolu': ['Erzurum', 'Van', 'Malatya', 'Elazığ', 'Erzincan', 'Ağrı', 'Kars', 'Ardahan', 'Iğdır', 'Bingöl', 'Bitlis', 'Hakkari', 'Muş', 'Tunceli'],
  'Güneydoğu Anadolu': ['Gaziantep', 'Şanlıurfa', 'Diyarbakır', 'Mardin', 'Batman', 'Siirt', 'Şırnak', 'Adıyaman', 'Kilis'],
};

export function bolge(sehir?: string | null): string {
  if (!sehir) return '—';
  if (sehir === 'Yurt dışı') return 'Yurt dışı';
  for (const [ad, iller] of Object.entries(BOLGELER)) {
    if (iller.includes(sehir)) return ad;
  }
  return 'Türkiye';
}

/** maskele()'nin ihtiyaç duyduğu alanlar — tam `Aday` tipine bağımlı olmasın diye dar tutuldu. */
export type MaskelenebilirAday = {
  id: string;
  gorunurluk: string;
  ad?: string | null;
  son_pozisyon?: string | null;
  son_kurum?: string | null;
  sehir?: string | null;
  sertifikalar?: string | null;
  serbest_metin?: string | null;
  cv_path?: string | null;
};

export type MaskeliAday = {
  id: string;
  /** Kapalı profilde null — kurum ismi görmez. */
  ad: string | null;
  /** Kapalı profilde null; arayüz yerine kıdem + fonksiyon gösterir. */
  son_pozisyon: string | null;
  /** Kapalı profilde null; arayüz yerine kanal tipini gösterir. */
  son_kurum: string | null;
  /** Kapalı profilde il değil bölge. */
  konum: string;
  /** Serbest metin alanları kimlik sızdırabilir; kapalıda yalnızca "var mı" bilgisi kalır. */
  sertifika_var: boolean;
  sertifikalar: string | null;
  serbest_metin: string | null;
  cv_erisilebilir: boolean;
  /** Kimlik gizli mi — arayüzdeki rozet ve temas akışı buna bakar. */
  kimlik_gizli: boolean;
};

/**
 * `mod: 'demo'` — herkes maskelenir, adayın kendi tercihine bakılmaz.
 * Kasıtlı: demo, henüz abone olmamış / hiçbir şey imzalamamış bir kuruma
 * gösteriliyor. Açık profil seçen aday da kimliğinin rastgele bir şirkete
 * değil, gerçek bir işveren temasında açılmasını bekliyor.
 *
 * `mod: 'abone'` — adayın kendi tercihi uygulanır (açık profil açık görünür).
 * Faz 2'de kullanılacak; iletişim bilgisi (e-posta/telefon) bu modda dahi
 * gösterilmez, temas her hâlükârda aracı üzerinden yürür.
 */
export function maskele(aday: MaskelenebilirAday, mod: MaskeMod): MaskeliAday {
  const gizli = mod === 'demo' || aday.gorunurluk !== 'acik';

  if (gizli) {
    return {
      id: aday.id,
      ad: null,
      son_pozisyon: null,
      son_kurum: null,
      konum: bolge(aday.sehir),
      sertifika_var: !!aday.sertifikalar?.trim(),
      sertifikalar: null,
      serbest_metin: null,
      cv_erisilebilir: false,
      kimlik_gizli: true,
    };
  }

  return {
    id: aday.id,
    ad: aday.ad ?? null,
    son_pozisyon: aday.son_pozisyon ?? null,
    son_kurum: aday.son_kurum ?? null,
    konum: aday.sehir ?? '—',
    sertifika_var: !!aday.sertifikalar?.trim(),
    sertifikalar: aday.sertifikalar ?? null,
    serbest_metin: aday.serbest_metin ?? null,
    cv_erisilebilir: !!aday.cv_path,
    kimlik_gizli: false,
  };
}
