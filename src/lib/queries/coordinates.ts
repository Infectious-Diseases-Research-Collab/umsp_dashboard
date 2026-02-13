import { createClient } from '@/lib/supabase/client';
import { HealthFacilityCoordinates } from '@/types/database';

export async function fetchCoordinates(): Promise<HealthFacilityCoordinates[]> {
  const { data, error } = await createClient()
    .from('health_facility_coordinates')
    .select('*')
    .order('site');

  if (error) throw error;
  return data ?? [];
}
