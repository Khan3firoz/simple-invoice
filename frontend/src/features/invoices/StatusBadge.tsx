import { cn } from '@/lib/utils';
import type { InvoiceStatusView } from '@/lib/api/types';

const STATUS_STYLES: Record<InvoiceStatusView, string> = {
  Draft: 'bg-muted text-muted-foreground border-border',
  Pending: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  Paid: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  Overdue: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
};

export function StatusBadge({ status }: { status: InvoiceStatusView }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
