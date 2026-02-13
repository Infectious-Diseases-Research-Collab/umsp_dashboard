'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { UmspMonthlyData } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';

interface Props {
  data: UmspMonthlyData[];
  visibleColumns: string[];
}

const ALL_COLUMNS: { key: keyof UmspMonthlyData; label: string }[] = [
  { key: 'site', label: 'Site' },
  { key: 'region', label: 'Region' },
  { key: 'district', label: 'District' },
  { key: 'monthyear', label: 'Month/Year' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
  { key: 'malaria_incidence_per_1000_py', label: 'Malaria Incidence per 1000' },
  { key: 'tpr_cases_all', label: 'TPR' },
  { key: 'tpr_cases_per_ca', label: 'Lab Confirmed Cases' },
  { key: 'visits', label: 'Number of Visits' },
  { key: 'malariasuspected', label: 'Suspected Cases' },
  { key: 'propsuspected_per_total_visits', label: 'Prop. Suspected' },
  { key: 'proptested', label: 'Prop. Tested' },
  { key: 'prop_visit_ca', label: 'Prop. Visits Target Area' },
];

export function DataTable({ data, visibleColumns }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns = useMemo<ColumnDef<UmspMonthlyData>[]>(() => {
    return ALL_COLUMNS
      .filter((col) => visibleColumns.includes(col.key))
      .map((col) => ({
        accessorKey: col.key,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 font-semibold"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {col.label}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const v = getValue();
          if (v == null) return <span className="text-muted-foreground">-</span>;
          if (typeof v === 'number') return isFinite(v) ? v.toFixed(2) : '-';
          return String(v);
        },
      }));
  }, [visibleColumns]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="space-y-4">
      <Badge variant="outline">
        Showing {table.getFilteredRowModel().rows.length} of {data.length} records
      </Badge>

      {/* Column filters */}
      <div className="flex flex-wrap gap-2">
        {table.getAllColumns().filter((col) => col.getCanFilter()).map((column) => (
          <Input
            key={column.id}
            placeholder={`Filter ${column.id}...`}
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(e) => column.setFilterValue(e.target.value)}
            className="w-40 h-8 text-xs"
          />
        ))}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { ALL_COLUMNS };
