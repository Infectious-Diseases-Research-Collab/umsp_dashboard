'use client';

import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { AccessRole, getRole, hasFullAccess } from '@/lib/auth/roles';
import type { AccessRequest } from '@/types/database';

export interface AccessLevel {
  user: User | null;
  role: AccessRole;
  isAdmin: boolean;
  hasFullAccess: boolean;
  loading: boolean;
  /** The signed-in user's most recent access request, if any. */
  latestRequest: AccessRequest | null;
  /** Admins only: number of requests awaiting review. */
  pendingCount: number;
  refetchRequests: () => Promise<void>;
}

export const AccessLevelContext = createContext<AccessLevel | null>(null);

export function AccessLevelProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestRequest, setLatestRequest] = useState<AccessRequest | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const refreshedForRequest = useRef<number | null>(null);

  const role = getRole(user);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = user?.id;
  const refetchRequests = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();

    const { data } = await supabase
      .from('access_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<AccessRequest>();
    setLatestRequest(data ?? null);

    if (role === 'admin') {
      const { count } = await supabase
        .from('access_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingCount(count ?? 0);
    }
  }, [userId, role]);

  useEffect(() => {
    refetchRequests();
  }, [refetchRequests]);

  // The role is read from the session token, which Supabase only reissues about
  // hourly. When an approval has landed but the token predates it, refresh now
  // so the user gets Full access without signing out (once per request).
  useEffect(() => {
    if (role !== 'standard' || latestRequest?.status !== 'approved') return;
    if (refreshedForRequest.current === latestRequest.id) return;
    refreshedForRequest.current = latestRequest.id;
    createClient().auth.refreshSession();
  }, [role, latestRequest]);

  return (
    <AccessLevelContext.Provider
      value={{
        user,
        role,
        isAdmin: role === 'admin',
        hasFullAccess: hasFullAccess(role),
        loading,
        latestRequest,
        pendingCount,
        refetchRequests,
      }}
    >
      {children}
    </AccessLevelContext.Provider>
  );
}
