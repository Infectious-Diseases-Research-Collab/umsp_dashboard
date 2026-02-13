/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { UmspMonthlyData } from '@/types/database';
import { IndicatorLabel, INDICATOR_DB_COLUMNS, PlotType, DisplayType, TimeScale, GeoLevel } from '@/types/indicators';
import { getColorsForGroups } from '@/lib/utils/color-palette';
import { groupBy } from '@/lib/utils/aggregation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { linearRegression } from 'simple-statistics';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface Props {
  data: UmspMonthlyData[];
  metric: IndicatorLabel;
  plotType: PlotType;
  displayType: DisplayType;
  timeScale: TimeScale;
  geoLevel: GeoLevel;
  showTrendLine: boolean;
  loading: boolean;
}

export function TemporalChart({ data, metric, plotType, displayType, timeScale, geoLevel, showTrendLine, loading }: Props) {
  const col = INDICATOR_DB_COLUMNS[metric];
  const groupKey = geoLevel === 'Site' ? 'site' : 'region';

  const chartData = useMemo(() => {
    if (!data.length) return { traces: [], layout: {} };

    const grouped = groupBy(data, (r) => r[groupKey]);
    const groups = Object.keys(grouped).sort();
    const colors = getColorsForGroups(groups);

    const traces: any[] = [];

    for (const group of groups) {
      const rows = grouped[group].sort((a, b) => a.monthyear.localeCompare(b.monthyear));

      // Aggregate by time period
      let timeGroups: Record<string, UmspMonthlyData[]>;
      if (timeScale === 'Annual') {
        timeGroups = groupBy(rows, (r) => String(r.year));
      } else if (timeScale === 'Quarterly') {
        timeGroups = groupBy(rows, (r) => r.quarter);
      } else {
        timeGroups = groupBy(rows, (r) => r.monthyear);
      }

      const sortedKeys = Object.keys(timeGroups).sort();
      const xValues = sortedKeys;
      const yValues = sortedKeys.map((key) => {
        const gRows = timeGroups[key];
        const vals = gRows
          .map((r) => r[col] as number | null)
          .filter((v): v is number => v != null && isFinite(v));
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      });

      if (plotType === 'Line') {
        traces.push({
          x: xValues,
          y: yValues,
          type: 'scatter',
          mode: 'lines+markers',
          name: group,
          line: { color: colors[group], width: 2 },
          marker: { size: 4 },
          ...(displayType === 'Separated' ? { xaxis: `x`, yaxis: `y` } : {}),
        });
      } else {
        traces.push({
          x: xValues,
          y: yValues,
          type: 'bar',
          name: group,
          marker: { color: colors[group] },
        });
      }

      // Trend line
      if (showTrendLine && timeScale === 'Monthly') {
        const validPairs = xValues
          .map((x, i) => [new Date(x).getTime(), yValues[i]] as [number, number | null])
          .filter((p): p is [number, number] => p[1] != null && isFinite(p[1]));

        if (validPairs.length >= 2) {
          const { m, b } = linearRegression(validPairs);
          const xStart = validPairs[0][0];
          const xEnd = validPairs[validPairs.length - 1][0];
          traces.push({
            x: [new Date(xStart).toISOString().split('T')[0], new Date(xEnd).toISOString().split('T')[0]],
            y: [m * xStart + b, m * xEnd + b],
            type: 'scatter',
            mode: 'lines',
            name: `${group} trend`,
            line: { color: colors[group], width: 1, dash: 'dash' },
            showlegend: false,
          });
        }
      }
    }

    const xTitle = timeScale === 'Annual' ? 'Year' : timeScale === 'Quarterly' ? 'Quarter' : 'Date';

    const layout: Partial<Record<string, unknown>> = {
      height: displayType === 'Separated' ? Math.max(400, groups.length * 200) : 500,
      margin: { l: 60, r: 20, t: 40, b: 80 },
      xaxis: { title: xTitle, tickangle: -45 },
      yaxis: { title: metric },
      barmode: plotType === 'Bar' ? 'dodge' : undefined,
      legend: { orientation: 'h', y: -0.2 },
      title: `${timeScale} ${metric} per ${geoLevel}`,
    };

    // For separated/faceted view, use subplots
    if (displayType === 'Separated' && groups.length > 1) {
  
      const subTraces: any[] = [];
      const annotations: Partial<Record<string, unknown>>[] = [];
      const rowCount = groups.length;

      groups.forEach((group, i) => {
        const yAxisId = i === 0 ? 'y' : `y${i + 1}`;
        const rows = grouped[group].sort((a, b) => a.monthyear.localeCompare(b.monthyear));

        let timeGroupsInner: Record<string, UmspMonthlyData[]>;
        if (timeScale === 'Annual') {
          timeGroupsInner = groupBy(rows, (r) => String(r.year));
        } else if (timeScale === 'Quarterly') {
          timeGroupsInner = groupBy(rows, (r) => r.quarter);
        } else {
          timeGroupsInner = groupBy(rows, (r) => r.monthyear);
        }

        const sortedKeys = Object.keys(timeGroupsInner).sort();
        const xVals = sortedKeys;
        const yVals = sortedKeys.map((key) => {
          const gRows = timeGroupsInner[key];
          const vals = gRows
            .map((r) => r[col] as number | null)
            .filter((v): v is number => v != null && isFinite(v));
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        });

        subTraces.push({
          x: xVals,
          y: yVals,
          type: plotType === 'Line' ? 'scatter' : 'bar',
          mode: plotType === 'Line' ? 'lines+markers' : undefined,
          name: group,
          marker: { color: colors[group] },
          line: plotType === 'Line' ? { color: colors[group] } : undefined,
          yaxis: yAxisId,
          showlegend: false,
    
        } as any);

        const domain = [i / rowCount, (i + 1) / rowCount - 0.02];
        (layout as Record<string, unknown>)[yAxisId === 'y' ? 'yaxis' : `yaxis${i + 1}`] = {
          domain,
          title: i === Math.floor(rowCount / 2) ? metric : '',
        };

        annotations.push({
          text: group,
          x: 0.5,
          y: domain[1],
          xref: 'paper',
          yref: 'paper',
          showarrow: false,
          font: { size: 12, color: colors[group] },
        });
      });

      return {
        traces: subTraces,
        layout: { ...layout, annotations, height: Math.max(400, groups.length * 200) },
      };
    }

    return { traces, layout };
  }, [data, metric, plotType, displayType, timeScale, geoLevel, showTrendLine, col, groupKey]);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Temporal Analysis</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[500px] w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Temporal Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No data available for the selected filters.</p>
        ) : (
          <Plot
            data={chartData.traces as any[]}
            layout={chartData.layout as Partial<Record<string, unknown>>}
            config={{ responsive: true, toImageButtonOptions: { format: 'png', filename: 'temporal_plot' } }}
            style={{ width: '100%' }}
          />
        )}
      </CardContent>
    </Card>
  );
}
