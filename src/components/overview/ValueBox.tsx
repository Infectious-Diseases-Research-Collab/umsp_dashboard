'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ValueBoxProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  loading?: boolean;
}

export function ValueBox({ title, value, icon: Icon, color, loading }: ValueBoxProps) {
  return (
    <Card className="app-panel transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(21,48,46,0.12)]">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm" style={{ backgroundColor: color }}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
          {loading ? <Skeleton className="mt-1 h-7 w-24" /> : <p className="text-2xl font-semibold text-foreground">{value}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
