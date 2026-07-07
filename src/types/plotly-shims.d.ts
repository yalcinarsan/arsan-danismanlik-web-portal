declare module 'plotly.js-basic-dist-min' {
  const Plotly: typeof import('plotly.js');
  export default Plotly;
}

declare module 'react-plotly.js/factory' {
  import type { ComponentType } from 'react';
  import type PlotlyType from 'plotly.js';
  import type { PlotParams } from 'react-plotly.js';

  export default function createPlotlyComponent(plotly: typeof PlotlyType): ComponentType<PlotParams>;
}
