// Referansın girişsiz yanıt sayfası (/kariyer/referans?token=...).
// Token, adayın "Referans talebi gönder"iyle referansa e-postada gider (temas-yanit ile aynı desen).
// Yetki tamamen sunucuda: referans_sayfa() asgari bilgiyi döner, referans_yanitla() tek seferlik yazar.
// ?token=demo: tanıtım için örnek görünüm — veritabanına hiç dokunmaz.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { referansHitap, referansKvkk, referansRiza } from '../lib/referansMetinleri';
import { anlasilirHata } from '../lib/hataMesaji';
import { SITE_EPOSTA } from '../lib/site';

const AZ = 20;
const COK = 5000;

export default function ReferansYaniti() {
  const [durum, setDurum] = useState<'yukleniyor' | 'gecersiz' | 'form' | 'gonderildi' | 'zaten'>('yukleniyor');
  const [adayAd, setAdayAd] = useState('');
  const [refAd, setRefAd] = useState('');
  const [yorum, setYorum] = useState('');
  const [riza, setRiza] = useState(false);
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const demo = token === 'demo';

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    setToken(t);
    if (!t) { setDurum('gecersiz'); return; }
    if (t === 'demo') { setAdayAd('Örnek Aday'); setRefAd(''); setDurum('form'); return; }
    supabase.rpc('referans_sayfa', { p_token: t }).then(({ data, error }) => {
      const bilgi = Array.isArray(data) ? data[0] : data;
      if (error || !bilgi) { setDurum('gecersiz'); return; }
      setAdayAd(bilgi.aday_ad ?? '');
      setRefAd(bilgi.referans_ad ?? '');
      setDurum(bilgi.yanitlandi ? 'zaten' : 'form');
    });
  }, []);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata('');
    if (yorum.trim().length < AZ) { setHata('Görüşünüz en az birkaç cümle olmalı.'); return; }
    if (!riza) { setHata('Göndermek için açık rıza kutusunu işaretlemelisiniz.'); return; }
    if (demo) { setDurum('gonderildi'); return; }
    setGonderiliyor(true);
    const { data, error } = await supabase.rpc('referans_yanitla', { p_token: token, p_yorum: yorum, p_riza: riza });
    setGonderiliyor(false);
    if (error) { setHata(anlasilirHata(error)); return; }
    if (data === 'tamam') setDurum('gonderildi');
    else if (data === 'zaten') setDurum('zaten');
    else setDurum('gecersiz');
  }

  if (durum === 'yukleniyor') return <p className="text-warm-600">Yükleniyor…</p>;

  if (durum === 'gecersiz')
    return (
      <>
        <h1 className="text-2xl font-semibold text-ink mb-3">Bağlantı geçerli değil</h1>
        <p className="text-warm-600">
          Bu bağlantı geçersiz ya da artık geçerli değil. Bir sorun olduğunu düşünüyorsanız{' '}
          <a className="text-accent underline" href={`mailto:${SITE_EPOSTA}`}>bize yazabilirsiniz</a>.
        </p>
      </>
    );

  if (durum === 'gonderildi' || durum === 'zaten')
    return (
      <>
        <h1 className="text-2xl font-semibold text-ink mb-3">
          {durum === 'gonderildi' ? 'Teşekkür ederiz' : 'Görüşünüz bize ulaşmış'}
        </h1>
        <p className="text-warm-600 leading-relaxed">
          {durum === 'gonderildi'
            ? 'Görüşünüz kaydedildi. Zaman ayırdığınız için teşekkürler.'
            : 'Bu bağlantıyla görüşünüzü daha önce göndermişsiniz. Değiştirmek isterseniz bize yazabilirsiniz.'}
        </p>
        {demo && <p className="mt-6 text-xs text-warm-400">Örnek görünüm — hiçbir şey kaydedilmedi.</p>}
      </>
    );

  const hitap = referansHitap(adayAd);
  return (
    <form onSubmit={gonder}>
      {refAd && <p className="text-warm-600 mb-2">Merhaba {refAd},</p>}
      <h1 className="text-2xl font-semibold text-ink mb-4">{hitap.baslik}</h1>
      {hitap.paragraflar.map((p) => (
        <p key={p} className="text-warm-600 leading-relaxed mb-3">{p}</p>
      ))}

      <label htmlFor="yorum" className="block text-sm font-medium text-ink mt-6 mb-1.5">Görüşünüz</label>
      <textarea id="yorum" rows={10} maxLength={COK} value={yorum} onChange={(e) => setYorum(e.target.value)}
        className="w-full rounded-md border border-warm-border bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none" />
      <p className="mt-1 text-xs text-warm-400 text-right">{yorum.length} / {COK}</p>

      <p className="mt-4 text-xs text-warm-500 leading-relaxed">{referansKvkk(adayAd)}</p>

      <label className="mt-4 flex items-start gap-2 text-sm text-warm-700">
        <input type="checkbox" checked={riza} onChange={(e) => setRiza(e.target.checked)} className="mt-1 accent-accent" />
        <span>{referansRiza(adayAd)}</span>
      </label>

      {hata && <p className="mt-4 text-sm text-accent">{hata}</p>}

      <button type="submit" disabled={gonderiliyor || !riza}
        className="mt-6 rounded-md bg-accent px-6 py-2.5 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed">
        {gonderiliyor ? 'Gönderiliyor…' : 'Görüşümü gönder'}
      </button>
      {demo && <p className="mt-6 text-xs text-warm-400">Örnek görünüm — gerçek bir aday ya da talep içermez, hiçbir şey kaydedilmez.</p>}
    </form>
  );
}
