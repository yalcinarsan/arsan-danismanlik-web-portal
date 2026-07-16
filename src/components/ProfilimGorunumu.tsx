import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  deneyimEtiket, kanalEtiket, fonksiyonEtiket, kidemEtiket,
  elektrifikasyonEtiket, calismaEtiket, aciklikEtiket, gorunurlukEtiket,
} from '../lib/adayTaksonomi';

const inputCls = 'w-full rounded-md border border-warm-border bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none';
const labelCls = 'block text-sm font-medium text-ink mb-1.5';

type Aday = {
  ad: string; eposta: string; telefon: string | null;
  deneyim_yili: string; son_pozisyon: string | null; son_kurum: string | null;
  kanal: string[]; fonksiyon: string[]; kidem: string; elektrifikasyon: string;
  markalar: string[]; diller: { dil: string }[];
  sehir: string | null; calisma_tercihi: string | null; aciklik: string | null;
  serbest_metin: string | null; gorunurluk: string; cv_path: string | null;
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

export default function ProfilimGorunumu() {
  const [durum, setDurum] = useState<'yukleniyor' | 'eposta' | 'gonderildi' | 'aranıyor' | 'bulunamadi' | 'gorunum'>('yukleniyor');
  const [eposta, setEposta] = useState('');
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [aday, setAday] = useState<Aday | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

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
    if (error) setHata(error.message);
    else setDurum('gonderildi');
  }

  if (durum === 'yukleniyor' || durum === 'aranıyor') return <p className="text-warm-500">Yükleniyor…</p>;

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
      <p className="text-sm text-warm-500 mb-6">
        Giriş: {aday.eposta} · Kayıt tarihi: {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(aday.created_at))}
      </p>
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
    </div>
  );
}
