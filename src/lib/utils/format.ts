export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value == null || !isFinite(value)) return 'N/A';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || !isFinite(value)) return 'N/A';
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatComma(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return 'N/A';
  return Math.round(value).toLocaleString('en-US');
}
