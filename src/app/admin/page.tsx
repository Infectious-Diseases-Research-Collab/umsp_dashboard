'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CsvUploader } from '@/components/admin/CsvUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, LogOut, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAdminAuth } from '@/lib/hooks/use-admin-auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AdminPage() {
  const { user } = useAdminAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  }, [router]);

  const handleUploadComplete = useCallback(() => {
    toast({ title: 'Upload complete', description: 'Data has been updated successfully.' });
  }, [toast]);

  return (
    <div className="min-h-screen app-shell">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
              <span className="font-semibold">Data Management</span>
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
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <Card className="mb-6 app-panel">
          <CardHeader>
            <CardTitle className="text-lg">Upload Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Upload CSV files to update dashboard data. Three tables are supported:</p>
            <ul className="list-inside list-disc space-y-1">
              <li><strong>Monthly Surveillance Data</strong>: Site, region, district, monthyear, and indicator fields</li>
              <li><strong>Health Facility Coordinates</strong>: GPS coordinates for map rendering</li>
              <li><strong>Active Sites</strong>: Sites currently included in surveillance tracking</li>
            </ul>
            <p><strong>Replace mode</strong> clears old data before insert. <strong>Append mode</strong> upserts existing rows.</p>
          </CardContent>
        </Card>

        <CsvUploader onUploadComplete={handleUploadComplete} />
      </main>
    </div>
  );
}
