import { createClient } from '@/lib/supabase/client';
import { UmspMonthlyData } from '@/types/database';

function getClient() { return createClient(); }
const PAGE_SIZE = 1000;

async function fetchAllRows<T>(buildQuery: (client: ReturnType<typeof getClient>) => {
  range: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
}): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(getClient()).range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const rows = data ?? [];
    allRows.push(...rows);

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
}

export async function fetchAllMonthlyData(): Promise<UmspMonthlyData[]> {
  return fetchAllRows<UmspMonthlyData>((client) =>
    client.from('umsp_monthly_data')
      .select('*')
      .order('monthyear', { ascending: true })
  );
}

export async function fetchMonthlyDataByRegion(regions: string[]): Promise<UmspMonthlyData[]> {
  return fetchAllRows<UmspMonthlyData>((client) =>
    client.from('umsp_monthly_data')
      .select('*')
      .in('region', regions)
      .order('monthyear', { ascending: true })
  );
}

export async function fetchMonthlyDataByYear(year: number): Promise<UmspMonthlyData[]> {
  return fetchAllRows<UmspMonthlyData>((client) =>
    client.from('umsp_monthly_data')
      .select('*')
      .eq('year', year)
      .order('monthyear', { ascending: true })
  );
}

export async function fetchDistinctRegions(): Promise<string[]> {
  const data = await fetchAllRows<Pick<UmspMonthlyData, 'region'>>((client) =>
    client.from('umsp_monthly_data')
      .select('region')
      .order('region')
  );

  return Array.from(new Set(data.map((d) => d.region).filter(Boolean)));
}

export async function fetchDistinctSites(): Promise<string[]> {
  const data = await fetchAllRows<Pick<UmspMonthlyData, 'site'>>((client) =>
    client.from('umsp_monthly_data')
      .select('site')
      .order('site')
  );

  return Array.from(new Set(data.map((d) => d.site).filter(Boolean)));
}

export async function fetchYearRange(): Promise<{ min: number; max: number }> {
  const { data, error } = await getClient()
    .from('umsp_monthly_data')
    .select('year')
    .order('year', { ascending: true })
    .limit(1);

  const { data: maxData } = await getClient()
    .from('umsp_monthly_data')
    .select('year')
    .order('year', { ascending: false })
    .limit(1);

  if (error) throw error;
  return {
    min: data?.[0]?.year ?? 2018,
    max: maxData?.[0]?.year ?? new Date().getFullYear(),
  };
}

export async function fetchDistinctQuarters(): Promise<string[]> {
  const data = await fetchAllRows<Pick<UmspMonthlyData, 'quarter'>>((client) =>
    client.from('umsp_monthly_data')
      .select('quarter')
      .order('quarter')
  );

  return Array.from(new Set(data.map((d) => d.quarter).filter(Boolean)));
}

export async function fetchDistinctMonthyears(): Promise<string[]> {
  const data = await fetchAllRows<Pick<UmspMonthlyData, 'monthyear'>>((client) =>
    client.from('umsp_monthly_data')
      .select('monthyear')
      .order('monthyear', { ascending: true })
  );

  return Array.from(new Set(data.map((d) => d.monthyear).filter(Boolean)));
}
