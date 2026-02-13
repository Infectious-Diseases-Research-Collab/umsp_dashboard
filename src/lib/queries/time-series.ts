import { createClient } from '@/lib/supabase/client';
import { UmspMonthlyData } from '@/types/database';

export async function fetchTimeSeriesData(params: {
  geoLevel: 'Site' | 'Region';
  entities?: string[];
  timeScale: string;
  yearRange?: [number, number];
  dateRange?: [string, string];
  quarters?: string[];
}): Promise<UmspMonthlyData[]> {
  let query = createClient().from('umsp_monthly_data').select('*');

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

  const { data, error } = await query.order('monthyear', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
