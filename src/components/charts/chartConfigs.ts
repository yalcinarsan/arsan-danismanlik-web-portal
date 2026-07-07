import type { ChartConfig } from './evDataTransforms';

export const worldSalesConfig: ChartConfig = {
  kind: 'world-sales-stacked-area',
  title: 'Dünya Toplam Elektrikli Araç Satışı (Adet)',
  yAxisTitle: 'Adet',
  series: [
    { region: 'World', metrik: 'Satış', gercekTahmin: 'Historical', powertrain: 'BEV', label: 'BEV', color: '#1e40af' },
    { region: 'World', metrik: 'Satış', gercekTahmin: 'Historical', powertrain: 'PHEV', label: 'PHEV', color: '#d97706' },
    { region: 'World', metrik: 'Satış', gercekTahmin: 'Historical', powertrain: 'FCEV', label: 'FCEV', color: '#059669' },
  ],
};

export const marketShareConfig: ChartConfig = {
  kind: 'market-share-lines',
  title: 'Elektrikli Araç Pazar Payı — Dünya, Avrupa, Türkiye (%)',
  yAxisTitle: 'Pazar Payı',
  series: [
    { region: 'World', metrik: 'Pazar Payı', powertrain: 'EV', label: 'Dünya', color: '#333333' },
    { region: 'Europe', metrik: 'Pazar Payı', powertrain: 'EV', label: 'Avrupa', color: '#1e40af' },
    { region: 'Turkiye', metrik: 'Pazar Payı', powertrain: 'EV', label: 'Türkiye', color: '#dc2626' },
  ],
};

export const projection2035Config: ChartConfig = {
  kind: 'projection-2035-bar',
  title: 'Dünya EV Satış Projeksiyonu — 2035 (STEPS Senaryosu)',
  yAxisTitle: 'Adet',
  series: [
    { region: 'World', metrik: 'Satış', gercekTahmin: 'Projection-STEPS', powertrain: 'BEV', label: 'BEV', color: '#1e40af' },
    { region: 'World', metrik: 'Satış', gercekTahmin: 'Projection-STEPS', powertrain: 'PHEV', label: 'PHEV', color: '#d97706' },
    { region: 'World', metrik: 'Satış', gercekTahmin: 'Projection-STEPS', powertrain: 'FCEV', label: 'FCEV', color: '#059669' },
  ],
};

export const evChartConfigs = [worldSalesConfig, marketShareConfig, projection2035Config];
