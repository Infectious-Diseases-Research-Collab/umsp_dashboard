'use client';

import { useState, useCallback, useMemo } from 'react';
import { ReportConfig } from '@/components/reports/ReportConfig';
import { ReportPreview } from '@/components/reports/ReportPreview';
import { useSupabaseQuery } from '@/lib/hooks/use-supabase-query';
import { fetchOverviewStats, fetchRegionalSummary } from '@/lib/queries/overview';
import { fetchDistinctSites } from '@/lib/queries/monthly-data';
import { fetchActiveSiteNames } from '@/lib/queries/active-sites';
import { useToast } from '@/hooks/use-toast';
import { ReportType, ReportSection } from '@/types/reports';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('annual');
  const [sections, setSections] = useState<ReportSection[]>(['summary', 'kpi', 'trends', 'alerts']);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const { data: stats } = useSupabaseQuery(() => fetchOverviewStats());
  const { data: sites } = useSupabaseQuery(() => fetchDistinctSites());
  const { data: activeSites } = useSupabaseQuery(() => fetchActiveSiteNames());
  const { data: regional } = useSupabaseQuery(
    () => fetchRegionalSummary(stats?.latestYear ?? undefined),
    [stats?.latestYear]
  );

  const previewStats = useMemo(() => {
    if (!stats || !sites || !activeSites || !regional) return null;
    const avgIncidence = regional.length
      ? regional.reduce((s, r) => s + (r.avg_incidence ?? 0), 0) / regional.length
      : 0;
    const avgTpr = regional.length
      ? regional.reduce((s, r) => s + (r.avg_tpr ?? 0), 0) / regional.length
      : 0;
    return {
      totalSites: sites.length,
      activeSites: activeSites.length,
      avgIncidence,
      avgTpr,
      dateRange: stats.latestDate ? `Data through ${stats.latestDate}` : 'N/A',
      totalRecords: stats.totalRecords,
    };
  }, [stats, sites, activeSites, regional]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, sections }),
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `malaria_surveillance_report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Report generated successfully', description: 'PDF download started.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate report. Please try again.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }, [reportType, sections, toast]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div>
        <ReportConfig
          reportType={reportType}
          sections={sections}
          onTypeChange={setReportType}
          onSectionsChange={setSections}
          onGenerate={handleGenerate}
          generating={generating}
        />
      </div>
      <div className="lg:col-span-2">
        <ReportPreview reportType={reportType} sections={sections} stats={previewStats} />
      </div>
    </div>
  );
}
