'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-[#1A237E] text-white min-h-screen">
      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#26A69A] flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-sm">IDRC Malaria GIS</span>
        </Link>
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
                  ? 'bg-[#26A69A] text-white border-l-4 border-[#F7A800]'
                  : 'text-white/80 hover:bg-[#26A69A]/50 hover:text-white border-l-4 border-transparent'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-md w-full transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
