export const INVOICE_STATUSES = ['Draft', 'Pending', 'Paid', 'Overdue'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export interface InvoiceItem {
  id: string
  name: string
  quantity: number
  rate: number
}

export interface Invoice {
  invoiceId: string
  invoiceNumber: string
  invoiceReference?: string
  invoiceDate: string
  dueDate: string
  currency: string
  currencySymbol: string
  description?: string
  status: InvoiceStatus
  customerFullname: string
  customerEmail: string
  customerMobileNumber?: string
  customerAddress?: string
  invoiceSubTotal: number
  taxPercent: number
  totalTax: number
  totalDiscount: number
  totalAmount: number
  totalPaid: number
  balanceAmount: number
  createdAt: string
  items: InvoiceItem[]
}

export interface PagedResult<T> {
  data: T[]
  paging: {
    page: number
    pageSize: number
    total: number
  }
}

export interface InvoiceListParams {
  page?: number
  pageSize?: number
  sortBy?: 'invoiceDate' | 'dueDate' | 'totalAmount'
  ordering?: 'ASC' | 'DESC'
  status?: InvoiceStatus
  keyword?: string
}

export interface CreateInvoicePayload {
  invoiceNumber: string
  invoiceReference?: string
  invoiceDate: string
  dueDate: string
  currency: string
  currencySymbol?: string
  description?: string
  customer: {
    fullname: string
    email: string
    mobileNumber?: string
    address?: string
  }
  item: {
    name: string
    quantity: number
    rate: number
  }
  taxPercent?: number
  discount?: number
}
