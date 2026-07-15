export interface EvRow {
  region: string;
  category: string;
  parameter: string;
  mode: string;
  powertrain: string;
  year: number;
  unit: string;
  value: number;
}

export interface EvDataFile {
  meta: {
    fetchedAt: string;
    source: string;
    sourceUrl: string;
    licence: string;
    licenceUrl: string;
    modifiedBy: string;
    excluded: string;
    rowCount: number;
  };
  rows: EvRow[];
}

export type ChartKind = 'powertrain-sales' | 'region-sales' | 'region-share' | 'turkiye-detail';

export interface SeriesDef {
  region: string;
  parameter: string;
  powertrain: string;
  /** Modes summed together. Shares are never summed — see chartConfigs. */
  modes: string[];
  label: string;
  color: string;
  /** turkiye-detail only: plot against the right-hand percentage axis. */
  onRightAxis?: boolean;
}

export interface ChartConfig {
  kind: ChartKind;
  /** Rendered as page HTML, not inside the plot, so it stays selectable and styled. */
  title: string;
  yAxisTitle: string;
  y2AxisTitle?: string;
  percent?: boolean;
  series: SeriesDef[];
}

const INK = '#4a4238';
const GRID = '#e7ddcf';

/** Sums `value` across the requested modes for each year within one category. */
function sumByYear(rows: EvRow[], s: SeriesDef, category: string): Map<number, number> {
  const totals = new Map<number, number>();
  for (const row of rows) {
    if (row.region !== s.region) continue;
    if (row.parameter !== s.parameter) continue;
    if (row.powertrain !== s.powertrain) continue;
    if (row.category !== category) continue;
    if (!s.modes.includes(row.mode)) continue;
    totals.set(row.year, (totals.get(row.year) ?? 0) + row.value);
  }
  return totals;
}

function sortedPoints(totals: Map<number, number>) {
  const years = Array.from(totals.keys()).sort((a, b) => a - b);
  return { years, values: years.map((y) => totals.get(y) as number) };
}

function baseLayout(config: ChartConfig): any {
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', size: 12, color: INK },
    separators: ',.',
    hovermode: 'x unified',
    legend: { orientation: 'h', y: -0.2, x: 0 },
    margin: { t: 12, r: 16, l: 68, b: 60 },
    autosize: true,
    xaxis: {
      title: { text: 'Yıl' },
      gridcolor: GRID,
      zeroline: false,
      type: 'category',
      categoryorder: 'category ascending',
    },
    yaxis: {
      title: { text: config.yAxisTitle },
      gridcolor: GRID,
      zeroline: false,
      rangemode: 'tozero',
      ticksuffix: config.percent ? '%' : '',
    },
  };
}

/**
 * A solid trace over the historical years, plus a dotted segment joining the last
 * historical point to the single IEA projection year (2035). IEA publishes no
 * intermediate projection years, so the dotted part connects two published points
 * — it is not a modelled trajectory.
 */
function tracesWithProjection(rows: EvRow[], s: SeriesDef): any[] {
  const hist = sortedPoints(sumByYear(rows, s, 'Historical'));
  const proj = sortedPoints(sumByYear(rows, s, 'Projection-STEPS'));

  const traces: any[] = [
    {
      x: hist.years,
      y: hist.values,
      name: s.label,
      type: 'scatter',
      mode: 'lines',
      line: { color: s.color, width: 2 },
      hovertemplate: `%{y}<extra>${s.label}</extra>`,
    },
  ];

  if (hist.years.length && proj.years.length) {
    const lastYear = hist.years[hist.years.length - 1];
    const lastValue = hist.values[hist.values.length - 1];
    traces.push({
      x: [lastYear, ...proj.years],
      y: [lastValue, ...proj.values],
      name: `${s.label} (2035 projeksiyonu)`,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: s.color, width: 2, dash: 'dot' },
      marker: { color: s.color, size: 6 },
      showlegend: false,
      hovertemplate: `%{y}<extra>${s.label} — 2035</extra>`,
    });
  }

  return traces;
}

function buildProjectionLines(rows: EvRow[], config: ChartConfig) {
  return {
    data: config.series.flatMap((s) => tracesWithProjection(rows, s)),
    layout: baseLayout(config),
  };
}

/** Türkiye: volumes on the left axis, market share on the right. Historical only. */
function buildTurkiyeDetail(rows: EvRow[], config: ChartConfig) {
  const data: any[] = config.series.map((s) => {
    const { years, values } = sortedPoints(sumByYear(rows, s, 'Historical'));
    // onRightAxis (pazar payı) serisinde suffix eklemiyoruz — yaxis2.ticksuffix zaten '%' basıyor,
    // ikisi birleşince "45%%" gibi çift işaret oluşuyordu.
    const suffix = s.onRightAxis ? '' : ' adet';
    return {
      x: years,
      y: values,
      name: s.label,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: s.color, width: 2 },
      marker: { color: s.color, size: 5 },
      yaxis: s.onRightAxis ? 'y2' : 'y',
      hovertemplate: `%{y}${suffix}<extra>${s.label}</extra>`,
    };
  });

  const layout: any = {
    ...baseLayout(config),
    yaxis: {
      title: { text: config.yAxisTitle },
      gridcolor: GRID,
      zeroline: false,
      rangemode: 'tozero',
    },
    yaxis2: {
      title: { text: config.y2AxisTitle ?? '' },
      overlaying: 'y',
      side: 'right',
      rangemode: 'tozero',
      ticksuffix: '%',
      showgrid: false,
    },
    margin: { t: 12, r: 68, l: 68, b: 60 },
  };

  return { data, layout };
}

export function buildPlotlyFigure(rows: EvRow[], config: ChartConfig) {
  switch (config.kind) {
    case 'powertrain-sales':
    case 'region-sales':
    case 'region-share':
      return buildProjectionLines(rows, config);
    case 'turkiye-detail':
      return buildTurkiyeDetail(rows, config);
  }
}
