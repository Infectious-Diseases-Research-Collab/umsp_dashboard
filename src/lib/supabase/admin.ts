import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service-role client: bypasses RLS entirely. Its only job is looking up admin
// email addresses to notify about access requests — role changes go through
// the admin-checked SQL functions instead, called as the signed-in admin.
function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function fetchAdminEmails(): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const emails: string[] = [];
  const perPage = 1000;

  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const u of data.users) {
      if (u.app_metadata?.role === 'admin' && u.email) emails.push(u.email);
    }
    if (data.users.length < perPage) break;
  }

  return emails;
}
