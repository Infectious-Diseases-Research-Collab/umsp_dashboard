'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Download, Table as TableIcon } from 'lucide-react';
import { MultiSelect } from '@/components/shared/MultiSelect';
import { DataTable } from '@/components/data-explorer/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseQuery } from '@/lib/hooks/use-supabase-query';
import {
  fetchDistinctSites,
  fetchDistinctMonthyears,
  fetchDistinctQuarters,
  fetchYearRange,
} from '@/lib/queries/monthly-data';
import { fetchMappedActiveUmspSiteNames } from '@/lib/queries/active-sites';
import { fetchTimeSeriesData } from '@/lib/queries/time-series';
import { fetchMapData } from '@/lib/queries/map-data';
import { downloadCsv } from '@/lib/utils/csv-export';
import { formatDate } from '@/lib/utils/format';
import { INDICATOR_DB_COLUMNS, INDICATOR_GROUPS, IndicatorLabel } from '@/types/indicators';
import { getColorsForGroups } from '@/lib/utils/color-palette';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
const MapContainerComponent = dynamic(
  () => import('@/components/map/MapContainer').then((mod) => mod.MapContainerComponent),
  { ssr: false, loading: () => <LoadingSpinner message="Loading map..." /> }
);

type TimeScale = 'Monthly' | 'Quarterly' | 'Annual';
type ViewType = 'Chart' | 'Map' | 'Table';
type OptionalMetric = IndicatorLabel | 'None';
type SiteScope = 'Active Sites' | 'All Sites';

function quarterSortKey(quarter: string): number {
  const qMatch = quarter.match(/Q([1-4])/i);
  const yMatch = quarter.match(/(19|20)\d{2}/);
  if (!qMatch || !yMatch) return 0;
  return Number(yMatch[0]) * 10 + Number(qMatch[1]);
}

function getIndicatorsFlat(): IndicatorLabel[] {
  return Array.from(new Set(Object.values(INDICATOR_GROUPS).flat()));
}

function getPeriodLabel(key: string, timeScale: TimeScale): string {
  if (timeScale === 'Annual') return key;
  if (timeScale === 'Quarterly') return key;
  return formatDate(key);
}

function normalizeMonthyearKey(value: unknown): string {
  const raw = String(value ?? '');
  return raw.includes('T') ? raw.split('T')[0] : raw;
}

function periodKey(row: Record<string, unknown>, timeScale: TimeScale): string {
  if (timeScale === 'Annual') return String(row.year);
  if (timeScale === 'Quarterly') return String(row.quarter);
  return normalizeMonthyearKey(row.monthyear);
}

function metricSeriesForSite(
  rows: Record<string, unknown>[],
  periods: string[],
  metric: IndicatorLabel,
  timeScale: TimeScale
): Array<number | null> {
  const column = INDICATOR_DB_COLUMNS[metric];
  const grouped = new Map<string, number[]>();

  for (const row of rows) {
    const key = periodKey(row, timeScale);
    const value = row[column] as number | null;
    if (value == null || !isFinite(value)) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(value);
  }

  return periods.map((key) => {
    const vals = grouped.get(key) ?? [];
    return vals.length ? vals.reduce((sum, v) => sum + v, 0) / vals.length : null;
  });
}

export default function DashboardPage() {
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [timeScale, setTimeScale] = useState<TimeScale>('Monthly');
  const [monthRange, setMonthRange] = useState<[string, string]>(['2018-01-01', '2025-12-31']);
  const [quarterRange, setQuarterRange] = useState<[string, string]>(['', '']);
  const [yearRange, setYearRange] = useState<[number, number]>([2018, 2025]);
  const [primaryMetric, setPrimaryMetric] = useState<IndicatorLabel>('Malaria Incidence per 1000');
  const [secondaryMetric, setSecondaryMetric] = useState<OptionalMetric>('None');
  const [siteScope, setSiteScope] = useState<SiteScope>('All Sites');
  const [viewType, setViewType] = useState<ViewType>('Chart');
  const [showRawData, setShowRawData] = useState(false);

  const { data: allSites } = useSupabaseQuery(() => fetchDistinctSites());
  const { data: activeSites } = useSupabaseQuery(() => fetchMappedActiveUmspSiteNames());
  const { data: monthyears } = useSupabaseQuery(() => fetchDistinctMonthyears());
  const { data: quarters } = useSupabaseQuery(() => fetchDistinctQuarters());
  const { data: years } = useSupabaseQuery(() => fetchYearRange());

  const sortedQuarters = useMemo(
    () => [...(quarters ?? [])].sort((a, b) => quarterSortKey(a) - quarterSortKey(b)),
    [quarters]
  );
  const normalizedMonthRange = useMemo<[string, string]>(() => {
    return monthRange[0] <= monthRange[1] ? monthRange : [monthRange[1], monthRange[0]];
  }, [monthRange]);
  const normalizedYearRange = useMemo<[number, number]>(() => {
    return yearRange[0] <= yearRange[1] ? yearRange : [yearRange[1], yearRange[0]];
  }, [yearRange]);

  const quarterSelection = useMemo(() => {
    if (!sortedQuarters.length || !quarterRange[0] || !quarterRange[1]) return [] as string[];
    const startIndex = sortedQuarters.indexOf(quarterRange[0]);
    const endIndex = sortedQuarters.indexOf(quarterRange[1]);
    if (startIndex < 0 || endIndex < 0) return [];
    return sortedQuarters.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
  }, [sortedQuarters, quarterRange]);
  const availableSites = useMemo(() => {
    const all = allSites ?? [];
    if (siteScope === 'All Sites') return all;
    const activeSet = new Set(activeSites ?? []);
    return all.filter((site) => activeSet.has(site));
  }, [allSites, activeSites, siteScope]);
  const effectiveSites = useMemo(
    () => (selectedSites.length ? selectedSites : (siteScope === 'Active Sites' ? availableSites : undefined)),
    [selectedSites, siteScope, availableSites]
  );

  useEffect(() => {
    if (!monthyears || monthyears.length === 0) return;
    setMonthRange([monthyears[0], monthyears[monthyears.length - 1]]);
  }, [monthyears]);

  useEffect(() => {
    if (!sortedQuarters.length) return;
    setQuarterRange([sortedQuarters[0], sortedQuarters[sortedQuarters.length - 1]]);
  }, [sortedQuarters]);

  useEffect(() => {
    if (!years) return;
    setYearRange([years.min, years.max]);
  }, [years]);
  useEffect(() => {
    setSelectedSites((prev) => prev.filter((site) => availableSites.includes(site)));
  }, [availableSites]);

  const queryDeps = [effectiveSites, timeScale, normalizedMonthRange, quarterSelection, normalizedYearRange] as const;

  const { data: tableRows, loading: tableLoading } = useSupabaseQuery(
    () =>
      fetchTimeSeriesData({
        geoLevel: 'Site',
        entities: effectiveSites,
        timeScale,
        dateRange: timeScale === 'Monthly' ? normalizedMonthRange : undefined,
        quarters: timeScale === 'Quarterly' ? quarterSelection : undefined,
        yearRange: timeScale === 'Annual' ? normalizedYearRange : undefined,
      }),
    [...queryDeps]
  );

  const { data: mapRows, loading: mapLoading } = useSupabaseQuery(
    () =>
      fetchMapData({
        sites: effectiveSites,
        timeScale,
        dateRange: timeScale === 'Monthly' ? normalizedMonthRange : undefined,
        quarters: timeScale === 'Quarterly' ? quarterSelection : undefined,
        yearRange: timeScale === 'Annual' ? normalizedYearRange : undefined,
      }),
    [...queryDeps]
  );

  const periodKeys = useMemo(() => {
    if (timeScale === 'Monthly') {
      const keys = (monthyears ?? []).map((m) => normalizeMonthyearKey(m));
      const startIndex = keys.indexOf(normalizeMonthyearKey(normalizedMonthRange[0]));
      const endIndex = keys.indexOf(normalizeMonthyearKey(normalizedMonthRange[1]));
      if (startIndex < 0 || endIndex < 0) return keys;
      return keys.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
    }
    if (timeScale === 'Quarterly') return quarterSelection;
    const [start, end] = normalizedYearRange;
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => String(start + i));
  }, [timeScale, monthyears, normalizedMonthRange, quarterSelection, normalizedYearRange]);
  const periodLabels = useMemo(() => periodKeys.map((key) => getPeriodLabel(key, timeScale)), [periodKeys, timeScale]);

  const selectedColumns = useMemo(() => {
    const base = ['site', 'district', 'monthyear', 'quarter', 'year'];
    const p = INDICATOR_DB_COLUMNS[primaryMetric];
    const columns = new Set<string>([...base, p]);
    if (secondaryMetric !== 'None') {
      columns.add(INDICATOR_DB_COLUMNS[secondaryMetric]);
    }
    return Array.from(columns);
  }, [primaryMetric, secondaryMetric]);

  const hasSecondMetric = secondaryMetric !== 'None' && secondaryMetric !== primaryMetric;
  const secondMetric: IndicatorLabel | null = hasSecondMetric ? secondaryMetric : null;
  const chartTraces = useMemo(() => {
    const rows = (tableRows ?? []) as unknown as Record<string, unknown>[];
    const selected = selectedSites.length
      ? selectedSites
      : Array.from(new Set(rows.map((row) => String(row.site)))).sort((a, b) => a.localeCompare(b));
    const colors = getColorsForGroups(selected);

    return selected.flatMap((site) => {
      const siteRows = rows.filter((row) => String(row.site) === site);
      const primaryValues = metricSeriesForSite(siteRows, periodKeys, primaryMetric, timeScale);
      const primaryTrace = {
        type: 'scatter',
        mode: 'lines+markers',
        x: periodLabels,
        y: primaryValues,
        name: site,
        line: { width: 2, color: colors[site] },
        marker: { size: 5 },
        yaxis: 'y',
      };

      if (!secondMetric) return [primaryTrace];

      const secondaryValues = metricSeriesForSite(siteRows, periodKeys, secondMetric, timeScale);
      return [
        primaryTrace,
        {
          type: 'scatter',
          mode: 'lines+markers',
          x: periodLabels,
          y: secondaryValues,
          name: `${site} (${secondMetric})`,
          line: { width: 1.5, color: colors[site], dash: 'dot' as const },
          marker: { size: 4 },
          yaxis: 'y2',
        },
      ];
    });
  }, [tableRows, selectedSites, periodKeys, periodLabels, primaryMetric, secondMetric, timeScale]);

  const handleDownloadRaw = useCallback(() => {
    const sourceRows = viewType === 'Map' ? (mapRows ?? []) : (tableRows ?? []);
    if (!sourceRows.length) return;

    downloadCsv(sourceRows as unknown as Record<string, unknown>[], `raw_data_${viewType.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
  }, [mapRows, tableRows, viewType]);

  const renderTimeScaleRange = () => {
    if (timeScale === 'Monthly') {
      return (
        <>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start Month</Label>
            <Select value={monthRange[0]} onValueChange={(value) => setMonthRange([value, monthRange[1]])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(monthyears ?? []).map((month) => (
                  <SelectItem key={month} value={month}>{formatDate(month)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End Month</Label>
            <Select value={monthRange[1]} onValueChange={(value) => setMonthRange([monthRange[0], value])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(monthyears ?? []).map((month) => (
                  <SelectItem key={month} value={month}>{formatDate(month)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      );
    }

    if (timeScale === 'Quarterly') {
      return (
        <>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start Quarter</Label>
            <Select value={quarterRange[0]} onValueChange={(value) => setQuarterRange([value, quarterRange[1]])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sortedQuarters.map((quarter) => (
                  <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End Quarter</Label>
            <Select value={quarterRange[1]} onValueChange={(value) => setQuarterRange([quarterRange[0], value])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sortedQuarters.map((quarter) => (
                  <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      );
    }

    const yearList = years ? Array.from({ length: years.max - years.min + 1 }, (_, i) => years.min + i) : [];

    return (
      <>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start Year</Label>
          <Select value={String(yearRange[0])} onValueChange={(value) => setYearRange([Number(value), yearRange[1]])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearList.map((year) => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End Year</Label>
          <Select value={String(yearRange[1])} onValueChange={(value) => setYearRange([yearRange[0], Number(value)])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearList.map((year) => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </>
    );
  };

  const viewLoading = viewType === 'Map' ? mapLoading : tableLoading;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workspace Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Site(s)</Label>
              <div className="mb-2 flex gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="site-scope"
                    checked={siteScope === 'Active Sites'}
                    onChange={() => setSiteScope('Active Sites')}
                  />
                  <span>Active Sites</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="site-scope"
                    checked={siteScope === 'All Sites'}
                    onChange={() => setSiteScope('All Sites')}
                  />
                  <span>All Sites</span>
                </label>
              </div>
              <MultiSelect
                options={availableSites}
                selected={selectedSites}
                onChange={setSelectedSites}
                placeholder="All Sites"
                maxItems={25}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time Scale</Label>
              <Select value={timeScale} onValueChange={(value) => setTimeScale(value as TimeScale)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Annual">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">View Type</Label>
              <Select value={viewType} onValueChange={(value) => setViewType(value as ViewType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Chart">Chart</SelectItem>
                  <SelectItem value="Map">Map</SelectItem>
                  <SelectItem value="Table">Tabular Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{renderTimeScaleRange()}</div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primary Metric</Label>
              <Select value={primaryMetric} onValueChange={(value) => setPrimaryMetric(value as IndicatorLabel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INDICATOR_GROUPS).map(([group, indicators]) => (
                    <SelectGroup key={group}>
                      <SelectLabel>{group}</SelectLabel>
                      {indicators.map((indicator) => (
                        <SelectItem key={`${group}-${indicator}`} value={indicator}>{indicator}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secondary Metric (Chart)</Label>
              <Select value={secondaryMetric} onValueChange={(value) => setSecondaryMetric(value as OptionalMetric)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {getIndicatorsFlat().map((indicator) => (
                    <SelectItem key={`second-${indicator}`} value={indicator}>{indicator}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => setShowRawData((prev) => !prev)}>
                <TableIcon className="mr-1 h-4 w-4" />
                {showRawData ? 'Hide Data' : 'Show Data'}
              </Button>
              <Button variant="outline" onClick={handleDownloadRaw}>
                <Download className="mr-1 h-4 w-4" /> Download CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewLoading ? (
        <LoadingSpinner message="Loading data..." />
      ) : (
        <>
          {viewType === 'Chart' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Metric Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {(tableRows ?? []).length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">No data available for these filters.</p>
                ) : (
                  <Plot
                    data={chartTraces}
                    layout={{
                      height: 520,
                      margin: { l: 55, r: hasSecondMetric ? 80 : 20, t: 30, b: 80 },
                      xaxis: { title: timeScale === 'Annual' ? 'Year' : timeScale, tickangle: -35 },
                      yaxis: { title: primaryMetric },
                      ...(hasSecondMetric
                        ? {
                            yaxis2: {
                              title: secondaryMetric,
                              overlaying: 'y',
                              side: 'right',
                            },
                          }
                        : {}),
                      legend: { orientation: 'h', y: -0.25 },
                    }}
                    config={{ responsive: true, displaylogo: false }}
                    style={{ width: '100%' }}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {viewType === 'Map' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spatial View ({primaryMetric})</CardTitle>
              </CardHeader>
              <CardContent>
                <MapContainerComponent
                  data={mapRows ?? []}
                  overlayType="circles"
                  metric={primaryMetric}
                  aggMethod="Mean"
                  basemap="OpenStreetMap.Mapnik"
                  trendMonths={12}
                  heatmapRadius={20}
                  heatmapBlur={15}
                  scaleMode="auto"
                />
              </CardContent>
            </Card>
          )}

          {(showRawData || viewType === 'Table') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Raw Tabular Data</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable data={(tableRows ?? [])} visibleColumns={selectedColumns} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
