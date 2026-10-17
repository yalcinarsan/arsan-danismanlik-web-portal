// Kabul edilmiş bir temas talebi için sıcak tanıştırma e-postası taslağı.
// Metin, Yalçın'ın elle gönderdiği son tanıştırmanın aynısı (17 Eki 2026, Çetaş ↔ Yusuf İmur).
// Gönderim yapmaz: talepler ekranındaki düğme bu taslakla e-posta programını açar (mailto),
// son sözü Yalçın verir. Ek (özgeçmiş) mailto ile eklenemez, gerekiyorsa elle eklenir.
//
// Yalçın (17 Eki): düğme kullandığı e-posta programında taslak açar, son kullandığı metinle;
// aday tam adıyla anılır (hangi adı kullandığı ve Bey/Hanım sistemde bilinmiyor); kurum
// yetkilisinin unvanı "abone kurum hesapları netleştikçe sistemik olarak kaydedilecek".
// O güne kadar yetkilinin adı ve unvanı taslakta köşeli parantezli boşluk olarak gelir.

export type TanistirmaGirdisi = {
  kurum: string | null;
  kurum_eposta: string;
  aday_ad: string | null;
  aday_eposta: string | null;
  aday_telefon: string | null;
};

const UNLULER = 'aeıioöuü';

/** "AHMET yusuf imur" → "Ahmet Yusuf İmur" (Türkçe büyük/küçük harf kurallarıyla). */
export function adDuzelt(ad: string): string {
  return ad
    .trim()
    .split(/\s+/)
    .map((k) => k.charAt(0).toLocaleUpperCase('tr') + k.slice(1).toLocaleLowerCase('tr'))
    .join(' ');
}

function sonUnlu(kelime: string): string {
  const k = kelime.toLocaleLowerCase('tr');
  for (let i = k.length - 1; i >= 0; i--) if (UNLULER.includes(k[i])) return k[i];
  return 'e';
}

/** İlgi eki, kesme işaretiyle: İmur'un, Özmen'in, Kan'ın, Köse'nin. */
export function ilgiEki(ad: string): string {
  const u = sonUnlu(ad);
  const unlu = 'aı'.includes(u) ? 'ı' : 'ei'.includes(u) ? 'i' : 'ou'.includes(u) ? 'u' : 'ü';
  const sonHarf = ad.slice(-1).toLocaleLowerCase('tr');
  return `${ad}'${UNLULER.includes(sonHarf) ? 'n' : ''}${unlu}n`;
}

/** Bağlaç "da/de": İmur da, Özmen de. */
export function daDe(ad: string): string {
  return `${ad} ${'aıou'.includes(sonUnlu(ad)) ? 'da' : 'de'}`;
}

/** 5XXXXXXXXX → 05XXXXXXXXX; diğer biçimler olduğu gibi. */
export function telefonDuzelt(tel: string | null): string | null {
  if (!tel) return null;
  const t = tel.replace(/\s+/g, '');
  return /^5\d{9}$/.test(t) ? `0${t}` : t;
}

export function tanistirmaTaslagi(t: TanistirmaGirdisi): { kime: string[]; konu: string; govde: string } {
  const aday = adDuzelt(t.aday_ad ?? 'Aday');
  const kurum = t.kurum ?? '[kurum]';
  const tel = telefonDuzelt(t.aday_telefon);
  const govde = [
    `Merhaba [Yetkili adı] Hanım/Bey & ${aday}; sizi Otomotiv İnsanı üzerinden tanıştırmak isterim.`,
    ``,
    `[Yetkili adı] Hanım/Bey, ${kurum} [unvan]. Yetenek havuzumuzda ${ilgiEki(aday)} profiliyle ilgilendi ve görüşmek istedi; ${daDe(aday)} görüşmeye açık olduğunu belirtti.`,
    ``,
    `Buradan sonrasını size bırakıyorum; uygun bir zamanda doğrudan görüşebilirsiniz. İletişim bilgileri:`,
    ``,
    `• ${[aday, t.aday_eposta, tel].filter(Boolean).join(' · ')}`,
    `• [Yetkili adı soyadı] · ${t.kurum_eposta}`,
    ``,
    `Sürecin ilerleyen bölümlerinde faydam dokunacağını düşündüğünüz bir nokta olursa çekinmeden yazın lütfen. İyi görüşmeler dilerim.`,
  ].join('\r\n');
  return {
    kime: [t.kurum_eposta, t.aday_eposta].filter((x): x is string => !!x),
    konu: `Tanışma — ${kurum} & ${aday}`,
    govde,
  };
}

export function tanistirmaMailto(t: TanistirmaGirdisi): string {
  const { kime, konu, govde } = tanistirmaTaslagi(t);
  return `mailto:${kime.join(',')}?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(govde)}`;
}
