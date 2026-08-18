import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { InvoiceDetailPage } from './InvoiceDetailPage';
import * as invoicesApi from '@/lib/api/invoices';
import type { Invoice } from '@/lib/api/types';

vi.mock('@/lib/api/invoices');

const sampleInvoice: Invoice = {
  invoiceId: 'inv-1',
  invoiceNumber: 'IV1001',
  invoiceReference: '#5721662',
  invoiceDate: '2026-06-03',
  dueDate: '2026-07-03',
  currency: 'AUD',
  currencySymbol: 'AU$',
  description: 'Invoice is issued to Kanglee',
  status: 'Overdue',
  customer: {
    fullname: 'Paul Tan',
    email: 'paul@101digital.io',
    mobileNumber: '947717364111',
    address: 'Singapore',
  },
  items: [{ id: 'item-1', name: 'Honda RC150', quantity: 2, rate: 1000 }],
  invoiceSubTotal: 2000,
  totalTax: 200,
  totalDiscount: 20,
  totalAmount: 2180,
  totalPaid: 1451.34,
  balanceAmount: 728.66,
  createdAt: '2026-06-03T12:03:26.995Z',
};

function renderDetailPage(id = 'inv-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/invoices/${id}`]}>
        <Routes>
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('InvoiceDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders invoice, customer, items and calculated totals', async () => {
    vi.mocked(invoicesApi.fetchInvoice).mockResolvedValue(sampleInvoice);

    renderDetailPage();

    expect(await screen.findByText('Invoice IV1001')).toBeInTheDocument();
    expect(screen.getByText('Paul Tan')).toBeInTheDocument();
    expect(screen.getByText('paul@101digital.io')).toBeInTheDocument();
    expect(screen.getByText('Honda RC150')).toBeInTheDocument();
    expect(screen.getByText('AU$2,180.00')).toBeInTheDocument(); // total
    expect(screen.getByText('AU$728.66')).toBeInTheDocument(); // balance due
    expect(invoicesApi.fetchInvoice).toHaveBeenCalledWith('inv-1');
  });

  it('shows a not-found message for a 404 response', async () => {
    const notFoundError = new AxiosError(
      'Request failed',
      '404',
      undefined,
      undefined,
      {
        status: 404,
        statusText: 'Not Found',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: { statusCode: 404, message: 'Invoice not found', error: 'Not Found' },
      },
    );
    vi.mocked(invoicesApi.fetchInvoice).mockRejectedValue(notFoundError);

    renderDetailPage('missing-id');

    expect(await screen.findByText('Invoice not found.')).toBeInTheDocument();
  });
});
