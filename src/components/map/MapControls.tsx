'use client';

import { Fragment } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/shared/MultiSelect';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { RotateCcw } from 'lucide-react';
import { INDICATOR_GROUPS, IndicatorLabel, TimeScale, AggMethod, OverlayType } from '@/types/indicators';
import { BASEMAP_OPTIONS, MapFilters } from '@/types/filters';

interface Props {
  filters: MapFilters;
  onChange: (filters: Partial<MapFilters>) => void;
  onReset: () => void;
  regions: string[];
  sites: string[];
  yearRange: { min: number; max: number };
  quarters: string[];
  monthyears: string[];
  onDownloadCsv: () => void;
}

function getRangeIndexes(values: string[], selectedStart?: string, selectedEnd?: string): [number, number] {
  const maxIndex = Math.max(values.length - 1, 0);
  if (!values.length) return [0, 0];
  const start = selectedStart ? values.indexOf(selectedStart) : 0;
  const end = selectedEnd ? values.indexOf(selectedEnd) : maxIndex;
  return [
    start >= 0 ? start : 0,
    end >= 0 ? end : maxIndex,
  ];
}

function formatMonthLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function quarterSortKey(quarter: string): number {
  const qMatch = quarter.match(/Q([1-4])/i);
  const yMatch = quarter.match(/(19|20)\d{2}/);
  if (!qMatch || !yMatch) return 0;
  return Number(yMatch[0]) * 10 + Number(qMatch[1]);
}

export function MapControls({ filters, onChange, onReset, regions, sites, yearRange, quarters, monthyears, onDownloadCsv }: Props) {
  const sortedQuarters = [...quarters].sort((a, b) => quarterSortKey(a) - quarterSortKey(b));
  const [quarterStart, quarterEnd] = getRangeIndexes(
    sortedQuarters,
    filters.quarters[0],
    filters.quarters[filters.quarters.length - 1]
  );
  const [monthStart, monthEnd] = getRangeIndexes(monthyears, filters.dateRange[0], filters.dateRange[1]);

  return (
    <div className="app-panel max-h-[calc(100vh-160px)] space-y-4 overflow-y-auto rounded-2xl p-4">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Region</Label>
        <MultiSelect options={regions} selected={filters.regions} onChange={(v) => onChange({ regions: v })} placeholder="All Regions" />
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sites</Label>
        <MultiSelect options={sites} selected={filters.sites} onChange={(v) => onChange({ sites: v })} placeholder="All Sites" />
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time Scale</Label>
        <Select value={filters.timeScale} onValueChange={(v) => onChange({ timeScale: v as TimeScale })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Monthly">Monthly</SelectItem>
            <SelectItem value="Quarterly">Quarterly</SelectItem>
            <SelectItem value="Annual">Annual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filters.timeScale === 'Annual' && (
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Year: {filters.yearRange[0]} - {filters.yearRange[1]}
          </Label>
          <Slider min={yearRange.min} max={yearRange.max} step={1} value={filters.yearRange} onValueChange={(v) => onChange({ yearRange: v as [number, number] })} className="mt-2" />
        </div>
      )}

      {filters.timeScale === 'Monthly' && monthyears.length > 0 && (
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Months: {formatMonthLabel(monthyears[monthStart])} - {formatMonthLabel(monthyears[monthEnd])}
          </Label>
          <Slider
            min={0}
            max={monthyears.length - 1}
            step={1}
            value={[monthStart, monthEnd]}
            onValueChange={(v) => {
              const start = Math.min(v[0], v[1]);
              const end = Math.max(v[0], v[1]);
              onChange({ dateRange: [monthyears[start], monthyears[end]] });
            }}
            className="mt-2"
          />
        </div>
      )}

      {filters.timeScale === 'Quarterly' && sortedQuarters.length > 0 && (
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quarters: {sortedQuarters[quarterStart]} - {sortedQuarters[quarterEnd]}
          </Label>
          <Slider
            min={0}
            max={sortedQuarters.length - 1}
            step={1}
            value={[quarterStart, quarterEnd]}
            onValueChange={(v) => {
              const start = Math.min(v[0], v[1]);
              const end = Math.max(v[0], v[1]);
              onChange({ quarters: sortedQuarters.slice(start, end + 1) });
            }}
            className="mt-2"
          />
        </div>
      )}

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metric</Label>
        <Select value={filters.metric} onValueChange={(v) => onChange({ metric: v as IndicatorLabel })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(INDICATOR_GROUPS).map(([group, indicators]) => (
              <Fragment key={group}>
                <SelectGroup>
                  <SelectLabel>{group}</SelectLabel>
                  {indicators.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectGroup>
              </Fragment>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aggregation</Label>
        <Select value={filters.aggMethod} onValueChange={(v) => onChange({ aggMethod: v as AggMethod })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Mean">Mean</SelectItem>
            <SelectItem value="Sum">Sum</SelectItem>
            <SelectItem value="Median">Median</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Base Map</Label>
        <Select value={filters.basemap} onValueChange={(v) => onChange({ basemap: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {BASEMAP_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overlay Type</Label>
        <Select value={filters.overlayType} onValueChange={(v) => onChange({ overlayType: v as OverlayType })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="circles">Circle Markers</SelectItem>
            <SelectItem value="heatmap">Heat Map</SelectItem>
            <SelectItem value="choropleth">Choropleth</SelectItem>
            <SelectItem value="cluster">Clustering</SelectItem>
            <SelectItem value="trends">Trend Lines</SelectItem>
            <SelectItem value="flows">Flow Lines</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filters.overlayType === 'trends' && (
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trend Months: {filters.trendMonths}</Label>
          <Slider min={3} max={24} step={1} value={[filters.trendMonths]} onValueChange={(v) => onChange({ trendMonths: v[0] })} className="mt-2" />
        </div>
      )}

      {filters.overlayType === 'heatmap' && (
        <>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Radius: {filters.heatmapRadius}</Label>
            <Slider min={10} max={50} step={1} value={[filters.heatmapRadius]} onValueChange={(v) => onChange({ heatmapRadius: v[0] })} className="mt-2" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blur: {filters.heatmapBlur}</Label>
            <Slider min={5} max={30} step={1} value={[filters.heatmapBlur]} onValueChange={(v) => onChange({ heatmapBlur: v[0] })} className="mt-2" />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-2">
        <DownloadButton onClick={onDownloadCsv} label="CSV" />
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
}
