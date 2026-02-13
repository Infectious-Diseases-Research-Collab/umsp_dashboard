'use client';

import { Activity, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MobileNav } from './MobileNav';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-14 bg-[#00016B] text-white flex items-center px-4 gap-4 border-b border-white/10">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/10">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-[#1A237E] border-none">
          <MobileNav />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2 flex-1">
        <Activity className="w-5 h-5 text-[#26A69A]" />
        <h1 className="font-semibold text-sm md:text-base">IDRC Malaria Surveillance Dashboard</h1>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="text-white/80 hover:text-white hover:bg-white/10"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </header>
  );
}
