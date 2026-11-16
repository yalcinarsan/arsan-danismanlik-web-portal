import { useEffect, useMemo, useRef, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-basic-dist-min';
import evData from '../../data/ev-data.json';
import { buildPlotlyFigure, type ChartConfig } from './evDataTransforms';

const Plot = createPlotlyComponent(Plotly);

interface Props {
  config: ChartConfig;
  /** Sunum deck'lerinde grafik daha geniş bir kartta duruyor; 420px orada basık kalıyor. */
  height?: string;
}

export default function EvChart({ config, height = '420px' }: Props) {
  const figure = useMemo(() => buildPlotlyFigure(evData.rows, config), [config]);
  const kutu = useRef<HTMLDivElement>(null);
  const [olcu, setOlcu] = useState<{ width: number; height: number } | null>(null);

  // Sunum deck'lerinde grafikler `display:none` bir slaytta mount oluyor:
  // Plotly genişliği 0 ölçüp 700px'lik varsayılanına düşüyor ve slayt açıldığında
  // o dar hâlde kalıyor. `useResizeHandler` yalnızca PENCERE yeniden boyutlanınca
  // devreye giriyor, kutunun kendi genişliğinin değişmesini görmüyor; autosize da
  // kendiliğinden yeniden ölçmüyor. Bu yüzden kutuyu izleyip ölçüyü layout'a
  // DOĞRUDAN yazıyoruz — Plotly'nin kendi ölçümüne hiç güvenmiyoruz.
  useEffect(() => {
    const el = kutu.current;
    if (!el) return;
    const uygula = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (w > 0 && h > 0) {
        setOlcu((onceki) => (onceki?.width === w && onceki?.height === h ? onceki : { width: w, height: h }));
      }
    };
    uygula();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', uygula);
      return () => window.removeEventListener('resize', uygula);
    }
    const gozlemci = new ResizeObserver(uygula);
    gozlemci.observe(el);
    return () => gozlemci.disconnect();
  }, []);

  const layout = useMemo(
    () => (olcu ? { ...figure.layout, ...olcu, autosize: false } : figure.layout),
    [figure.layout, olcu],
  );

  return (
    <div ref={kutu} style={{ width: '100%', height }}>
      <Plot
        data={figure.data}
        layout={layout}
        config={{ displayModeBar: false, responsive: true, locale: 'tr' }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </div>
  );
}
