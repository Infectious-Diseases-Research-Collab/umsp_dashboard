'use client';

import { useState, useMemo, useCallback } from 'react';
import { TimeSeriesControls } from '@/components/time-series/TimeSeriesControls';
import { TemporalChart } from '@/components/time-series/TemporalChart';
import { SeasonalChart } from '@/components/time-series/SeasonalChart';
import { TrendSummaryTable } from '@/components/time-series/TrendSummaryTable';
import { StatsSummaryTable } from '@/components/time-series/StatsSummaryTable';
import { ValueBox } from '@/components/overview/ValueBox';
import { TrendingUp } from 'lucide-react';
import { useSupabaseQuery } from '@/lib/hooks/use-supabase-query';
import { fetchDistinctRegions, fetchDistinctSites, fetchYearRange, fetchDistinctQuarters } from '@/lib/queries/monthly-data';
import { fetchActiveSiteNames } from '@/lib/queries/active-sites';
import { fetchTimeSeriesData } from '@/lib/queries/time-series';
import { matchActiveSite } from '@/lib/utils/indicators';
import { INDICATOR_DB_COLUMNS } from '@/types/indicators';
import { TimeSeriesFilters } from '@/types/filters';
import { downloadCsv } from '@/lib/utils/csv-export';
import { formatNumber } from '@/lib/utils/format';

const DEFAULT_FILTERS: TimeSeriesFilters = {
  status: 'Active Sites',
  geoLevel: 'Site',
  selectedEntities: [],
  timeScale: 'Monthly',
  yearRange: [2018, 2025],
  dateRange: ['2018-01-01', '2025-12-31'],
  quarters: [],
  metric: 'Malaria Incidence per 1000',
  plotType: 'Line',
  displayType: 'Combined',
  showTrendLine: true,
  showSeasonal: false,
  summaryTable: 'None',
};

export default function TimeSeriesPage() {
  const [filters, setFilters] = useState<TimeSeriesFilters>(DEFAULT_FILTERS);

  const { data: regions } = useSupabaseQuery(() => fetchDistinctRegions());
  const { data: allSites } = useSupabaseQuery(() => fetchDistinctSites());
  const { data: activeSiteNames } = useSupabaseQuery(() => fetchActiveSiteNames());
  const { data: yearRange } = useSupabaseQuery(() => fetchYearRange());
  const { data: quarters } = useSupabaseQuery(() => fetchDistinctQuarters());

  // Compute entity options based on geo level and status
  const entityOptions = useMemo(() => {
    if (filters.geoLevel === 'Region') return regions ?? [];
    if (filters.status === 'Active Sites' && allSites && activeSiteNames) {
      return allSites.filter((site) => matchActiveSite(site, activeSiteNames));
    }
    return allSites ?? [];
  }, [filters.geoLevel, filters.status, regions, allSites, activeSiteNames]);

  const { data: rawData, loading } = useSupabaseQuery(
    () => fetchTimeSeriesData({
      geoLevel: filters.geoLevel,
      entities: filters.selectedEntities.length > 0 ? filters.selectedEntities : undefined,
      timeScale: filters.timeScale,
      yearRange: filters.timeScale === 'Annual' ? filters.yearRange : undefined,
      dateRange: filters.timeScale === 'Monthly' ? filters.dateRange : undefined,
      quarters: filters.timeScale === 'Quarterly' ? filters.quarters : undefined,
    }),
    [filters.geoLevel, filters.selectedEntities, filters.timeScale, filters.yearRange, filters.dateRange, filters.quarters]
  );

  // Apply active site filter client-side for Site level
  const filteredData = useMemo(() => {
    if (!rawData) return [];
    if (filters.geoLevel === 'Site' && filters.status === 'Active Sites' && activeSiteNames) {
      return rawData.filter((r) => matchActiveSite(r.site, activeSiteNames));
    }
    return rawData;
  }, [rawData, filters.geoLevel, filters.status, activeSiteNames]);

  // Overall metric value
  const overallMetric = useMemo(() => {
    if (filteredData.length === 0) return null;
    const col = INDICATOR_DB_COLUMNS[filters.metric];
    const values = filteredData
      .map((r) => r[col] as number | null)
      .filter((v): v is number => v != null && isFinite(v));
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }, [filteredData, filters.metric]);

  const handleChange = useCallback((partial: Partial<TimeSeriesFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleReset = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      yearRange: yearRange ? [yearRange.min, yearRange.max] : DEFAULT_FILTERS.yearRange,
    });
  }, [yearRange]);

  const handleDownloadPlot = useCallback(() => {
    // Plotly's built-in toImage handles this via the toolbar
  }, []);

  const handleDownloadData = useCallback(() => {
    if (!filteredData.length) return;
    downloadCsv(
      filteredData as unknown as Record<string, unknown>[],
      `temporal_data_${new Date().toISOString().split('T')[0]}.csv`
    );
  }, [filteredData]);

  const handleDownloadTable = useCallback(() => {
    // Export trend summary as CSV
    if (!filteredData.length) return;
    const col = INDICATOR_DB_COLUMNS[filters.metric];
    const groupKey = filters.geoLevel === 'Site' ? 'site' : 'region';
    const grouped: Record<string, typeof filteredData> = {};
    for (const r of filteredData) {
      const k = r[groupKey];
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(r);
    }
    const rows = Object.entries(grouped).map(([entity, rows]) => {
      const values = rows
        .map((r) => r[col] as number | null)
        .filter((v): v is number => v != null && isFinite(v));
      const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : '';
      return { entity, count: values.length, mean };
    });
    downloadCsv(rows, `summary_table_${new Date().toISOString().split('T')[0]}.csv`);
  }, [filteredData, filters.metric, filters.geoLevel]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-72 shrink-0">
        <TimeSeriesControls
          filters={filters}
          onChange={handleChange}
          onReset={handleReset}
          entities={entityOptions}
          yearRange={yearRange ?? { min: 2018, max: 2025 }}
          quarters={quarters ?? []}
          onDownloadPlot={handleDownloadPlot}
          onDownloadData={handleDownloadData}
          onDownloadTable={handleDownloadTable}
        />
      </div>
      <div className="flex-1 space-y-6">
        <ValueBox
          title={`Overall ${filters.metric}`}
          value={formatNumber(overallMetric, 2)}
          icon={TrendingUp}
          color="#0f8f97"
          loading={loading}
        />

        <TemporalChart
          data={filteredData}
          metric={filters.metric}
          plotType={filters.plotType}
          displayType={filters.displayType}
          timeScale={filters.timeScale}
          geoLevel={filters.geoLevel}
          showTrendLine={filters.showTrendLine}
          loading={loading}
        />

        {filters.showSeasonal && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SeasonalChart data={filteredData} metric={filters.metric} timeScale={filters.timeScale} />
            <TrendSummaryTable
              data={filteredData}
              metric={filters.metric}
              geoLevel={filters.geoLevel}
              timeScale={filters.timeScale}
            />
          </div>
        )}

        {filters.summaryTable !== 'None' && (
          <StatsSummaryTable
            data={filteredData}
            metric={filters.metric}
            geoLevel={filters.geoLevel}
            timeScale={filters.timeScale}
            summaryType={filters.summaryTable}
          />
        )}
      </div>
    </div>
  );
}
