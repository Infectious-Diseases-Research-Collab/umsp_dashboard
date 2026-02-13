import { IndicatorLabel, INDICATOR_DB_COLUMNS, IndicatorColumn } from '@/types/indicators';
import { UmspMonthlyData } from '@/types/database';

export function getIndicatorValue(
  row: UmspMonthlyData,
  indicator: IndicatorLabel
): number | null {
  const col = INDICATOR_DB_COLUMNS[indicator];
  const val = row[col] as number | null;
  if (val == null || !isFinite(val) || val >= 1e6) return null;
  return val;
}

export function getDbColumn(indicator: IndicatorLabel): IndicatorColumn {
  return INDICATOR_DB_COLUMNS[indicator];
}

/**
 * Match active sites by stripping " HC..." suffix and comparing uppercase.
 */
export function matchActiveSite(siteName: string, activeSites: string[]): boolean {
  const base = siteName.replace(/ HC.*/i, '').trim().toUpperCase();
  return activeSites.some(
    (active) => active.replace(/ HC.*/i, '').trim().toUpperCase() === base
  );
}
