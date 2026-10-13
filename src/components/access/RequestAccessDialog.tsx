'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onSubmitted: () => void;
  /** Set when the user's previous request was declined; shown above the form. */
  previousDenial?: { note: string | null } | null;
}

export function RequestAccessDialog({ open, onOpenChange, email, onSubmitted, previousDenial }: Props) {
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const response = await fetch('/api/access-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, institution, reason }),
    });
    const body = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      toast({ title: 'Request not sent', description: body.error ?? 'Please try again.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Request sent', description: 'An administrator will review it and you will be notified by email. Check your spam or junk folder if you do not see it.' });
    setReason('');
    onOpenChange(false);
    onSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Request full access</DialogTitle>
            <DialogDescription>
              Full access adds the data tables, CSV downloads and PDF reports. An administrator
              reviews each request.
            </DialogDescription>
          </DialogHeader>

          {previousDenial && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Your previous request was declined.
              {previousDenial.note && <span className="mt-1 block">Administrator&apos;s note: {previousDenial.note}</span>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="request-email">Email</Label>
            <Input id="request-email" value={email} readOnly disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="request-name">Full name</Label>
            <Input id="request-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="request-institution">Institution</Label>
            <Input id="request-institution" value={institution} onChange={(e) => setInstitution(e.target.value)} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="request-reason">Reason for requesting full access</Label>
            <Textarea
              id="request-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={2000}
              rows={5}
              placeholder="How you plan to use the data"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
