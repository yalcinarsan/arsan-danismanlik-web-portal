-- Aday "kanal" enum'una "Medya / İçerik üreticisi" değeri eklendi.
-- Şimdilik TEK birleşik değer (medya + içerik üreticisi/influencer birlikte);
-- havuzda bu segment büyür ve kurumlar bu ayrımla filtrelemeye başlarsa
-- ileride ayrı bir 'icerik_ureticisi' değeri eklenerek bölünür.
-- Etiket ('Medya / İçerik üreticisi') ön yüzde src/lib/adayTaksonomi.ts'te.
alter type public.kanal add value if not exists 'medya';
