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
 * Build a canonical site key so labels can match across tables:
 * e.g. "Aduku" == "Aduku HCIV" == "aduku-hciv".
 */
export function normalizeSiteName(value: string): string {
  return value
    .toUpperCase()
    .replace(/\bHC\s*(II|III|IV|V)\b/g, '')
    .replace(/\bHC\b/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match active sites via canonicalized name comparison.
 */
export function matchActiveSite(siteName: string, activeSites: string[]): boolean {
  const base = normalizeSiteName(siteName);
  return activeSites.some((active) => normalizeSiteName(active) === base);
}
