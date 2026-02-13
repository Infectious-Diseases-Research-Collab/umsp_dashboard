'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { UmspMonthlyData } from '@/types/database';
import { IndicatorLabel, INDICATOR_DB_COLUMNS } from '@/types/indicators';
import { calculateSeasonalAnalysis } from '@/lib/utils/trend-calculation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  data: UmspMonthlyData[];
  metric: IndicatorLabel;
  timeScale: string;
}

export function SeasonalChart({ data, metric, timeScale }: Props) {
  const seasonal = useMemo(() => {
    if (timeScale !== 'Monthly' || data.length === 0) return null;
    const col = INDICATOR_DB_COLUMNS[metric];
    const months = data.map((r) => new Date(r.monthyear).getMonth() + 1);
    const values = data.map((r) => (r[col] as number) ?? NaN);
    return calculateSeasonalAnalysis(months, values);
  }, [data, metric, timeScale]);

  if (timeScale !== 'Monthly') {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Seasonal Analysis</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">Seasonal analysis requires monthly data.</p>
        </CardContent>
      </Card>
    );
  }

  if (!seasonal) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Seasonal Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Plot
          data={[
            {
              x: MONTH_LABELS,
              y: seasonal.map((s) => s.mean),
              type: 'bar',
              marker: { color: '#26A69A', opacity: 0.8 },
              error_y: {
                type: 'data',
                array: seasonal.map((s) => s.se),
                visible: true,
              },
              name: 'Monthly Mean',
            },
          ]}
          layout={{
            height: 400,
            margin: { l: 60, r: 20, t: 10, b: 50 },
            xaxis: { title: 'Month' },
            yaxis: { title: `Mean ${metric}` },
            showlegend: false,
          }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%' }}
        />
      </CardContent>
    </Card>
  );
}
