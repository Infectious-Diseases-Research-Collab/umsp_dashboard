'use client';

import { useState, useCallback } from 'react';
import { DataTable } from '@/components/data-explorer/DataTable';
import { ColumnSelector } from '@/components/data-explorer/ColumnSelector';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useSupabaseQuery } from '@/lib/hooks/use-supabase-query';
import { fetchAllMonthlyData } from '@/lib/queries/monthly-data';
import { downloadCsv } from '@/lib/utils/csv-export';

const DEFAULT_COLUMNS = [
  'site', 'region', 'monthyear',
  'malaria_incidence_per_1000_py', 'tpr_cases_all', 'tpr_cases_per_ca',
];

export default function DataExplorerPage() {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const { data, loading } = useSupabaseQuery(() => fetchAllMonthlyData());

  const handleDownload = useCallback(() => {
    if (!data) return;
    const rows = data.map((r) => {
      const row: Record<string, unknown> = {};
      for (const col of visibleColumns) {
        row[col] = (r as unknown as Record<string, unknown>)[col];
      }
      return row;
    });
    downloadCsv(rows, `malaria_filtered_data_${new Date().toISOString().split('T')[0]}.csv`);
  }, [data, visibleColumns]);

  if (loading) return <LoadingSpinner message="Loading data..." />;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-56 shrink-0">
        <ColumnSelector selected={visibleColumns} onChange={setVisibleColumns} />
        <div className="mt-4">
          <DownloadButton onClick={handleDownload} label="Download CSV" />
        </div>
      </div>
      <div className="flex-1">
        <DataTable data={data ?? []} visibleColumns={visibleColumns} />
      </div>
    </div>
  );
}
