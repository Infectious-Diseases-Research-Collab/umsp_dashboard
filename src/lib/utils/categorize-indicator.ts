import { CategoryLevel } from '@/types/indicators';

/**
 * Categorize numeric values into 4 levels using quartile breakpoints.
 * Matches the R function: categorize_indicator()
 */
export function categorizeIndicator(values: (number | null)[]): (CategoryLevel | null)[] {
  const levels: CategoryLevel[] = ['Low', 'Medium-Low', 'Medium-High', 'High'];
  const nonNull = values.filter((v): v is number => v != null && isFinite(v));

  if (nonNull.length === 0) return values.map(() => null);

  const unique = Array.from(new Set(nonNull));
  if (unique.length < 2) return values.map((v) => (v != null && isFinite(v) ? 'Low' : null));

  const sorted = [...nonNull].sort((a, b) => a - b);
  const q25 = quantile(sorted, 0.25);
  const q50 = quantile(sorted, 0.5);
  const q75 = quantile(sorted, 0.75);
  const breaks = [sorted[0], q25, q50, q75, sorted[sorted.length - 1]];

  const uniqueBreaks = Array.from(new Set(breaks));
  if (uniqueBreaks.length < 5) return values.map((v) => (v != null && isFinite(v) ? 'Low' : null));

  return values.map((v) => {
    if (v == null || !isFinite(v)) return null;
    if (v <= q25) return levels[0];
    if (v <= q50) return levels[1];
    if (v <= q75) return levels[2];
    return levels[3];
  });
}

function quantile(sorted: number[], p: number): number {
  const n = sorted.length;
  const index = (n - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}
