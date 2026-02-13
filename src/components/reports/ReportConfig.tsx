'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { REPORT_TYPES, REPORT_SECTIONS, ReportType, ReportSection } from '@/types/reports';

interface Props {
  reportType: ReportType;
  sections: ReportSection[];
  onTypeChange: (type: ReportType) => void;
  onSectionsChange: (sections: ReportSection[]) => void;
  onGenerate: () => void;
  generating: boolean;
}

export function ReportConfig({ reportType, sections, onTypeChange, onSectionsChange, onGenerate, generating }: Props) {
  const toggleSection = (section: ReportSection) => {
    if (sections.includes(section)) {
      onSectionsChange(sections.filter((s) => s !== section));
    } else {
      onSectionsChange([...sections, section]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Report Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Report Type</Label>
          <Select value={reportType} onValueChange={(v) => onTypeChange(v as ReportType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((rt) => (
                <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Sections</Label>
          <div className="space-y-2">
            {REPORT_SECTIONS.map((rs) => (
              <div key={rs.value} className="flex items-center gap-2">
                <Checkbox
                  id={`section-${rs.value}`}
                  checked={sections.includes(rs.value)}
                  onCheckedChange={() => toggleSection(rs.value)}
                />
                <Label htmlFor={`section-${rs.value}`} className="text-sm">{rs.label}</Label>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={onGenerate} disabled={generating || sections.length === 0} className="w-full">
          {generating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
          ) : (
            <><Download className="w-4 h-4 mr-2" /> Generate PDF Report</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
