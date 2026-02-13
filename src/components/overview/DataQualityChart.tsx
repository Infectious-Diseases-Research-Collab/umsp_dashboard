'use client';

import dynamic from 'next/dynamic';
import { DataCompleteness } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface Props {
  data: DataCompleteness[] | null;
  loading: boolean;
}

export function DataQualityChart({ data, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Data Quality Status</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
    );
  }

  const dates = (data ?? []).map((d) => d.monthyear);
  const completeness = (data ?? []).map((d) => d.completeness);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Data Quality Status</CardTitle>
      </CardHeader>
      <CardContent>
        <Plot
          data={[
            {
              x: dates,
              y: completeness,
              type: 'scatter',
              mode: 'lines+markers',
              line: { color: '#26A69A', width: 2 },
              marker: { size: 4 },
              name: 'Completeness %',
            },
          ]}
          layout={{
            height: 300,
            margin: { l: 50, r: 20, t: 10, b: 50 },
            xaxis: { title: 'Date', tickangle: -45 },
            yaxis: { title: 'Completeness (%)', range: [0, 105] },
            showlegend: false,
          }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%' }}
        />
      </CardContent>
    </Card>
  );
}
