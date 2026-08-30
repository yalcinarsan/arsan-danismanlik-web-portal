// Site geneli sabitler — tek doğruluk kaynağı.
//
// SITE_EPOSTA daha önce 8 ayrı dosyada elle yazılıydı; adres değişince hepsi
// tek tek kırılırdı. Artık buradan tek yerden yönetilir.
//
// DİKKAT: Bu adres aynı zamanda yöneticinin (Yalçın) giriş yaptığı hesaptır ve
// veritabanındaki `adaylar` RLS politikasında da SABİT olarak geçiyor — SQL,
// bu dosyadan import edemez. Adres değişirse burayı + ilgili migration/RLS
// politikasını BİRLİKTE güncelle, yoksa yönetici erişimi sessizce kırılır.
export const SITE_EPOSTA = 'yalcinarsan@arsandanismanlik.com.tr';

// Yönetici girişi / kurum görünürlüğü kontrolü. Bugün SITE_EPOSTA ile aynı
// kimlik; ileride ayrışması gerekirse buradan ayrı bir değere alınır.
export const ADMIN_EPOSTA = SITE_EPOSTA;
