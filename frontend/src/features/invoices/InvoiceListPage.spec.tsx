import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InvoiceListPage } from './InvoiceListPage';
import * as invoicesApi from '@/lib/api/invoices';
import type { Invoice, Paginated } from '@/lib/api/types';

vi.mock('@/lib/api/invoices');

const sampleInvoice: Invoice = {
  invoiceId: 'inv-1',
  invoiceNumber: 'IV1001',
  invoiceDate: '2026-06-01',
  dueDate: '2026-07-01',
  currency: 'AUD',
  currencySymbol: 'AU$',
  status: 'Pending',
  customer: { fullname: 'Paul Tan', email: 'paul@101digital.io' },
  items: [],
  invoiceSubTotal: 2000,
  totalTax: 200,
  totalDiscount: 0,
  totalAmount: 2200,
  totalPaid: 0,
  balanceAmount: 2200,
  createdAt: '2026-06-01T00:00:00.000Z',
};

function mockList(data: Invoice[], total = data.length): Paginated<Invoice> {
  return { data, paging: { page: 1, pageSize: 10, total } };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('InvoiceListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders invoice rows returned by the API', async () => {
    vi.mocked(invoicesApi.fetchInvoices).mockResolvedValue(mockList([sampleInvoice]));

    renderPage();

    expect(await screen.findByText('IV1001')).toBeInTheDocument();
    expect(screen.getByText('Paul Tan')).toBeInTheDocument();
    expect(screen.getByText('AU$2,200.00')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows an empty state when there are no invoices', async () => {
    vi.mocked(invoicesApi.fetchInvoices).mockResolvedValue(mockList([]));

    renderPage();

    expect(await screen.findByText('No invoices found.')).toBeInTheDocument();
  });

  it('requests the next page when Next is clicked', async () => {
    vi.mocked(invoicesApi.fetchInvoices).mockResolvedValue(mockList([sampleInvoice], 25));

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('IV1001');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      const lastCall = vi.mocked(invoicesApi.fetchInvoices).mock.calls.at(-1)?.[0];
      expect(lastCall?.page).toBe(2);
    });
  });

  it('toggles sort order when a sortable header is clicked twice', async () => {
    vi.mocked(invoicesApi.fetchInvoices).mockResolvedValue(mockList([sampleInvoice]));

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('IV1001');
    const dueDateHeader = screen.getByRole('button', { name: /due date/i });

    await user.click(dueDateHeader);
    await waitFor(() => {
      const call = vi.mocked(invoicesApi.fetchInvoices).mock.calls.at(-1)?.[0];
      expect(call?.sortBy).toBe('dueDate');
      expect(call?.ordering).toBe('DESC');
    });

    await user.click(dueDateHeader);
    await waitFor(() => {
      const call = vi.mocked(invoicesApi.fetchInvoices).mock.calls.at(-1)?.[0];
      expect(call?.ordering).toBe('ASC');
    });
  });

  it('filters by status via the status select', async () => {
    vi.mocked(invoicesApi.fetchInvoices).mockResolvedValue(mockList([sampleInvoice]));

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('IV1001');
    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('Overdue'));

    await waitFor(() => {
      const call = vi.mocked(invoicesApi.fetchInvoices).mock.calls.at(-1)?.[0];
      expect(call?.status).toBe('Overdue');
    });
  });
});
