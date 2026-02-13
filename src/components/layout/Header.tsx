'use client';

import { useEffect, useState } from 'react';
import { Activity, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MobileNav } from './MobileNav';
import { createClient } from '@/lib/supabase/client';

export function Header() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) console.error('Sign out failed:', error.message);
    window.location.assign('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border/70 bg-background/95 px-4 backdrop-blur md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-r p-0">
          <MobileNav />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
          <h1 className="text-sm font-semibold md:text-base">Uganda Malaria Surveillance</h1>
        </div>
      </div>

      {email ? (
        <div className="hidden max-w-[240px] truncate text-sm text-muted-foreground md:block" title={email}>
          {email}
        </div>
      ) : null}

      <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </header>
  );
}
