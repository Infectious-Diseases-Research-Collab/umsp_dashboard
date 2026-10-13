'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Clock, KeyRound, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAccessLevel } from '@/lib/hooks/use-access-level';
import { RequestAccessDialog } from './RequestAccessDialog';

/** Header control showing the user's tier, or letting a Standard user request Full. */
export function AccessStatus() {
  const { user, role, loading, latestRequest, pendingCount, refetchRequests } = useAccessLevel();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading || !user) return null;

  if (role === 'admin') {
    return (
      <Button variant="outline" size="sm" asChild className="gap-2">
        <Link href="/admin/access-requests">
          <ShieldCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Access requests</span>
          {pendingCount > 0 && <Badge className="h-5 px-1.5">{pendingCount}</Badge>}
        </Link>
      </Button>
    );
  }

  if (role === 'full') {
    return (
      <Badge variant="secondary" className="gap-1 py-1">
        <BadgeCheck className="h-3.5 w-3.5" />
        Full access
      </Badge>
    );
  }

  if (latestRequest?.status === 'pending') {
    return (
      <Badge variant="outline" className="gap-1 py-1" title="An administrator will review your request">
        <Clock className="h-3.5 w-3.5" />
        Request pending
      </Badge>
    );
  }

  const denied = latestRequest?.status === 'denied';
  return (
    <>
      <Button
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        <KeyRound className="h-4 w-4" />
        <span className="hidden sm:inline">{denied ? 'Request access again' : 'Request Full Access'}</span>
        <span className="sm:hidden">Full access</span>
      </Button>
      <RequestAccessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        email={user.email ?? ''}
        onSubmitted={refetchRequests}
        previousDenial={denied ? { note: latestRequest?.admin_note ?? null } : null}
      />
    </>
  );
}
