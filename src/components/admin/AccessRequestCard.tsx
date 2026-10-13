'use client';

import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { AccessRequest } from '@/types/database';

interface Props {
  request: AccessRequest;
  onReview?: (id: number, approve: boolean, note: string) => Promise<void>;
}

const STATUS_VARIANT = {
  pending: 'outline',
  approved: 'default',
  denied: 'destructive',
} as const;

export function AccessRequestCard({ request, onReview }: Props) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'deny' | null>(null);

  const review = async (approve: boolean) => {
    if (!onReview) return;
    setBusy(approve ? 'approve' : 'deny');
    await onReview(request.id, approve, note);
    setBusy(null);
  };

  return (
    <Card className="app-panel">
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{request.full_name}</p>
            <p className="text-sm text-muted-foreground">{request.email}</p>
            <p className="text-sm">{request.institution}</p>
          </div>
          <div className="text-right">
            <Badge variant={STATUS_VARIANT[request.status]} className="capitalize">{request.status}</Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              Requested {new Date(request.created_at).toLocaleDateString()}
            </p>
            {request.reviewed_at && (
              <p className="text-xs text-muted-foreground">
                Reviewed {new Date(request.reviewed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{request.reason}</p>

        {request.admin_note && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Admin note:</span> {request.admin_note}
          </p>
        )}

        {onReview && request.status === 'pending' && (
          <div className="space-y-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note, included in the email to the requester"
              maxLength={2000}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => review(false)} disabled={busy !== null}>
                {busy === 'deny' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}
                Deny
              </Button>
              <Button onClick={() => review(true)} disabled={busy !== null}>
                {busy === 'approve' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                Approve
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
