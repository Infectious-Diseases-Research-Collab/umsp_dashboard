'use client';

import { useCallback } from 'react';
import { CsvUploader } from '@/components/admin/CsvUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
  const { toast } = useToast();

  const handleUploadComplete = useCallback(() => {
    toast({ title: 'Upload complete', description: 'Data has been updated successfully.' });
  }, [toast]);

  return (
    <div className="min-h-screen app-shell">
      <AdminHeader />

      <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <Card className="mb-6 app-panel">
          <CardHeader>
            <CardTitle className="text-lg">Upload Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Upload CSV or TSV files to update dashboard data. Supported tables:</p>
            <ul className="list-inside list-disc space-y-1">
              <li><strong>Monthly Surveillance Data</strong>: Site, region, district, monthyear, and indicator fields</li>
              <li><strong>Health Facility Coordinates</strong>: GPS coordinates for map rendering</li>
              <li><strong>Active Sites</strong>: Sites currently included in surveillance tracking</li>
              <li><strong>Genomic: Sites Reference</strong>: merged_sites_reference.csv — 80 sites with collection codes</li>
              <li><strong>Genomic: Single Locus</strong>: sl_summary TSV — select MIPs or Paragon platform when uploading</li>
              <li><strong>Genomic: Multilocus</strong>: ml_summary TSV — select MIPs or Paragon platform when uploading</li>
            </ul>
            <p><strong>Replace mode</strong> clears old data before insert. <strong>Append mode</strong> upserts existing rows.</p>
          </CardContent>
        </Card>

        <CsvUploader onUploadComplete={handleUploadComplete} />
      </main>
    </div>
  );
}
