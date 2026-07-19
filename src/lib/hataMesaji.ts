/**
 * Supabase/ağ hatalarını adayın anlayabileceği Türkçe mesajlara çevirir.
 *
 * Neden gerekli: ham hatalar ya İngilizce teknik metin ya da (SMTP el sıkışması
 * başarısız olduğunda olduğu gibi) boş gövde oluyor — o durumda ekrana "{}" gibi
 * anlamsız bir şey düşüyordu. Aday hiçbir zaman ham hata görmemeli.
 */

const DESTEK_EPOSTA = 'yalcinarsan@arsandanismanlik.com.tr';

/** Ham hatayı okunabilir bir metne indirger; boş/anlamsızsa null döner. */
function hamMetin(hata: unknown): string | null {
  if (!hata) return null;
  if (typeof hata === 'string') return hata.trim() || null;
  const m = (hata as { message?: unknown }).message;
  if (typeof m === 'string' && m.trim() && m.trim() !== '{}') return m.trim();
  return null;
}

export function anlasilirHata(hata: unknown, baglam: 'giris' | 'kayit' | 'silme' = 'kayit'): string {
  // Ham hatayı konsola bırakıyoruz: kullanıcı görmesin ama teşhis mümkün olsun.
  if (hata) console.error('[Otomotiv İnsanı] ham hata:', hata);

  const metin = hamMetin(hata);
  const k = (metin ?? '').toLowerCase();

  if (k.includes('for security purposes') || k.includes('only request this after')) {
    return 'Az önce bir giriş bağlantısı gönderdik. Yenisini istemek için birkaç saniye beklemen gerekiyor.';
  }
  if (k.includes('rate limit') || k.includes('too many requests') || k.includes('429')) {
    return 'Kısa sürede çok fazla deneme yapıldı. Birkaç dakika bekleyip tekrar dener misin?';
  }
  if (k.includes('invalid email') || k.includes('unable to validate email')) {
    return 'E-posta adresi geçerli görünmüyor. Yazımını kontrol eder misin?';
  }
  if (k.includes('failed to fetch') || k.includes('networkerror') || k.includes('network request failed')) {
    return 'Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dener misin?';
  }
  if (k.includes('duplicate key') || k.includes('already registered') || k.includes('already exists')) {
    return 'Bu e-posta ile zaten bir kayıt var. Giriş yaparsan mevcut profilini düzenleyebilirsin.';
  }

  // Boş gövde / tanınmayan hata: en sık sebebi e-posta gönderim altyapısı.
  if (baglam === 'giris') {
    return `Giriş bağlantısı gönderilemedi. Geçici bir aksaklık olabilir — birkaç dakika sonra tekrar dener misin? Sorun sürerse ${DESTEK_EPOSTA} adresine yazabilirsin.`;
  }
  if (baglam === 'silme') {
    return `Kayıt silinemedi. Tekrar dener misin? Sorun sürerse ${DESTEK_EPOSTA} adresine yazabilirsin.`;
  }
  return `Kaydedilemedi. Tekrar dener misin? Sorun sürerse ${DESTEK_EPOSTA} adresine yazabilirsin.`;
}
