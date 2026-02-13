'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  onDownloadPlot: () => void;
  onDownloadData: () => void;
  onDownloadTable: () => void;
}

export function TimeSeriesControls({
  filters, onChange, onReset, entities, yearRange, quarters,
  onDownloadPlot, onDownloadData, onDownloadTable,
}: Props) {
  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border shadow-sm overflow-y-auto max-h-[calc(100vh-160px)]">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</Label>
        <Select
          value={filters.status}
          onValueChange={(v) => onChange({ status: v as 'Active Sites' | 'All Sites' })}
          disabled={filters.geoLevel === 'Region'}
        >
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
        <MultiSelect
          options={entities}
          selected={filters.selectedEntities}
          onChange={(v) => onChange({ selectedEntities: v })}
          placeholder="Select entities..."
          maxItems={10}
        />
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
          <Slider
            min={yearRange.min} max={yearRange.max} step={1}
            value={filters.yearRange}
            onValueChange={(v) => onChange({ yearRange: v as [number, number] })}
            className="mt-2"
          />
        </div>
      )}

      {filters.timeScale === 'Quarterly' && (
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quarters</Label>
          <MultiSelect
            options={quarters}
            selected={filters.quarters}
            onChange={(v) => onChange({ quarters: v })}
            placeholder="Select quarters"
          />
        </div>
      )}

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Metric</Label>
        <Select value={filters.metric} onValueChange={(v) => onChange({ metric: v as IndicatorLabel })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(INDICATOR_GROUPS).map(([group, indicators]) => (
              <div key={group}>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{group}</div>
                {indicators.map((ind) => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </div>
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
        <Checkbox
          id="showTrend"
          checked={filters.showTrendLine}
          onCheckedChange={(v) => onChange({ showTrendLine: !!v })}
        />
        <Label htmlFor="showTrend" className="text-sm">Show Trend Line</Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="showSeasonal"
          checked={filters.showSeasonal}
          onCheckedChange={(v) => onChange({ showSeasonal: !!v })}
        />
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
          <RotateCcw className="w-4 h-4 mr-1" /> Reset
        </Button>
      </div>
    </div>
  );
}
