import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateInvoicePage } from './CreateInvoicePage';
import * as invoicesApi from '@/lib/api/invoices';
import type { Invoice } from '@/lib/api/types';

vi.mock('@/lib/api/invoices');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderCreatePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/invoices/new']}>
        <Routes>
          <Route path="/invoices/new" element={<CreateInvoicePage />} />
          <Route path="/" element={<p>Invoice list page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/invoice number/i), 'IV-0001');
  await user.type(screen.getByLabelText(/invoice date/i), '2026-09-01');
  await user.type(screen.getByLabelText(/due date/i), '2026-09-15');
  await user.type(screen.getByLabelText(/customer name/i), 'Jane Doe');
  await user.type(screen.getByLabelText(/customer email/i), 'jane@example.com');
  await user.type(screen.getByLabelText(/item name/i), 'Consulting');
  await user.type(screen.getByLabelText(/^quantity/i), '2');
  await user.type(screen.getByLabelText(/^rate/i), '150');
}

describe('CreateInvoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation errors instead of submitting when required fields are empty', async () => {
    const user = userEvent.setup();
    renderCreatePage();

    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(await screen.findByText('Invoice number is required')).toBeInTheDocument();
    expect(screen.getByText('Customer name is required')).toBeInTheDocument();
    expect(screen.getByText('Item name is required')).toBeInTheDocument();
    expect(invoicesApi.createInvoice).not.toHaveBeenCalled();
  });

  it('rejects a due date before the invoice date', async () => {
    const user = userEvent.setup();
    renderCreatePage();

    await fillValidForm(user);
    await user.clear(screen.getByLabelText(/due date/i));
    await user.type(screen.getByLabelText(/due date/i), '2026-08-01');
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(await screen.findByText('Due date must be on or after invoice date')).toBeInTheDocument();
    expect(invoicesApi.createInvoice).not.toHaveBeenCalled();
  });

  it('computes the live item amount from quantity and rate', async () => {
    const user = userEvent.setup();
    renderCreatePage();

    await user.type(screen.getByLabelText(/^quantity/i), '3');
    await user.type(screen.getByLabelText(/^rate/i), '100');

    expect(await screen.findByText('AU$300.00')).toBeInTheDocument();
  });

  it('submits successfully without a customer email', async () => {
    vi.mocked(invoicesApi.createInvoice).mockResolvedValue({} as Invoice);

    const user = userEvent.setup();
    renderCreatePage();

    await user.type(screen.getByLabelText(/invoice number/i), 'IV-0002');
    await user.type(screen.getByLabelText(/invoice date/i), '2026-09-01');
    await user.type(screen.getByLabelText(/due date/i), '2026-09-15');
    await user.type(screen.getByLabelText(/customer name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/item name/i), 'Consulting');
    await user.type(screen.getByLabelText(/^quantity/i), '2');
    await user.type(screen.getByLabelText(/^rate/i), '150');
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() => expect(screen.getByText('Invoice list page')).toBeInTheDocument());

    const payload = vi.mocked(invoicesApi.createInvoice).mock.calls[0][0];
    expect(payload.customer.email).toBeUndefined();
  });

  it('rejects a malformed customer email while still allowing it to be blank', async () => {
    const user = userEvent.setup();
    renderCreatePage();

    await user.type(screen.getByLabelText(/customer email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(invoicesApi.createInvoice).not.toHaveBeenCalled();
  });

  it('submits the mapped payload and redirects to the list on success', async () => {
    vi.mocked(invoicesApi.createInvoice).mockResolvedValue({} as Invoice);

    const user = userEvent.setup();
    renderCreatePage();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    await waitFor(() => expect(screen.getByText('Invoice list page')).toBeInTheDocument());

    const payload = vi.mocked(invoicesApi.createInvoice).mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        invoiceNumber: 'IV-0001',
        invoiceDate: '2026-09-01',
        dueDate: '2026-09-15',
        currency: 'AUD',
        currencySymbol: 'AU$',
        customer: expect.objectContaining({ fullname: 'Jane Doe', email: 'jane@example.com' }),
        item: { name: 'Consulting', quantity: 2, rate: 150 },
        taxPercent: 10,
        discount: 0,
      }),
    );
  });

  it('surfaces a duplicate invoice number as a field error', async () => {
    vi.mocked(invoicesApi.createInvoice).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { statusCode: 409, message: 'conflict', error: 'Conflict' } },
    });

    const user = userEvent.setup();
    renderCreatePage();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(await screen.findByText('This invoice number already exists')).toBeInTheDocument();
  });
});
