import { Badge } from '@/components/ui/badge'
import type { InvoiceStatus } from '@/types/invoice'

const VARIANT_BY_STATUS: Record<InvoiceStatus, 'secondary' | 'info' | 'success' | 'destructive'> = {
  Draft: 'secondary',
  Pending: 'info',
  Paid: 'success',
  Overdue: 'destructive',
}

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{status}</Badge>
}
