import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  deneyimEtiket, kanalEtiket, fonksiyonEtiket, kidemEtiket,
  elektrifikasyonEtiket, calismaEtiket, aciklikEtiket, gorunurlukEtiket,
} from '../lib/adayTaksonomi';
import { anlasilirHata } from '../lib/hataMesaji';
import { ADMIN_EPOSTA } from '../lib/site';

const inputCls = 'w-full rounded-md border border-warm-border bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none';
const labelCls = 'block text-sm font-medium text-ink mb-1.5';

type Aday = {
  id: string; ad: string; eposta: string; telefon: string | null;
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
    <div className="grid grid-cols-3 gap-4 py-2 border-b border-warm-border/60">
      <dt className="text-sm text-warm-500">{etiket}</dt>
      <dd className="col-span-2 text-ink text-sm">{deger}</dd>
    </div>
  );
}

/** Tek/çoklu değerli bir alanın dağılımını (etiket → sayı), çoktan aza sıralı çıkarır. */
function dagilimHesapla(degerler: (string | null | undefined)[], etiketFn?: (v: string) => string): [string, number][] {
  const sayac = new Map<string, number>();
  for (const d of degerler) {
    if (!d) continue;
    const etiket = etiketFn ? etiketFn(d) : d;
    sayac.set(etiket, (sayac.get(etiket) ?? 0) + 1);
  }
  return [...sayac.entries()].sort((a, b) => b[1] - a[1]);
}

/** kurum_mercegi RPC'sinin döndürdüğü {slug: sayı} nesnesini OzetKart verisine çevirir. */
function jsonbDagilim(obj: Record<string, number> | undefined, etiketFn?: (v: string) => string): [string, number][] {
  if (!obj) return [];
  return Object.entries(obj)
    .map(([k, v]) => [etiketFn ? etiketFn(k) : k, v] as [string, number])
    .sort((a, b) => b[1] - a[1]);
}

type Mercek = {
  kurum: string; grup: string;
  kaynak: { toplam_gruptan: number; gizli: number; gorunur: number };
  uyum: {
    gorunur_toplam: number;
    fonksiyon: Record<string, number>; kidem: Record<string, number>;
    deneyim: Record<string, number>; elektrifikasyon: Record<string, number>;
    kanal: Record<string, number>;
  };
};

function OzetKart({ baslik, veri }: { baslik: string; veri: [string, number][] }) {
  if (veri.length === 0) return null;
  return (
    <div className="rounded-lg border border-warm-border p-4">
      <p className="text-sm font-medium text-ink mb-2">{baslik}</p>
      <ul className="space-y-1">
        {veri.map(([etiket, sayi]) => (
          <li key={etiket} className="flex justify-between gap-3 text-sm text-warm-600">
            <span>{etiket}</span>
            <span className="text-warm-400 tabular-nums">{sayi}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdaylarListesi() {
  const [durum, setDurum] = useState<'yukleniyor' | 'eposta' | 'gonderildi' | 'yetkisiz' | 'liste'>('yukleniyor');
  const [eposta, setEposta] = useState('');
  const [oturumEpostasi, setOturumEpostasi] = useState('');
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [adaylar, setAdaylar] = useState<Aday[]>([]);
  const [acikId, setAcikId] = useState<string | null>(null);
  const [cvYukleniyor, setCvYukleniyor] = useState<string | null>(null);
  const [mercekKurum, setMercekKurum] = useState('');
  const [mercek, setMercek] = useState<Mercek | null>(null);
  const [mercekYukleniyor, setMercekYukleniyor] = useState(false);
  const [mercekHata, setMercekHata] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) oturumHazir(data.session.user.email ?? '');
      else setDurum('eposta');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) oturumHazir(session.user.email ?? '');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function oturumHazir(girenEposta: string) {
    setOturumEpostasi(girenEposta);
    if (girenEposta.toLocaleLowerCase('tr') !== ADMIN_EPOSTA) {
      setDurum('yetkisiz');
      return;
    }
    const { data, error } = await supabase.from('adaylar').select('*').order('created_at', { ascending: false });
    if (error) { setHata(anlasilirHata(error)); setDurum('yetkisiz'); return; }
    setAdaylar((data ?? []) as Aday[]);
    setDurum('liste');
  }

  /** Açık oturumu kapatıp e-posta formuna döner (yanlış hesapla gelen kilitlenmesin). */
  async function cikisYap() {
    await supabase.auth.signOut();
    setOturumEpostasi(''); setAdaylar([]); setHata(''); setEposta('');
    setDurum('eposta');
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

  async function mercekAra(e: React.FormEvent) {
    e.preventDefault();
    const kurum = mercekKurum.trim();
    if (!kurum) return;
    setMercekHata(''); setMercekYukleniyor(true);
    const { data, error } = await supabase.rpc('kurum_mercegi', { p_kurum: kurum });
    setMercekYukleniyor(false);
    if (error) { setMercekHata(anlasilirHata(error)); setMercek(null); return; }
    setMercek(data as Mercek);
  }

  async function cvAc(aday: Aday) {
    if (!aday.cv_path) return;
    setCvYukleniyor(aday.id);
    const { data, error } = await supabase.storage.from('cv').createSignedUrl(aday.cv_path, 120);
    setCvYukleniyor(null);
    if (error || !data) { setHata('CV açılamadı: ' + (error?.message ?? 'bilinmeyen hata')); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  if (durum === 'yukleniyor') return <p className="text-warm-500">Yükleniyor…</p>;

  if (durum === 'yetkisiz')
    return (
      <div className="rounded-lg border border-warm-border bg-sand p-8">
        <h2 className="text-xl font-semibold text-ink mb-2">Bu sayfa yalnızca yönetici içindir.</h2>
        <p className="text-warm-600">{hata || 'Bu e-posta ile erişim yetkin yok.'}</p>
        {oturumEpostasi && (
          <p className="text-warm-600 mt-3 text-sm">
            Şu anda <strong>{oturumEpostasi}</strong> hesabıyla giriş yapılmış. Yönetici hesabıyla girmek için çıkış yap.
          </p>
        )}
        <button type="button" onClick={cikisYap}
          className="mt-5 rounded-md bg-accent px-5 py-2 text-sm text-white font-medium">
          Çıkış yap ve yönetici hesabıyla gir
        </button>
      </div>
    );

  if (durum === 'eposta' || durum === 'gonderildi')
    return (
      <div className="max-w-md">
        <p className="text-warm-600 mb-6">Yönetici girişi için e-postanı gir; sana bir giriş bağlantısı yollayacağız.</p>
        {durum === 'gonderildi' ? (
          <div className="rounded-md border border-accent/40 bg-sand p-4 text-ink">
            <strong>{eposta}</strong> adresine bir giriş bağlantısı gönderdik. Gelen kutunu kontrol et.
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

  const kanalDagilim = dagilimHesapla(adaylar.flatMap((a) => a.kanal ?? []), kanalEtiket);
  const fonksiyonDagilim = dagilimHesapla(adaylar.flatMap((a) => a.fonksiyon ?? []), fonksiyonEtiket);
  const kidemDagilim = dagilimHesapla(adaylar.map((a) => a.kidem), kidemEtiket);
  const deneyimDagilim = dagilimHesapla(adaylar.map((a) => a.deneyim_yili), deneyimEtiket);
  const elektrifikasyonDagilim = dagilimHesapla(adaylar.map((a) => a.elektrifikasyon), elektrifikasyonEtiket);
  const gorunurlukDagilim = dagilimHesapla(adaylar.map((a) => a.gorunurluk), gorunurlukEtiket);
  const sehirDagilim = dagilimHesapla(adaylar.map((a) => a.sehir));
  const calismaDagilim = dagilimHesapla(adaylar.map((a) => a.calisma_tercihi), calismaEtiket);

  return (
    <div>
      <p className="text-sm text-warm-500 mb-4">{adaylar.length} kayıt · en yeni önce</p>

      <form onSubmit={mercekAra} className="mb-10 rounded-lg border border-warm-border p-4">
        <p className="text-sm font-medium text-ink mb-1">Kurum merceği</p>
        <p className="text-xs text-warm-500 mb-3">Bir kurum adı gir; o kurum + grubundan (iştirakler dahil) havuzda kaç kişi var ve o kurumun görebileceği adayların dağılımı.</p>
        <div className="flex flex-wrap gap-2">
          <input value={mercekKurum} onChange={(e) => setMercekKurum(e.target.value)}
            className={inputCls + ' max-w-xs'} placeholder="Kurum adı (ör. Doğuş Otomotiv)" />
          <button type="submit" disabled={mercekYukleniyor}
            className="rounded-md bg-accent px-5 py-2 text-sm text-white font-medium disabled:opacity-60">
            {mercekYukleniyor ? 'Aranıyor…' : 'Ara'}
          </button>
        </div>
        {mercekHata && <p className="mt-2 text-sm text-accent">{mercekHata}</p>}
        {mercek && (
          <div className="mt-4 space-y-4">
            <div className="rounded-md bg-sand p-3">
              <p className="text-sm text-ink">
                Kaynak — <strong>{mercek.kurum}</strong> grubundan havuzda{' '}
                <strong>{mercek.kaynak.toplam_gruptan}</strong> kişi{' '}
                <span className="text-warm-600">({mercek.kaynak.gizli} gizli · {mercek.kaynak.gorunur} görünür)</span>
              </p>
              <p className="mt-1 text-xs text-accent">⚠ Bu "kaynak" sayısını kurumla paylaşma — kendi çalışanlarının çıkış aradığını ele verir. Yalnız senin farkındalığın için.</p>
            </div>
            <p className="text-sm text-ink">
              Uyum — <strong>{mercek.kurum}</strong>'un görebileceği{' '}
              <strong>{mercek.uyum.gorunur_toplam}</strong> aday (bu konuşulabilir):
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <OzetKart baslik="Fonksiyon" veri={jsonbDagilim(mercek.uyum.fonksiyon, fonksiyonEtiket)} />
              <OzetKart baslik="Kıdem" veri={jsonbDagilim(mercek.uyum.kidem, kidemEtiket)} />
              <OzetKart baslik="Toplam deneyim" veri={jsonbDagilim(mercek.uyum.deneyim, deneyimEtiket)} />
              <OzetKart baslik="Elektrifikasyon" veri={jsonbDagilim(mercek.uyum.elektrifikasyon, elektrifikasyonEtiket)} />
              <OzetKart baslik="Kanal" veri={jsonbDagilim(mercek.uyum.kanal, kanalEtiket)} />
            </div>
          </div>
        )}
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <OzetKart baslik="Kanal" veri={kanalDagilim} />
        <OzetKart baslik="Fonksiyon" veri={fonksiyonDagilim} />
        <OzetKart baslik="Kıdem" veri={kidemDagilim} />
        <OzetKart baslik="Toplam deneyim" veri={deneyimDagilim} />
        <OzetKart baslik="Elektrifikasyon" veri={elektrifikasyonDagilim} />
        <OzetKart baslik="Görünürlük" veri={gorunurlukDagilim} />
        <OzetKart baslik="Şehir" veri={sehirDagilim} />
        <OzetKart baslik="Çalışma tercihi" veri={calismaDagilim} />
      </div>

      <div className="space-y-3">
        {adaylar.map((aday) => {
          const acik = acikId === aday.id;
          return (
            <div key={aday.id} className="rounded-lg border border-warm-border overflow-hidden">
              <button
                type="button"
                onClick={() => setAcikId(acik ? null : aday.id)}
                className="w-full flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-left hover:bg-sand/50 transition-colors"
              >
                <div>
                  <span className="font-medium text-ink">{aday.ad}</span>
                  <span className="text-sm text-warm-500 ml-3">{aday.eposta}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-warm-500">
                  <span>{aday.sehir ?? '—'}</span>
                  <span>{new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(aday.created_at))}</span>
                  <span className="text-accent">{acik ? '▲' : '▼'}</span>
                </div>
              </button>
              {acik && (
                <div className="px-5 pb-5 pt-1 border-t border-warm-border">
                  <dl>
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
                    <Satir etiket="Çalışma tercihi" deger={calismaEtiket(aday.calisma_tercihi)} />
                    <Satir etiket="Fırsatlara açıklık" deger={aciklikEtiket(aday.aciklik)} />
                    <Satir etiket="Eğitim ve sertifikalar" deger={aday.sertifikalar} />
                    <Satir etiket="Seni en iyi anlatan" deger={aday.serbest_metin} />
                    <Satir etiket="Görünürlük" deger={gorunurlukEtiket(aday.gorunurluk)} />
                  </dl>
                  {aday.cv_path && (
                    <button
                      type="button"
                      onClick={() => cvAc(aday)}
                      disabled={cvYukleniyor === aday.id}
                      className="mt-3 text-sm text-accent hover:underline disabled:opacity-50"
                    >
                      {cvYukleniyor === aday.id ? 'Açılıyor…' : 'CV’yi görüntüle →'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hata && <p className="mt-4 text-sm text-accent">{hata}</p>}
    </div>
  );
}
