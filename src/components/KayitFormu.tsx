import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DENEYIM, KANAL, FONKSIYON, KIDEM, ELEKTRIFIKASYON, CALISMA, ACIKLIK, GORUNURLUK } from '../lib/adayTaksonomi';

const bos = {
  ad: '', telefon: '', deneyim_yili: '', son_pozisyon: '', son_kurum: '',
  kanal: [] as string[], fonksiyon: [] as string[], kidem: '', elektrifikasyon: '',
  markalar: '', diller: '', sehir: '', calisma_tercihi: '', aciklik: '',
  sertifikalar: '', serbest_metin: '', gorunurluk: 'tek_kor', kvkk: false,
};

const inputCls = 'w-full rounded-md border border-warm-border bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none';
const labelCls = 'block text-sm font-medium text-ink mb-1.5';

export default function KayitFormu() {
  const [durum, setDurum] = useState<'yukleniyor' | 'eposta' | 'gonderildi' | 'form' | 'basarili'>('yukleniyor');
  const [eposta, setEposta] = useState('');
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [f, setF] = useState(bos);

  // Oturum kontrolü (magic-link'ten dönünce oturum oluşur)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { setEposta(data.session.user.email ?? ''); setDurum('form'); }
      else setDurum('eposta');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setEposta(session.user.email ?? ''); setDurum('form'); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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

  function coklu(alan: 'kanal' | 'fonksiyon', deger: string) {
    setF((s) => {
      const dizi = s[alan];
      return { ...s, [alan]: dizi.includes(deger) ? dizi.filter((x) => x !== deger) : [...dizi, deger] };
    });
  }

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata('');
    if (!f.kvkk) { setHata('Devam etmek için KVKK açık rızası gerekli.'); return; }
    if (!f.ad || !f.deneyim_yili || !f.kidem || !f.elektrifikasyon || f.kanal.length === 0 || f.fonksiyon.length === 0) {
      setHata('Lütfen zorunlu alanları (*) doldur.'); return;
    }
    setGonderiliyor(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    const { error } = await supabase.from('adaylar').insert({
      user_id: uid,
      ad: f.ad, eposta, telefon: f.telefon || null,
      deneyim_yili: f.deneyim_yili, son_pozisyon: f.son_pozisyon || null, son_kurum: f.son_kurum || null,
      kanal: f.kanal, fonksiyon: f.fonksiyon, kidem: f.kidem, elektrifikasyon: f.elektrifikasyon,
      markalar: f.markalar ? f.markalar.split(',').map((x) => x.trim()).filter(Boolean) : [],
      diller: f.diller ? f.diller.split(',').map((x) => ({ dil: x.trim() })).filter((x) => x.dil) : [],
      sehir: f.sehir || null, calisma_tercihi: f.calisma_tercihi || null, aciklik: f.aciklik || null,
      sertifikalar: f.sertifikalar || null,
      serbest_metin: f.serbest_metin || null,
      gorunurluk: f.gorunurluk,
      kvkk_riza: true, kvkk_riza_tarihi: new Date().toISOString(),
    });
    setGonderiliyor(false);
    if (error) setHata(error.message);
    else setDurum('basarili');
  }

  if (durum === 'yukleniyor') return <p className="text-warm-500">Yükleniyor…</p>;

  if (durum === 'basarili')
    return (
      <div className="rounded-lg border border-warm-border bg-sand p-8 text-center">
        <h2 className="text-2xl font-semibold text-ink mb-2">Teşekkürler, kaydın alındı.</h2>
        <p className="text-warm-600">Havuza katıldın. Sana uygun bir fırsat olduğunda, belirlediğin görünürlük seviyesinde ulaşacağız.</p>
      </div>
    );

  // ---- Adım 1: e-posta ----
  if (durum === 'eposta' || durum === 'gonderildi')
    return (
      <div className="max-w-md">
        <p className="text-warm-600 mb-6">
          Başlamak için e-postanı gir; sana bir giriş bağlantısı yollayacağız (şifre yok). Bağlantıya
          tıklayınca profilini oluşturursun.
        </p>
        {durum === 'gonderildi' ? (
          <div className="rounded-md border border-accent/40 bg-sand p-4 text-ink">
            <strong>{eposta}</strong> adresine bir giriş bağlantısı gönderdik. Gelen kutunu (ve spam'i)
            kontrol et, bağlantıya tıkla — buraya geri dönüp profilini oluşturacaksın.
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

  // ---- Adım 2: profil formu ----
  return (
    <form onSubmit={kaydet} className="space-y-8">
      <p className="text-sm text-warm-500">Giriş: {eposta}</p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Ad Soyad *</label>
          <input required value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Telefon</label>
          <input value={f.telefon} onChange={(e) => setF({ ...f, telefon: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Toplam deneyim *</label>
          <select required value={f.deneyim_yili} onChange={(e) => setF({ ...f, deneyim_yili: e.target.value })} className={inputCls}>
            <option value="">Seç…</option>
            {DENEYIM.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Kıdem *</label>
          <select required value={f.kidem} onChange={(e) => setF({ ...f, kidem: e.target.value })} className={inputCls}>
            <option value="">Seç…</option>
            {KIDEM.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Son pozisyon</label>
          <input value={f.son_pozisyon} onChange={(e) => setF({ ...f, son_pozisyon: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Son kurum</label>
          <input value={f.son_kurum} onChange={(e) => setF({ ...f, son_kurum: e.target.value })} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Kanal * <span className="font-normal text-warm-500">(birden çok seçebilirsin)</span></label>
        <div className="flex flex-wrap gap-2">
          {KANAL.map(([v, l]) => (
            <button type="button" key={v} onClick={() => coklu('kanal', v)}
              className={`rounded-full border px-3 py-1.5 text-sm ${f.kanal.includes(v) ? 'border-accent bg-accent text-white' : 'border-warm-border text-warm-600'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Fonksiyon * <span className="font-normal text-warm-500">(birden çok)</span></label>
        <div className="flex flex-wrap gap-2">
          {FONKSIYON.map(([v, l]) => (
            <button type="button" key={v} onClick={() => coklu('fonksiyon', v)}
              className={`rounded-full border px-3 py-1.5 text-sm ${f.fonksiyon.includes(v) ? 'border-accent bg-accent text-white' : 'border-warm-border text-warm-600'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Elektrifikasyon karşısındaki konumun *</label>
        <div className="space-y-2">
          {ELEKTRIFIKASYON.map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 text-ink">
              <input type="radio" name="elektrifikasyon" checked={f.elektrifikasyon === v}
                onChange={() => setF({ ...f, elektrifikasyon: v })} className="accent-accent" />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Deneyimli olduğun markalar</label>
          <input value={f.markalar} onChange={(e) => setF({ ...f, markalar: e.target.value })} className={inputCls} placeholder="virgülle ayır" />
        </div>
        <div>
          <label className={labelCls}>Yabancı diller</label>
          <input value={f.diller} onChange={(e) => setF({ ...f, diller: e.target.value })} className={inputCls} placeholder="virgülle ayır" />
        </div>
        <div>
          <label className={labelCls}>Şehir</label>
          <input value={f.sehir} onChange={(e) => setF({ ...f, sehir: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Çalışma tercihi</label>
          <select value={f.calisma_tercihi} onChange={(e) => setF({ ...f, calisma_tercihi: e.target.value })} className={inputCls}>
            <option value="">Seç…</option>
            {CALISMA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Fırsatlara açıklık</label>
          <select value={f.aciklik} onChange={(e) => setF({ ...f, aciklik: e.target.value })} className={inputCls}>
            <option value="">Seç…</option>
            {ACIKLIK.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Eğitim ve sertifikalar <span className="font-normal text-warm-500">(varsa)</span></label>
        <textarea rows={3} value={f.sertifikalar} onChange={(e) => setF({ ...f, sertifikalar: e.target.value })} className={inputCls}
          placeholder="Aldığınız eğitimleri ve sahip olduğunuz sertifikaları yazabilirsiniz — marka/OEM eğitimleri, MYK belgeleri, yüksek voltaj (HV) / elektrikli araç eğitimi vb." />
      </div>

      <div>
        <label className={labelCls}>Sizi en iyi ne anlatır?</label>
        <textarea rows={4} value={f.serbest_metin} onChange={(e) => setF({ ...f, serbest_metin: e.target.value })} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Görünürlük</label>
        <div className="space-y-2">
          {GORUNURLUK.map(([v, l, aciklama]) => (
            <label key={v} className="flex gap-2 rounded-md border border-warm-border p-3 cursor-pointer has-[:checked]:border-accent">
              <input type="radio" name="gorunurluk" checked={f.gorunurluk === v}
                onChange={() => setF({ ...f, gorunurluk: v })} className="mt-1 accent-accent" />
              <span><span className="font-medium text-ink">{l}</span> <span className="text-sm text-warm-500">— {aciklama}</span></span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-warm-700">
        <input type="checkbox" checked={f.kvkk} onChange={(e) => setF({ ...f, kvkk: e.target.checked })} className="mt-1 accent-accent" />
        <span>KVKK aydınlatma metnini okudum; kişisel verilerimin bu kapsamda işlenmesine açık rıza veriyorum. *</span>
      </label>

      {hata && <p className="text-sm text-accent">{hata}</p>}

      <button type="submit" disabled={gonderiliyor}
        className="rounded-md bg-accent px-8 py-3 text-white font-medium disabled:opacity-60">
        {gonderiliyor ? 'Kaydediliyor…' : 'Havuza katıl'}
      </button>
    </form>
  );
}
