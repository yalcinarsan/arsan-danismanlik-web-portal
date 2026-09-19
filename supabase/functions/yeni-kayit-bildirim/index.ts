// Supabase Database Webhook hedefi. İki tabloyu dinler:
//  - adaylar          → yeni kayıt bildirimi (Yalçın'a)
//  - temas_talepleri  → (a) Yalçın'a bildirim (/talepler'e bağlanır),
//                       (b) ADAYA otomatik onay linki (girişsiz Kabul/Ret)
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

const BILDIRIM = 'Otomotiv İnsanı <bildirim@arsandanismanlik.com.tr>';
const YONETICI = 'yalcinarsan@arsandanismanlik.com.tr';

Deno.serve(async (req) => {
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json();
  const kayit = payload.record ?? {};
  const table = payload.table ?? '';

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
      const ilkAd = esc(String(payload.aday_ad ?? '').trim().split(' ')[0]);
      const selam = ilkAd ? `Merhaba ${ilkAd},` : 'Merhaba,';
      const link = `${SITE}/kariyer/temas-yanit?token=${encodeURIComponent(token)}`;
      await resendGonder(BILDIRIM, adayEposta, 'Bir kurum seninle görüşmek istiyor', [
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
