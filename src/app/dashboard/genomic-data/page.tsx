'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GenomicControls } from '@/components/genomic/GenomicControls';
import { GenomicChartView } from '@/components/genomic/GenomicChartView';
import { GenomicTableView } from '@/components/genomic/GenomicTableView';
import { useSupabaseQuery } from '@/lib/hooks/use-supabase-query';
import {
  fetchGenomicSites,
  fetchGenomicYearRange,
  fetchSingleLocusData,
  fetchMultiLocusData,
} from '@/lib/queries/genomic';
import { downloadCsv } from '@/lib/utils/csv-export';
import {
  GenomicFilters,
  GenomicSite,
  DHFR_DHPS_GROUP_ID,
  MIPS_YEARS,
} from '@/types/genomic';

const GenomicMapView = dynamic(
  () => import('@/components/genomic/GenomicMapView').then((m) => m.GenomicMapView),
  { ssr: false, loading: () => <LoadingSpinner message="Loading map..." /> }
);

const DEFAULT_GENE = 'PF3D7_1343700.1'; // pfkelch13
const DEFAULT_CODON = 675;

export default function GenomicDataPage() {
  const { data: sitesData } = useSupabaseQuery(() => fetchGenomicSites());
  const { data: yearRange } = useSupabaseQuery(() => fetchGenomicYearRange());

  const siteNames = useMemo(
    () => (sitesData ?? []).map((s) => s.site_name).sort(),
    [sitesData]
  );
  const siteMeta = useMemo(() => {
    const m = new Map<string, GenomicSite>();
    for (const s of sitesData ?? []) m.set(s.site_name, s);
    return m;
  }, [sitesData]);

  const yearMin = yearRange?.min ?? MIPS_YEARS[0];
  const yearMax = yearRange?.max ?? 2026;

  const [filters, setFilters] = useState<GenomicFilters>({
    sites: [],
    view: 'Map',
    yearRange: [MIPS_YEARS[0], 2026],
    mapYear: 'RECENT',
    locusMode: 'SingleLocus',
    geneId: DEFAULT_GENE,
    codon: DEFAULT_CODON,
    haplotypeGroup: DHFR_DHPS_GROUP_ID,
    metric: 'prev',
  });

  // Sync year range defaults once data loads
  useEffect(() => {
    if (!yearRange) return;
    setFilters((f) => ({
      ...f,
      yearRange: [yearRange.min, yearRange.max],
    }));
  }, [yearRange]);

  const effectiveSites = filters.sites.length ? filters.sites : undefined;

  // Map view resolves its own year: 'RECENT' fetches every year and lets the map
  // pick each site's latest; a specific year is pushed down to the query so sites
  // with no data that year simply drop off the map.
  const mapYearRange = useMemo<[number, number] | undefined>(
    () => (filters.mapYear === 'RECENT' ? undefined : [filters.mapYear, filters.mapYear]),
    [filters.mapYear]
  );

  const slParams = useMemo(
    () => ({
      sites: effectiveSites,
      yearRange: filters.view === 'Map' ? mapYearRange : filters.yearRange,
      geneId: filters.locusMode === 'SingleLocus' ? filters.geneId : undefined,
    }),
    [effectiveSites, filters.view, filters.yearRange, mapYearRange, filters.locusMode, filters.geneId]
  );

  const { data: slRows, loading: slLoading } = useSupabaseQuery(
    () => fetchSingleLocusData(slParams),
    [JSON.stringify(slParams)],
    { enabled: filters.locusMode === 'SingleLocus' }
  );

  const mlParams = useMemo(
    () => ({
      sites: effectiveSites,
      yearRange: filters.view === 'Map' ? mapYearRange : filters.yearRange,
      groupId: filters.haplotypeGroup,
    }),
    [effectiveSites, filters.view, filters.yearRange, mapYearRange, filters.haplotypeGroup]
  );

  const { data: mlRows, loading: mlLoading } = useSupabaseQuery(
    () => fetchMultiLocusData(mlParams),
    [JSON.stringify(mlParams)],
    { enabled: filters.locusMode === 'Multilocus' }
  );

  const loading = filters.locusMode === 'SingleLocus' ? slLoading : mlLoading;

  const handleDownload = useCallback(() => {
    const rows =
      filters.locusMode === 'SingleLocus' ? (slRows ?? []) : (mlRows ?? []);
    if (!rows.length) return;
    const fname = `genomic_${filters.locusMode === 'SingleLocus' ? 'single_locus' : 'multi_locus'}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv(rows as unknown as Record<string, unknown>[], fname);
  }, [filters.locusMode, slRows, mlRows]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/70 bg-white px-5 py-4 text-sm leading-relaxed text-muted-foreground">
        <p className="font-semibold text-foreground">Malaria Genomic Surveillance</p>
        <p>
          Drug and diagnostic resistance marker data from amplicon deep sequencing.
          Select sites, view type, locus mode (Single Locus or Multilocus),
          gene or haplotype group, and a metric (prevalence or frequency).
        </p>
        <p>
          <span className="font-medium text-foreground">Map</span> view shows pie charts at each
          site for the selected data year; the default, <em>Most recent</em>, uses the latest
          year available at each site, so pies may be from different years.
          <span className="font-medium text-foreground"> Chart</span> view plots the selected
          mutation or haplotype category over time, one line per site.
          <span className="font-medium text-foreground"> Tabular</span> view shows the raw
          per-population rows.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <GenomicControls
            filters={filters}
            onChange={setFilters}
            sites={siteNames}
            yearMin={yearMin}
            yearMax={yearMax}
            onDownloadCsv={handleDownload}
          />
        </CardContent>
      </Card>

      {loading ? (
        <LoadingSpinner message="Loading genomic data..." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filters.view} view — {filters.locusMode === 'SingleLocus' ? 'Single Locus' : 'Multilocus'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filters.view === 'Map' && (
              <GenomicMapView
                filters={filters}
                siteMeta={siteMeta}
                slRows={slRows ?? []}
                mlRows={mlRows ?? []}
              />
            )}
            {filters.view === 'Chart' && (
              <GenomicChartView
                filters={filters}
                slRows={slRows ?? []}
                mlRows={mlRows ?? []}
              />
            )}
            {filters.view === 'Table' && (
              <GenomicTableView
                mode={filters.locusMode}
                slRows={slRows ?? []}
                mlRows={mlRows ?? []}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
