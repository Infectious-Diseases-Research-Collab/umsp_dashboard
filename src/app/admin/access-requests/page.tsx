'use client';

import { useCallback } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AccessRequestCard } from '@/components/admin/AccessRequestCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseQuery } from '@/lib/hooks/use-supabase-query';
import { fetchAccessRequests } from '@/lib/queries/access';
import { useToast } from '@/hooks/use-toast';

export default function AccessRequestsPage() {
  const { data, loading, error, refetch } = useSupabaseQuery(() => fetchAccessRequests());
  const { toast } = useToast();

  const pending = (data ?? []).filter((r) => r.status === 'pending');
  const history = (data ?? []).filter((r) => r.status !== 'pending');

  const handleReview = useCallback(async (id: number, approve: boolean, note: string) => {
    const response = await fetch(`/api/admin/access-requests/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve, note }),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast({ title: 'Review failed', description: body.error ?? 'Please try again.', variant: 'destructive' });
    } else {
      toast({
        title: approve ? 'Request approved' : 'Request denied',
        description: body.notified
          ? `${body.email} has been notified by email.`
          : `The notification email to ${body.email} could not be sent.`,
      });
    }
    refetch();
  }, [refetch, toast]);

  return (
    <div className="min-h-screen app-shell">
      <AdminHeader />

      <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
        {loading && !data ? (
          <LoadingSpinner message="Loading requests..." />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="history">History ({history.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pending.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No pending requests.</p>}
              {pending.map((r) => (
                <AccessRequestCard key={r.id} request={r} onReview={handleReview} />
              ))}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {history.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No reviewed requests yet.</p>}
              {history.map((r) => (
                <AccessRequestCard key={r.id} request={r} />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
