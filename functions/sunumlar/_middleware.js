/**
 * /sunumlar/* altındaki her şeyi ortak bir şifreyle korur (HTTP Basic Auth).
 * Deck sayfaları ve onların görselleri aynı yol önekinde olduğu için ikisi de
 * kapsanıyor.
 *
 * KURULUM — şifre repoda durmuyor, Cloudflare'da tanımlanıyor:
 *   Cloudflare Pages → proje → Settings → Variables and Secrets →
 *   Production'a SUNUM_SIFRE adıyla bir değer ekle, sonra yeniden deploy et.
 *   Kullanıcı adı önemsiz, boş bırakılabilir; yalnızca şifre doğrulanıyor.
 *
 * DEĞİŞKEN TANIMLI DEĞİLSE KORUMA ÇALIŞMAZ (fail-open). Bilinçli bir tercih:
 * aksi hâlde değişken eklenmeden yapılan ilk deploy sunumları tamamen
 * erişilemez hâle getirirdi. Bunun bedeli şu: değişken silinirse koruma
 * sessizce kalkar. Koruma açık mı diye bakmanın yolu, gizli sekmede sunum
 * adresini açmak — şifre sorulmuyorsa değişken yok demektir.
 */

/** Şifreleri uzunluk ve içerik sızdırmayacak şekilde karşılaştırır. */
function esitMi(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

const ISTE = () =>
  new Response('Bu sayfa şifre ile korunuyor.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Arsan Danismanlik sunumlari", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

export const onRequest = async ({ request, env, next }) => {
  const sifre = env.SUNUM_SIFRE;
  if (!sifre) return next(); // yukarıdaki nota bakın

  const baslik = request.headers.get('Authorization') || '';
  if (!baslik.startsWith('Basic ')) return ISTE();

  let cozulmus;
  try {
    // atob ham bayt veriyor; tarayıcı kimlik bilgisini UTF-8 gönderdiği için
    // ayrıca çözmek gerekiyor, yoksa Türkçe karakterli şifre hiç tutmuyor.
    const ikili = atob(baslik.slice(6));
    cozulmus = new TextDecoder().decode(Uint8Array.from(ikili, (k) => k.charCodeAt(0)));
  } catch {
    return ISTE();
  }

  // Şifrenin kendisi ":" içerebilir; yalnızca ilk ikinokta ayraç sayılıyor.
  const girilen = cozulmus.slice(cozulmus.indexOf(':') + 1);
  if (!esitMi(girilen, sifre)) return ISTE();

  const yanit = await next();
  // Korumalı içerik ara sunucularda önbelleğe alınmasın.
  const yeni = new Response(yanit.body, yanit);
  yeni.headers.set('Cache-Control', 'private, no-store');
  return yeni;
};
