// Giriş gerektiren ekranların ortak parçası: oturum kontrolü, giriş bağlantısı
// formu, "hangi hesapla girildi" satırı, çıkış.
//
// Daha önce altı bileşende (KayitFormu, ProfilimGorunumu, KurumDemo,
// AdaylarListesi, TalepListesi, YoneticiPanel) neredeyse aynı kodla ayrı ayrı
// yazılıydı (denetim 18 Eki, bulgu 8). Giriş akışında bir şey değişecekse burada
// değişir.
import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { anlasilirHata } from '../../lib/hataMesaji';
import { inputCls, labelCls } from '../../lib/formStil';

/**
 * Sayfa açılınca açık oturum var mı bakar; giriş bağlantısından dönünce ya da
 * oturum yenilenince yeniden haber verir. Oturum her bildirildiğinde
 * `oturumVar` yeniden çağrılır.
 */
export function useOturum(oturumVar: (oturum: Session) => void, oturumYok: () => void) {
  // Abonelik bir kez kurulur; geri çağrının en güncel hâli buradan okunur.
  const geriCagri = useRef({ oturumVar, oturumYok });
  geriCagri.current = { oturumVar, oturumYok };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) geriCagri.current.oturumVar(data.session);
      else geriCagri.current.oturumYok();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) geriCagri.current.oturumVar(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
}

/** Yalnızca bu tarayıcıdaki oturumu kapatır; hesap ve veriler durur. */
export async function oturumuKapat() {
  await supabase.auth.signOut();
}

/**
 * E-posta ile giriş bağlantısı (şifresiz) isteme formu. Bağlantı aynı sayfaya
 * geri döner; dönüşte `useOturum` oturumu görür.
 */
export function GirisFormu({ aciklama, gonderildiNotu, onKontrol }: {
  aciklama: React.ReactNode;
  /** "…adresine bir giriş bağlantısı gönderdik." cümlesinden sonra gelen yönlendirme. */
  gonderildiNotu: React.ReactNode;
  /** Bağlantı gönderilmeden önceki ek kontrol (kurum görünümü: adres davetli mi).
   *  Hata metni dönerse bağlantı gönderilmez, metin formda görünür. */
  onKontrol?: (eposta: string) => Promise<string | null>;
}) {
  const [eposta, setEposta] = useState('');
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(''); setGonderiliyor(true);
    if (onKontrol) {
      const kontrolHatasi = await onKontrol(eposta);
      if (kontrolHatasi) { setGonderiliyor(false); setHata(kontrolHatasi); return; }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: eposta,
      options: { emailRedirectTo: window.location.href },
    });
    setGonderiliyor(false);
    if (error) setHata(anlasilirHata(error, 'giris'));
    else setGonderildi(true);
  }

  return (
    <div className="max-w-md">
      <p className="text-warm-600 mb-6">{aciklama}</p>
      {gonderildi ? (
        <div className="rounded-md border border-accent/40 bg-sand p-4 text-ink">
          <strong>{eposta}</strong> adresine bir giriş bağlantısı gönderdik. {gonderildiNotu}
        </div>
      ) : (
        <form onSubmit={gonder} className="space-y-4">
          <div>
            <label className={labelCls} htmlFor="giris-eposta">E-posta *</label>
            <input id="giris-eposta" type="email" required value={eposta} onChange={(e) => setEposta(e.target.value)}
              className={inputCls} placeholder="ornek@eposta.com" />
          </div>
          {hata && <p className="text-sm text-accent">{hata}</p>}
          <button type="submit" disabled={gonderiliyor}
            className="rounded-md bg-accent px-6 py-2.5 text-white font-medium disabled:opacity-60">
            {gonderiliyor ? 'Gönderiliyor…' : 'Giriş bağlantısı gönder'}
          </button>
        </form>
      )}
    </div>
  );
}

/** Yönetici sayfalarının (panel, adaylar, talepler) giriş formu. */
export function YoneticiGirisFormu() {
  return (
    <GirisFormu
      aciklama="Yönetici girişi için e-postanı gir; sana bir giriş bağlantısı yollayacağız."
      gonderildiNotu="Gelen kutunu kontrol et."
    />
  );
}

/**
 * "Şu hesapla girildi: … · Çıkış yap". Giriş gerektiren her ekranın başında durur:
 * yönetici ve test kurum pencereleri karışınca hangi hesapta olunduğu görünmüyordu
 * (canlı test, 18 Eki). `children`: sağ tarafa gelen sayfaya özgü bağlantılar.
 */
export function OturumSatiri({ eposta, onCikis, children, className = '' }: {
  eposta: string; onCikis: () => void; children?: React.ReactNode; className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-md border border-warm-border bg-sand/60 px-4 py-2.5 text-sm ${className}`}>
      <p className="min-w-0 text-warm-600">
        Şu hesapla girildi: <strong className="font-medium text-ink break-words">{eposta}</strong>
        <span className="text-warm-400" aria-hidden="true"> · </span>
        <button type="button" onClick={onCikis} className="text-accent hover:underline">Çıkış yap</button>
      </p>
      {children && <div className="flex items-center gap-4">{children}</div>}
    </div>
  );
}

/** Yönetici sayfasına yönetici olmayan bir hesapla girilince. */
export function YoneticiYetkisiz({ hata, oturumEpostasi, onCikis }: {
  hata: string; oturumEpostasi: string; onCikis: () => void;
}) {
  return (
    <div className="rounded-lg border border-warm-border bg-sand p-8">
      <h2 className="text-xl font-semibold text-ink mb-2">Bu sayfa yalnızca yönetici içindir.</h2>
      <p className="text-warm-600">{hata || 'Bu e-posta ile erişim yetkin yok.'}</p>
      {oturumEpostasi && (
        <p className="text-warm-600 mt-3 text-sm">
          Şu anda <strong>{oturumEpostasi}</strong> hesabıyla giriş yapılmış. Yönetici hesabıyla girmek için çıkış yap.
        </p>
      )}
      <button type="button" onClick={onCikis}
        className="mt-5 rounded-md bg-accent px-5 py-2 text-sm text-white font-medium">
        Çıkış yap ve yönetici hesabıyla gir
      </button>
    </div>
  );
}
