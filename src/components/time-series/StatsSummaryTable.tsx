'use client';

import { useMemo } from 'react';
import { UmspMonthlyData } from '@/types/database';
import { IndicatorLabel, INDICATOR_DB_COLUMNS, GeoLevel, TimeScale } from '@/types/indicators';
import { groupBy } from '@/lib/utils/aggregation';
import { formatNumber } from '@/lib/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  data: UmspMonthlyData[];
  metric: IndicatorLabel;
  geoLevel: GeoLevel;
  timeScale: TimeScale;
  summaryType: 'Mean' | 'Sum' | 'Median';
}

export function StatsSummaryTable({ data, metric, geoLevel, timeScale, summaryType }: Props) {
  const col = INDICATOR_DB_COLUMNS[metric];
  const groupKey = geoLevel === 'Site' ? 'site' : 'region';

  const rows = useMemo(() => {
    const grouped = groupBy(data, (r) => r[groupKey]);
    return Object.entries(grouped).flatMap(([entity, entityRows]) => {
      // Group by time period
      let timeGrouped: Record<string, UmspMonthlyData[]>;
      if (timeScale === 'Annual') {
        timeGrouped = groupBy(entityRows, (r) => String(r.year));
      } else if (timeScale === 'Quarterly') {
        timeGrouped = groupBy(entityRows, (r) => r.quarter);
      } else {
        timeGrouped = { All: entityRows };
      }

      return Object.entries(timeGrouped).map(([period, rows]) => {
        const values = rows
          .map((r) => r[col] as number | null)
          .filter((v): v is number => v != null && isFinite(v));

        const count = values.length;
        let result: number | null = null;
        if (values.length > 0) {
          switch (summaryType) {
            case 'Mean':
              result = values.reduce((a, b) => a + b, 0) / values.length;
              break;
            case 'Sum':
              result = values.reduce((a, b) => a + b, 0);
              break;
            case 'Median': {
              const sorted = [...values].sort((a, b) => a - b);
              const mid = Math.floor(sorted.length / 2);
              result = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
              break;
            }
          }
        }

        return { entity, period, count, value: result };
      });
    }).sort((a, b) => a.entity.localeCompare(b.entity) || a.period.localeCompare(b.period));
  }, [data, col, groupKey, timeScale, summaryType]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{summaryType} Summary: {metric}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{geoLevel}</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">{summaryType} {metric}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={`${row.entity}-${row.period}-${i}`}>
                  <TableCell className="font-medium">{row.entity}</TableCell>
                  <TableCell>{row.period}</TableCell>
                  <TableCell className="text-right">{row.count}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.value, 2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
