export const INDICATOR_DB_COLUMNS = {
  'Malaria Incidence per 1000': 'malaria_incidence_per_1000_py',
  'TPR': 'tpr_cases_all',
  'Laboratory Confirmed Malaria Cases': 'tpr_cases_per_ca',
  'Number of Visits': 'visits',
  'Suspected Malaria Cases': 'malariasuspected',
  'Proportion Suspected Malaria': 'propsuspected_per_total_visits',
  'Proportion Tested': 'proptested',
  'Proportion Visits from Target Area': 'prop_visit_ca',
} as const;

export type IndicatorLabel = keyof typeof INDICATOR_DB_COLUMNS;
export type IndicatorColumn = (typeof INDICATOR_DB_COLUMNS)[IndicatorLabel];

export const INDICATOR_LABELS = Object.keys(INDICATOR_DB_COLUMNS) as IndicatorLabel[];

export const INDICATOR_GROUPS = {
  'Malaria Burden': [
    'Malaria Incidence per 1000',
    'TPR',
    'Laboratory Confirmed Malaria Cases',
  ] as IndicatorLabel[],
  'Health Seeking': [
    'Number of Visits',
    'Suspected Malaria Cases',
    'Proportion Suspected Malaria',
    'Proportion Visits from Target Area',
  ] as IndicatorLabel[],
  'Quality Control': [
    'Proportion Tested',
    'Proportion Visits from Target Area',
  ] as IndicatorLabel[],
};

export type TimeScale = 'Monthly' | 'Quarterly' | 'Annual';
export type AggMethod = 'Mean' | 'Sum' | 'Median';
export type OverlayType = 'circles' | 'heatmap' | 'choropleth' | 'cluster' | 'trends' | 'flows';
export type PlotType = 'Line' | 'Bar';
export type DisplayType = 'Combined' | 'Separated';
export type CategoryLevel = 'Low' | 'Medium-Low' | 'Medium-High' | 'High';
export type GeoLevel = 'Site' | 'Region';
