export interface EvRow {
  region: string | null;
  gercekTahmin: string | null;
  metrik: string | null;
  aracTuru: string | null;
  powertrain: string | null;
  year: string | null;
  unit: string | null;
  value: number | null;
}

export interface EvDataFile {
  meta: { fetchedAt: string; sourceDoc: string; sourceTable: string; rowCount: number };
  rows: EvRow[];
}

export type ChartKind = 'world-sales-stacked-area' | 'market-share-lines' | 'projection-2035-bar';

export interface SeriesFilter {
  region: string;
  metrik: 'Satış' | 'Pazar Payı';
  gercekTahmin?: 'Historical' | 'Projection-STEPS';
  powertrain?: string;
  label: string;
  color: string;
}

export interface ChartConfig {
  kind: ChartKind;
  title: string;
  yAxisTitle: string;
  series: SeriesFilter[];
}

function matchesRow(row: EvRow, f: SeriesFilter): boolean {
  if (row.region !== f.region) return false;
  if (row.metrik !== f.metrik) return false;
  if (f.gercekTahmin && row.gercekTahmin !== f.gercekTahmin) return false;
  if (f.powertrain && row.powertrain !== f.powertrain) return false;
  return true;
}

/** Sums `value` across matching rows for each year, combining Otomobil + Hafif Ticari. */
function sumByYear(rows: EvRow[], f: SeriesFilter): { years: number[]; values: number[] } {
  const totals = new Map<number, number>();
  for (const row of rows) {
    if (!matchesRow(row, f) || !row.year || row.value == null) continue;
    const year = Number(row.year);
    totals.set(year, (totals.get(year) ?? 0) + row.value);
  }
  const years = Array.from(totals.keys()).sort((a, b) => a - b);
  return { years, values: years.map((y) => totals.get(y) as number) };
}

export function buildStackedSalesChart(rows: EvRow[], config: ChartConfig) {
  const traces = config.series.map((f) => {
    const { years, values } = sumByYear(rows, f);
    return {
      x: years,
      y: values,
      name: f.label,
      type: 'scatter' as const,
      mode: 'lines' as const,
      stackgroup: 'one',
      line: { color: f.color },
    };
  });

  return {
    data: traces,
    layout: {
      title: { text: config.title, font: { size: 15 }, x: 0.02, xanchor: 'left' as const },
      xaxis: { title: { text: 'Yıl' } },
      yaxis: { title: { text: config.yAxisTitle } },
      hovermode: 'x unified' as const,
      legend: { orientation: 'h' as const, y: -0.2 },
      margin: { t: 48, r: 16, l: 56, b: 64 },
      autosize: true,
    },
  };
}

export function buildMarketShareChart(rows: EvRow[], config: ChartConfig) {
  const traces = config.series.map((f) => {
    const historical = sumByYear(
      rows,
      { ...f, gercekTahmin: 'Historical' }
    );
    return {
      x: historical.years,
      y: historical.values,
      name: f.label,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      line: { color: f.color, width: 2 },
    };
  });

  return {
    data: traces,
    layout: {
      title: { text: config.title, font: { size: 15 }, x: 0.02, xanchor: 'left' as const },
      xaxis: { title: { text: 'Yıl' } },
      yaxis: { title: { text: config.yAxisTitle }, ticksuffix: '%' },
      hovermode: 'x unified' as const,
      legend: { orientation: 'h' as const, y: -0.2 },
      margin: { t: 48, r: 16, l: 56, b: 64 },
      autosize: true,
    },
  };
}

export function buildProjectionBarChart(rows: EvRow[], config: ChartConfig) {
  const labels = config.series.map((f) => f.label);
  const values = config.series.map((f) => {
    let total = 0;
    for (const row of rows) {
      if (matchesRow(row, f) && row.value != null) total += row.value;
    }
    return total;
  });

  return {
    data: [
      {
        x: labels,
        y: values,
        type: 'bar' as const,
        marker: { color: config.series.map((f) => f.color) },
      },
    ],
    layout: {
      title: { text: config.title, font: { size: 15 }, x: 0.02, xanchor: 'left' as const },
      yaxis: { title: { text: config.yAxisTitle } },
      margin: { t: 48, r: 16, l: 64, b: 48 },
      autosize: true,
    },
  };
}

export function buildPlotlyFigure(rows: EvRow[], config: ChartConfig) {
  switch (config.kind) {
    case 'world-sales-stacked-area':
      return buildStackedSalesChart(rows, config);
    case 'market-share-lines':
      return buildMarketShareChart(rows, config);
    case 'projection-2035-bar':
      return buildProjectionBarChart(rows, config);
  }
}
