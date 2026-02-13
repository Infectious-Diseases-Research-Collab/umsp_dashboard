'use client';

import dynamic from 'next/dynamic';
import { UmspMonthlyData } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface Props {
  data: UmspMonthlyData[] | null;
  loading: boolean;
}

export function OverviewMetricsChart({ data, loading }: Props) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Get last 3 years of data
    const years = [...new Set(data.map((d) => d.year))].sort().slice(-3);
    const recentData = data.filter((d) => years.includes(d.year));

    // Group by monthyear and compute averages
    const byMonth: Record<string, { incidence: number[]; tpr: number[]; visits: number[] }> = {};
    for (const row of recentData) {
      const key = row.monthyear;
      if (!byMonth[key]) byMonth[key] = { incidence: [], tpr: [], visits: [] };
      if (row.malaria_incidence_per_1000_py != null) byMonth[key].incidence.push(row.malaria_incidence_per_1000_py);
      if (row.tpr_cases_all != null) byMonth[key].tpr.push(row.tpr_cases_all);
      if (row.visits != null) byMonth[key].visits.push(row.visits);
    }

    const sortedMonths = Object.keys(byMonth).sort();
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      dates: sortedMonths,
      incidence: sortedMonths.map((m) => avg(byMonth[m].incidence)),
      tpr: sortedMonths.map((m) => avg(byMonth[m].tpr)),
      visits: sortedMonths.map((m) => avg(byMonth[m].visits)),
    };
  }, [data]);

  if (loading || !chartData) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Quick Metrics Overview</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[400px] w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Metrics Overview (Last 3 Years)</CardTitle>
      </CardHeader>
      <CardContent>
        <Plot
          data={[
            {
              x: chartData.dates,
              y: chartData.incidence,
              type: 'scatter',
              mode: 'lines',
              name: 'Incidence per 1000',
              line: { color: '#E31A1C' },
              yaxis: 'y',
            },
            {
              x: chartData.dates,
              y: chartData.tpr,
              type: 'scatter',
              mode: 'lines',
              name: 'TPR',
              line: { color: '#1F78B4' },
              yaxis: 'y2',
            },
            {
              x: chartData.dates,
              y: chartData.visits,
              type: 'bar',
              name: 'Avg Visits',
              marker: { color: '#B2DF8A', opacity: 0.5 },
              yaxis: 'y3',
            },
          ]}
          layout={{
            height: 400,
            margin: { l: 60, r: 60, t: 10, b: 60 },
            xaxis: { title: 'Date', tickangle: -45 },
            yaxis: { title: 'Incidence per 1000', side: 'left' },
            yaxis2: {
              title: 'TPR',
              overlaying: 'y',
              side: 'right',
              showgrid: false,
            },
            yaxis3: {
              overlaying: 'y',
              visible: false,
            },
            legend: { orientation: 'h', y: -0.2 },
            barmode: 'overlay',
          }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%' }}
        />
      </CardContent>
    </Card>
  );
}
