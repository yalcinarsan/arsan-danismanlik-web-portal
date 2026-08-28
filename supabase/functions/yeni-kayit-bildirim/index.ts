// Supabase Database Webhook hedefi. İki tabloyu dinler:
//  - adaylar          → yeni kayıt bildirimi (Yalçın'a)
//  - temas_talepleri  → abone kurumdan gelen temas talebi bildirimi (Yalçın'a)
// Webhook payload şekli: { type, table, record, old_record }

Deno.serve(async (req) => {
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json();
  const kayit = payload.record ?? {};
  const table = payload.table ?? '';

  let subject: string;
  let html: string;

  if (table === 'temas_talepleri') {
    const kurum = kayit.kurum || kayit.kurum_eposta || 'Bir kurum';
    subject = `Temas talebi: ${kurum}`;
    html = [
      `<p><strong>${kurum}</strong> bir aday için <strong>temas talebi</strong> gönderdi.</p>`,
      `<p>Kurum e-posta: ${kayit.kurum_eposta ?? ''}<br>Aday ID: ${kayit.aday_id ?? ''}${kayit.aciklama ? `<br>Not: ${kayit.aciklama}` : ''}</p>`,
      `<p><a href="https://supabase.com/dashboard/project/wwpkgwndgephkuwpnjov/editor">temas_talepleri tablosunu aç</a></p>`,
    ].join('\n');
  } else {
    const ad = kayit.ad ?? '(isimsiz)';
    const eposta = kayit.eposta ?? '';
    const sehir = kayit.sehir ?? '';
    const sonPozisyon = kayit.son_pozisyon ?? '';
    subject = `Yeni kayıt: ${ad}`;
    html = [
      `<p><strong>${ad}</strong> Otomotiv İnsanı'na kayıt oldu.</p>`,
      `<p>E-posta: ${eposta}${sehir ? `<br>Şehir: ${sehir}` : ''}${sonPozisyon ? `<br>Son pozisyon: ${sonPozisyon}` : ''}</p>`,
      `<p><a href="https://supabase.com/dashboard/project/wwpkgwndgephkuwpnjov/editor">Supabase'de adaylar tablosunu aç</a></p>`,
    ].join('\n');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Otomotiv İnsanı <bildirim@arsandanismanlik.com.tr>',
      to: 'yalcinarsan@arsandanismanlik.com.tr',
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error('Resend hata:', await res.text());
    return new Response('Resend error', { status: 502 });
  }

  return new Response('ok', { status: 200 });
});
