import type { User } from '@supabase/supabase-js';

// Access tiers live in auth.users.raw_app_meta_data.role (surfaced as
// user.app_metadata.role), which users cannot edit themselves. A missing role
// means Standard; see supabase/migrations/*_access_tiers.sql.
export type AccessRole = 'standard' | 'full' | 'admin';

export function getRole(user: Pick<User, 'app_metadata'> | null | undefined): AccessRole {
  const role = user?.app_metadata?.role;
  return role === 'admin' || role === 'full' ? role : 'standard';
}

/** Full and Admin users may see raw tables, download CSVs and generate reports. */
export function hasFullAccess(role: AccessRole): boolean {
  return role === 'full' || role === 'admin';
}
