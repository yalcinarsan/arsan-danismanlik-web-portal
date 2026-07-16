import type { ChartConfig } from './evDataTransforms';

// Warm palette, aligned with the "Sıcak kağıt" theme.
const CLAY = '#b5623c';
const SLATE = '#4a6670';
const OLIVE = '#7a8b5a';
const INK = '#2c2620';
const STONE = '#857a69';

const LIGHT_DUTY = ['Cars', 'Vans'];

/** 1 — Dünya, güç ünitesine göre satış. Otomobil + hafif ticari toplamı. */
export const worldPowertrainConfig: ChartConfig = {
  kind: 'powertrain-sales',
  title: 'Dünya elektrikli araç satışları — güç ünitesine göre',
  yAxisTitle: 'Adet',
  series: [
    { region: 'World', parameter: 'EV sales', powertrain: 'BEV', modes: LIGHT_DUTY, label: 'BEV (tam elektrikli)', color: CLAY },
    { region: 'World', parameter: 'EV sales', powertrain: 'PHEV', modes: LIGHT_DUTY, label: 'PHEV (şarjlı hibrit)', color: SLATE },
    { region: 'World', parameter: 'EV sales', powertrain: 'FCEV', modes: LIGHT_DUTY, label: 'FCEV (yakıt hücreli)', color: OLIVE },
  ],
};

/** 2 — Adet olarak Dünya ve Avrupa. Türkiye ölçek farkı ve projeksiyon yokluğu nedeniyle 4. grafikte. */
export const regionSalesConfig: ChartConfig = {
  kind: 'region-sales',
  title: 'Elektrikli araç satışları — Dünya ve Avrupa',
  yAxisTitle: 'Adet',
  series: [
    { region: 'World', parameter: 'EV sales', powertrain: 'EV', modes: LIGHT_DUTY, label: 'Dünya', color: INK },
    { region: 'Europe', parameter: 'EV sales', powertrain: 'EV', modes: LIGHT_DUTY, label: 'Avrupa', color: SLATE },
  ],
};

/**
 * 3 — Pazar payı. Yalnızca otomobil: IEA paydayı (toplam pazar) yayınlamadığı için
 * otomobil ve hafif ticari payları toplanamaz; toplanırsa yanlış olur.
 */
export const regionShareConfig: ChartConfig = {
  kind: 'region-share',
  title: 'Elektrikli araç pazar payı — Dünya, Avrupa, Türkiye',
  yAxisTitle: 'Yeni otomobil satışları içindeki pay',
  percent: true,
  series: [
    { region: 'World', parameter: 'EV sales share', powertrain: 'EV', modes: ['Cars'], label: 'Dünya', color: INK },
    { region: 'Europe', parameter: 'EV sales share', powertrain: 'EV', modes: ['Cars'], label: 'Avrupa', color: SLATE },
    { region: 'Turkiye', parameter: 'EV sales share', powertrain: 'EV', modes: ['Cars'], label: 'Türkiye', color: CLAY },
  ],
};

/** 4 — Türkiye satış + pazar payı: satış (sol eksen) ve pazar payı (sağ eksen). */
export const turkiyeSatisConfig: ChartConfig = {
  kind: 'turkiye-detail',
  title: 'Türkiye — elektrikli otomobil satışı ve pazar payı',
  yAxisTitle: 'Adet',
  y2AxisTitle: 'Pazar payı',
  series: [
    { region: 'Turkiye', parameter: 'EV sales', powertrain: 'EV', modes: ['Cars'], label: 'Yıllık satış (adet)', color: CLAY },
    {
      region: 'Turkiye',
      parameter: 'EV sales share',
      powertrain: 'EV',
      modes: ['Cars'],
      label: 'Pazar payı (%)',
      color: SLATE,
      onRightAxis: true,
    },
  ],
};

/** 5 — Türkiye araç parkı (kümülatif stok), tek başına — satış/pazar payından çok farklı ölçekte. */
export const turkiyeStokConfig: ChartConfig = {
  kind: 'turkiye-detail',
  title: 'Türkiye — elektrikli otomobil araç parkı',
  yAxisTitle: 'Adet',
  series: [
    {
      region: 'Turkiye',
      parameter: 'EV stock',
      powertrain: 'EV',
      modes: ['Cars'],
      label: 'Araç parkı (adet)',
      color: STONE,
      // IEA Türkiye için projeksiyon yayınlamıyor; EPDK'nın 22/4/2026 tarihli, Orta
      // senaryo araç parkı (otomobil) projeksiyonu kullanıldı.
      projeksiyon2035: 5629051,
    },
  ],
};

export const evChartConfigs = [worldPowertrainConfig, regionSalesConfig, regionShareConfig, turkiyeSatisConfig, turkiyeStokConfig];
