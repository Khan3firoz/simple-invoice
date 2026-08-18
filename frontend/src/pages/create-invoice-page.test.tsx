import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CreateInvoicePage } from './create-invoice-page'
import { api } from '@/lib/api'

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    api: { post: vi.fn() },
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateInvoicePage />
    </MemoryRouter>,
  )
}

describe('CreateInvoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a due date before the invoice date', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('IV-0001'), 'IV-TEST-001')
    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Jane Doe')
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'jane@example.com')
    await user.type(screen.getByPlaceholderText('Consulting services'), 'Widget')
    await user.type(screen.getByLabelText(/quantity/i), '2')
    await user.type(screen.getByLabelText(/^rate$/i), '50')

    const invoiceDateInput = screen.getByLabelText(/invoice date/i)
    const dueDateInput = screen.getByLabelText(/due date/i)
    await user.clear(invoiceDateInput)
    await user.type(invoiceDateInput, '2027-01-15')
    await user.clear(dueDateInput)
    await user.type(dueDateInput, '2027-01-01')

    await user.click(screen.getByRole('button', { name: /create invoice/i }))

    expect(
      await screen.findByText(/due date must be on or after the invoice date/i),
    ).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('submits a valid invoice and lets the backend calculate totals', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText('IV-0001'), 'IV-TEST-002')
    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Jane Doe')
    await user.type(screen.getByPlaceholderText('jane@example.com'), 'jane@example.com')
    await user.type(screen.getByPlaceholderText('Consulting services'), 'Widget')
    await user.type(screen.getByLabelText(/quantity/i), '2')
    await user.type(screen.getByLabelText(/^rate$/i), '50')
    await user.type(screen.getByLabelText(/due date/i), '2027-01-15')

    await user.click(screen.getByRole('button', { name: /create invoice/i }))

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(api.post).mock.calls[0]
    expect(payload).toMatchObject({
      invoiceNumber: 'IV-TEST-002',
      customer: { fullname: 'Jane Doe', email: 'jane@example.com' },
      item: { name: 'Widget', quantity: 2, rate: 50 },
    })
    // Total calculation is intentionally not sent by the client (server-side only).
    expect(payload).not.toHaveProperty('totalAmount')
  })
})
