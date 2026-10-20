import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  deneyimEtiket, kanalEtiket, fonksiyonEtiket, kidemEtiket,
  elektrifikasyonEtiket, calismaEtiket, aciklikEtiket, gorunurlukEtiket, iliskiEtiket,
} from '../lib/adayTaksonomi';
import { anlasilirHata } from '../lib/hataMesaji';
import { inputCls, labelCls } from '../lib/formStil';
import { useOturum, oturumuKapat, GirisFormu, OturumSatiri } from './ortak/Giris';
import { Satir } from './ortak/Parcalar';

type Aday = {
  ad: string; eposta: string; telefon: string | null;
  deneyim_yili: string; son_pozisyon: string | null; son_kurum: string | null;
  kanal: string[]; fonksiyon: string[]; kidem: string; elektrifikasyon: string;
  markalar: string[]; diller: { dil: string }[];
  sehir: string | null; calisma_tercihi: string | null; aciklik: string | null;
  sertifikalar: string | null; serbest_metin: string | null; gorunurluk: string; cv_path: string | null;
  created_at: string;
};

export type Referans = {
  id: string; ad: string; eposta: string; kurum_unvan: string | null; iliski: string;
  talep_ts: string | null; talep_sayisi: number; yorum: string | null; yorum_ts: string | null;
};
const gunFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const TALEP_SONUC: Record<string, string> = {
  gonderildi: 'Talep gönderildi.',
  bekle: 'Bu kişiye son 24 saat içinde zaten talep gönderdin; biraz bekle.',
  sinir: 'Bu kişiye en fazla 3 kez talep gönderilebilir.',
  yanitlandi: 'Bu kişi görüşünü zaten yazdı.',
};

/** Silme onayı için kullanıcının yazması gereken ifade. */
const SILME_ONAY_IFADESI = 'KAYDIMI SİL';

/**
 * Onay karşılaştırması. Büyük/küçük harf ve noktalı/noktasız İ-I farkını tolere eder:
 * "SIL" ile "SİL" arasındaki fark klavye/alışkanlık kaynaklıdır, niyet eksikliği değil —
 * kişi yine de tüm ifadeyi yazmak zorunda.
 */
function onayEslesti(girilen: string) {
  const sadelestir = (s: string) => s.trim().toLocaleUpperCase('tr').replace(/İ/g, 'I');
  return sadelestir(girilen) === sadelestir(SILME_ONAY_IFADESI);
}

export default function ProfilimGorunumu() {
  const [durum, setDurum] = useState<'yukleniyor' | 'eposta' | 'aranıyor' | 'bulunamadi' | 'gorunum' | 'silindi' | 'cikildi'>('yukleniyor');
  const [oturumEpostasi, setOturumEpostasi] = useState('');
  const [hata, setHata] = useState('');
  const [aday, setAday] = useState<Aday | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  // Silme akışı: tehlikeli kontrol varsayılan olarak GİZLİ; açıldıktan sonra da
  // onay ifadesi birebir yazılmadan silme düğmesi etkinleşmiyor. Amaç, "okumadan
  // onayla" refleksini kırmak.
  const [silmeAcik, setSilmeAcik] = useState(false);
  const [silmeOnayi, setSilmeOnayi] = useState('');
  const [siliniyor, setSiliniyor] = useState(false);
  const [referanslar, setReferanslar] = useState<Referans[]>([]);
  const [refIslem, setRefIslem] = useState<string | null>(null);
  const [refMesaj, setRefMesaj] = useState<Record<string, string>>({});

  useOturum(() => getirKayit(), () => setDurum('eposta'));

  async function getirKayit() {
    setDurum('aranıyor');
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { setDurum('eposta'); return; }
    setOturumEpostasi(sess.session?.user.email ?? '');
    const { data, error } = await supabase.from('adaylar').select('*').eq('user_id', uid).maybeSingle();
    if (error || !data) { setDurum('bulunamadi'); return; }
    setAday(data as Aday);
    if (data.cv_path) {
      const { data: signed } = await supabase.storage.from('cv').createSignedUrl(data.cv_path, 60 * 10);
      if (signed) setCvUrl(signed.signedUrl);
    }
    await referanslariGetir();
    setDurum('gorunum');
  }

  async function referanslariGetir() {
    const { data } = await supabase.rpc('referanslarim');
    setReferanslar((data ?? []) as Referans[]);
  }

  /** Aday, referansına kişiye özel linki içeren e-postayı kendisi gönderir (sunucuda 24 saat ve 3 gönderim sınırı). */
  async function talepGonder(id: string) {
    setRefIslem(id);
    const { data, error } = await supabase.rpc('referans_talep_gonder', { p_id: id });
    setRefIslem(null);
    setRefMesaj((m) => ({ ...m, [id]: error ? anlasilirHata(error) : TALEP_SONUC[String(data)] ?? '' }));
    await referanslariGetir();
  }

  /**
   * Yalnızca tarayıcı oturumunu kapatır — hesap ve veriler durur (silme DEĞİL).
   * Ortak/paylaşımlı cihazlarda profilin bir sonraki kişiye açık kalmaması için.
   */
  async function cikisYap() {
    await oturumuKapat();
    setAday(null);
    setCvUrl(null);
    setOturumEpostasi('');
    setDurum('cikildi');
  }

  /**
   * KVKK silme hakkı. Önce (varsa) CV dosyası, sonra profil satırı silinir; ardından
   * oturum kapatılır. Not: giriş hesabının kendisi (yalnızca e-posta adresini tutan
   * auth kaydı) tarayıcıdan silinemiyor — yönetici yetkisi gerekiyor.
   */
  async function kaydiSil() {
    if (!onayEslesti(silmeOnayi)) return;
    setHata(''); setSiliniyor(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    // CV silinemezse profili de silme: aksi halde sahibi olmayan bir özgeçmiş depoda kalır.
    if (aday?.cv_path) {
      const { error: cvHata } = await supabase.storage.from('cv').remove([aday.cv_path]);
      if (cvHata) { setHata(anlasilirHata(cvHata, 'silme')); setSiliniyor(false); return; }
    }
    const { error } = await supabase.from('adaylar').delete().eq('user_id', uid);
    if (error) { setHata(anlasilirHata(error, 'silme')); setSiliniyor(false); return; }
    await supabase.auth.signOut();
    setSiliniyor(false);
    setDurum('silindi');
  }

  if (durum === 'yukleniyor' || durum === 'aranıyor') return <p className="text-warm-500">Yükleniyor…</p>;

  if (durum === 'cikildi')
    return (
      <div className="rounded-lg border border-warm-border bg-sand p-8">
        <h2 className="text-xl font-semibold text-ink mb-2">Çıkış yaptın.</h2>
        <p className="text-warm-600 mb-4">
          Oturumun bu tarayıcıda kapatıldı. Profilin ve bilgilerin duruyor — dilediğin
          zaman e-postanla yeniden giriş yapabilirsin.
        </p>
        <a href="/kariyer/profilim" className="text-accent hover:underline">Yeniden giriş yap</a>
      </div>
    );

  if (durum === 'silindi')
    return (
      <div className="rounded-lg border border-warm-border bg-sand p-8">
        <h2 className="text-xl font-semibold text-ink mb-2">Kaydın silindi.</h2>
        <p className="text-warm-600 mb-4">
          Profil bilgilerin havuzdan kaldırıldı ve oturumun kapatıldı. Dilediğin zaman
          yeniden kaydolabilirsin.
        </p>
        <a href="/kariyer/kayit" className="text-accent hover:underline">Yeniden kaydol</a>
      </div>
    );

  if (durum === 'eposta')
    return (
      <GirisFormu
        aciklama="Profilini görüntülemek için e-postanı gir; sana bir giriş bağlantısı yollayacağız (şifre yok)."
        gonderildiNotu="Gelen kutunu (ve spam'i) kontrol et, bağlantıya tıkla — buraya geri dönüp profilini göreceksin."
      />
    );

  // Hesap satırı burada da var: "kaydın yok" çoğu zaman başka bir e-postayla girildiği içindir.
  if (durum === 'bulunamadi')
    return (
      <>
        <OturumSatiri eposta={oturumEpostasi} onCikis={cikisYap} className="mb-6" />
        <div className="rounded-lg border border-warm-border bg-sand p-8">
          <h2 className="text-xl font-semibold text-ink mb-2">Henüz bir kaydın yok.</h2>
          <p className="text-warm-600 mb-4">Bu e-posta ile daha önce havuza katılmamışsın.</p>
          <a href="/kariyer/kayit" className="inline-block rounded-md bg-accent px-5 py-2.5 text-white font-medium hover:opacity-90">
            Havuza katıl
          </a>
        </div>
      </>
    );

  if (!aday) return null;

  return (
    <div>
      <OturumSatiri eposta={oturumEpostasi} onCikis={cikisYap} className="mb-6">
        <a href="/kariyer/kayit" className="text-accent hover:underline">Profilimi düzenle</a>
      </OturumSatiri>
      <dl>
        <Satir genis etiket="Ad Soyad" deger={aday.ad} />
        <Satir genis etiket="E-posta" deger={aday.eposta} />
        <Satir genis etiket="Telefon" deger={aday.telefon} />
        <Satir genis etiket="Toplam deneyim" deger={deneyimEtiket(aday.deneyim_yili)} />
        <Satir genis etiket="Kıdem" deger={kidemEtiket(aday.kidem)} />
        <Satir genis etiket="Son pozisyon" deger={aday.son_pozisyon} />
        <Satir genis etiket="Son kurum" deger={aday.son_kurum} />
        <Satir genis etiket="Kanal" deger={aday.kanal?.map(kanalEtiket).join(', ')} />
        <Satir genis etiket="Fonksiyon" deger={aday.fonksiyon?.map(fonksiyonEtiket).join(', ')} />
        <Satir genis etiket="Elektrifikasyon" deger={elektrifikasyonEtiket(aday.elektrifikasyon)} />
        <Satir genis etiket="Markalar" deger={aday.markalar?.join(', ')} />
        <Satir genis etiket="Yabancı diller" deger={aday.diller?.map((d) => d.dil).join(', ')} />
        <Satir genis etiket="Şehir" deger={aday.sehir} />
        <Satir genis etiket="Çalışma tercihi" deger={calismaEtiket(aday.calisma_tercihi)} />
        <Satir genis etiket="Fırsatlara açıklık" deger={aciklikEtiket(aday.aciklik)} />
        <Satir genis etiket="Eğitim ve sertifikalar" deger={aday.sertifikalar} />
        <Satir genis etiket="Seni en iyi anlatan" deger={aday.serbest_metin} />
        <Satir genis etiket="Görünürlük" deger={gorunurlukEtiket(aday.gorunurluk)} />
        <Satir genis etiket="CV" deger={cvUrl && (
          <a href={cvUrl} target="_blank" rel="noopener" className="text-accent hover:underline">Görüntüle</a>
        )} />
        <Satir genis etiket="Kayıt tarihi" deger={new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(aday.created_at))} />
      </dl>

      {/* Referanslar: talebi aday kendisi gönderir; gelen görüşü okur, gizleyemez. */}
      <ProfilReferanslari referanslar={referanslar} refIslem={refIslem} refMesaj={refMesaj} onGonder={talepGonder} />

      {/* KVKK silme hakkı. Bilinçli olarak sayfanın en altında, sessiz ve iki aşamalı:
          önce gizli, sonra yazarak onay. */}
      <div className="mt-16 pt-8 border-t border-warm-border">
        {!silmeAcik ? (
          <button
            type="button"
            onClick={() => setSilmeAcik(true)}
            className="text-sm text-warm-400 hover:text-warm-600 underline underline-offset-4"
          >
            Kaydımı silmek istiyorum
          </button>
        ) : (
          <div className="rounded-md border border-warm-border bg-sand p-5">
            <h2 className="text-base font-semibold text-ink mb-2">Kaydını silmek üzeresin</h2>
            <p className="text-sm text-warm-600 leading-relaxed mb-2">
              Profil bilgilerin ve (varsa) yüklediğin CV havuzdan kalıcı olarak silinir.
              <strong className="font-medium text-ink"> Bu işlem geri alınamaz.</strong> Dilediğin
              zaman yeniden kaydolabilirsin, ama bilgilerin sıfırdan girilir.
            </p>
            <p className="text-sm text-warm-600 leading-relaxed mb-4">
              Sadece bir süre görünmek istemiyorsan, silmek yerine{' '}
              <a href="/kariyer/kayit" className="text-accent hover:underline">görünürlük seviyeni</a>{' '}
              değiştirmeyi de düşünebilirsin.
            </p>

            <label className={labelCls}>
              Onaylamak için aşağıya <span className="font-semibold text-ink">{SILME_ONAY_IFADESI}</span> yaz
            </label>
            <input
              value={silmeOnayi}
              onChange={(e) => setSilmeOnayi(e.target.value)}
              className={`${inputCls} max-w-xs`}
              placeholder={SILME_ONAY_IFADESI}
              autoComplete="off"
            />

            {hata && <p className="mt-3 text-sm text-accent">{hata}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={kaydiSil}
                disabled={siliniyor || !onayEslesti(silmeOnayi)}
                className="rounded-md bg-red-700 px-5 py-2.5 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {siliniyor ? 'Siliniyor…' : 'Kaydımı kalıcı olarak sil'}
              </button>
              <button
                type="button"
                onClick={() => { setSilmeAcik(false); setSilmeOnayi(''); setHata(''); }}
                className="text-sm text-warm-500 hover:text-ink"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Profildeki referans listesi ve "Referans talebi gönder" düğmeleri. Önizlenebilsin diye ayrı. */
export function ProfilReferanslari({ referanslar, refIslem, refMesaj, onGonder }: {
  referanslar: Referans[]; refIslem: string | null; refMesaj: Record<string, string>; onGonder: (id: string) => void;
}) {
  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-ink">Referanslarım</h2>
        <a href="/kariyer/kayit" className="text-sm text-accent hover:underline">
          {referanslar.length ? 'Referansları düzenle' : 'Referans ekle'}
        </a>
      </div>
      {referanslar.length === 0 ? (
        <p className="text-sm text-warm-500">
          Henüz referans eklemedin. Seninle çalışmış en fazla 3 kişiyi ekleyebilir, onlardan görüş isteyebilirsin;
          yazdıkları görüş profilinde ve görüşmeyi kabul ettiğin kurumlarda görünür.
        </p>
      ) : (
        <ul className="space-y-3">
          {referanslar.map((r) => {
            const bekliyor = !!r.talep_ts && Date.now() - new Date(r.talep_ts).getTime() < 24 * 3600 * 1000;
            return (
              <li key={r.id} className="rounded-md border border-warm-border p-4">
                <p className="text-ink font-medium">{r.ad}</p>
                <p className="text-sm text-warm-500">
                  {[iliskiEtiket(r.iliski), r.kurum_unvan, r.eposta].filter(Boolean).join(' · ')}
                </p>
                {r.yorum ? (
                  <div className="mt-3">
                    <p className="text-xs text-warm-500 mb-1">Görüşünü yazdı · {r.yorum_ts ? gunFmt.format(new Date(r.yorum_ts)) : ''}</p>
                    <p className="text-sm text-ink whitespace-pre-line leading-relaxed">{r.yorum}</p>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-warm-600">
                      {r.talep_ts ? `Talep gönderildi · ${gunFmt.format(new Date(r.talep_ts))}` : 'Talep henüz gönderilmedi'}
                    </span>
                    {r.talep_sayisi < 3 && !bekliyor && (
                      <button type="button" onClick={() => onGonder(r.id)} disabled={refIslem === r.id}
                        className="rounded-md bg-accent px-4 py-1.5 text-sm text-white font-medium disabled:opacity-60">
                        {refIslem === r.id ? 'Gönderiliyor…' : r.talep_ts ? 'Yeniden gönder' : 'Referans talebi gönder'}
                      </button>
                    )}
                  </div>
                )}
                {refMesaj[r.id] && <p className="mt-2 text-sm text-accent">{refMesaj[r.id]}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
