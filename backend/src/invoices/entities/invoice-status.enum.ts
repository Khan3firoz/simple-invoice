// Persisted statuses only. "Overdue" is derived at read-time in InvoicesService
// and must never be written to the database — see business logic in invoices.service.ts.
export enum InvoiceStatus {
  DRAFT = 'Draft',
  PENDING = 'Pending',
  PAID = 'Paid',
}

export type InvoiceStatusView = InvoiceStatus | 'Overdue';
