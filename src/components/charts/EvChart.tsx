import { useMemo } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';
import evData from '../../data/ev-data.json';
import { buildPlotlyFigure, type ChartConfig } from './evDataTransforms';

const Plot = createPlotlyComponent(Plotly);

interface Props {
  config: ChartConfig;
}

export default function EvChart({ config }: Props) {
  const figure = useMemo(() => buildPlotlyFigure(evData.rows, config), [config]);

  return (
    <Plot
      data={figure.data}
      layout={figure.layout}
      config={{ displayModeBar: false, responsive: true, locale: 'tr' }}
      style={{ width: '100%', height: '420px' }}
      useResizeHandler
    />
  );
}
