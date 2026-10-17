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
  aktif: boolean; tur: 'yonetici' | 'test' | 'ucretli' | 'demo';
  toplam_temas: number; bekleyen_temas: number;
};
type TemasSatir = { kurum: string | null; aday_ad: string | null; durum: string; olusturuldu: string; yanit_ts: string | null };
type AdaySatir = { id?: string; ad: string | null; son_pozisyon: string | null; sehir: string | null; created_at: string };
type Dagilim = Record<string, number>;
export type Panel = {
  ozet: {
    aday_toplam: number; kurum_dis: number; kurum_aktif: number;
    ucretli: number; demo: number; demo_aktif: number; ic_hesap: number;
    temas_toplam: number; temas_bekleyen: number; temas_kabul: number; temas_ret: number;
  };
  kurumlar: Kurum[];
  havuz: { toplam: number; deneyim: Dagilim; kidem: Dagilim; fonksiyon: Dagilim; kanal: Dagilim; elektrifikasyon: Dagilim };
  temas: { toplam: number; durumlar: Dagilim };
  temas_son: TemasSatir[];
  adaylar_son: AdaySatir[];
  talep_profilleri?: {
    talep: number; aday: number; kurum: number; kabul: number;
    fonksiyon: Dagilim; kanal: Dagilim; kidem: Dagilim; bolge: Dagilim; elektrifikasyon: Dagilim;
  };
};

const dtFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const gunFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
function tarih(s: string | null) { return s ? dtFmt.format(new Date(s)) : null; }
function gun(s: string | null) { return s ? gunFmt.format(new Date(s)) : null; }
function kalanGun(s: string | null): string {
  if (!s) return 'süresiz';
  const g = Math.ceil((new Date(s).getTime() - Date.now()) / 86400000);
  return g > 0 ? `${g} gün kaldı` : 'doldu';
}
function dagilim(obj: Dagilim | undefined, fn?: (v: string) => string): [string, number][] {
  if (!obj) return [];
  return Object.entries(obj).map(([k, v]) => [fn ? fn(k) : k, v] as [string, number]).sort((a, b) => b[1] - a[1]);
}

// ———————————————————————————————————————————————————————————————
// Yapı taşları — yeni modül eklemek = bir <Modul> daha koymak.
// ———————————————————————————————————————————————————————————————

function Gosterge({ sayi, etiket, alt, href, vurgu }: {
  sayi: number | string; etiket: string; alt?: string; href?: string; vurgu?: boolean;
}) {
  const govde = (
    <>
      <p className={`text-3xl font-semibold tabular-nums ${vurgu ? 'text-accent' : 'text-ink'}`}>{sayi}</p>
      <p className="text-sm text-warm-600 mt-1 leading-tight">{etiket}</p>
      {alt && <p className="text-xs text-warm-400 mt-0.5">{alt}</p>}
    </>
  );
  const cls = `rounded-xl border p-4 ${vurgu ? 'border-accent/40 bg-accent/5' : 'border-warm-border bg-white'}`;
  return href
    ? <a href={href} className={`${cls} block transition-colors hover:border-accent/60`}>{govde}</a>
    : <div className={cls}>{govde}</div>;
}

function Modul({ baslik, aksiyon, not, cocuk, className = '' }: {
  baslik: string; aksiyon?: { metin: string; href: string }; not?: string;
  cocuk: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-xl border border-warm-border bg-white p-5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-base font-semibold text-ink">{baslik}</h2>
          {not && <span className="text-xs text-warm-400">{not}</span>}
        </div>
        {aksiyon && <a href={aksiyon.href} className="text-sm text-accent hover:underline whitespace-nowrap">{aksiyon.metin} →</a>}
      </div>
      {cocuk}
    </section>
  );
}

const TUR_ROZET: Record<Kurum['tur'], { metin: string; cls: string }> = {
  ucretli: { metin: 'ücretli', cls: 'bg-accent text-white' },
  demo: { metin: 'pilot', cls: 'bg-accent/10 text-accent' },
  test: { metin: 'test', cls: 'bg-warm-border/50 text-warm-600' },
  yonetici: { metin: 'yönetici', cls: 'bg-warm-border/50 text-warm-600' },
};

const DURUM_ROZET: Record<string, { metin: string; cls: string }> = {
  yeni: { metin: 'yeni', cls: 'bg-accent/10 text-accent' },
  iletildi: { metin: 'adaya iletildi', cls: 'bg-accent/10 text-accent' },
  kabul: { metin: 'kabul', cls: 'bg-ink/10 text-ink' },
  ret: { metin: 'ret', cls: 'bg-warm-border/50 text-warm-500' },
};
function durumRozet(d: string) { return DURUM_ROZET[d] ?? { metin: d, cls: 'bg-warm-border/50 text-warm-600' }; }

function OzetKart({ baslik, veri }: { baslik: string; veri: [string, number][] }) {
  if (veri.length === 0) return null;
  const enYuksek = veri[0]?.[1] || 1;
  return (
    <div className="rounded-lg border border-warm-border p-4">
      <p className="text-sm font-medium text-ink mb-2.5">{baslik}</p>
      <ul className="space-y-1.5">
        {veri.map(([e, n]) => (
          <li key={e} className="text-sm text-warm-600">
            <div className="flex justify-between gap-3">
              <span>{e}</span><span className="text-warm-400 tabular-nums">{n}</span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-sand overflow-hidden">
              <div className="h-full rounded-full bg-accent/50" style={{ width: `${Math.round((n / enYuksek) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KurumSatir({ x }: { x: Kurum }) {
  const bakti = !!x.son_erisim;
  const rozet = TUR_ROZET[x.tur];
  return (
    <div className={`rounded-lg border p-3.5 ${x.aktif ? 'border-warm-border' : 'border-warm-border/60 bg-warm-border/10'}`}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="font-medium text-ink">{x.kurum}</span>
        <span className={`text-xs rounded px-1.5 py-0.5 ${rozet.cls}`}>{rozet.metin}</span>
        {(x.tur === 'demo' || x.tur === 'ucretli') && (
          <span className={`text-xs rounded px-1.5 py-0.5 ${x.aktif ? 'bg-sand text-warm-600' : 'bg-ink/5 text-ink'}`}>
            {x.aktif ? kalanGun(x.gecerlilik) : 'süresi doldu'}
          </span>
        )}
        {x.bekleyen_temas > 0 && (
          <span className="text-xs rounded px-1.5 py-0.5 bg-accent/10 text-accent font-medium">{x.bekleyen_temas} bekleyen</span>
        )}
      </div>
      <p className="text-sm text-warm-600 mt-1.5">
        {bakti
          ? <>Son giriş: <strong className="text-ink font-medium">{tarih(x.son_erisim)}</strong> · {x.erisim_sayisi} kez</>
          : <span className="text-accent">Henüz girmedi — davet gitti</span>}
        {x.toplam_temas > 0 && <> · {x.toplam_temas} temas</>}
      </p>
      <p className="text-xs text-warm-400 mt-0.5">{x.eposta}{x.aciklama ? ` · ${x.aciklama}` : ''}</p>
    </div>
  );
}

// ———————————————————————————————————————————————————————————————

export default function YoneticiPanel() {
  const [durum, setDurum] = useState<'yukleniyor' | 'eposta' | 'gonderildi' | 'yetkisiz' | 'panel'>('yukleniyor');
  const [eposta, setEposta] = useState('');
  const [oturumEpostasi, setOturumEpostasi] = useState('');
  const [hata, setHata] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);
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

  async function yenile() {
    setYenileniyor(true);
    const { data, error } = await supabase.rpc('admin_panel');
    if (!error && data) setPanel(data as Panel);
    setYenileniyor(false);
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
  return (
    <PanelGovde panel={panel} oturumEpostasi={oturumEpostasi} onYenile={yenile} onCikis={cikisYap} yenileniyor={yenileniyor} />
  );
}

// Sunum katmanı — auth/fetch'ten ayrı, böylece test/önizleme için gerçek ya da
// örnek veriyle doğrudan beslenebilir.
export function PanelGovde({ panel, oturumEpostasi, onYenile, onCikis, yenileniyor }: {
  panel: Panel; oturumEpostasi: string; onYenile: () => void; onCikis: () => void; yenileniyor: boolean;
}) {
  const { ozet } = panel;
  const tp = panel.talep_profilleri;
  const dis = panel.kurumlar.filter((x) => x.tur === 'demo' || x.tur === 'ucretli');
  const ic = panel.kurumlar.filter((x) => x.tur === 'test' || x.tur === 'yonetici');

  return (
    <div className="space-y-8">
      {/* Üst bar: oturum + yenile */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-warm-500">Giriş: <strong className="text-warm-600 font-medium">{oturumEpostasi}</strong></span>
        <div className="flex items-center gap-4">
          <button type="button" onClick={onYenile} disabled={yenileniyor} className="text-accent hover:underline disabled:opacity-50">
            {yenileniyor ? 'Yenileniyor…' : 'Yenile'}
          </button>
          <button type="button" onClick={onCikis} className="text-warm-500 hover:text-ink hover:underline">Çıkış</button>
        </div>
      </div>

      {/* Göstergeler */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Gosterge sayi={ozet.aday_toplam} etiket="Aday havuzu" alt="Kayıtlı profil" href="/kariyer/adaylar" />
        <Gosterge sayi={ozet.kurum_aktif} etiket="Aktif kurum" alt={`${ozet.demo_aktif} pilot · ${ozet.ucretli} ücretli`} />
        <Gosterge sayi={ozet.temas_bekleyen} etiket="Bekleyen temas" alt={ozet.temas_bekleyen > 0 ? 'yanıt bekliyor' : 'hepsi yanıtlandı'} href="/kariyer/talepler" vurgu={ozet.temas_bekleyen > 0} />
        <Gosterge sayi={ozet.temas_kabul} etiket="Kabul edilen" alt={`${ozet.temas_toplam} talebin ${ozet.temas_kabul}'i`} />
        <Gosterge sayi={ozet.temas_toplam} etiket="Toplam temas" alt={`${ozet.temas_ret} ret`} href="/kariyer/talepler" />
      </div>

      {/* Modüller */}
      {/* grid-cols-1 = minmax(0,1fr): telefonda uzun içerik (e-posta, kurum adı) sütunu ekrandan taşırmasın */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Temas talepleri */}
        <Modul baslik="Temas talepleri" not={`${ozet.temas_toplam} talep`} aksiyon={{ metin: 'Tümünü yönet', href: '/kariyer/talepler' }}
          cocuk={
            panel.temas_son.length === 0
              ? <p className="text-sm text-warm-500">Henüz temas talebi yok.</p>
              : <ul className="divide-y divide-warm-border/70">
                  {panel.temas_son.map((t, i) => {
                    const r = durumRozet(t.durum);
                    return (
                      <li key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-sm text-ink truncate">
                            <strong className="font-medium">{t.kurum || 'Kurum'}</strong>
                            <span className="text-warm-400"> → </span>
                            {t.aday_ad || 'Aday'}
                          </p>
                          <p className="text-xs text-warm-400">{gun(t.olusturuldu)}{t.yanit_ts ? ` · yanıt ${gun(t.yanit_ts)}` : ''}</p>
                        </div>
                        <span className={`shrink-0 text-xs rounded px-1.5 py-0.5 ${r.cls}`}>{r.metin}</span>
                      </li>
                    );
                  })}
                </ul>
          } />

        {/* Kurum erişimleri */}
        <Modul baslik="Kurum erişimleri" not={`${ozet.kurum_dis} dış · ${ozet.ic_hesap} iç`}
          cocuk={
            <div className="space-y-3">
              {dis.map((x) => <KurumSatir key={x.eposta} x={x} />)}
              {ic.length > 0 && (
                <details className="rounded-lg border border-dashed border-warm-border/70 bg-sand/40">
                  <summary className="cursor-pointer select-none px-3.5 py-2.5 text-sm text-warm-500">
                    İç hesaplar ({ic.length}) — yönetici & test, sayıma dahil değil
                  </summary>
                  <div className="space-y-3 p-3.5 pt-0">
                    {ic.map((x) => <KurumSatir key={x.eposta} x={x} />)}
                  </div>
                </details>
              )}
            </div>
          } />

        {/* Son kayıtlar — kutu içinde kayar; satır adayın kartını yeni sekmede açar (/kariyer/adaylar?aday=<id>) */}
        <Modul baslik="Son kayıtlar" not={`son ${panel.adaylar_son.length} · havuzda ${ozet.aday_toplam}`} aksiyon={{ metin: 'Adaylar', href: '/kariyer/adaylar' }}
          cocuk={
            panel.adaylar_son.length === 0
              ? <p className="text-sm text-warm-500">Kayıt yok.</p>
              : <ul className="divide-y divide-warm-border/70 max-h-80 overflow-y-auto overscroll-contain -mx-2 px-2">
                  {panel.adaylar_son.map((a, i) => {
                    const icerik = (
                      <>
                        <div className="min-w-0">
                          <p className="text-sm text-ink truncate font-medium">{a.ad || '(isimsiz)'}</p>
                          <p className="text-xs text-warm-400 truncate">{[a.son_pozisyon, a.sehir].filter(Boolean).join(' · ') || '—'}</p>
                        </div>
                        <span className="shrink-0 text-xs text-warm-400">{gun(a.created_at)}</span>
                      </>
                    );
                    return (
                      <li key={a.id ?? i}>
                        {a.id
                          ? <a href={`/kariyer/adaylar?aday=${a.id}`} target="_blank" rel="noopener"
                              className="flex items-center justify-between gap-3 py-2.5 -mx-2 px-2 rounded hover:bg-sand/60 focus-visible:bg-sand/60 transition-colors">
                              {icerik}
                            </a>
                          : <div className="flex items-center justify-between gap-3 py-2.5">{icerik}</div>}
                      </li>
                    );
                  })}
                </ul>
          } />

        {/* Talep alan profiller — kurumların gerçekte ne aradığı, mevcut temas taleplerinden (yeni kayıt toplamadan).
            Filtre kullanım kaydı bilinçli olarak ertelendi; kurum sayısı artınca yeniden düşünülecek. */}
        <Modul baslik="Talep alan profiller"
          not={tp ? `${tp.talep} talep · ${tp.aday} aday · ${tp.kurum} kurum` : undefined}
          aksiyon={{ metin: 'Talepler', href: '/kariyer/talepler' }}
          cocuk={
            !tp || tp.talep === 0
              ? <p className="text-sm text-warm-500">Henüz temas talebi yok.</p>
              : <>
                  <p className="text-xs text-warm-400 mb-3">
                    Kurumların temas talebi gönderdiği adaylar · iç ve test hesapları hariç
                    {tp.kurum === 1 && ' · şimdilik tek kurumun tercihleri'}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <OzetKart baslik="Fonksiyon" veri={dagilim(tp.fonksiyon, fonksiyonEtiket).slice(0, 5)} />
                    <OzetKart baslik="Kanal" veri={dagilim(tp.kanal, kanalEtiket).slice(0, 5)} />
                    <OzetKart baslik="Kıdem" veri={dagilim(tp.kidem, kidemEtiket)} />
                    <OzetKart baslik="Bölge" veri={dagilim(tp.bolge)} />
                  </div>
                </>
          } />
      </div>

      {/* Havuz dağılımı — tam genişlik */}
      <Modul baslik="Havuz dağılımı" not={`${panel.havuz.toplam} aday`}
        cocuk={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <OzetKart baslik="Fonksiyon" veri={dagilim(panel.havuz.fonksiyon, fonksiyonEtiket)} />
            <OzetKart baslik="Kıdem" veri={dagilim(panel.havuz.kidem, kidemEtiket)} />
            <OzetKart baslik="Toplam deneyim" veri={dagilim(panel.havuz.deneyim, deneyimEtiket)} />
            <OzetKart baslik="Elektrifikasyon" veri={dagilim(panel.havuz.elektrifikasyon, elektrifikasyonEtiket)} />
            <OzetKart baslik="Kanal" veri={dagilim(panel.havuz.kanal, kanalEtiket)} />
          </div>
        } />
    </div>
  );
}
