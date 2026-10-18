// Referans işlevinin kullanıcıya görünen metinleri — tek yerde, düzenlemesi kolay olsun diye.
// Kaynak: cikti/taslaklar/referans-islevi-tasarim.md (proje kökünde). Metinler TASLAK:
// yayından önce Yalçın'la birlikte gözden geçirilecek; KVKK metni hukukçuya gösterilecek.
// Referansa giden e-postanın metni ayrıca supabase/functions/yeni-kayit-bildirim/index.ts içinde.
import { adDuzelt, ilgiEki } from './tanistirma';

/** Referans sayfasındaki açıklayıcı hitap (paragraflar). */
export function referansHitap(adayAdHam: string): { baslik: string; paragraflar: string[] } {
  const aday = adDuzelt(adayAdHam || 'Aday');
  return {
    baslik: `${aday} sizi Otomotiv İnsanı'nda referans olarak gösterdi.`,
    paragraflar: [
      `Otomotiv İnsanı, otomotiv sektörüne özgü bir yetenek havuzu. ${aday} ile birlikte çalıştığınız dönemi düşünerek gözlemlerinizi birkaç cümleyle paylaşabilir misiniz? Örneğin: hangi işte, ne kadar süre birlikte çalıştınız; güçlü yönleri neler; hangi ortamlarda en iyi katkıyı verir.`,
      'Yazdıklarınız kendisiyle ve görüşmeyi kabul ettiği kurumlarla paylaşılacak.',
    ],
  };
}

/** Metin kutusunun altındaki KVKK aydınlatması — HUKUKÇUYA GÖSTERİLECEK TASLAK. */
export function referansKvkk(adayAdHam: string): string {
  const aday = adDuzelt(adayAdHam || 'Aday');
  return (
    `Arsan Danışmanlık Ticaret Limited Şirketi, veri sorumlusu olarak; adınızı ve e-posta adresinizi ` +
    `${aday} tarafından referans olarak gösterilmeniz üzerine size bu talebi iletmek için; adınızı, ` +
    `kurum ve unvan bilginizi, adayla ilişkinizi ve bu sayfada yazdığınız görüşü ise ${ilgiEki(aday)} ` +
    `Otomotiv İnsanı profiline eklemek ve ${ilgiEki(aday)} görüşmeyi kabul ettiği kurumlarla paylaşmak ` +
    `amacıyla işler. E-posta adresiniz ve telefonunuz kurumlarla paylaşılmaz. Görüşünüzü göndermezseniz ` +
    `bilgileriniz bu amaç dışında kullanılmaz. Haklarınız ve ayrıntılar: arsandanismanlik.com.tr/kvkk`
  );
}

/** Gönder düğmesini açan açık rıza kutusu. */
export function referansRiza(adayAdHam: string): string {
  const aday = adDuzelt(adayAdHam || 'Aday');
  return `Yazdığım görüşün ${aday} ve ${ilgiEki(aday)} görüşmeyi kabul ettiği kurumlarla paylaşılmasına açık rıza veriyorum.`;
}

/** Aday formundaki bölüm açıklaması ve beyan kutusu. */
export const REFERANS_FORM_ACIKLAMA =
  'Seninle çalışmış ve seni tanıyan kişiler. Profilinden onlara bir referans talebi gönderebilirsin; ' +
  'yazdıkları görüş senin profilinde ve görüşmeyi kabul ettiğin kurumlarda görünür.';
export const REFERANS_FORM_BEYAN =
  'Referans olarak gösterdiğim kişilerin bilgisi dahilinde bu bilgileri paylaşıyorum.';
