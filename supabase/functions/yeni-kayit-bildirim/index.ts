// Supabase Database Webhook hedefi. Üç tabloyu dinler:
//  - adaylar          → yeni kayıt bildirimi (Yalçın'a)
//  - temas_talepleri  → (a) Yalçın'a bildirim (/talepler'e bağlanır),
//                       (b) ADAYA otomatik onay linki (girişsiz Kabul/Ret)
//  - referanslar      → aday "Referans talebi gönder"e basınca REFERANSA kişiye özel link
//                       (payload: { type: 'REFERANS_TALEBI', record: {ad, eposta, token}, aday_ad })
//
// Payload: { type, table, record, aday_eposta?, aday_ad? }
// aday_eposta / aday_ad yalnızca temas_talepleri trigger'ında doldurulur
// (temas_talebi_bildirim_webhook, adaylar'dan join ederek ekler).

const SITE = 'https://arsandanismanlik.com.tr';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

async function resendGonder(from: string, to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) console.error('Resend hata:', to, await res.text());
  return res.ok;
}

/** "AHMET yusuf imur" → "Ahmet Yusuf İmur" (src/lib/tanistirma.ts adDuzelt ile aynı). */
const adDuzelt = (ad: string) => ad.trim().split(/\s+/).filter(Boolean)
  .map((k) => k.charAt(0).toLocaleUpperCase('tr') + k.slice(1).toLocaleLowerCase('tr')).join(' ');

const BILDIRIM = 'Otomotiv İnsanı <bildirim@arsandanismanlik.com.tr>';
// Adaya giden temas e-postası, tanıdıkları (hoşgeldin'i de alan) kişisel
// gönderenden çıkar — "bildirim@" + spam-kokan konu junk'a düşüyordu.
const YALCIN = 'Yalçın Arsan <yalcinarsan@arsandanismanlik.com.tr>';
const YONETICI = 'yalcinarsan@arsandanismanlik.com.tr';

Deno.serve(async (req) => {
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json();
  const kayit = payload.record ?? {};
  const table = payload.table ?? '';

  if (table === 'referanslar') {
    // Metin TASLAK: cikti/taslaklar/referans-islevi-tasarim.md — yayından önce Yalçın'la gözden geçirilecek.
    const refEposta = kayit.eposta;
    const token = kayit.token;
    if (!refEposta || !token) return new Response('eksik alan', { status: 400 });
    const adayDuz = adDuzelt(String(payload.aday_ad ?? '')) || 'Bir aday';
    const aday = esc(adayDuz);
    const refAd = esc(String(kayit.ad ?? '').trim());
    const link = `${SITE}/kariyer/referans?token=${encodeURIComponent(token)}`;
    await resendGonder(YALCIN, refEposta, `${adayDuz} sizi referans olarak gösterdi`, [
      `<p>Merhaba ${refAd},</p>`,
      `<p>${aday}, Otomotiv İnsanı'ndaki profilinde sizi referans olarak gösterdi ve iletişim bilgilerinizi bizimle paylaştı.</p>`,
      `<p>Kendisini tanıyan biri olarak görüşlerinizi birkaç cümleyle paylaşırsanız çok seviniriz: <a href="${link}">Görüşümü yaz</a></p>`,
      `<p>Bu bağlantı yalnızca size özel. Yazmak istemezseniz bir şey yapmanıza gerek yok; bilgileriniz başka bir amaçla kullanılmaz. Kişisel verilerinizle ilgili ayrıntı: <a href="${SITE}/kvkk">arsandanismanlik.com.tr/kvkk</a></p>`,
      `<p>Yalçın Arsan<br>Otomotiv İnsanı · Arsan Danışmanlık</p>`,
    ].join('\n'));
    return new Response('ok', { status: 200 });
  }

  if (table === 'temas_talepleri') {
    const kurum = esc(kayit.kurum || kayit.kurum_eposta || 'Bir kurum');

    // (a) Yalçın'a bildirim — takip/yönetim için /talepler'e bağlanır.
    await resendGonder(BILDIRIM, YONETICI, `Temas talebi: ${kurum}`, [
      `<p><strong>${kurum}</strong> bir aday için <strong>temas talebi</strong> gönderdi.</p>`,
      `<p>Kurum e-posta: ${esc(kayit.kurum_eposta)}${kayit.aciklama ? `<br>Not: ${esc(kayit.aciklama)}` : ''}</p>`,
      `<p><a href="${SITE}/kariyer/talepler">Talepleri aç ve yönet</a></p>`,
    ].join('\n'));

    // (b) Adaya otomatik onay linki — girişsiz, token'lı.
    const adayEposta = payload.aday_eposta;
    const token = kayit.yanit_token;
    if (adayEposta && token) {
      // Referans e-postasındaki gibi düzeltilmiş ad: "deneme" → "Deneme" (denetim 18 Eki, bulgu 10).
      const adRaw = adDuzelt(String(payload.aday_ad ?? '')).split(' ')[0];
      const ilkAd = esc(adRaw);
      const selam = ilkAd ? `Merhaba ${ilkAd},` : 'Merhaba,';
      const konu = adRaw
        ? `${adRaw}, Otomotiv İnsanı'nda bir görüşme talebin var`
        : "Otomotiv İnsanı'nda bir görüşme talebin var";
      const link = `${SITE}/kariyer/temas-yanit?token=${encodeURIComponent(token)}`;
      await resendGonder(YALCIN, adayEposta, konu, [
        `<p>${selam}</p>`,
        `<p>Otomotiv İnsanı havuzundaki profilinle bir kurum ilgilendi ve seninle tanışmak istiyor. Görüşmeye açık olup olmadığını buradan bize bildirebilirsin:</p>`,
        `<p><a href="${link}">Görüşme talebini gör ve yanıtla</a></p>`,
        `<p>Görüşmeye açıksan Arsan Danışmanlık seni tanıştırır; iletişim bilgin ve özgeçmişin ancak o zaman paylaşılır. İstemezsen paylaşılmaz.</p>`,
        `<p>Otomotiv İnsanı · Arsan Danışmanlık</p>`,
      ].join('\n'));
    }

    return new Response('ok', { status: 200 });
  }

  // adaylar → yeni kayıt bildirimi (Yalçın'a)
  const ad = esc(kayit.ad ?? '(isimsiz)');
  const eposta = esc(kayit.eposta);
  const sehir = esc(kayit.sehir);
  const sonPozisyon = esc(kayit.son_pozisyon);
  await resendGonder(BILDIRIM, YONETICI, `Yeni kayıt: ${ad}`, [
    `<p><strong>${ad}</strong> Otomotiv İnsanı'na kayıt oldu.</p>`,
    `<p>E-posta: ${eposta}${sehir ? `<br>Şehir: ${sehir}` : ''}${sonPozisyon ? `<br>Son pozisyon: ${sonPozisyon}` : ''}</p>`,
    `<p><a href="${SITE}/kariyer/adaylar">Adayları aç</a></p>`,
  ].join('\n'));

  return new Response('ok', { status: 200 });
});
