'use client';

import { RegionalSummary } from '@/types/database';
import { formatNumber, formatComma } from '@/lib/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  data: RegionalSummary[] | null;
  loading: boolean;
}

export function RegionalSummaryTable({ data, loading }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Regional Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Sites</TableHead>
                  <TableHead className="text-right">Avg Incidence</TableHead>
                  <TableHead className="text-right">Avg TPR</TableHead>
                  <TableHead className="text-right">Total Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((row) => (
                  <TableRow key={row.region}>
                    <TableCell className="font-medium">{row.region}</TableCell>
                    <TableCell className="text-right">{row.site_count}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.avg_incidence)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.avg_tpr)}</TableCell>
                    <TableCell className="text-right">{formatComma(row.total_visits)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
