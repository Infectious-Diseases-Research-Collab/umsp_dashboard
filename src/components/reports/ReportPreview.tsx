'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportType, ReportSection, REPORT_TYPES, REPORT_SECTIONS } from '@/types/reports';

interface Props {
  reportType: ReportType;
  sections: ReportSection[];
  stats: {
    totalSites: number;
    activeSites: number;
    avgIncidence: number;
    avgTpr: number;
    dateRange: string;
    totalRecords: number;
  } | null;
}

const REPORT_DESCRIPTIONS: Record<ReportType, string> = {
  monthly: 'Monthly surveillance report with latest month data analysis, trends, and key findings.',
  quarterly: 'Quarterly analysis covering 3-month aggregated data with seasonal patterns.',
  annual: 'Comprehensive annual review with year-over-year comparisons and strategic recommendations.',
  regional: 'Regional breakdown analysis comparing performance across surveillance regions.',
  site: 'Site-level detailed analysis for individual health facility performance review.',
};

export function ReportPreview({ reportType, sections, stats }: Props) {
  const typeLabel = REPORT_TYPES.find((rt) => rt.value === reportType)?.label ?? reportType;

  return (
    <Card className="app-panel">
      <CardHeader>
        <CardTitle className="text-lg">Report Preview</CardTitle>
        <Badge variant="secondary" className="w-fit">{typeLabel}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{REPORT_DESCRIPTIONS[reportType]}</p>

        <div>
          <h4 className="text-sm font-semibold mb-2">Selected Sections:</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {sections.map((section) => {
              const label = REPORT_SECTIONS.find((rs) => rs.value === section)?.label;
              return <li key={section}>{label}</li>;
            })}
          </ul>
        </div>

        {stats && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <h4 className="font-semibold">Report Statistics</h4>
            <p>Total Sites: <strong>{stats.totalSites}</strong></p>
            <p>Active Sites: <strong>{stats.activeSites}</strong></p>
            <p>Average Incidence: <strong>{stats.avgIncidence.toFixed(1)}</strong> per 1,000 PY</p>
            <p>Average TPR: <strong>{(stats.avgTpr * 100).toFixed(1)}%</strong></p>
            <p>Date Range: <strong>{stats.dateRange}</strong></p>
            <p>Total Records: <strong>{stats.totalRecords.toLocaleString()}</strong></p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
