'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Map, Activity, Database, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard/overview', label: 'Overview', icon: BarChart3 },
  { href: '/dashboard/map', label: 'Interactive Map', icon: Map },
  { href: '/dashboard/time-series', label: 'Time Series', icon: Activity },
  { href: '/dashboard/data-explorer', label: 'Data Explorer', icon: Database },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-white text-foreground">
      <div className="border-b border-border px-5 py-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">IDRC</p>
        <p className="text-sm font-semibold">Surveillance Suite</p>
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
