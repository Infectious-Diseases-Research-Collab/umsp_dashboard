'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ALL_COLUMNS } from './DataTable';

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function ColumnSelector({ selected, onChange }: Props) {
  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((s) => s !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <Card className="app-panel">
      <CardHeader>
        <CardTitle className="text-sm">Visible Columns</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ALL_COLUMNS.map((col) => (
          <div key={col.key} className="flex items-center gap-2">
            <Checkbox
              id={`col-${col.key}`}
              checked={selected.includes(col.key)}
              onCheckedChange={() => toggle(col.key)}
            />
            <Label htmlFor={`col-${col.key}`} className="text-xs">{col.label}</Label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
