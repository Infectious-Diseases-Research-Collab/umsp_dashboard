'use client';

import { Badge } from '@/components/ui/badge';

interface Props {
  metric: string;
  siteCount: number;
  dataRange: string;
}

export function MapStatsBar({ metric, siteCount, dataRange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      <Badge variant="secondary">{metric}</Badge>
      <Badge variant="outline">{siteCount} sites</Badge>
      <Badge variant="outline">{dataRange}</Badge>
    </div>
  );
}
