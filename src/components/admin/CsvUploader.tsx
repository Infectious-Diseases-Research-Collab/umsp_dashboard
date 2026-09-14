'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type TargetTable =
  | 'umsp_monthly_data'
  | 'health_facility_coordinates'
  | 'active_sites'
  | 'genomic_sites_reference'
  | 'genomic_single_locus'
  | 'genomic_multi_locus';
type UploadMode = 'replace' | 'append';
type Platform = 'mips' | 'paragon';

const TABLE_LABELS: Record<TargetTable, string> = {
  umsp_monthly_data: 'Monthly Surveillance Data',
  health_facility_coordinates: 'Health Facility Coordinates',
  active_sites: 'Active Sites',
  genomic_sites_reference: 'Genomic: Sites Reference',
  genomic_single_locus: 'Genomic: Single Locus (SL)',
  genomic_multi_locus: 'Genomic: Multilocus (ML)',
};

interface Props {
  onUploadComplete: () => void;
}

export function CsvUploader({ onUploadComplete }: Props) {
  const [targetTable, setTargetTable] = useState<TargetTable>('umsp_monthly_data');
  const [mode, setMode] = useState<UploadMode>('append');
  const [platform, setPlatform] = useState<Platform>('paragon');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const isTsv = f.name.toLowerCase().endsWith('.tsv');
    Papa.parse(f, {
      header: true,
      delimiter: isTsv ? '\t' : undefined,
      preview: 10,
      complete: (result) => {
        setColumns(result.meta.fields ?? []);
        setPreview(result.data as Record<string, string>[]);
      },
      error: () => {
        toast({ title: 'Error', description: 'Failed to parse file.', variant: 'destructive' });
      },
    });
  }, [toast]);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const isTsv = file.name.toLowerCase().endsWith('.tsv');
    const needsPlatform = targetTable === 'genomic_single_locus' || targetTable === 'genomic_multi_locus';
    Papa.parse(file, {
      header: true,
      delimiter: isTsv ? '\t' : undefined,
      complete: async (result) => {
        const rows = result.data as Record<string, string>[];

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table: targetTable,
              mode,
              rows,
              platform: needsPlatform ? platform : undefined,
            }),
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Upload failed');
          }

          const result = await response.json();
          toast({
            title: 'Upload successful',
            description: `${result.inserted} rows processed in ${targetTable}.`,
          });
          onUploadComplete();
        } catch (error) {
          toast({
            title: 'Upload failed',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
        } finally {
          setUploading(false);
          setProgress(100);
        }
      },
    });
  }, [file, targetTable, mode, platform, toast, onUploadComplete]);

  return (
    <Card className="app-panel">
      <CardHeader>
        <CardTitle className="text-lg">CSV Data Upload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target Table</Label>
          <Select value={targetTable} onValueChange={(v) => setTargetTable(v as TargetTable)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TABLE_LABELS) as TargetTable[]).map((key) => (
                <SelectItem key={key} value={key}>{TABLE_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(targetTable === 'genomic_single_locus' || targetTable === 'genomic_multi_locus') && (
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mips">MIPs (2016–2022, abbreviated site codes)</SelectItem>
                <SelectItem value="paragon">Paragon (2023+, full site names)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upload Mode</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as UploadMode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">Replace All Data</SelectItem>
              <SelectItem value="append">Append / Upsert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CSV File</Label>
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/60">
            <input
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
              onChange={handleFileChange}
              className="hidden"
              id="csv-input"
            />
            <label htmlFor="csv-input" className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : 'Click to select or drag CSV/TSV file'}
              </p>
            </label>
          </div>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{columns.length} columns</Badge>
              <Badge variant="outline">Preview: first 10 rows</Badge>
            </div>
            <div className="overflow-x-auto max-h-60 border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col} className="whitespace-nowrap text-xs">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell key={col} className="text-xs whitespace-nowrap">{row[col]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading... {progress}%</span>
          </div>
        )}

        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
          {uploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Upload Data</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
