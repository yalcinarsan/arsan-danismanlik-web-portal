// Abone kurumlara giden "yeni katılım" e-postalarının metni. Saf TypeScript, Deno'ya özgü
// hiçbir şey yok: e-posta fonksiyonu kullanır, test/önizleme betiği Node'da da çalıştırabilir.
//
// İçerik kuralı (25 Eki 2026, Yalçın): aday adı vs. görünmez; yalnızca kurum ekranındaki
// kartta zaten görünen nitelikler (kıdem, fonksiyon, kanal, deneyim, bölge), katılım tarihi
// ve kurum ekranına bağlantı. Metin Yalçın'ın 26 Eki revizyonu.
import { deneyimEtiket, fonksiyonEtiket, kanalEtiket, kidemEtiket } from './adayTaksonomi.ts';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Veritabanının gönderdiği maskeli özet (public.kurum_aday_ozeti). */
export type AdayOzeti = {
  id: string; kidem: string | null; fonksiyon: string[] | null; kanal: string[] | null;
  deneyim_yili: string | null; bolge: string | null; katilim: string | null;
};

/** Alıcı kurum: hitap (ör. "Esra Hanım", yoksa "Merhaba,") ve kendi ekranında görünen profil sayısı. */
export type KurumAlici = { eposta: string; kurum: string; hitap?: string | null; havuz?: number | null };

const KURUM_SAYFASI = '/kariyer/kurum-demo';

/** Kurum ekranındaki kapalı-profil kartıyla aynı iki satır (src/components/KurumDemo.tsx). */
export function adaySatirlari(a: AdayOzeti): { baslik: string; alt: string } {
  return {
    baslik: [kidemEtiket(a.kidem), (a.fonksiyon ?? []).map(fonksiyonEtiket).join(' · ')].filter(Boolean).join(' · '),
    alt: [(a.kanal ?? []).map(kanalEtiket).join(', '), deneyimEtiket(a.deneyim_yili), a.bolge]
      .filter((x) => x && x !== '—').join(' · '),
  };
}

// "25 Ekim'de" — ay adına göre bulunma eki.
const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const AY_EK = ["'ta", "'ta", "'ta", "'da", "'ta", "'da", "'da", "'ta", "'de", "'de", "'da", "'ta"];
function tarihParcalari(iso: string | null): { gun: number; ay: number } | null {
  if (!iso) return null;
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'numeric' })
    .formatToParts(new Date(iso));
  const deger = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { gun: deger('day'), ay: deger('month') - 1 };
}
export function tarihte(iso: string | null): string {
  const t = tarihParcalari(iso);
  return t ? `${t.gun} ${AY[t.ay]}${AY_EK[t.ay]}` : '';
}
function tarih(iso: string | null): string {
  const t = tarihParcalari(iso);
  return t ? `${t.gun} ${AY[t.ay]}` : '';
}

const selam = (k: KurumAlici) => `<p>Merhaba${k.hitap ? ' ' + esc(k.hitap) : ''},</p>`;
const IMZA = '<p>Yalçın Arsan<br>Otomotiv İnsanı · Arsan Danışmanlık</p>';
const havuzCumlesi = (k: KurumAlici) =>
  `Otomotiv İnsanı yetenek havuzumuzda şu anda kayıtlı ${k.havuz ?? ''} profil bulunmaktadır.`;

/** Yeni kayıt anında, adayı görebilen her abone kuruma. */
export function yeniKatilimEpostasi(site: string, k: KurumAlici, a: AdayOzeti): { konu: string; html: string } {
  const { baslik, alt } = adaySatirlari(a);
  const link = `${site}${KURUM_SAYFASI}?aday=${encodeURIComponent(a.id)}`;
  const ne = a.katilim ? `${tarihte(a.katilim)} katılan son adayın` : 'Son katılan adayın';
  return {
    konu: "Otomotiv İnsanı'na yeni katılım",
    html: [
      selam(k),
      '<p>Otomotiv İnsanı projemizin kurumsal kullanıcıları, sisteme yeni bir aday katıldığında bildirim e-postası alıyorlar. ' +
        'Eğer bu bildirimi kapatmak isterseniz bu mesaja "Yeni katılım bildirimi almak istemiyorum" şeklinde yanıt verebilirsiniz.</p>',
      `<p>${havuzCumlesi(k)} ${ne} temel profili aşağıdaki gibi:</p>`,
      `<p><strong>${esc(baslik)}</strong><br>${esc(alt)}</p>`,
      `<p><a href="${link}">Profili kurum ekranında gör</a></p>`,
      IMZA,
    ].join('\n'),
  };
}

/** Haftada bir, son yedi günde katılan ve kurumun görebildiği profillerin özeti. */
export function haftalikOzetEpostasi(site: string, k: KurumAlici, adaylar: AdayOzeti[]): { konu: string; html: string } {
  const n = adaylar.length;
  const satirlar = adaylar.map((a) => {
    const { baslik, alt } = adaySatirlari(a);
    const link = `${site}${KURUM_SAYFASI}?aday=${encodeURIComponent(a.id)}`;
    const gun = a.katilim ? `${tarih(a.katilim)} · ` : '';
    return `<li style="margin-bottom:10px"><strong>${esc(baslik)}</strong><br>${esc(gun + alt)} · <a href="${link}">Gör</a></li>`;
  });
  return {
    konu: `Otomotiv İnsanı'na bu hafta ${n} yeni katılım`,
    html: [
      selam(k),
      '<p>Otomotiv İnsanı projemizin kurumsal kullanıcıları, her hafta havuza yeni katılan adayların özetini alıyorlar. ' +
        'Eğer bu özeti kapatmak isterseniz bu mesaja "Haftalık özet almak istemiyorum" şeklinde yanıt verebilirsiniz.</p>',
      `<p>${havuzCumlesi(k)} Son yedi günde katılan ${n} adayın temel profili aşağıdaki gibi:</p>`,
      `<ul style="padding-left:18px">${satirlar.join('')}</ul>`,
      `<p><a href="${site}${KURUM_SAYFASI}">Kurum ekranını aç</a></p>`,
      IMZA,
    ].join('\n'),
  };
}
