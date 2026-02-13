'use client';

import { Badge } from '@/components/ui/badge';

interface Props {
  metric: string;
  siteCount: number;
  dataRange: string;
}

export function MapStatsBar({ metric, siteCount, dataRange }: Props) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <Badge className="rounded-full bg-primary/15 text-primary hover:bg-primary/15" variant="secondary">{metric}</Badge>
      <Badge variant="outline" className="rounded-full">{siteCount} sites</Badge>
      <Badge variant="outline" className="rounded-full">{dataRange}</Badge>
    </div>
  );
}
