import { api } from './client';
import type { CreateInvoicePayload, Invoice, InvoiceListQuery, Paginated } from './types';

export function fetchInvoices(query: InvoiceListQuery) {
  return api
    .get<Paginated<Invoice>>('/invoices', {
      params: {
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        ordering: query.ordering,
        status: query.status,
        keyword: query.keyword || undefined,
        fromDate: query.fromDate || undefined,
        toDate: query.toDate || undefined,
      },
    })
    .then((res) => res.data);
}

export function fetchInvoice(id: string) {
  return api.get<Invoice>(`/invoices/${id}`).then((res) => res.data);
}

export function createInvoice(payload: CreateInvoicePayload) {
  return api.post<Invoice>('/invoices', payload).then((res) => res.data);
}
