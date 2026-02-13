'use client';

import { YLOR_RD, RD_YL_BU } from '@/lib/utils/color-palette';

interface Props {
  title: string;
  min: number;
  max: number;
  type?: 'ylOrRd' | 'rdYlBu';
}

export function MapLegend({ title, min, max, type = 'ylOrRd' }: Props) {
  const palette = type === 'rdYlBu' ? RD_YL_BU : YLOR_RD;

  return (
    <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 rounded-lg p-3 shadow-md text-xs">
      <p className="font-semibold mb-1">{title}</p>
      <div className="flex items-center gap-1">
        <span>{min.toFixed(1)}</span>
        <div className="flex h-3">
          {palette.map((color, i) => (
            <div key={i} className="w-4 h-3" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
}
