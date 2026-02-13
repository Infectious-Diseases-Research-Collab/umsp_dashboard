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
    <div className="min-h-screen bg-[#F5F6F5]">
      <header className="h-14 bg-[#00016B] text-white flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-[#26A69A]" />
          <span className="font-semibold">Admin Panel</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/70">{user?.email}</span>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" asChild>
            <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-1" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">Data Management</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Upload CSV files to update dashboard data. Three tables are supported:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Monthly Surveillance Data</strong>: Main data with Site, Region, district, monthyear, indicators</li>
              <li><strong>Health Facility Coordinates</strong>: GPS coordinates for map display</li>
              <li><strong>Active Sites</strong>: List of currently active surveillance sites</li>
            </ul>
            <p><strong>Replace mode</strong> deletes all existing data before inserting. <strong>Append mode</strong> upserts (updates existing, inserts new).</p>
          </CardContent>
        </Card>

        <CsvUploader onUploadComplete={handleUploadComplete} />
      </main>
    </div>
  );
}
