'use client';

import { Fragment } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/shared/MultiSelect';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { RotateCcw } from 'lucide-react';
import { INDICATOR_GROUPS, IndicatorLabel, TimeScale, PlotType, DisplayType, GeoLevel } from '@/types/indicators';
import { TimeSeriesFilters } from '@/types/filters';

interface Props {
  filters: TimeSeriesFilters;
  onChange: (filters: Partial<TimeSeriesFilters>) => void;
  onReset: () => void;
  entities: string[];
  yearRange: { min: number; max: number };
  quarters: string[];
  monthyears: string[];
  onDownloadPlot: () => void;
  onDownloadData: () => void;
  onDownloadTable: () => void;
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

export function TimeSeriesControls({
  filters, onChange, onReset, entities, yearRange, quarters,
  monthyears, onDownloadPlot, onDownloadData, onDownloadTable,
}: Props) {
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
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</Label>
        <Select value={filters.status} onValueChange={(v) => onChange({ status: v as 'Active Sites' | 'All Sites' })} disabled={filters.geoLevel === 'Region'}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Active Sites">Active Sites</SelectItem>
            <SelectItem value="All Sites">All Sites</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Geographic Level</Label>
        <Select value={filters.geoLevel} onValueChange={(v) => onChange({ geoLevel: v as GeoLevel })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Site">Site</SelectItem>
            <SelectItem value="Region">Region</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {filters.geoLevel === 'Site' ? 'Sites' : 'Regions'} (max 10)
        </Label>
        <MultiSelect options={entities} selected={filters.selectedEntities} onChange={(v) => onChange({ selectedEntities: v })} placeholder="Select entities..." maxItems={10} />
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
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Year: {filters.yearRange[0]} - {filters.yearRange[1]}</Label>
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
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plot Type</Label>
        <Select value={filters.plotType} onValueChange={(v) => onChange({ plotType: v as PlotType })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Line">Line</SelectItem>
            <SelectItem value="Bar">Bar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Display</Label>
        <Select value={filters.displayType} onValueChange={(v) => onChange({ displayType: v as DisplayType })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Combined">Combined</SelectItem>
            <SelectItem value="Separated">Separated (Faceted)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="showTrend" checked={filters.showTrendLine} onCheckedChange={(v) => onChange({ showTrendLine: !!v })} />
        <Label htmlFor="showTrend" className="text-sm">Show Trend Line</Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="showSeasonal" checked={filters.showSeasonal} onCheckedChange={(v) => onChange({ showSeasonal: !!v })} />
        <Label htmlFor="showSeasonal" className="text-sm">Show Seasonal Analysis</Label>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary Table</Label>
        <Select value={filters.summaryTable} onValueChange={(v) => onChange({ summaryTable: v as 'None' | 'Mean' | 'Sum' | 'Median' })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="None">None</SelectItem>
            <SelectItem value="Mean">Mean</SelectItem>
            <SelectItem value="Sum">Sum</SelectItem>
            <SelectItem value="Median">Median</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <DownloadButton onClick={onDownloadPlot} label="Plot PNG" />
        <DownloadButton onClick={onDownloadData} label="Data CSV" />
        <DownloadButton onClick={onDownloadTable} label="Table CSV" />
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
}
