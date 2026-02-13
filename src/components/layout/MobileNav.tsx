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
    <div className="flex flex-col h-full text-white">
      <div className="p-4 border-b border-white/10">
        <span className="font-bold text-sm">IDRC Malaria GIS</span>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm transition-all',
                isActive
                  ? 'bg-[#26A69A] text-white'
                  : 'text-white/80 hover:bg-[#26A69A]/50 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
