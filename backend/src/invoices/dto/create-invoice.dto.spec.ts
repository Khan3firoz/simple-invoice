import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateInvoiceDto } from './create-invoice.dto';

const validPayload = {
  invoiceNumber: 'IV-0001',
  invoiceDate: '2026-01-10',
  dueDate: '2026-01-20',
  currency: 'USD',
  currencySymbol: 'US$',
  customer: { fullname: 'Jane Doe', email: 'jane@example.com' },
  items: [{ name: 'Service', quantity: 1, rate: 100 }],
};

async function validateDto(overrides: Record<string, unknown> = {}) {
  const instance = plainToInstance(CreateInvoiceDto, {
    ...validPayload,
    ...overrides,
  });
  return validate(instance);
}

describe('CreateInvoiceDto validation', () => {
  it('passes for a fully valid payload', async () => {
    const errors = await validateDto();
    expect(errors).toHaveLength(0);
  });

  it('rejects a due date before the invoice date, with the exact spec-required message', async () => {
    const errors = await validateDto({
      invoiceDate: '2026-01-20',
      dueDate: '2026-01-10',
    });
    const dueDateError = errors.find((e) => e.property === 'dueDate');

    expect(dueDateError).toBeDefined();
    expect(Object.values(dueDateError!.constraints ?? {})).toContain(
      'dueDate must be on or after invoiceDate',
    );
  });

  it('accepts a due date equal to the invoice date', async () => {
    const errors = await validateDto({
      invoiceDate: '2026-01-10',
      dueDate: '2026-01-10',
    });
    expect(errors.find((e) => e.property === 'dueDate')).toBeUndefined();
  });

  it('rejects a malformed customer email', async () => {
    const errors = await validateDto({
      customer: { fullname: 'Jane', email: 'not-an-email' },
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a customer with no email at all', async () => {
    const errors = await validateDto({
      customer: { fullname: 'Jane' },
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a non-positive item quantity', async () => {
    const errors = await validateDto({
      items: [{ name: 'Service', quantity: 0, rate: 100 }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an empty items array', async () => {
    const errors = await validateDto({ items: [] });
    expect(errors.find((e) => e.property === 'items')).toBeDefined();
  });

  it('accepts multiple items and validates each one independently', async () => {
    const validErrors = await validateDto({
      items: [
        { name: 'Design', quantity: 1, rate: 500 },
        { name: 'Development', quantity: 10, rate: 80 },
      ],
    });
    expect(validErrors).toHaveLength(0);

    const invalidErrors = await validateDto({
      items: [
        { name: 'Design', quantity: 1, rate: 500 },
        { name: 'Development', quantity: -1, rate: 80 },
      ],
    });
    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it('rejects a missing invoice number', async () => {
    const errors = await validateDto({ invoiceNumber: '' });
    expect(errors.find((e) => e.property === 'invoiceNumber')).toBeDefined();
  });
});
