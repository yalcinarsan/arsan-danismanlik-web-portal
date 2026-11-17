/**
 * Sunumlara şifreli erişim (HTTP Basic Auth) — HER SUNUM AYRI.
 *
 * Koruma sunum bazında açılıp kapanıyor: hangi sunumu koruyacaksan Cloudflare'da
 * ona ait değişkeni tanımlıyorsun. Değişken yoksa o sunum açık kalır; diğerleri
 * etkilenmez.
 *
 * Değişken adı, adresteki sunum adından türüyor: tireler alt çizgi olur, harfler
 * büyür, başına SIFRE_ gelir.
 *
 *   /sunumlar/audi-dim-ankara/                 -> SIFRE_AUDI_DIM_ANKARA
 *   /sunumlar/audi-dim-egitimi/                -> SIFRE_AUDI_DIM_EGITIMI
 *   /sunumlar/audi-turkiye-elektrifikasyona-giris/
 *                                              -> SIFRE_AUDI_TURKIYE_ELEKTRIFIKASYONA_GIRIS
 *   /sunumlar/ford-otosan-mdd/                 -> SIFRE_FORD_OTOSAN_MDD
 *
 * KURULUM:
 *   Cloudflare Pages → proje → Settings → Variables and Secrets → Production'a
 *   yukarıdaki adlardan birini Secret olarak ekle, değerine şifreyi yaz, sonra
 *   Deployments'tan yeniden dağıt. Kaldırmak için değişkeni sil ve yeniden dağıt.
 *
 * Sunumun görselleri de aynı adres önekinde olduğu için aynı şifreyle korunur.
 *
 * DEĞİŞKEN TANIMLI DEĞİLSE O SUNUM AÇIKTIR (fail-open). Bilinçli tercih: aksi
 * hâlde değişken eklenmeden yapılan ilk dağıtım bütün sunumları erişilemez
 * hâle getirirdi. Bedeli, değişken silinince korumanın sessizce kalkması.
 * Kontrol etmenin yolu: gizli sekmede sunumu aç, şifre sorulmuyorsa koruma yok.
 */

/** Adresteki sunum adını ortam değişkeni adına çevirir. */
export function degiskenAdi(pathname) {
  const parcalar = pathname.split('/').filter(Boolean); // ['sunumlar', '<sunum>', ...]
  const sunum = parcalar[1];
  if (!sunum) return null;
  // Slug'lar ASCII küçük harf + tire; toUpperCase burada yerelden etkilenmiyor.
  return 'SIFRE_' + sunum.replace(/-/g, '_').toUpperCase();
}

/** Şifreleri uzunluk ve içerik sızdırmayacak şekilde karşılaştırır. */
function esitMi(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

const ISTE = (sunum) =>
  new Response('Bu sunum şifre ile korunuyor.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${sunum}", charset="UTF-8"`,
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

export const onRequest = async ({ request, env, next }) => {
  const yol = new URL(request.url).pathname;
  const anahtar = degiskenAdi(yol);
  const sifre = anahtar ? env[anahtar] : null;
  if (!sifre) return next(); // bu sunum için koruma tanımlanmamış

  const baslik = request.headers.get('Authorization') || '';
  if (!baslik.startsWith('Basic ')) return ISTE(anahtar);

  let cozulmus;
  try {
    // atob ham bayt veriyor; tarayıcı kimlik bilgisini UTF-8 gönderdiği için
    // ayrıca çözmek gerekiyor, yoksa Türkçe karakterli şifre hiç tutmuyor.
    const ikili = atob(baslik.slice(6));
    cozulmus = new TextDecoder().decode(Uint8Array.from(ikili, (k) => k.charCodeAt(0)));
  } catch {
    return ISTE(anahtar);
  }

  // Şifrenin kendisi ":" içerebilir; yalnızca ilk ikinokta ayraç sayılıyor.
  const girilen = cozulmus.slice(cozulmus.indexOf(':') + 1);
  if (!esitMi(girilen, sifre)) return ISTE(anahtar);

  const yanit = await next();
  // Korumalı içerik ara sunucularda önbelleğe alınmasın.
  const yeni = new Response(yanit.body, yanit);
  yeni.headers.set('Cache-Control', 'private, no-store');
  return yeni;
};
