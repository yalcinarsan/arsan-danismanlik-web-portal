# Makale Kapak Görseli Rehberi

Bu belge, Arsan Danışmanlık makalelerinde kullanılan karakalem kapak görsellerinin ortak üretim ve yayın standardıdır. Kapak kullanımı isteğe bağlıdır; yalnızca makalenin ana düşüncesine yeni bir okuma katmanı eklediğinde kullanılır.

## Görsel dil

- Temel estetik, sıcak kırık beyaz kâğıt üzerinde ayrıntılı grafit karakalemdir.
- Petrol yeşili sınırlı ve anlam taşıyan vurgu rengidir. Yeni olanı, dönüşümü, yönü veya çözümü işaret eder; yalnızca dekorasyon amacıyla kullanılmaz.
- Tercih edilen biçim 2:1 oranında, tek ve kesintisiz bir editoryal panoramadır.
- Görsel bir düşünceyi anlatır. Makaledeki her başlığı resme doldurmak yerine ana gerilimi, karşılaştırmayı veya dönüşümü görünür kılar.
- Kutu kutu bölünmüş infografik düzeninden; görsel içine başlık, açıklama, logo ve etiket yerleştirmekten kaçınılır.
- Nesnelerin anlatıdaki rolü açık olmalıdır. Aynı fikri tekrar eden veya anlamı olmayan araç, kişi ve dekor kullanılmaz.
- Teknik ilişkiler doğru kurulmalıdır: kablo ve bağlantılar tamamlanır, araç ve ekipmanın işlevi anlaşılır, anlamsız yazı ve sahte marka işaretleri bırakılmaz.
- Ana düşünce, sayfanın geniş kapak boyutunda kolayca okunmalı; dar ekranda küçüldüğünde de ana aktörler kaybolmamalıdır.

## Altyazı ve erişilebilirlik

Her kapakta iki ayrı metin bulunur:

- `alt`, görselde ne olduğunu görmeyen okur için nesnel ve betimleyici bir açıklamadır.
- `altyazi`, görsel ile makalenin tezi arasındaki bağı kuran kısa bir editoryal cümledir. Görseldeki bütün nesneleri saymaz ve görsel olmadan da anlamlıdır.

Kapak eklendiğinde bu iki alan da zorunludur. Altyazı görselin açıklamasını tekrarlamak yerine okura görseli hangi düşünceyle okuyacağını söyler.

## Üretim ve onay akışı

1. Makalenin ana fikri tek cümleye indirilir.
2. Görseldeki her ana öğenin bu fikir içindeki rolü belirlenir.
3. Karakalem dil, petrol yeşilinin işlevi ve 2:1 panorama korunarak ilk taslak üretilir.
4. Anlatı netliği, teknik tutarlılık, gereksiz öğeler, bağlantılar, anlamsız yazılar ve renk dengesi kontrol edilir.
5. Görsel ve altyazı birlikte değerlendirilir; kullanıcı onayından önce web makalesine veya vault’a eklenmez.
6. Yalnızca onaylanan son sürüm `public/images/articles/` altına alınır. Ara taslaklar GitHub deposunun dışında tutulur.
7. Onaylanan görsel ve altyazı, web makalesiyle birlikte Yazma Projeleri vault’undaki özgün nota da eklenir.
8. `npm run build` çalıştırılır; kapak masaüstü ve dar ekranda kontrol edilir.
9. Kullanıcının yayın onayından sonra `main` dalına gönderilir. Cloudflare Pages dağıtımı tamamlandığında canlı sayfa ayrıca doğrulanır.

## Web yerleşimi

Görsel `public/images/articles/<makale-klasörü>/` altında tutulur ve makalenin frontmatter bölümünde tanımlanır:

```yaml
kapakGorseli:
  src: "/images/articles/<makale-klasörü>/00-karakalem-<kısa-ad>-v1.png"
  alt: "Görselin nesnel betimi."
  altyazi: "Görsel ile makalenin ana düşüncesini bağlayan cümle."
```

Kapak, makalenin metin ve içerik navigasyonunu birlikte kapsayan genişliğini kullanır. Metin ile sağdaki “Bu sayfada” navigasyonu kapağın altında başlar.

## Obsidian eşleştirmesi

Onaylanan görsel, Yazma Projeleri vault’unda `attachments/` klasörüne kopyalanır. Mevcut frontmatter değiştirilmeden hemen altına görsel ve italik altyazı eklenir:

```markdown
![[ea-05-00-karakalem-yeni-ekonomi-v1.png]]

*Elektrikli araç tek başına yeni bir ürün değil; çevresinde yeni bir sanayi ve hizmet ekonomisi kuruyor.*
```

## Onaylanan ilk üç örnek

- **Aynı Kâr, Farklı Hikaye:** Aynı sonuca farklı miktarda kaynak bağlayan iki işletmenin karşılaştırması.
- **Müşteri Ne Diyor?:** Satıcının ürün anlatısı ile müşterinin kendi hayatındaki karşılığı arasındaki ayrım.
- **Otomotivde Yeni Ekonomi:** Mekanik parça dünyasından batarya, şarj, enerji, yazılım, hizmet ve ihracat ekosistemine geçiş.

Bu üç örnek sonraki üretimler için ton ve yaklaşım referansıdır; yeni görseller bunların kopyası olmak zorunda değildir.
