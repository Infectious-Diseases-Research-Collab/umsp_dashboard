import { UmspMonthlyData } from '@/types/database';
import { AggMethod, IndicatorColumn, IndicatorLabel, INDICATOR_DB_COLUMNS } from '@/types/indicators';

type NumericKey = IndicatorColumn;

function getValues(rows: UmspMonthlyData[], col: NumericKey): number[] {
  return rows
    .map((r) => r[col] as number | null)
    .filter((v): v is number => v != null && isFinite(v));
}

function aggregate(values: number[], method: AggMethod): number | null {
  if (values.length === 0) return null;
  switch (method) {
    case 'Mean':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'Sum':
      return values.reduce((a, b) => a + b, 0);
    case 'Median': {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
  }
}

export function aggregateByMetric(
  rows: UmspMonthlyData[],
  indicator: IndicatorLabel,
  method: AggMethod
): number | null {
  const col = INDICATOR_DB_COLUMNS[indicator];
  const values = getValues(rows, col);
  return aggregate(values, method);
}

/**
 * Weighted regional aggregation matching the R logic:
 * - Incidence, TPR: simple mean
 * - Lab Cases, Visits, Suspected: sum
 * - Proportions: weighted average by visits
 */
export function aggregateRegional(
  rows: UmspMonthlyData[],
  indicator: IndicatorLabel,
): number | null {
  const col = INDICATOR_DB_COLUMNS[indicator];
  const valid = rows.filter((r) => r[col] != null && isFinite(r[col] as number));
  if (valid.length === 0) return null;

  switch (indicator) {
    case 'Malaria Incidence per 1000':
    case 'TPR':
      return valid.reduce((sum, r) => sum + (r[col] as number), 0) / valid.length;

    case 'Laboratory Confirmed Malaria Cases':
    case 'Number of Visits':
    case 'Suspected Malaria Cases':
      return valid.reduce((sum, r) => sum + (r[col] as number), 0);

    case 'Proportion Suspected Malaria': {
      const totalVisits = valid.reduce((s, r) => s + (r.visits ?? 0), 0);
      const totalSuspected = valid.reduce((s, r) => s + (r.malariasuspected ?? 0), 0);
      return totalVisits > 0 ? totalSuspected / totalVisits : null;
    }

    case 'Proportion Tested':
    case 'Proportion Visits from Target Area': {
      const totalVisitsW = valid.reduce((s, r) => s + (r.visits ?? 0), 0);
      if (totalVisitsW === 0) return null;
      const weightedSum = valid.reduce(
        (s, r) => s + (r[col] as number) * (r.visits ?? 0),
        0
      );
      return weightedSum / totalVisitsW;
    }
  }
}

export function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}
