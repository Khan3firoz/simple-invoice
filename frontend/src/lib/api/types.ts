export type InvoiceStatus = 'Draft' | 'Pending' | 'Paid';
export type InvoiceStatusView = InvoiceStatus | 'Overdue';

export interface Customer {
  fullname: string;
  email?: string;
  mobileNumber?: string;
  address?: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  invoiceReference?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  currencySymbol: string;
  description?: string;
  status: InvoiceStatusView;
  customer: Customer;
  items: InvoiceItem[];
  invoiceSubTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  totalPaid: number;
  balanceAmount: number;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  paging: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export type InvoiceSortField = 'invoiceDate' | 'dueDate' | 'totalAmount';
export type SortOrder = 'ASC' | 'DESC';

export interface InvoiceListQuery {
  page: number;
  pageSize: number;
  sortBy: InvoiceSortField;
  ordering: SortOrder;
  status?: InvoiceStatusView;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CreateInvoicePayload {
  invoiceNumber: string;
  invoiceReference?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  currencySymbol: string;
  description?: string;
  customer: Customer;
  item: {
    name: string;
    quantity: number;
    rate: number;
  };
  taxPercent?: number;
  discount?: number;
}

export interface User {
  id: string;
  email: string;
  fullname: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}
