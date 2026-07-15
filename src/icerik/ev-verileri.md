---
# EA Verileri sayfasının TÜM metni burada. Serbestçe düzenleyebilirsin.
#
# Bu dosyanın "---" işaretinden sonra gövdesi (düz yazı kısmı) YOK — bu bir hata
# değil, bilinçli: bu sayfanın metni Otomotiv İnsanı gibi tek akan bir yazı değil,
# sayfanın farklı yerlerine dağılan ayrı parçalardan oluşuyor (başlık, giriş, her
# grafiğin altındaki not, vb). Her alan adı (soldaki kelime), o metnin sayfada
# nereye yerleştiğini söylüyor.
#
# Uzun metinleri (giris, kesikli_metin, not_1_...) düzenlerken tırnak işareti
# KULLANMANA gerek yok — ">-" işaretinden sonraki satırları normal bir paragraf
# gibi istediğin yerden kır, boşluk bırak, uzat/kısalt. Kısa metinler (başlıklar
# gibi) tek satırlık tırnaklı string olarak kalıyor, onlarda tırnak korunmalı.
#
# Grafik notları (not_1_..., not_2_...) sırayla sayfadaki grafiklerle eşleşir;
# alan adının içindeki kelimeler o grafiğin konusunu söylüyor (dünya güç aktarma,
# dünya+avrupa satış, pazar payı, türkiye detay) — bu görüntüleyicide yorum
# satırları görünmediği için, eşleşme alan adının kendisinden anlaşılsın diye.
#
# Grafiklerin kendisi (renkler, veri, seriler) src/components/charts/chartConfigs.ts
# dosyasında — bu dosya sadece YAZI içerir, koda hiç dokunmaz.

baslik_tag: "EA Verileri"
aciklama: "IEA Global EV Outlook verisiyle dünya, Avrupa ve Türkiye elektrikli araç pazarının interaktif görünümü."

h1: "Elektrikli Araç Verileri"
giris: >-
  Dünya, Avrupa ve Türkiye elektrikli araç pazarının IEA verisine dayanan görünümü.
  Grafikler etkileşimlidir — üzerine gelerek yıl bazında değerleri okuyabilirsiniz.

kesikli_baslik: "Kesikli çizgiler ne anlama geliyor?"
kesikli_metin: >-
  IEA, 2025 sonrası için ara yıl yayınlamıyor; yalnızca 2035 yılına ait tek bir
  projeksiyon değeri veriyor. Grafiklerdeki kesikli çizgi, 2025'teki gerçekleşen
  değeri 2035 değerine bağlayan bir bağlantı çizgisi. Projeksiyonlar
  IEA'nın STEPS (Stated Policies Scenario) senaryosuna aittir: yani yürürlükteki ve açıklanmış politikaları esas alan, ne iyimser ne kötümser orta yollu bir çerçevedir.

# Aşağıdaki 4 not, grafiklerin ALTINDAKİ açıklama metinleri (figcaption). Her alan
# adı, hangi grafiğe ait olduğunu kendi başlığından anlaşılır tutuyor:

not_1_dunya_guc_aktarma_grafigi: >-
  Otomobil ve hafif ticari araç toplamı. BEV tam elektrikli, PHEV şarj edilebilir hibrit, FCEV yakıt hücreli araçları ifade eder. FCEV hacimleri adetsel olarak düşük düzeyde olduğu için grafikte neredeyse yatay görünür.

not_2_dunya_avrupa_satis_grafigi: >-
  Otomobil ve hafif ticari araç toplamı. Türkiye bu grafikte yer almıyor: ölçek farkı (dünya milyonlarla, Türkiye on binlerle ölçülüyor) çizgiyi okunamaz hale getiriyor ve IEA Türkiye için 2035 projeksiyonu yayınlamıyor. Türkiye verileri aşağıdaki kendi grafiğinde yer alıyor

not_3_pazar_payi_grafigi: >-
  Yalnızca otomobil. "Elektrikli araç" ifadesi burada BEV (tam elektrikli), PHEV
  (şarj edilebilir hibrit) ve FCEV (yakıt hücreli) araçların toplamını kapsar.
  IEA toplam pazar büyüklüğünü (paydayı) yayınlamadığı için otomobil ve hafif
  ticari araç payları toplanamaz. Türkiye çizgisi 2025'te biter — IEA Türkiye
  için projeksiyon yayınlamıyor.

not_4_turkiye_detay_grafigi: >-
  Sol eksen adet, sağ eksen pazar payı. Araç parkı, yollardaki toplam elektrikli
  otomobil sayısıdır; yani kümülatif adet gösterir. Pazar payı, BEV, PHEV ve
  FCEV toplamını kapsar.

kaynak_baslik: "Kaynak ve lisans"
kaynak_ek_metin: >-
  Tam veri setine, burada gösterilmeyen bölge ve metriklere IEA'nın kendi
  aracından ulaşabilirsiniz. Bu sayfa özet bir görünüm sunar; kaynağın yerini
  almayı amaçlamaz.
---
