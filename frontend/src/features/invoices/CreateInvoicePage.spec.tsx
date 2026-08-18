import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

// Native <input type="date"> uses a segmented picker UI that userEvent.type()
// doesn't reliably drive (especially once the field already has a default
// value, as invoiceDate now does). Setting .value + firing change is the
// standard, reliable way to test date inputs.
function setDateValue(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

function itemRow(index: number) {
  return within(screen.getByTestId(`item-row-${index}`));
}

async function fillItemRow(
  user: ReturnType<typeof userEvent.setup>,
  index: number,
  { name, quantity, rate }: { name: string; quantity: string; rate: string },
) {
  const row = itemRow(index);
  await user.type(row.getByLabelText(/item name/i), name);
  await user.type(row.getByLabelText(/quantity/i), quantity);
  await user.type(row.getByLabelText(/rate/i), rate);
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/invoice number/i), 'IV-0001');
  setDateValue(screen.getByLabelText(/invoice date/i), '2026-09-01');
  setDateValue(screen.getByLabelText(/due date/i), '2026-09-15');
  await user.type(screen.getByLabelText(/customer name/i), 'Jane Doe');
  await user.type(screen.getByLabelText(/customer email/i), 'jane@example.com');
  await fillItemRow(user, 0, { name: 'Consulting', quantity: '2', rate: '150' });
}

describe('CreateInvoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with exactly one item row', () => {
    renderCreatePage();
    expect(screen.getByTestId('item-row-0')).toBeInTheDocument();
    expect(screen.queryByTestId('item-row-1')).not.toBeInTheDocument();
  });

  it('shows validation errors instead of submitting when required fields are empty', async () => {
    const user = userEvent.setup();
    renderCreatePage();

    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(await screen.findByText('Invoice number is required')).toBeInTheDocument();
    expect(screen.getByText('Customer name is required')).toBeInTheDocument();
    expect(itemRow(0).getByText('Item name is required')).toBeInTheDocument();
    expect(invoicesApi.createInvoice).not.toHaveBeenCalled();
  });

  it('rejects a due date before the invoice date', async () => {
    const user = userEvent.setup();
    renderCreatePage();

    await fillValidForm(user);
    setDateValue(screen.getByLabelText(/due date/i), '2026-08-01');
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(await screen.findByText('Due date must be on or after invoice date')).toBeInTheDocument();
    expect(invoicesApi.createInvoice).not.toHaveBeenCalled();
  });

  it('computes the items subtotal from a single row', async () => {
    const user = userEvent.setup();
    renderCreatePage();

    await fillItemRow(user, 0, { name: 'Service', quantity: '3', rate: '100' });

    expect(await screen.findByTestId('items-subtotal')).toHaveTextContent('AU$300.00');
  });

  it('adds a second item row, sums both into the subtotal, and lets you remove one', async () => {
    const user = userEvent.setup();
    renderCreatePage();

    await fillItemRow(user, 0, { name: 'Design', quantity: '1', rate: '500' });

    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(screen.getByTestId('item-row-1')).toBeInTheDocument();
    await fillItemRow(user, 1, { name: 'Development', quantity: '2', rate: '80' });

    // subtotal = (1*500) + (2*80) = 660
    expect(await screen.findByTestId('items-subtotal')).toHaveTextContent('AU$660.00');

    // Removing the second row drops back to just the first item's amount.
    await user.click(itemRow(1).getByRole('button', { name: /remove item/i }));
    expect(screen.queryByTestId('item-row-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('items-subtotal')).toHaveTextContent('AU$500.00');
  });

  it('cannot remove the last remaining item row', () => {
    renderCreatePage();
    expect(itemRow(0).getByRole('button', { name: /remove item/i })).toBeDisabled();
  });

  it('rejects submission when the customer email is blank', async () => {
    const user = userEvent.setup();
    renderCreatePage();

    await user.type(screen.getByLabelText(/invoice number/i), 'IV-0002');
    setDateValue(screen.getByLabelText(/invoice date/i), '2026-09-01');
    setDateValue(screen.getByLabelText(/due date/i), '2026-09-15');
    await user.type(screen.getByLabelText(/customer name/i), 'Jane Doe');
    await fillItemRow(user, 0, { name: 'Consulting', quantity: '2', rate: '150' });
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(await screen.findByText('Customer email is required')).toBeInTheDocument();
    expect(invoicesApi.createInvoice).not.toHaveBeenCalled();
  });

  it('rejects a malformed customer email', async () => {
    const user = userEvent.setup();
    renderCreatePage();

    await user.type(screen.getByLabelText(/customer email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /create invoice/i }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(invoicesApi.createInvoice).not.toHaveBeenCalled();
  });

  it('submits the mapped payload, including all item rows, and redirects to the list on success', async () => {
    vi.mocked(invoicesApi.createInvoice).mockResolvedValue({} as Invoice);

    const user = userEvent.setup();
    renderCreatePage();

    await user.type(screen.getByLabelText(/invoice number/i), 'IV-0001');
    setDateValue(screen.getByLabelText(/invoice date/i), '2026-09-01');
    setDateValue(screen.getByLabelText(/due date/i), '2026-09-15');
    await user.type(screen.getByLabelText(/customer name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/customer email/i), 'jane@example.com');
    await fillItemRow(user, 0, { name: 'Design', quantity: '1', rate: '500' });
    await user.click(screen.getByRole('button', { name: /add item/i }));
    await fillItemRow(user, 1, { name: 'Development', quantity: '2', rate: '80' });
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
        items: [
          { name: 'Design', quantity: 1, rate: 500 },
          { name: 'Development', quantity: 2, rate: 80 },
        ],
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
