'use client';

import { Building2, Activity, Calendar, TrendingUp } from 'lucide-react';
import { ValueBox } from '@/components/overview/ValueBox';
import { RegionalSummaryTable } from '@/components/overview/RegionalSummaryTable';
import { DataQualityChart } from '@/components/overview/DataQualityChart';
import { OverviewMetricsChart } from '@/components/overview/OverviewMetricsChart';
import { useSupabaseQuery } from '@/lib/hooks/use-supabase-query';
import { fetchRegionalSummary, fetchDataCompleteness, fetchOverviewStats } from '@/lib/queries/overview';
import { fetchActiveSiteNames } from '@/lib/queries/active-sites';
import { fetchDistinctSites } from '@/lib/queries/monthly-data';
import { fetchAllMonthlyData } from '@/lib/queries/monthly-data';
import { formatNumber, formatDate } from '@/lib/utils/format';

export default function OverviewPage() {
  const { data: stats, loading: statsLoading } = useSupabaseQuery(() => fetchOverviewStats());
  const { data: activeSites, loading: activeLoading } = useSupabaseQuery(() => fetchActiveSiteNames());
  const { data: allSites, loading: sitesLoading } = useSupabaseQuery(() => fetchDistinctSites());
  const { data: regional, loading: regionalLoading } = useSupabaseQuery(
    () => fetchRegionalSummary(stats?.latestYear ?? undefined),
    [stats?.latestYear]
  );
  const { data: completeness, loading: compLoading } = useSupabaseQuery(() => fetchDataCompleteness());
  const { data: monthlyData, loading: monthlyLoading } = useSupabaseQuery(() => fetchAllMonthlyData());

  // Compute avg incidence from latest year
  const avgIncidence = regional
    ? regional.reduce((s, r) => s + (r.avg_incidence ?? 0), 0) / (regional.length || 1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Value Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ValueBox
          title="Total Sites"
          value={allSites?.length ?? '-'}
          icon={Building2}
          color="#0f8f97"
          loading={sitesLoading}
        />
        <ValueBox
          title="Active Sites"
          value={activeSites?.length ?? '-'}
          icon={Activity}
          color="#2e9f74"
          loading={activeLoading}
        />
        <ValueBox
          title="Latest Date"
          value={stats?.latestDate ? formatDate(stats.latestDate) : '-'}
          icon={Calendar}
          color="#df8d2f"
          loading={statsLoading}
        />
        <ValueBox
          title="Avg Incidence"
          value={formatNumber(avgIncidence)}
          icon={TrendingUp}
          color="#d86144"
          loading={regionalLoading}
        />
      </div>

      {/* Regional Summary + Data Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RegionalSummaryTable data={regional} loading={regionalLoading} />
        <DataQualityChart data={completeness} loading={compLoading} />
      </div>

      {/* Overview Metrics */}
      <OverviewMetricsChart data={monthlyData} loading={monthlyLoading} />
    </div>
  );
}
