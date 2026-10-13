'use client';

import { useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSupabaseQuery } from '@/lib/hooks/use-supabase-query';
import { fetchAdminUsers, setUserRole } from '@/lib/queries/access';
import { useToast } from '@/hooks/use-toast';

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');

export default function UsersPage() {
  const { data, loading, error, refetch } = useSupabaseQuery(() => fetchAdminUsers());
  const [filter, setFilter] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast } = useToast();

  const users = (data ?? []).filter((u) => u.email?.toLowerCase().includes(filter.trim().toLowerCase()));

  const handleRoleChange = async (userId: string, email: string, role: 'standard' | 'full') => {
    setSavingId(userId);
    try {
      await setUserRole(userId, role);
      toast({
        title: 'Role updated',
        description: `${email} is now ${role === 'full' ? 'Full' : 'Standard'}. It takes effect when their session next refreshes (within an hour).`,
      });
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
    setSavingId(null);
    refetch();
  };

  return (
    <div className="min-h-screen app-shell">
      <AdminHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <Card className="app-panel">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-lg">Users ({data?.length ?? 0})</CardTitle>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by email"
              className="max-w-xs"
            />
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <LoadingSpinner message="Loading users..." />
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>Latest request</TableHead>
                      <TableHead>Signed up</TableHead>
                      <TableHead>Last sign-in</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          {u.role === 'admin' ? (
                            <Badge>Admin</Badge>
                          ) : (
                            <Select
                              value={u.role}
                              disabled={savingId === u.id}
                              onValueChange={(v) => handleRoleChange(u.id, u.email, v as 'standard' | 'full')}
                            >
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">{u.latest_request_status ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(u.last_sign_in_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
