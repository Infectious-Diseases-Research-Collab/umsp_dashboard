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
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: color }}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
          {loading ? (
            <Skeleton className="h-7 w-24 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
