import { createClient } from '@/lib/supabase/client';
import { ActiveSite } from '@/types/database';

export async function fetchActiveSites(): Promise<ActiveSite[]> {
  const { data, error } = await createClient()
    .from('active_sites')
    .select('*')
    .order('site');

  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveSiteNames(): Promise<string[]> {
  const { data, error } = await createClient()
    .from('active_sites')
    .select('site')
    .order('site');

  if (error) throw error;
  return (data ?? []).map((d) => d.site);
}
