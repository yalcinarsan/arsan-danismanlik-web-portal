import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DENEYIM, KANAL, FONKSIYON, KIDEM, ELEKTRIFIKASYON, CALISMA, ACIKLIK, GORUNURLUK } from '../lib/adayTaksonomi';
import { anlasilirHata } from '../lib/hataMesaji';

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
  // Bu kullanıcının zaten bir kaydı var mı? Varsa form "güncelleme" moduna geçer.
  const [mevcutKayit, setMevcutKayit] = useState(false);
  // CV: seçilen yeni dosya, kayıtlı dosyanın yolu, ve "kaldır" işareti.
  const [cvDosya, setCvDosya] = useState<File | null>(null);
  const [cvMevcutYol, setCvMevcutYol] = useState<string | null>(null);
  const [cvKaldirilsin, setCvKaldirilsin] = useState(false);

  // Oturum kontrolü (magic-link'ten dönünce oturum oluşur)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) oturumHazir(data.session);
      else setDurum('eposta');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) oturumHazir(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /**
   * Oturum açılınca kullanıcının mevcut kaydını arar. Varsa formu onunla doldurup
   * güncelleme moduna geçer — aksi halde ikinci bir INSERT `user_id` unique kısıtını
   * ihlal edip kullanıcıya anlamsız bir veritabanı hatası döndürüyordu.
   */
  async function oturumHazir(session: { user: { id: string; email?: string } }) {
    setEposta(session.user.email ?? '');
    const { data } = await supabase.from('adaylar').select('*').eq('user_id', session.user.id).maybeSingle();
    if (data) {
      setMevcutKayit(true);
      setF({
        ad: data.ad ?? '', telefon: data.telefon ?? '',
        deneyim_yili: data.deneyim_yili ?? '', son_pozisyon: data.son_pozisyon ?? '', son_kurum: data.son_kurum ?? '',
        kanal: data.kanal ?? [], fonksiyon: data.fonksiyon ?? [],
        kidem: data.kidem ?? '', elektrifikasyon: data.elektrifikasyon ?? '',
        markalar: (data.markalar ?? []).join(', '),
        diller: (data.diller ?? []).map((d: { dil: string }) => d.dil).filter(Boolean).join(', '),
        sehir: data.sehir ?? '', calisma_tercihi: data.calisma_tercihi ?? '', aciklik: data.aciklik ?? '',
        sertifikalar: data.sertifikalar ?? '', serbest_metin: data.serbest_metin ?? '',
        gorunurluk: data.gorunurluk ?? 'tek_kor',
        kvkk: data.kvkk_riza ?? false,
      });
      setCvMevcutYol(data.cv_path ?? null);
    }
    setDurum('form');
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

  /** CV dosyası seçimi — boyut ve tür kontrolü burada, yükleme kaydetme anında. */
  function dosyaSecildi(dosya: File | null) {
    setHata('');
    if (!dosya) { setCvDosya(null); return; }
    const izinliUzantilar = ['pdf', 'doc', 'docx'];
    const uzanti = (dosya.name.split('.').pop() ?? '').toLowerCase();
    if (!izinliUzantilar.includes(uzanti)) {
      setHata('CV yalnızca PDF veya Word (.doc/.docx) olabilir.');
      return;
    }
    if (dosya.size > 5 * 1024 * 1024) {
      setHata('CV dosyası 5 MB\'ı aşamaz.');
      return;
    }
    setCvDosya(dosya);
    setCvKaldirilsin(false);
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

    // CV yükleme/kaldırma — satırı kaydetmeden ÖNCE yapılır ki dosya işlemi
    // başarısız olursa veritabanında yanlış bir yol kalmasın.
    let cvYol = cvMevcutYol;
    if (cvKaldirilsin && cvMevcutYol) {
      const { error: silHata } = await supabase.storage.from('cv').remove([cvMevcutYol]);
      if (silHata) { setHata(anlasilirHata(silHata)); setGonderiliyor(false); return; }
      cvYol = null;
    } else if (cvDosya) {
      const uzanti = (cvDosya.name.split('.').pop() ?? 'pdf').toLowerCase();
      const yeniYol = `${uid}/cv.${uzanti}`;
      // Uzantı değiştiyse eski dosya farklı adla kalırdı — önce onu temizle.
      if (cvMevcutYol && cvMevcutYol !== yeniYol) {
        await supabase.storage.from('cv').remove([cvMevcutYol]);
      }
      const { error: yukleHata } = await supabase.storage
        .from('cv')
        .upload(yeniYol, cvDosya, { upsert: true, contentType: cvDosya.type || undefined });
      if (yukleHata) { setHata(anlasilirHata(yukleHata)); setGonderiliyor(false); return; }
      cvYol = yeniYol;
    }

    const alanlar = {
      ad: f.ad, telefon: f.telefon || null,
      deneyim_yili: f.deneyim_yili, son_pozisyon: f.son_pozisyon || null, son_kurum: f.son_kurum || null,
      kanal: f.kanal, fonksiyon: f.fonksiyon, kidem: f.kidem, elektrifikasyon: f.elektrifikasyon,
      markalar: f.markalar ? f.markalar.split(',').map((x) => x.trim()).filter(Boolean) : [],
      diller: f.diller ? f.diller.split(',').map((x) => ({ dil: x.trim() })).filter((x) => x.dil) : [],
      sehir: f.sehir || null, calisma_tercihi: f.calisma_tercihi || null, aciklik: f.aciklik || null,
      sertifikalar: f.sertifikalar || null,
      serbest_metin: f.serbest_metin || null,
      gorunurluk: f.gorunurluk,
      cv_path: cvYol,
    };
    // Güncellemede eposta ve kvkk_riza_tarihi'ne DOKUNMUYORUZ: ilki auth kimliğine bağlı,
    // ikincisi ilk açık rızanın hukuki kaydı — her düzenlemede ezilmemeli.
    const { error } = mevcutKayit
      ? await supabase.from('adaylar').update(alanlar).eq('user_id', uid)
      : await supabase.from('adaylar').insert({
          ...alanlar,
          user_id: uid,
          eposta,
          kvkk_riza: true,
          kvkk_riza_tarihi: new Date().toISOString(),
        });
    setGonderiliyor(false);
    if (error) setHata(anlasilirHata(error, 'kayit'));
    else setDurum('basarili');
  }

  if (durum === 'yukleniyor') return <p className="text-warm-500">Yükleniyor…</p>;

  if (durum === 'basarili')
    return (
      <div className="rounded-lg border border-warm-border bg-sand p-8 text-center">
        <h2 className="text-2xl font-semibold text-ink mb-2">
          {mevcutKayit ? 'Profilin güncellendi.' : 'Teşekkürler, kaydın alındı.'}
        </h2>
        <p className="text-warm-600 mb-4">
          {mevcutKayit
            ? 'Değişikliklerin kaydedildi.'
            : 'Havuza katıldın. Sana uygun bir fırsat olduğunda, belirlediğin görünürlük seviyesinde ulaşacağız.'}
        </p>
        <a href="/kariyer/profilim" className="text-accent hover:underline">Profilini görüntüle</a>
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

  // ---- Adım 2: profil formu (yeni kayıt veya mevcut kaydın güncellenmesi) ----
  return (
    <form onSubmit={kaydet} className="space-y-8">
      <p className="text-sm text-warm-500">Giriş: {eposta}</p>

      {mevcutKayit && (
        <div className="rounded-md border border-accent/40 bg-sand p-4 text-ink">
          Bu e-posta ile zaten bir kaydın var — aşağıda mevcut bilgilerin duruyor.
          İstediğin zaman düzenleyip kaydedebilirsin.
        </div>
      )}

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
        <label className={labelCls}>Özgeçmiş (CV) <span className="font-normal text-warm-500">(isteğe bağlı)</span></label>

        {cvMevcutYol && !cvDosya && !cvKaldirilsin ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-ink">Yüklü: {cvMevcutYol.split('/').pop()}</span>
            <label className="text-accent hover:underline cursor-pointer">
              Değiştir
              <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                onChange={(e) => dosyaSecildi(e.target.files?.[0] ?? null)} />
            </label>
            <button type="button" onClick={() => setCvKaldirilsin(true)} className="text-warm-500 hover:text-ink">
              Kaldır
            </button>
          </div>
        ) : cvKaldirilsin ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-warm-600">CV kaydedince kaldırılacak.</span>
            <button type="button" onClick={() => setCvKaldirilsin(false)} className="text-accent hover:underline">
              Vazgeç
            </button>
          </div>
        ) : (
          <div>
            <input type="file" accept=".pdf,.doc,.docx"
              onChange={(e) => dosyaSecildi(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-warm-600 file:mr-3 file:rounded-md file:border-0 file:bg-sand file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-warm-border/50" />
            {cvDosya && (
              <p className="mt-2 text-sm text-warm-600">
                Seçilen: {cvDosya.name}{' '}
                <button type="button" onClick={() => setCvDosya(null)} className="text-accent hover:underline">kaldır</button>
              </p>
            )}
            <p className="mt-2 text-xs text-warm-500">PDF veya Word · en fazla 5 MB. CV'ni yalnızca sen ve biz görürüz.</p>
          </div>
        )}
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
        <span>
          <a href="/kvkk" target="_blank" rel="noopener" className="text-accent hover:underline">KVKK aydınlatma metnini</a>
          {' '}okudum; kişisel verilerimin bu kapsamda işlenmesine açık rıza veriyorum. *
        </span>
      </label>

      {hata && <p className="text-sm text-accent">{hata}</p>}

      <button type="submit" disabled={gonderiliyor}
        className="rounded-md bg-accent px-8 py-3 text-white font-medium disabled:opacity-60">
        {gonderiliyor ? 'Kaydediliyor…' : mevcutKayit ? 'Profilimi güncelle' : 'Havuza katıl'}
      </button>
    </form>
  );
}
