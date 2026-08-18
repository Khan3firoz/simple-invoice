// Persisted statuses only. "Overdue" is derived at read time and never stored.
export enum InvoiceStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  PAID = 'Paid',
}

export type InvoiceStatusWithOverdue = InvoiceStatus | 'Overdue';
