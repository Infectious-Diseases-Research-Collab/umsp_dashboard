'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useAdminAuth } from '@/lib/hooks/use-admin-auth';
import { cn } from '@/lib/utils';

const ADMIN_NAV = [
  { href: '/admin', label: 'Data Upload' },
  { href: '/admin/access-requests', label: 'Access Requests' },
  { href: '/admin/users', label: 'Users' },
];

export function AdminHeader() {
  const { user } = useAdminAuth();
  const pathname = usePathname();
  const title = ADMIN_NAV.find((item) => item.href === pathname)?.label ?? 'Admin';

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) console.error('Sign out failed:', error.message);
    window.location.assign('/admin/login');
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
            <span className="font-semibold">{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline">{user?.email}</span>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>

      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6 pb-2">
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors',
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
