-- Aday "fonksiyon" enum'una otomotivin teknik/endüstriyel yarısı eklendi.
-- Gerekçe: mevcut 8 fonksiyonun hepsi ticari/yönetsel/destek tarafıydı;
-- mühendislik, üretim, kalite, satınalma/tedarik hiç yoktu — özellikle yan
-- sanayi ve OEM adayları için boşluk (bir adayın geri bildirimi, 2026-10-01).
-- Birleşik 4 değer (öneriyi veren kişinin saydığı 6 dar maddeyi kapsar; liste
-- şişmesin ve OEM'e aşırı kaymasın diye konsolide edildi):
--   muhendislik_arge   = ürün mühendislik, Ar-Ge, tasarım
--   uretim_operasyon   = üretim, montaj, proses
--   kalite             = kalite güvence / kontrol (IATF vb.)
--   satinalma_tedarik  = satınalma, lojistik, tedarik zinciri
-- Etiketler ön yüzde src/lib/adayTaksonomi.ts'te. ENUM değeri KALICIDIR.
alter type public.fonksiyon add value if not exists 'muhendislik_arge';
alter type public.fonksiyon add value if not exists 'uretim_operasyon';
alter type public.fonksiyon add value if not exists 'kalite';
alter type public.fonksiyon add value if not exists 'satinalma_tedarik';
