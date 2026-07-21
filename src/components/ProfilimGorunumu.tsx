import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  deneyimEtiket, kanalEtiket, fonksiyonEtiket, kidemEtiket,
  elektrifikasyonEtiket, calismaEtiket, aciklikEtiket, gorunurlukEtiket,
} from '../lib/adayTaksonomi';
import { anlasilirHata } from '../lib/hataMesaji';

const inputCls = 'w-full rounded-md border border-warm-border bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none';
const labelCls = 'block text-sm font-medium text-ink mb-1.5';

type Aday = {
  ad: string; eposta: string; telefon: string | null;
  deneyim_yili: string; son_pozisyon: string | null; son_kurum: string | null;
  kanal: string[]; fonksiyon: string[]; kidem: string; elektrifikasyon: string;
  markalar: string[]; diller: { dil: string }[];
  sehir: string | null; calisma_tercihi: string | null; aciklik: string | null;
  sertifikalar: string | null; serbest_metin: string | null; gorunurluk: string; cv_path: string | null;
  created_at: string;
};

function Satir({ etiket, deger }: { etiket: string; deger?: string | null }) {
  if (!deger) return null;
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-warm-border">
      <dt className="text-sm text-warm-500">{etiket}</dt>
      <dd className="col-span-2 text-ink">{deger}</dd>
    </div>
  );
}

/** Silme onayı için kullanıcının yazması gereken ifade. */
const SILME_ONAY_IFADESI = 'KAYDIMI SİL';

/**
 * Onay karşılaştırması. Büyük/küçük harf ve noktalı/noktasız İ-I farkını tolere eder:
 * "SIL" ile "SİL" arasındaki fark klavye/alışkanlık kaynaklıdır, niyet eksikliği değil —
 * kişi yine de tüm ifadeyi yazmak zorunda.
 */
function onayEslesti(girilen: string) {
  const sadelestir = (s: string) => s.trim().toLocaleUpperCase('tr').replace(/İ/g, 'I');
  return sadelestir(girilen) === sadelestir(SILME_ONAY_IFADESI);
}

export default function ProfilimGorunumu() {
  const [durum, setDurum] = useState<'yukleniyor' | 'eposta' | 'gonderildi' | 'aranıyor' | 'bulunamadi' | 'gorunum' | 'silindi' | 'cikildi'>('yukleniyor');
  const [eposta, setEposta] = useState('');
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [aday, setAday] = useState<Aday | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  // Silme akışı: tehlikeli kontrol varsayılan olarak GİZLİ; açıldıktan sonra da
  // onay ifadesi birebir yazılmadan silme düğmesi etkinleşmiyor. Amaç, "okumadan
  // onayla" refleksini kırmak.
  const [silmeAcik, setSilmeAcik] = useState(false);
  const [silmeOnayi, setSilmeOnayi] = useState('');
  const [siliniyor, setSiliniyor] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) getirKayit();
      else setDurum('eposta');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) getirKayit();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function getirKayit() {
    setDurum('aranıyor');
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { setDurum('eposta'); return; }
    const { data, error } = await supabase.from('adaylar').select('*').eq('user_id', uid).maybeSingle();
    if (error || !data) { setDurum('bulunamadi'); return; }
    setAday(data as Aday);
    if (data.cv_path) {
      const { data: signed } = await supabase.storage.from('cv').createSignedUrl(data.cv_path, 60 * 10);
      if (signed) setCvUrl(signed.signedUrl);
    }
    setDurum('gorunum');
  }

  async function magicLinkGonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(''); setGonderiliyor(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: eposta,
      options: { emailRedirectTo: window.location.href },
    });
    setGonderiliyor(false);
    if (error) setHata(anlasilirHata(error, 'giris'));
    else setDurum('gonderildi');
  }

  /**
   * Yalnızca tarayıcı oturumunu kapatır — hesap ve veriler durur (silme DEĞİL).
   * Ortak/paylaşımlı cihazlarda profilin bir sonraki kişiye açık kalmaması için.
   */
  async function cikisYap() {
    await supabase.auth.signOut();
    setAday(null);
    setCvUrl(null);
    setEposta('');
    setDurum('cikildi');
  }

  /**
   * KVKK silme hakkı. Önce (varsa) CV dosyası, sonra profil satırı silinir; ardından
   * oturum kapatılır. Not: giriş hesabının kendisi (yalnızca e-posta adresini tutan
   * auth kaydı) tarayıcıdan silinemiyor — yönetici yetkisi gerekiyor.
   */
  async function kaydiSil() {
    if (!onayEslesti(silmeOnayi)) return;
    setHata(''); setSiliniyor(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (aday?.cv_path) await supabase.storage.from('cv').remove([aday.cv_path]);
    const { error } = await supabase.from('adaylar').delete().eq('user_id', uid);
    if (error) { setHata(anlasilirHata(error, 'silme')); setSiliniyor(false); return; }
    await supabase.auth.signOut();
    setSiliniyor(false);
    setDurum('silindi');
  }

  if (durum === 'yukleniyor' || durum === 'aranıyor') return <p className="text-warm-500">Yükleniyor…</p>;

  if (durum === 'cikildi')
    return (
      <div className="rounded-lg border border-warm-border bg-sand p-8">
        <h2 className="text-xl font-semibold text-ink mb-2">Çıkış yaptın.</h2>
        <p className="text-warm-600 mb-4">
          Oturumun bu tarayıcıda kapatıldı. Profilin ve bilgilerin duruyor — dilediğin
          zaman e-postanla yeniden giriş yapabilirsin.
        </p>
        <a href="/kariyer/profilim" className="text-accent hover:underline">Yeniden giriş yap</a>
      </div>
    );

  if (durum === 'silindi')
    return (
      <div className="rounded-lg border border-warm-border bg-sand p-8">
        <h2 className="text-xl font-semibold text-ink mb-2">Kaydın silindi.</h2>
        <p className="text-warm-600 mb-4">
          Profil bilgilerin havuzdan kaldırıldı ve oturumun kapatıldı. Dilediğin zaman
          yeniden kaydolabilirsin.
        </p>
        <a href="/kariyer/kayit" className="text-accent hover:underline">Yeniden kaydol</a>
      </div>
    );

  if (durum === 'eposta' || durum === 'gonderildi')
    return (
      <div className="max-w-md">
        <p className="text-warm-600 mb-6">
          Profilini görüntülemek için e-postanı gir; sana bir giriş bağlantısı yollayacağız (şifre yok).
        </p>
        {durum === 'gonderildi' ? (
          <div className="rounded-md border border-accent/40 bg-sand p-4 text-ink">
            <strong>{eposta}</strong> adresine bir giriş bağlantısı gönderdik. Gelen kutunu (ve spam'i)
            kontrol et, bağlantıya tıkla — buraya geri dönüp profilini göreceksin.
          </div>
        ) : (
          <form onSubmit={magicLinkGonder} className="space-y-4">
            <div>
              <label className={labelCls}>E-posta *</label>
              <input type="email" required value={eposta} onChange={(e) => setEposta(e.target.value)}
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

  if (durum === 'bulunamadi')
    return (
      <div className="rounded-lg border border-warm-border bg-sand p-8">
        <h2 className="text-xl font-semibold text-ink mb-2">Henüz bir kaydın yok.</h2>
        <p className="text-warm-600 mb-4">Bu e-posta ile daha önce havuza katılmamışsın.</p>
        <a href="/kariyer/kayit" className="inline-block rounded-md bg-accent px-5 py-2.5 text-white font-medium hover:opacity-90">
          Havuza katıl
        </a>
      </div>
    );

  if (!aday) return null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
        <p className="text-sm text-warm-500">
          Giriş: {aday.eposta} · Kayıt tarihi: {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(aday.created_at))}
        </p>
        <div className="flex items-baseline gap-4">
          <a href="/kariyer/kayit" className="text-sm text-accent hover:underline">Profilimi düzenle</a>
          <button type="button" onClick={cikisYap} className="text-sm text-warm-500 hover:text-ink">Çıkış yap</button>
        </div>
      </div>
      <dl>
        <Satir etiket="Ad Soyad" deger={aday.ad} />
        <Satir etiket="Telefon" deger={aday.telefon} />
        <Satir etiket="Toplam deneyim" deger={deneyimEtiket(aday.deneyim_yili)} />
        <Satir etiket="Kıdem" deger={kidemEtiket(aday.kidem)} />
        <Satir etiket="Son pozisyon" deger={aday.son_pozisyon} />
        <Satir etiket="Son kurum" deger={aday.son_kurum} />
        <Satir etiket="Kanal" deger={aday.kanal?.map(kanalEtiket).join(', ')} />
        <Satir etiket="Fonksiyon" deger={aday.fonksiyon?.map(fonksiyonEtiket).join(', ')} />
        <Satir etiket="Elektrifikasyon" deger={elektrifikasyonEtiket(aday.elektrifikasyon)} />
        <Satir etiket="Markalar" deger={aday.markalar?.join(', ')} />
        <Satir etiket="Yabancı diller" deger={aday.diller?.map((d) => d.dil).join(', ')} />
        <Satir etiket="Şehir" deger={aday.sehir} />
        <Satir etiket="Çalışma tercihi" deger={calismaEtiket(aday.calisma_tercihi)} />
        <Satir etiket="Fırsatlara açıklık" deger={aciklikEtiket(aday.aciklik)} />
        <Satir etiket="Eğitim ve sertifikalar" deger={aday.sertifikalar} />
        <Satir etiket="Seni en iyi anlatan" deger={aday.serbest_metin} />
        <Satir etiket="Görünürlük" deger={gorunurlukEtiket(aday.gorunurluk)} />
        {cvUrl && (
          <div className="grid grid-cols-3 gap-4 py-3 border-b border-warm-border">
            <dt className="text-sm text-warm-500">CV</dt>
            <dd className="col-span-2">
              <a href={cvUrl} target="_blank" rel="noopener" className="text-accent hover:underline">Görüntüle</a>
            </dd>
          </div>
        )}
      </dl>

      {/* KVKK silme hakkı. Bilinçli olarak sayfanın en altında, sessiz ve iki aşamalı:
          önce gizli, sonra yazarak onay. */}
      <div className="mt-16 pt-8 border-t border-warm-border">
        {!silmeAcik ? (
          <button
            type="button"
            onClick={() => setSilmeAcik(true)}
            className="text-sm text-warm-400 hover:text-warm-600 underline underline-offset-4"
          >
            Kaydımı silmek istiyorum
          </button>
        ) : (
          <div className="rounded-md border border-warm-border bg-sand p-5">
            <h2 className="text-base font-semibold text-ink mb-2">Kaydını silmek üzeresin</h2>
            <p className="text-sm text-warm-600 leading-relaxed mb-2">
              Profil bilgilerin ve (varsa) yüklediğin CV havuzdan kalıcı olarak silinir.
              <strong className="font-medium text-ink"> Bu işlem geri alınamaz.</strong> Dilediğin
              zaman yeniden kaydolabilirsin, ama bilgilerin sıfırdan girilir.
            </p>
            <p className="text-sm text-warm-600 leading-relaxed mb-4">
              Sadece bir süre görünmek istemiyorsan, silmek yerine{' '}
              <a href="/kariyer/kayit" className="text-accent hover:underline">görünürlük seviyeni</a>{' '}
              değiştirmeyi de düşünebilirsin.
            </p>

            <label className={labelCls}>
              Onaylamak için aşağıya <span className="font-semibold text-ink">{SILME_ONAY_IFADESI}</span> yaz
            </label>
            <input
              value={silmeOnayi}
              onChange={(e) => setSilmeOnayi(e.target.value)}
              className={`${inputCls} max-w-xs`}
              placeholder={SILME_ONAY_IFADESI}
              autoComplete="off"
            />

            {hata && <p className="mt-3 text-sm text-accent">{hata}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={kaydiSil}
                disabled={siliniyor || !onayEslesti(silmeOnayi)}
                className="rounded-md bg-red-700 px-5 py-2.5 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {siliniyor ? 'Siliniyor…' : 'Kaydımı kalıcı olarak sil'}
              </button>
              <button
                type="button"
                onClick={() => { setSilmeAcik(false); setSilmeOnayi(''); setHata(''); }}
                className="text-sm text-warm-500 hover:text-ink"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
