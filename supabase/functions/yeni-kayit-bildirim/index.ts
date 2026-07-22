// Supabase Database Webhook hedefi: `adaylar` tablosuna yeni satır (INSERT)
// eklendiğinde tetiklenir, Resend üzerinden Yalçın'a bildirim e-postası atar.
// Webhook payload şekli: { type, table, record, old_record }

Deno.serve(async (req) => {
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json();
  const kayit = payload.record ?? {};

  const ad = kayit.ad ?? '(isimsiz)';
  const eposta = kayit.eposta ?? '';
  const sehir = kayit.sehir ?? '';
  const sonPozisyon = kayit.son_pozisyon ?? '';

  const satirlar = [
    `<p><strong>${ad}</strong> Otomotiv İnsanı'na kayıt oldu.</p>`,
    `<p>E-posta: ${eposta}${sehir ? `<br>Şehir: ${sehir}` : ''}${sonPozisyon ? `<br>Son pozisyon: ${sonPozisyon}` : ''}</p>`,
    `<p><a href="https://supabase.com/dashboard/project/wwpkgwndgephkuwpnjov/editor">Supabase'de adaylar tablosunu aç</a></p>`,
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Otomotiv İnsanı <bildirim@send.arsandanismanlik.com.tr>',
      to: 'yalcinarsan@arsandanismanlik.com.tr',
      subject: `Yeni kayıt: ${ad}`,
      html: satirlar,
    }),
  });

  if (!res.ok) {
    console.error('Resend hata:', await res.text());
    return new Response('Resend error', { status: 502 });
  }

  return new Response('ok', { status: 200 });
});
