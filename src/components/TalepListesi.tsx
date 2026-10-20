import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { gorunurlukEtiket } from '../lib/adayTaksonomi';
import { anlasilirHata } from '../lib/hataMesaji';
import { ADMIN_EPOSTA } from '../lib/site';
import { tanistirmaMailto } from '../lib/tanistirma';
import { useOturum, oturumuKapat, YoneticiGirisFormu, OturumSatiri, YoneticiYetkisiz } from './ortak/Giris';
import { Satir } from './ortak/Parcalar';

const DURUMLAR: [string, string][] = [
  ['yeni', 'Yeni'], ['iletildi', 'İletildi'], ['kabul', 'Kabul'], ['ret', 'Ret'],
];

type Talep = {
  id: string; olusturuldu: string; durum: string;
  kurum: string | null; kurum_eposta: string; aciklama: string | null;
  aday_id: string; aday_ad: string | null; aday_eposta: string | null; aday_telefon: string | null;
  aday_son_kurum: string | null; aday_son_pozisyon: string | null;
  aday_gorunurluk: string | null; aday_sehir: string | null;
  yanit_token: string;
};

// Adaya gidecek girişsiz onay linki (/kariyer/temas-yanit?token=...). Otomatik
// e-posta devreye girene kadar Yalçın bunu elle iletebilir; akış böylece hemen
// gösterilebilir/kullanılabilir.
function OnayLinki({ token }: { token: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/kariyer/temas-yanit?token=${token}`;
  async function kopyala() {
    try {
      await navigator.clipboard.writeText(url);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch { /* pano erişimi yoksa sessizce geç — metin zaten seçilebilir */ }
  }
  return (
    <div className="mt-4 border-t border-warm-border/60 pt-4">
      <p className="text-xs font-medium text-warm-600 mb-1.5">Adaya gidecek onay linki</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-md bg-sand px-2.5 py-1.5 text-xs text-warm-700">{url}</code>
        <button type="button" onClick={kopyala}
          className="rounded-md border border-warm-border px-3 py-1.5 text-xs text-warm-700 hover:bg-sand">
          {kopyalandi ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-warm-500">
        Aday bu linke girip Kabul/Ret verir; durum kendiliğinden güncellenir. Otomatik e-posta devreye girene kadar elle iletebilirsin.
      </p>
    </div>
  );
}

export default function TalepListesi() {
  const [durum, setDurum] = useState<'yukleniyor' | 'eposta' | 'yetkisiz' | 'liste'>('yukleniyor');
  const [oturumEpostasi, setOturumEpostasi] = useState('');
  const [hata, setHata] = useState('');
  const [talepler, setTalepler] = useState<Talep[]>([]);
  const [guncelleniyor, setGuncelleniyor] = useState<string | null>(null);

  useOturum((oturum) => oturumHazir(oturum.user.email ?? ''), () => setDurum('eposta'));

  async function oturumHazir(girenEposta: string) {
    setOturumEpostasi(girenEposta);
    if (girenEposta.toLocaleLowerCase('tr') !== ADMIN_EPOSTA) {
      setDurum('yetkisiz');
      return;
    }
    const { data, error } = await supabase.rpc('admin_talepleri');
    if (error) { setHata(anlasilirHata(error)); setDurum('yetkisiz'); return; }
    setTalepler((data ?? []) as Talep[]);
    setDurum('liste');
  }

  /** Açık oturumu kapatıp e-posta formuna döner (yanlış hesapla gelen kilitlenmesin). */
  async function cikisYap() {
    await oturumuKapat();
    setOturumEpostasi(''); setTalepler([]); setHata('');
    setDurum('eposta');
  }

  async function durumDegistir(id: string, yeniDurum: string) {
    setHata(''); setGuncelleniyor(id);
    const { error } = await supabase.rpc('admin_talep_durum', { p_id: id, p_durum: yeniDurum });
    setGuncelleniyor(null);
    if (error) { setHata(anlasilirHata(error)); return; }
    setTalepler((ts) => ts.map((t) => (t.id === id ? { ...t, durum: yeniDurum } : t)));
  }

  if (durum === 'yukleniyor') return <p className="text-warm-500">Yükleniyor…</p>;

  if (durum === 'yetkisiz')
    return <YoneticiYetkisiz hata={hata} oturumEpostasi={oturumEpostasi} onCikis={cikisYap} />;

  if (durum === 'eposta') return <YoneticiGirisFormu />;

  const bekleyen = talepler.filter((t) => t.durum === 'yeni').length;

  return (
    <div>
      <OturumSatiri eposta={oturumEpostasi} onCikis={cikisYap} className="mb-4" />
      <p className="text-sm text-warm-500 mb-6">
        {talepler.length} talep · en yeni önce{bekleyen > 0 && ` · ${bekleyen} yeni`}
      </p>

      {talepler.length === 0 && (
        <div className="rounded-lg border border-warm-border bg-sand p-8 text-warm-600">
          Henüz temas talebi yok.
        </div>
      )}

      <div className="space-y-4">
        {talepler.map((t) => {
          const acik = t.aday_gorunurluk === 'acik';
          return (
            <div key={t.id} className="rounded-lg border border-warm-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {t.aday_ad ?? 'Aday bulunamadı (silinmiş olabilir)'}
                    <span className={`ml-2 text-xs rounded-md px-2 py-0.5 ${acik ? 'bg-sand text-warm-600' : 'bg-ink/5 text-ink'}`}>
                      {acik ? 'Açık profil' : 'Kapalı profil'}
                    </span>
                  </p>
                  {(t.aday_son_pozisyon || t.aday_son_kurum || t.aday_sehir) && (
                    <p className="text-sm text-warm-500 mt-0.5">
                      {[t.aday_son_pozisyon, t.aday_son_kurum, t.aday_sehir].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <p className="text-sm text-warm-500 shrink-0">
                  {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(t.olusturuldu))}
                </p>
              </div>

              <dl className="mt-3">
                <Satir etiket="İsteyen kurum" deger={[t.kurum, t.kurum_eposta].filter(Boolean).join(' · ')} />
                <Satir etiket="Kurumun notu" deger={t.aciklama} />
                <Satir etiket="Aday e-posta" deger={t.aday_eposta} />
                <Satir etiket="Aday telefon" deger={t.aday_telefon} />
                <Satir etiket="Görünürlük" deger={gorunurlukEtiket(t.aday_gorunurluk)} />
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-warm-500 mr-1">Durum:</span>
                {DURUMLAR.map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    disabled={guncelleniyor === t.id}
                    onClick={() => durumDegistir(t.id, v)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
                      t.durum === v
                        ? 'border-accent bg-accent text-white'
                        : 'border-warm-border text-warm-600 hover:bg-sand'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {(t.durum === 'yeni' || t.durum === 'iletildi') && <OnayLinki token={t.yanit_token} />}

              {t.durum === 'kabul' && t.aday_eposta && (
                <div className="mt-4 border-t border-warm-border/60 pt-4">
                  <a
                    href={tanistirmaMailto(t)}
                    className="inline-block rounded-md bg-accent px-5 py-2 text-sm text-white font-medium"
                  >
                    Tanıştırma e-postası hazırla
                  </a>
                  <p className="mt-2 text-xs text-warm-500">
                    İki tarafın adresi ve hazır bir taslakla e-posta programını açar; hiçbir şey kendiliğinden gönderilmez. Köşeli parantezli yerleri (yetkilinin adı, unvanı) doldur, özgeçmiş varsa elle ekle.
                  </p>
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
