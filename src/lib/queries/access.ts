import { createClient } from '@/lib/supabase/client';
import type { AccessRequest, AdminUserRow } from '@/types/database';

/** Admins see every request (RLS); newest first. */
export async function fetchAccessRequests(): Promise<AccessRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return data ?? [];
}

export async function setUserRole(userId: string, role: 'standard' | 'full'): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('set_user_role', { p_user_id: userId, p_role: role });
  if (error) throw error;
}
