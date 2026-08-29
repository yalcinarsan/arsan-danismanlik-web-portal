import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { gorunurlukEtiket } from '../lib/adayTaksonomi';
import { anlasilirHata } from '../lib/hataMesaji';

const ADMIN_EPOSTA = 'yalcinarsan@arsandanismanlik.com.tr';

const inputCls = 'w-full rounded-md border border-warm-border bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none';
const labelCls = 'block text-sm font-medium text-ink mb-1.5';

const DURUMLAR: [string, string][] = [
  ['yeni', 'Yeni'], ['iletildi', 'İletildi'], ['kabul', 'Kabul'], ['ret', 'Ret'],
];

type Talep = {
  id: string; olusturuldu: string; durum: string;
  kurum: string | null; kurum_eposta: string; aciklama: string | null;
  aday_id: string; aday_ad: string | null; aday_eposta: string | null; aday_telefon: string | null;
  aday_son_kurum: string | null; aday_son_pozisyon: string | null;
  aday_gorunurluk: string | null; aday_sehir: string | null;
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

// Kabul edilmiş bir talep için sıcak tanıştırma e-postası taslağı hazırlar.
// Gönderimi yapmaz — yalnızca iki tarafı adresleyip gövdeyi doldurarak
// kullanıcının kendi e-posta uygulamasını açar (mailto). Son sözü kullanıcı verir.
function tanistirmaMailto(t: Talep): string {
  const aday = t.aday_ad ?? 'Aday';
  const kurum = t.kurum ?? 'kurum';
  const tanim = [t.aday_son_pozisyon, t.aday_son_kurum].filter(Boolean).join(' · ');
  const konu = `Tanışma — ${aday} & ${kurum}`;
  const govde = [
    `Merhaba ${kurum} ekibi ve ${aday},`,
    ``,
    `Sizi tanıştırmak isterim. ${aday}${tanim ? `, ${tanim}` : ''}; ${kurum} ekibi profiliyle ilgilendi, ${aday} da görüşmeye açık olduğunu belirtti.`,
    ``,
    `Bundan sonrasını size bırakıyorum — uygun bir zamanda tanışıp konuşabilirsiniz. Süreçte yardımcı olabileceğim bir şey olursa buradayım.`,
    ``,
    `Sevgiler,`,
    `Yalçın Arsan`,
    `Otomotiv İnsanı · Arsan Danışmanlık`,
  ].join('\r\n');
  const alicilar = [t.kurum_eposta, t.aday_eposta].filter(Boolean).join(',');
  return `mailto:${alicilar}?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(govde)}`;
}

export default function TalepListesi() {
  const [durum, setDurum] = useState<'yukleniyor' | 'eposta' | 'gonderildi' | 'yetkisiz' | 'liste'>('yukleniyor');
  const [eposta, setEposta] = useState('');
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [talepler, setTalepler] = useState<Talep[]>([]);
  const [guncelleniyor, setGuncelleniyor] = useState<string | null>(null);

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
    if (girenEposta.toLocaleLowerCase('tr') !== ADMIN_EPOSTA) {
      setDurum('yetkisiz');
      return;
    }
    const { data, error } = await supabase.rpc('admin_talepleri');
    if (error) { setHata(anlasilirHata(error)); setDurum('yetkisiz'); return; }
    setTalepler((data ?? []) as Talep[]);
    setDurum('liste');
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

  async function durumDegistir(id: string, yeniDurum: string) {
    setHata(''); setGuncelleniyor(id);
    const { error } = await supabase.rpc('admin_talep_durum', { p_id: id, p_durum: yeniDurum });
    setGuncelleniyor(null);
    if (error) { setHata(anlasilirHata(error)); return; }
    setTalepler((ts) => ts.map((t) => (t.id === id ? { ...t, durum: yeniDurum } : t)));
  }

  if (durum === 'yukleniyor') return <p className="text-warm-500">Yükleniyor…</p>;

  if (durum === 'yetkisiz')
    return (
      <div className="rounded-lg border border-warm-border bg-sand p-8">
        <h2 className="text-xl font-semibold text-ink mb-2">Bu sayfa yalnızca yönetici içindir.</h2>
        <p className="text-warm-600">{hata || 'Bu e-posta ile erişim yetkin yok.'}</p>
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

  const bekleyen = talepler.filter((t) => t.durum === 'yeni').length;

  return (
    <div>
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

              {t.durum === 'kabul' && t.aday_eposta && (
                <div className="mt-4 border-t border-warm-border/60 pt-4">
                  <a
                    href={tanistirmaMailto(t)}
                    className="inline-block rounded-md bg-accent px-5 py-2 text-sm text-white font-medium"
                  >
                    Tanıştırma e-postası hazırla
                  </a>
                  <p className="mt-2 text-xs text-warm-500">
                    İki tarafın adresi ve hazır bir taslakla e-posta uygulamanı açar. Göndermeden önce sen düzenlersin.
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
