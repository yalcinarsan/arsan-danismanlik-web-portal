import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  deneyimEtiket, kanalEtiket, fonksiyonEtiket, kidemEtiket, elektrifikasyonEtiket,
} from '../lib/adayTaksonomi';
import { anlasilirHata } from '../lib/hataMesaji';
import { ADMIN_EPOSTA } from '../lib/site';

const inputCls = 'w-full rounded-md border border-warm-border bg-white px-3 py-2 text-ink focus:border-accent focus:outline-none';
const labelCls = 'block text-sm font-medium text-ink mb-1.5';

type Kurum = {
  kurum: string; eposta: string; kademe: string; aciklama: string | null;
  son_erisim: string | null; erisim_sayisi: number; gecerlilik: string | null;
  aktif: boolean; toplam_temas: number; bekleyen_temas: number;
};
type Panel = {
  kurumlar: Kurum[];
  havuz: {
    toplam: number;
    deneyim: Record<string, number>; kidem: Record<string, number>;
    fonksiyon: Record<string, number>; kanal: Record<string, number>;
    elektrifikasyon: Record<string, number>;
  };
  temas: { toplam: number; durumlar: Record<string, number> };
};

const dtFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
function tarih(s: string | null) { return s ? dtFmt.format(new Date(s)) : null; }
function kalanGun(s: string | null): string {
  if (!s) return 'süresiz';
  const g = Math.ceil((new Date(s).getTime() - Date.now()) / 86400000);
  return g > 0 ? `${g} gün` : 'doldu';
}
function dagilim(obj: Record<string, number> | undefined, fn?: (v: string) => string): [string, number][] {
  if (!obj) return [];
  return Object.entries(obj).map(([k, v]) => [fn ? fn(k) : k, v] as [string, number]).sort((a, b) => b[1] - a[1]);
}

function OzetKart({ baslik, veri }: { baslik: string; veri: [string, number][] }) {
  if (veri.length === 0) return null;
  return (
    <div className="rounded-lg border border-warm-border p-4">
      <p className="text-sm font-medium text-ink mb-2">{baslik}</p>
      <ul className="space-y-1">
        {veri.map(([e, n]) => (
          <li key={e} className="flex justify-between gap-3 text-sm text-warm-600">
            <span>{e}</span><span className="text-warm-400 tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function YoneticiPanel() {
  const [durum, setDurum] = useState<'yukleniyor' | 'eposta' | 'gonderildi' | 'yetkisiz' | 'panel'>('yukleniyor');
  const [eposta, setEposta] = useState('');
  const [oturumEpostasi, setOturumEpostasi] = useState('');
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);

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
    if (girenEposta.toLocaleLowerCase('tr') !== ADMIN_EPOSTA) { setDurum('yetkisiz'); return; }
    const { data, error } = await supabase.rpc('admin_panel');
    if (error) { setHata(anlasilirHata(error)); setDurum('yetkisiz'); return; }
    setPanel(data as Panel);
    setDurum('panel');
  }

  async function cikisYap() {
    await supabase.auth.signOut();
    setOturumEpostasi(''); setPanel(null); setHata(''); setEposta(''); setDurum('eposta');
  }

  async function magicLinkGonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(''); setGonderiliyor(true);
    const { error } = await supabase.auth.signInWithOtp({ email: eposta, options: { emailRedirectTo: window.location.href } });
    setGonderiliyor(false);
    if (error) setHata(anlasilirHata(error, 'giris')); else setDurum('gonderildi');
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
        <button type="button" onClick={cikisYap} className="mt-5 rounded-md bg-accent px-5 py-2 text-sm text-white font-medium">
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
              <input type="email" required value={eposta} onChange={(e) => setEposta(e.target.value)} className={inputCls} placeholder="ornek@eposta.com" />
            </div>
            {hata && <p className="text-sm text-accent">{hata}</p>}
            <button type="submit" disabled={gonderiliyor} className="rounded-md bg-accent px-6 py-2.5 text-white font-medium disabled:opacity-60">
              {gonderiliyor ? 'Gönderiliyor…' : 'Giriş bağlantısı gönder'}
            </button>
          </form>
        )}
      </div>
    );

  if (!panel) return null;
  const k = panel.kurumlar;
  const bekleyenToplam = k.reduce((s, x) => s + (x.bekleyen_temas || 0), 0);

  return (
    <div className="space-y-12">
      {/* Kurumlar / erişimler */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-ink">Kurumlar / erişimler</h2>
          <span className="text-sm text-warm-500">{k.length} erişim · {bekleyenToplam} bekleyen temas</span>
        </div>
        <div className="space-y-3">
          {k.map((x) => {
            const bakti = !!x.son_erisim;
            return (
              <div key={x.eposta} className={`rounded-lg border p-4 ${x.aktif ? 'border-warm-border' : 'border-warm-border/60 bg-warm-border/10'}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium text-ink">{x.kurum}</span>
                  <span className={`text-xs rounded px-1.5 py-0.5 ${x.kademe === 'abone' ? 'bg-accent/10 text-accent' : 'bg-warm-border/50 text-warm-600'}`}>
                    {x.kademe}
                  </span>
                  <span className={`text-xs rounded px-1.5 py-0.5 ${x.aktif ? 'bg-sand text-warm-600' : 'bg-ink/5 text-ink'}`}>
                    {x.aktif ? `aktif · ${kalanGun(x.gecerlilik)}` : 'süresi doldu'}
                  </span>
                  {x.bekleyen_temas > 0 && (
                    <span className="text-xs rounded px-1.5 py-0.5 bg-accent/10 text-accent font-medium">
                      {x.bekleyen_temas} bekleyen temas
                    </span>
                  )}
                </div>
                <p className="text-sm text-warm-600 mt-1.5">
                  {bakti
                    ? <>Son giriş: <strong className="text-ink font-medium">{tarih(x.son_erisim)}</strong> · {x.erisim_sayisi} kez baktı</>
                    : <span className="text-accent">Henüz bakmadı — davet gitti, girmedi</span>}
                  {x.toplam_temas > 0 && <> · toplam {x.toplam_temas} temas</>}
                </p>
                <p className="text-xs text-warm-400 mt-0.5">{x.eposta}{x.aciklama ? ` · ${x.aciklama}` : ''}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Havuz anlık görüntüsü */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-ink">Havuz</h2>
          <span className="text-sm text-warm-500">{panel.havuz.toplam} aday</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OzetKart baslik="Fonksiyon" veri={dagilim(panel.havuz.fonksiyon, fonksiyonEtiket)} />
          <OzetKart baslik="Kıdem" veri={dagilim(panel.havuz.kidem, kidemEtiket)} />
          <OzetKart baslik="Toplam deneyim" veri={dagilim(panel.havuz.deneyim, deneyimEtiket)} />
          <OzetKart baslik="Elektrifikasyon" veri={dagilim(panel.havuz.elektrifikasyon, elektrifikasyonEtiket)} />
          <OzetKart baslik="Kanal" veri={dagilim(panel.havuz.kanal, kanalEtiket)} />
        </div>
      </section>

      {/* Temas özeti */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-ink">Temas talepleri</h2>
          <a href="/kariyer/talepler" className="text-sm text-accent hover:underline">Tümünü yönet →</a>
        </div>
        <div className="rounded-lg border border-warm-border p-4">
          <p className="text-sm text-ink mb-2">Toplam <strong>{panel.temas.toplam}</strong> temas talebi</p>
          <ul className="space-y-1">
            {dagilim(panel.temas.durumlar).map(([d, n]) => (
              <li key={d} className="flex justify-between gap-3 text-sm text-warm-600">
                <span>{d}</span><span className="text-warm-400 tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
