import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/Pagination';
import { fetchInvoices } from '@/lib/api/invoices';
import type { InvoiceSortField, InvoiceStatusView, SortOrder } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { StatusBadge } from './StatusBadge';

const STATUS_OPTIONS: Array<{ value: InvoiceStatusView | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Overdue', label: 'Overdue' },
];

const PAGE_SIZE = 6;

function SortableHeader({
  label,
  field,
  sortBy,
  ordering,
  onSort,
}: {
  label: string;
  field: InvoiceSortField;
  sortBy: InvoiceSortField;
  ordering: SortOrder;
  onSort: (field: InvoiceSortField) => void;
}) {
  const isActive = sortBy === field;
  const Icon = isActive ? (ordering === 'ASC' ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
    >
      {label}
      <Icon className="size-3.5" />
    </button>
  );
}

export function InvoiceListPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<InvoiceStatusView | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState<InvoiceSortField>('invoiceDate');
  const [ordering, setOrdering] = useState<SortOrder>('DESC');

  const debouncedKeyword = useDebouncedValue(keyword, 350);

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      ordering,
      status: status === 'all' ? undefined : status,
      keyword: debouncedKeyword,
      fromDate,
      toDate,
    }),
    [page, sortBy, ordering, status, debouncedKeyword, fromDate, toDate],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['invoices', query],
    queryFn: () => fetchInvoices(query),
  });

  const handleSort = (field: InvoiceSortField) => {
    if (field === sortBy) {
      setOrdering((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setOrdering('DESC');
    }
    setPage(1);
  };

  const hasFilters = keyword || status !== 'all' || fromDate || toDate;
  const clearFilters = () => {
    setKeyword('');
    setStatus('all');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <Button
          className="bg-blue-600 text-white hover:bg-blue-500"
          onClick={() => navigate('/invoices/new')}
        >
          <Plus className="size-4" />
          Create Invoice
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Search invoice number or customer…"
            className="pl-9"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as InvoiceStatusView | 'all');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40"
            aria-label="From date"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40"
            aria-label="To date"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Invoice Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>
                  <SortableHeader
                    label="Invoice Date"
                    field="invoiceDate"
                    sortBy={sortBy}
                    ordering={ordering}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader
                    label="Due Date"
                    field="dueDate"
                    sortBy={sortBy}
                    ordering={ordering}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <div className="flex justify-end">
                    <SortableHeader
                      label="Total Amount"
                      field="totalAmount"
                      sortBy={sortBy}
                      ordering={ordering}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isLoading && isError && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    Failed to load invoices. Please try again.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && data?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                !isError &&
                data?.data.map((invoice) => (
                  <TableRow
                    key={invoice.invoiceId}
                    className="cursor-pointer"
                    onClick={() => navigate(`/invoices/${invoice.invoiceId}`)}
                  >
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{invoice.customer.fullname}</div>
                      {invoice.customer.email && (
                        <div className="text-xs text-muted-foreground">{invoice.customer.email}</div>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(invoice.totalAmount, invoice.currencySymbol)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data?.paging.total ?? 0}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
