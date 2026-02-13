import { AggMethod, DisplayType, GeoLevel, IndicatorLabel, OverlayType, PlotType, TimeScale } from './indicators';

export interface MapFilters {
  regions: string[];
  sites: string[];
  timeScale: TimeScale;
  yearRange: [number, number];
  dateRange: [string, string];
  quarters: string[];
  metric: IndicatorLabel;
  aggMethod: AggMethod;
  basemap: string;
  overlayType: OverlayType;
  trendMonths: number;
  heatmapRadius: number;
  heatmapBlur: number;
}

export interface TimeSeriesFilters {
  status: 'Active Sites' | 'All Sites';
  geoLevel: GeoLevel;
  selectedEntities: string[];
  timeScale: TimeScale;
  yearRange: [number, number];
  dateRange: [string, string];
  quarters: string[];
  metric: IndicatorLabel;
  plotType: PlotType;
  displayType: DisplayType;
  showTrendLine: boolean;
  showSeasonal: boolean;
  summaryTable: 'None' | 'Mean' | 'Sum' | 'Median';
}

export const BASEMAP_OPTIONS = [
  { value: 'OpenStreetMap.Mapnik', label: 'OpenStreetMap' },
  { value: 'Esri.WorldImagery', label: 'Satellite' },
  { value: 'OpenTopoMap', label: 'Topographic' },
  { value: 'CartoDB.Positron', label: 'Light' },
  { value: 'CartoDB.DarkMatter', label: 'Dark' },
] as const;
