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

export async function fetchMappedActiveUmspSiteNames(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('active_site_umsp_site_map')
    .select('umsp_site')
    .order('umsp_site');

  if (error) {
    // Fallback for environments where mapping table is not yet migrated
    return fetchActiveSiteNames();
  }

  return (data ?? []).map((d) => d.umsp_site as string);
}
