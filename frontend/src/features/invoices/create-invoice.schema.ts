import { z } from 'zod';

export const CURRENCIES = [
  { code: 'AUD', symbol: 'AU$' },
  { code: 'USD', symbol: 'US$' },
  { code: 'GBP', symbol: '£' },
  { code: 'SGD', symbol: 'S$' },
  { code: 'EUR', symbol: '€' },
] as const;

function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0;
}

function isPositiveNumber(value: string): boolean {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n > 0;
}

function isNonNegativeNumber(value: string): boolean {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n >= 0;
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

const invoiceItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required'),
  quantity: z.string().refine(isPositiveInteger, 'Quantity must be a whole number greater than 0'),
  rate: z.string().refine(isPositiveNumber, 'Rate must be greater than 0'),
});

export type InvoiceItemFormValues = z.infer<typeof invoiceItemSchema>;

export const emptyInvoiceItem: InvoiceItemFormValues = { name: '', quantity: '', rate: '' };

// Mirrors the backend's CreateInvoiceDto validation rules (backend/src/invoices/dto/create-invoice.dto.ts)
// so the user sees the same errors client-side before a round trip is made.
// Numeric fields stay as strings here (native <input> values are strings)
// and get converted to numbers in CreateInvoicePage's onSubmit.
export const createInvoiceSchema = z
  .object({
    invoiceNumber: z.string().trim().min(1, 'Invoice number is required'),
    invoiceReference: z.string().trim().optional(),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    dueDate: z.string().min(1, 'Due date is required'),
    currency: z.string().min(1, 'Currency is required'),
    currencySymbol: z.string().min(1),
    description: z.string().trim().optional(),

    customerFullname: z.string().trim().min(1, 'Customer name is required'),
    customerEmail: z
      .string()
      .trim()
      .min(1, 'Customer email is required')
      .email('Enter a valid email address'),
    customerMobile: z.string().trim().optional(),
    customerAddress: z.string().trim().optional(),

    items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),

    taxPercent: z.string().refine(isNonNegativeNumber, 'Tax must be 0 or greater'),
    discount: z.string().refine(isNonNegativeNumber, 'Discount must be 0 or greater'),
  })
  .refine((data) => data.dueDate >= data.invoiceDate, {
    message: 'Due date must be on or after invoice date',
    path: ['dueDate'],
  });

export type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;

export const createInvoiceDefaults: CreateInvoiceFormValues = {
  invoiceNumber: '',
  invoiceReference: '',
  invoiceDate: todayDateString(),
  dueDate: '',
  currency: CURRENCIES[0].code,
  currencySymbol: CURRENCIES[0].symbol,
  description: '',
  customerFullname: '',
  customerEmail: '',
  customerMobile: '',
  customerAddress: '',
  items: [emptyInvoiceItem],
  taxPercent: '10',
  discount: '0',
};
