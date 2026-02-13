'use client';

import { useAdminAuth } from '@/lib/hooks/use-admin-auth';
import { usePathname, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Allow login page without auth
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!loading && !isAdmin && !isLoginPage) {
      router.push('/admin/login');
    }
  }, [loading, isAdmin, isLoginPage, router]);

  if (loading) return <LoadingSpinner message="Checking authentication..." />;
  if (!isAdmin && !isLoginPage) return null;

  return <>{children}</>;
}
