'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapControls } from '@/components/map/MapControls';
import { MapStatsBar } from '@/components/map/MapStatsBar';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useSupabaseQuery } from '@/lib/hooks/use-supabase-query';
import { fetchDistinctRegions, fetchDistinctSites, fetchYearRange, fetchDistinctQuarters, fetchDistinctMonthyears } from '@/lib/queries/monthly-data';
import { fetchMapData } from '@/lib/queries/map-data';
import { MapFilters } from '@/types/filters';
import { downloadCsv } from '@/lib/utils/csv-export';
import { formatDate } from '@/lib/utils/format';

const MapContainerComponent = dynamic(
  () => import('@/components/map/MapContainer').then((mod) => mod.MapContainerComponent),
  { ssr: false, loading: () => <LoadingSpinner message="Loading map..." /> }
);

const DEFAULT_FILTERS: MapFilters = {
  regions: [],
  sites: [],
  timeScale: 'Annual',
  yearRange: [2018, 2025],
  dateRange: ['2018-01-01', '2025-12-31'],
  quarters: [],
  metric: 'Malaria Incidence per 1000',
  aggMethod: 'Mean',
  basemap: 'OpenStreetMap.Mapnik',
  overlayType: 'circles',
  trendMonths: 12,
  heatmapRadius: 25,
  heatmapBlur: 15,
};

export default function MapPage() {
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
  const [initialized, setInitialized] = useState(false);

  const { data: regions } = useSupabaseQuery(() => fetchDistinctRegions());
  const { data: allSites } = useSupabaseQuery(() => fetchDistinctSites());
  const { data: yearRange } = useSupabaseQuery(() => fetchYearRange());
  const { data: quarters } = useSupabaseQuery(() => fetchDistinctQuarters());
  const { data: monthyears } = useSupabaseQuery(() => fetchDistinctMonthyears());

  useEffect(() => {
    if (initialized) return;
    if (!yearRange || !quarters || !monthyears || monthyears.length === 0) return;
    setFilters((prev) => ({
      ...prev,
      yearRange: [yearRange.min, yearRange.max],
      dateRange: [monthyears[0], monthyears[monthyears.length - 1]],
      quarters: quarters,
    }));
    setInitialized(true);
  }, [initialized, yearRange, quarters, monthyears]);

  // Filter sites by selected regions
  const filteredSiteOptions = useMemo(() => {
    if (!allSites) return [];
    return allSites;
  }, [allSites]);

  const { data: mapData, loading } = useSupabaseQuery(
    () => fetchMapData({
      regions: filters.regions.length > 0 ? filters.regions : undefined,
      sites: filters.sites.length > 0 ? filters.sites : undefined,
      yearRange: filters.timeScale === 'Annual' ? filters.yearRange : undefined,
      dateRange: filters.timeScale === 'Monthly' ? filters.dateRange : undefined,
      quarters: filters.timeScale === 'Quarterly' ? filters.quarters : undefined,
      timeScale: filters.timeScale,
    }),
    [filters.regions, filters.sites, filters.timeScale, filters.yearRange, filters.dateRange, filters.quarters]
  );

  const handleFilterChange = useCallback((partial: Partial<MapFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleReset = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      yearRange: yearRange ? [yearRange.min, yearRange.max] : DEFAULT_FILTERS.yearRange,
      dateRange: monthyears && monthyears.length > 0
        ? [monthyears[0], monthyears[monthyears.length - 1]]
        : DEFAULT_FILTERS.dateRange,
      quarters: quarters ?? DEFAULT_FILTERS.quarters,
    });
  }, [yearRange, monthyears, quarters]);

  const handleDownloadCsv = useCallback(() => {
    if (!mapData) return;
    const rows = mapData.map((r) => ({
      site: r.site,
      region: r.region,
      district: r.district,
      monthyear: r.monthyear,
      latitude: r.latitude,
      longitude: r.longitude,
      value: (r as unknown as Record<string, unknown>)[filters.metric] ?? '',
    }));
    downloadCsv(rows, `malaria_map_data_${new Date().toISOString().split('T')[0]}.csv`);
  }, [mapData, filters.metric]);

  const dataRange = useMemo(() => {
    if (!mapData || mapData.length === 0) return 'No data';
    const dates = mapData.map((d) => d.monthyear).sort();
    return `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`;
  }, [mapData]);

  const uniqueSites = useMemo(() => {
    if (!mapData) return 0;
    return new Set(mapData.map((d) => d.site)).size;
  }, [mapData]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-72 shrink-0">
        <MapControls
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
          regions={regions ?? []}
          sites={filteredSiteOptions}
          yearRange={yearRange ?? { min: 2018, max: 2025 }}
          quarters={quarters ?? []}
          monthyears={monthyears ?? []}
          onDownloadCsv={handleDownloadCsv}
        />
      </div>
      <div className="flex-1">
        <MapStatsBar metric={filters.metric} siteCount={uniqueSites} dataRange={dataRange} />
        {loading ? (
          <LoadingSpinner message="Loading map data..." />
        ) : (
          <MapContainerComponent
            data={mapData ?? []}
            overlayType={filters.overlayType}
            metric={filters.metric}
            aggMethod={filters.aggMethod}
            basemap={filters.basemap}
            trendMonths={filters.trendMonths}
            heatmapRadius={filters.heatmapRadius}
            heatmapBlur={filters.heatmapBlur}
          />
        )}
      </div>
    </div>
  );
}
