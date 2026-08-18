import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { api } from '@/lib/api'
import type { Invoice, PagedResult } from '@/types/invoice'
import { INVOICE_STATUSES } from '@/types/invoice'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/status-badge'

type SortField = 'invoiceDate' | 'dueDate' | 'totalAmount'

const PAGE_SIZE = 10
const STATUS_FILTER_OPTIONS = ['All', ...INVOICE_STATUSES] as const

function formatMoney(amount: number, currencySymbol: string) {
  return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function InvoiceListPage() {
  const navigate = useNavigate()
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<(typeof STATUS_FILTER_OPTIONS)[number]>('All')
  const [sortBy, setSortBy] = useState<SortField>('invoiceDate')
  const [ordering, setOrdering] = useState<'ASC' | 'DESC'>('DESC')
  const [page, setPage] = useState(1)

  // Debounce the free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setKeyword(keywordInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(timeout)
  }, [keywordInput])

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      ordering,
      ...(status !== 'All' ? { status } : {}),
      ...(keyword ? { keyword } : {}),
    }),
    [page, sortBy, ordering, status, keyword],
  )

  const { data, isLoading, isError } = useQuery({
    queryKey: ['invoices', queryParams],
    queryFn: async () => {
      const res = await api.get<PagedResult<Invoice>>('/invoices', { params: queryParams })
      return res.data
    },
  })

  const total = data?.paging.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setOrdering((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))
    } else {
      setSortBy(field)
      setOrdering('DESC')
    }
    setPage(1)
  }

  function sortIndicator(field: SortField) {
    if (sortBy !== field) return null
    return ordering === 'ASC' ? '▲' : '▼'
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          {total} invoice{total === 1 ? '' : 's'} total
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number or customer name..."
              className="pl-8"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as (typeof STATUS_FILTER_OPTIONS)[number])
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'All' ? 'All statuses' : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('invoiceDate')}>
                Invoice Date {sortIndicator('invoiceDate')}
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('dueDate')}>
                Due Date {sortIndicator('dueDate')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => toggleSort('totalAmount')}
              >
                Total {sortIndicator('totalAmount')}
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Loading invoices...
                </TableCell>
              </TableRow>
            )}
            {isError && (
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
            {data?.data.map((invoice) => (
              <TableRow
                key={invoice.invoiceId}
                className="cursor-pointer"
                onClick={() => navigate(`/invoices/${invoice.invoiceId}`)}
              >
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.customerFullname}</TableCell>
                <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                <TableCell className="text-right">
                  {formatMoney(invoice.totalAmount, invoice.currencySymbol)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={invoice.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
