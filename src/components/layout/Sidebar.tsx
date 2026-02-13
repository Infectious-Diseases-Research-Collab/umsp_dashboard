'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Map, Activity, Database, FileText, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/dashboard/overview', label: 'Overview', icon: BarChart3 },
  { href: '/dashboard/map', label: 'Interactive Map', icon: Map },
  { href: '/dashboard/time-series', label: 'Time Series', icon: Activity },
  { href: '/dashboard/data-explorer', label: 'Data Explorer', icon: Database },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleSignOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) console.error('Sign out failed:', error.message);
    window.location.assign('/login');
  };

  return (
    <aside className="hidden w-72 shrink-0 flex-col rounded-2xl border border-border/70 bg-white p-3 shadow-sm lg:flex">
      <Link href="/" className="mb-3 flex items-center gap-3 rounded-xl px-3 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">IDRC</p>
          <p className="text-sm font-semibold text-foreground">Surveillance Suite</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1.5 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleSignOut}
        className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Sign Out
      </button>
    </aside>
  );
}
