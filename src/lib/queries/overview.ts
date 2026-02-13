import { createClient } from '@/lib/supabase/client';
import { RegionalSummary, DataCompleteness } from '@/types/database';

export async function fetchRegionalSummary(year?: number): Promise<RegionalSummary[]> {
  const { data, error } = await createClient().rpc('get_regional_summary', {
    p_year: year ?? null,
  });

  if (error) throw error;
  return data ?? [];
}

export async function fetchDataCompleteness(): Promise<DataCompleteness[]> {
  const { data, error } = await createClient().rpc('get_data_completeness');

  if (error) throw error;
  return data ?? [];
}

export async function fetchOverviewStats() {
  const supabase = createClient();
  const [
    { count: totalRecords },
    { data: latestDate },
    { data: yearData },
  ] = await Promise.all([
    supabase.from('umsp_monthly_data').select('*', { count: 'exact', head: true }),
    supabase.from('umsp_monthly_data').select('monthyear').order('monthyear', { ascending: false }).limit(1),
    supabase.from('umsp_monthly_data').select('year').order('year', { ascending: false }).limit(1),
  ]);

  return {
    totalRecords: totalRecords ?? 0,
    latestDate: latestDate?.[0]?.monthyear ?? null,
    latestYear: yearData?.[0]?.year ?? null,
  };
}
