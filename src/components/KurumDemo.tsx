// Kurum görünümü — DEMO.
//
// Amaç: beta kurum görüşmelerinde ekranda gösterilecek, "abone bir kurum ne
// görür" sorusunun somut cevabı. Veri gerçek (havuzdaki kayıtlar), ama tüm
// profiller maskeli — bkz. lib/adayMaskeleme.ts'deki gerekçe.
//
// Erişim: /kariyer/adaylar ile aynı desen — yalnızca Yalçın'ın girişi.
// Yeni bir veri açığı yok; toplantıda ekran paylaşımıyla gösteriliyor.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  KANAL, FONKSIYON, ELEKTRIFIKASYON,
  deneyimEtiket, kanalEtiket, fonksiyonEtiket, kidemEtiket,
  elektrifikasyonEtiket, calismaEtiket, aciklikEtiket,
} from '../lib/adayTaksonomi';
import { maskele, type MaskelenebilirAday } from '../lib/adayMaskeleme';
import { anlasilirHata } from '../lib/hataMesaji';

const ADMIN_EPOSTA = 'yalcinarsan@arsandanismanlik.com.tr';

const inputCls = 'w-full rounded-md border border-warm-border bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none';
const labelCls = 'block text-sm font-medium text-ink mb-1.5';

type Aday = MaskelenebilirAday & {
  deneyim_yili: string;
  kanal: string[];
  fonksiyon: string[];
  kidem: string;
  elektrifikasyon: string;
  markalar: string[];
  calisma_tercihi: string | null;
  aciklik: string | null;
};

function Etiket({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-md bg-sand px-2.5 py-1 text-xs text-warm-600">{children}</span>
  );
}

function Satir({ etiket, deger }: { etiket: string; deger?: string | null }) {
  if (!deger) return null;
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b border-warm-border/60">
      <dt className="text-sm text-warm-500">{etiket}</dt>
      <dd className="col-span-2 text-ink text-sm">{deger}</dd>
    </div>
  );
}

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

function dagilimHesapla(degerler: (string | null | undefined)[], etiketFn?: (v: string) => string): [string, number][] {
  const sayac = new Map<string, number>();
  for (const d of degerler) {
    if (!d) continue;
    const etiket = etiketFn ? etiketFn(d) : d;
    sayac.set(etiket, (sayac.get(etiket) ?? 0) + 1);
  }
  return [...sayac.entries()].sort((a, b) => b[1] - a[1]);
}

export default function KurumDemo() {
  const [durum, setDurum] = useState<'yukleniyor' | 'eposta' | 'gonderildi' | 'yetkisiz' | 'liste'>('yukleniyor');
  const [eposta, setEposta] = useState('');
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [adaylar, setAdaylar] = useState<Aday[]>([]);
  const [acikId, setAcikId] = useState<string | null>(null);
  const [talepId, setTalepId] = useState<string | null>(null);

  const [fKanal, setFKanal] = useState('');
  const [fFonksiyon, setFFonksiyon] = useState('');
  const [fElektrifikasyon, setFElektrifikasyon] = useState('');

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
    const { data, error } = await supabase.from('adaylar').select('*').order('created_at', { ascending: false });
    if (error) { setHata(anlasilirHata(error)); setDurum('yetkisiz'); return; }
    setAdaylar((data ?? []) as Aday[]);
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

  const suzulmus = useMemo(() => adaylar.filter((a) => (
    (!fKanal || (a.kanal ?? []).includes(fKanal)) &&
    (!fFonksiyon || (a.fonksiyon ?? []).includes(fFonksiyon)) &&
    (!fElektrifikasyon || a.elektrifikasyon === fElektrifikasyon)
  )), [adaylar, fKanal, fFonksiyon, fElektrifikasyon]);

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

  const kidemDagilim = dagilimHesapla(suzulmus.map((a) => a.kidem), kidemEtiket);
  const fonksiyonDagilim = dagilimHesapla(suzulmus.flatMap((a) => a.fonksiyon ?? []), fonksiyonEtiket);
  const kanalDagilim = dagilimHesapla(suzulmus.flatMap((a) => a.kanal ?? []), kanalEtiket);
  const elektrifikasyonDagilim = dagilimHesapla(suzulmus.map((a) => a.elektrifikasyon), elektrifikasyonEtiket);

  return (
    <div>
      <div className="rounded-lg border border-accent/30 bg-sand p-4 mb-8">
        <p className="text-sm text-ink">
          <strong>Kurum görünümü — örnek.</strong> Veriler havuzdaki gerçek kayıtlardan geliyor;
          profillerin tamamı maskeli. Adayların kimliği, siz temas talebi gönderdikten ve
          aday kabul ettikten sonra açılır. İletişim her aşamada Arsan Danışmanlık üzerinden yürür.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div>
          <label className={labelCls}>Kanal</label>
          <select value={fKanal} onChange={(e) => setFKanal(e.target.value)} className={inputCls}>
            <option value="">Hepsi</option>
            {KANAL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Fonksiyon</label>
          <select value={fFonksiyon} onChange={(e) => setFFonksiyon(e.target.value)} className={inputCls}>
            <option value="">Hepsi</option>
            {FONKSIYON.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Elektrifikasyon</label>
          <select value={fElektrifikasyon} onChange={(e) => setFElektrifikasyon(e.target.value)} className={inputCls}>
            <option value="">Hepsi</option>
            {ELEKTRIFIKASYON.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <p className="text-sm text-warm-500 mb-6">
        {suzulmus.length} profil eşleşti{suzulmus.length !== adaylar.length && ` · havuzda toplam ${adaylar.length}`}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <OzetKart baslik="Kıdem" veri={kidemDagilim} />
        <OzetKart baslik="Fonksiyon" veri={fonksiyonDagilim} />
        <OzetKart baslik="Kanal" veri={kanalDagilim} />
        <OzetKart baslik="Elektrifikasyon" veri={elektrifikasyonDagilim} />
      </div>

      <div className="space-y-3">
        {suzulmus.map((aday) => {
          const m = maskele(aday, 'demo');
          const acik = acikId === aday.id;
          // Kapalı profilde serbest-metin pozisyon gösterilmez; başlığı
          // yapılandırılmış alanlardan kuruyoruz — kimliğe götürmez ama iş anlamı taşır.
          const baslik = [kidemEtiket(aday.kidem), (aday.fonksiyon ?? []).map(fonksiyonEtiket).join(' · ')]
            .filter(Boolean).join(' · ');
          return (
            <div key={aday.id} className="rounded-lg border border-warm-border overflow-hidden">
              <button
                type="button"
                onClick={() => setAcikId(acik ? null : aday.id)}
                className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-sand/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{baslik}</p>
                  <p className="text-sm text-warm-500 mt-0.5">
                    {(aday.kanal ?? []).map(kanalEtiket).join(', ')} · {deneyimEtiket(aday.deneyim_yili)} · {m.konum}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-warm-400">Kimlik gizli</span>
                  <span className="text-accent">{acik ? '▲' : '▼'}</span>
                </div>
              </button>
              {acik && (
                <div className="px-5 pb-5 pt-1 border-t border-warm-border">
                  <dl>
                    <Satir etiket="Kıdem" deger={kidemEtiket(aday.kidem)} />
                    <Satir etiket="Toplam deneyim" deger={deneyimEtiket(aday.deneyim_yili)} />
                    <Satir etiket="Fonksiyon" deger={(aday.fonksiyon ?? []).map(fonksiyonEtiket).join(', ')} />
                    <Satir etiket="Kanal deneyimi" deger={(aday.kanal ?? []).map(kanalEtiket).join(', ')} />
                    <Satir etiket="Elektrifikasyon" deger={elektrifikasyonEtiket(aday.elektrifikasyon)} />
                    <Satir etiket="Çalıştığı markalar" deger={(aday.markalar ?? []).join(', ')} />
                    <Satir etiket="Konum" deger={m.konum} />
                    <Satir etiket="Çalışma tercihi" deger={calismaEtiket(aday.calisma_tercihi)} />
                    <Satir etiket="Fırsatlara açıklık" deger={aciklikEtiket(aday.aciklik)} />
                    <Satir etiket="Eğitim ve sertifika" deger={m.sertifika_var ? 'Var (temas sonrası paylaşılır)' : null} />
                    <Satir etiket="Kimlik ve özgeçmiş" deger="Temas talebi onaylandıktan sonra paylaşılır" />
                  </dl>
                  {talepId === aday.id ? (
                    <div className="mt-4 rounded-md border border-accent/40 bg-sand p-3 text-sm text-ink">
                      Örnek akış: talep Arsan Danışmanlık'a iletilir, adaya kurumunuzun kim olduğu
                      söylenir. Aday kabul ederse kimliği ve özgeçmişi sizinle paylaşılır.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setTalepId(aday.id)}
                      className="mt-4 rounded-md bg-accent px-5 py-2 text-sm text-white font-medium"
                    >
                      Temas talebi gönder
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
