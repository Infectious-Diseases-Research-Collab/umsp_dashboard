export type ReportType = 'monthly' | 'quarterly' | 'annual' | 'regional' | 'site';
export type ReportSection = 'summary' | 'kpi' | 'trends' | 'quality' | 'alerts';

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'quarterly', label: 'Quarterly Report' },
  { value: 'annual', label: 'Annual Report' },
  { value: 'regional', label: 'Regional Report' },
  { value: 'site', label: 'Site Report' },
];

export const REPORT_SECTIONS: { value: ReportSection; label: string }[] = [
  { value: 'summary', label: 'Executive Summary' },
  { value: 'kpi', label: 'Key Performance Indicators' },
  { value: 'trends', label: 'Trend Analysis' },
  { value: 'quality', label: 'Data Quality Assessment' },
  { value: 'alerts', label: 'Alerts & Recommendations' },
];
