import { linearRegression } from 'simple-statistics';

export interface TrendResult {
  slope: number;
  direction: 'Increasing' | 'Decreasing' | 'Stable';
  arrow: string;
}

export function calculateTrend(
  dates: Date[],
  values: number[]
): TrendResult | null {
  if (dates.length < 2) return null;

  const pairs: [number, number][] = dates.map((d, i) => [d.getTime(), values[i]]);
  const validPairs = pairs.filter(([, v]) => v != null && isFinite(v));
  if (validPairs.length < 2) return null;

  const { m: slope } = linearRegression(validPairs);

  // Slope per day, convert to per month for interpretation
  const slopePerMonth = slope * 30 * 24 * 60 * 60 * 1000;
  const direction = Math.abs(slopePerMonth) < 0.001 ? 'Stable' : slopePerMonth > 0 ? 'Increasing' : 'Decreasing';
  const arrow = direction === 'Increasing' ? '\u2197' : direction === 'Decreasing' ? '\u2198' : '\u2192';

  return { slope: slopePerMonth, direction, arrow };
}

export function calculateSeasonalAnalysis(
  months: number[],
  values: number[]
): { month: number; mean: number; se: number }[] {
  const byMonth: Record<number, number[]> = {};
  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    if (values[i] != null && isFinite(values[i])) {
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(values[i]);
    }
  }

  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const vals = byMonth[m] || [];
    if (vals.length === 0) return { month: m, mean: 0, se: 0 };
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.length > 1
      ? vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1)
      : 0;
    const se = Math.sqrt(variance / vals.length);
    return { month: m, mean, se };
  });
}
