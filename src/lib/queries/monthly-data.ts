import { createClient } from '@/lib/supabase/client';
import { UmspMonthlyData } from '@/types/database';

function getClient() { return createClient(); }

export async function fetchAllMonthlyData(): Promise<UmspMonthlyData[]> {
  const { data, error } = await getClient()
    .from('umsp_monthly_data')
    .select('*')
    .order('monthyear', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchMonthlyDataByRegion(regions: string[]): Promise<UmspMonthlyData[]> {
  const { data, error } = await getClient()
    .from('umsp_monthly_data')
    .select('*')
    .in('region', regions)
    .order('monthyear', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchMonthlyDataByYear(year: number): Promise<UmspMonthlyData[]> {
  const { data, error } = await getClient()
    .from('umsp_monthly_data')
    .select('*')
    .eq('year', year)
    .order('monthyear', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchDistinctRegions(): Promise<string[]> {
  const { data, error } = await getClient()
    .from('umsp_monthly_data')
    .select('region')
    .order('region');

  if (error) throw error;
  const unique = Array.from(new Set((data ?? []).map((d) => d.region)));
  return unique;
}

export async function fetchDistinctSites(): Promise<string[]> {
  const { data, error } = await getClient()
    .from('umsp_monthly_data')
    .select('site')
    .order('site');

  if (error) throw error;
  return Array.from(new Set((data ?? []).map((d) => d.site)));
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
  const { data, error } = await getClient()
    .from('umsp_monthly_data')
    .select('quarter')
    .order('quarter');

  if (error) throw error;
  return Array.from(new Set((data ?? []).map((d) => d.quarter)));
}
