import { createClient } from '@/lib/supabase/client';
import { UmspMonthlyData } from '@/types/database';

const PAGE_SIZE = 1000;

export async function fetchTimeSeriesData(params: {
  geoLevel: 'Site' | 'Region';
  entities?: string[];
  timeScale: string;
  yearRange?: [number, number];
  dateRange?: [string, string];
  quarters?: string[];
}): Promise<UmspMonthlyData[]> {
  const supabase = createClient();
  let from = 0;
  const rows: UmspMonthlyData[] = [];

  while (true) {
    let query = supabase.from('umsp_monthly_data').select('*');

    if (params.entities && params.entities.length > 0) {
      const field = params.geoLevel === 'Site' ? 'site' : 'region';
      query = query.in(field, params.entities);
    }

    if (params.timeScale === 'Annual' && params.yearRange) {
      query = query.gte('year', params.yearRange[0]).lte('year', params.yearRange[1]);
    } else if (params.timeScale === 'Monthly' && params.dateRange) {
      query = query.gte('monthyear', params.dateRange[0]).lte('monthyear', params.dateRange[1]);
    } else if (params.timeScale === 'Quarterly' && params.quarters && params.quarters.length > 0) {
      query = query.in('quarter', params.quarters);
    }

    const { data, error } = await query
      .order('monthyear', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}
