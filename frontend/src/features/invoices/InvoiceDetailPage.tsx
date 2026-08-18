import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ArrowLeft, MoreHorizontal, Printer } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchInvoice } from '@/lib/api/invoices';
import { formatDate, formatMoney } from '@/lib/format';
import { StatusBadge } from './StatusBadge';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => fetchInvoice(id!),
    enabled: !!id,
  });

  const notFound = isAxiosError(error) && error.response?.status === 404;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to Invoices
        </Link>
        <p className="text-destructive">
          {notFound ? 'Invoice not found.' : 'Failed to load this invoice. Please try again.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to Invoices
        </Link>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoice {invoice.invoiceNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review invoice information and payment status
          </p>
          <div className="mt-3 flex items-center gap-3">
            <StatusBadge status={invoice.status} />
            <span className="text-xs text-muted-foreground">
              Last updated {formatDate(invoice.createdAt.slice(0, 10))}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreHorizontal className="size-4" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => window.print()}>
              <Printer className="size-4" />
              Print Invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Section title="Invoice information">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field label="Invoice number" value={invoice.invoiceNumber} />
          <Field label="Reference" value={invoice.invoiceReference || invoice.description || '—'} />
          <Field label="Invoice date" value={formatDate(invoice.invoiceDate)} />
          <Field label="Due date" value={formatDate(invoice.dueDate)} />
          <Field label="Currency" value={`${invoice.currency} · ${invoice.currencySymbol}`} />
          <Field label="Status" value={<StatusBadge status={invoice.status} />} />
        </dl>
      </Section>

      <Section title="Customer">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Name" value={invoice.customer.fullname} />
          <Field label="Email" value={invoice.customer.email || '—'} />
          <Field label="Mobile" value={invoice.customer.mobileNumber || '—'} />
          <Field label="Address" value={invoice.customer.address || '—'} />
        </dl>
      </Section>

      <Section title="Invoice items">
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id} className="hover:bg-transparent">
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(item.rate, invoice.currencySymbol)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(item.quantity * item.rate, invoice.currencySymbol)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 ml-auto flex w-full flex-col gap-2 sm:w-64">
          <SummaryRow label="Subtotal" value={formatMoney(invoice.invoiceSubTotal, invoice.currencySymbol)} />
          <SummaryRow label="Tax" value={formatMoney(invoice.totalTax, invoice.currencySymbol)} />
          <SummaryRow
            label="Discount"
            value={`-${formatMoney(invoice.totalDiscount, invoice.currencySymbol)}`}
          />
          <SummaryRow
            label="Total"
            value={formatMoney(invoice.totalAmount, invoice.currencySymbol)}
            emphasis
          />
          <SummaryRow label="Paid" value={formatMoney(invoice.totalPaid, invoice.currencySymbol)} />
          <SummaryRow
            label="Balance due"
            value={formatMoney(invoice.balanceAmount, invoice.currencySymbol)}
            emphasis
          />
        </div>
      </Section>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={emphasis ? 'font-semibold text-foreground' : 'text-foreground'}>{value}</span>
    </div>
  );
}
