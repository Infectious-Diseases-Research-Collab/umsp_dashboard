'use client';

import { useMemo } from 'react';
import { UmspMonthlyData } from '@/types/database';
import { IndicatorLabel, INDICATOR_DB_COLUMNS, GeoLevel } from '@/types/indicators';
import { groupBy } from '@/lib/utils/aggregation';
import { calculateTrend } from '@/lib/utils/trend-calculation';
import { formatNumber } from '@/lib/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  data: UmspMonthlyData[];
  metric: IndicatorLabel;
  geoLevel: GeoLevel;
  timeScale: string;
}

export function TrendSummaryTable({ data, metric, geoLevel, timeScale }: Props) {
  const col = INDICATOR_DB_COLUMNS[metric];
  const groupKey = geoLevel === 'Site' ? 'site' : 'region';

  const rows = useMemo(() => {
    const grouped = groupBy(data, (r) => r[groupKey]);
    return Object.entries(grouped).map(([entity, rows]) => {
      const values = rows
        .map((r) => r[col] as number | null)
        .filter((v): v is number => v != null && isFinite(v));

      const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      const std = values.length > 1
        ? Math.sqrt(values.reduce((s, v) => s + (v - mean!) ** 2, 0) / (values.length - 1))
        : null;

      let trendResult = null;
      if (timeScale === 'Monthly' && values.length > 1) {
        const sortedRows = rows
          .filter((r) => r[col] != null && isFinite(r[col] as number))
          .sort((a, b) => a.monthyear.localeCompare(b.monthyear));
        const dates = sortedRows.map((r) => new Date(r.monthyear));
        const vals = sortedRows.map((r) => r[col] as number);
        trendResult = calculateTrend(dates, vals);
      }

      return {
        entity,
        count: values.length,
        mean,
        std,
        direction: trendResult?.direction ?? 'N/A',
        arrow: trendResult?.arrow ?? '',
      };
    }).sort((a, b) => a.entity.localeCompare(b.entity));
  }, [data, col, groupKey, timeScale]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Trend Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{geoLevel}</TableHead>
                <TableHead className="text-right">N</TableHead>
                <TableHead className="text-right">Mean</TableHead>
                <TableHead className="text-right">Std Dev</TableHead>
                <TableHead className="text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.entity}>
                  <TableCell className="font-medium">{row.entity}</TableCell>
                  <TableCell className="text-right">{row.count}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.mean, 2)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.std, 2)}</TableCell>
                  <TableCell className="text-center">{row.arrow} {row.direction}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
