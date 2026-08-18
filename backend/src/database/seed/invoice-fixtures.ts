import { InvoiceStatus } from '../../invoices/entities/invoice-status.enum';
import { InvoicesService } from '../../invoices/invoices.service';

interface InvoiceFixtureItem {
  name: string;
  quantity: number;
  rate: number;
}

export interface InvoiceFixture {
  invoiceNumber: string;
  invoiceReference: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  currencySymbol: string;
  description: string;
  status: InvoiceStatus;
  customerFullname: string;
  customerEmail: string;
  customerMobileNumber: string;
  customerAddress: string;
  invoiceSubTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  totalPaid: number;
  balanceAmount: number;
  createdBy: string;
  item: InvoiceFixtureItem;
}

const CUSTOMERS = [
  {
    fullname: 'Paul Tan',
    email: 'paul@101digital.io',
    mobileNumber: '947717364111',
    address: 'Singapore',
  },
  {
    fullname: 'Kanglee Wong',
    email: 'kanglee@acme.io',
    mobileNumber: '912345671',
    address: 'Kuala Lumpur, Malaysia',
  },
  {
    fullname: 'Sarah Chen',
    email: 'sarah.chen@brightworks.com',
    mobileNumber: '983001122',
    address: 'Hong Kong',
  },
  {
    fullname: 'Michael Lee',
    email: 'michael@nimbustech.io',
    mobileNumber: '971234567',
    address: 'Sydney, Australia',
  },
  {
    fullname: 'Amelia Ng',
    email: 'amelia.ng@northstar.co',
    mobileNumber: '965554433',
    address: 'Auckland, New Zealand',
  },
  {
    fullname: 'David Kumar',
    email: 'david.kumar@fintrack.io',
    mobileNumber: '919988776',
    address: 'Mumbai, India',
  },
  {
    fullname: 'Grace Lim',
    email: 'grace.lim@bluepeak.com',
    mobileNumber: '923344556',
    address: 'Jakarta, Indonesia',
  },
  {
    fullname: "James O'Brien",
    email: 'james.obrien@harborline.co',
    mobileNumber: '447700900123',
    address: 'London, UK',
  },
  {
    fullname: 'Nadia Rahman',
    email: 'nadia@cloudgate.io',
    mobileNumber: '601123344',
    address: 'Penang, Malaysia',
  },
  {
    fullname: 'Ethan Wright',
    email: 'ethan.wright@summitworks.com',
    mobileNumber: '14155550111',
    address: 'San Francisco, USA',
  },
];

const ITEMS: InvoiceFixtureItem[] = [
  { name: 'Website Development', quantity: 1, rate: 3500 },
  { name: 'Honda RC150', quantity: 2, rate: 1000 },
  { name: 'Consulting Services (hrs)', quantity: 20, rate: 120 },
  { name: 'Cloud Hosting - Annual', quantity: 1, rate: 960 },
  { name: 'UI/UX Design Package', quantity: 1, rate: 2200 },
  { name: 'Office Chairs', quantity: 10, rate: 85 },
  { name: 'Mobile App Maintenance', quantity: 3, rate: 450 },
  { name: 'API Integration', quantity: 1, rate: 1800 },
  { name: 'Marketing Retainer', quantity: 1, rate: 1500 },
  { name: 'Laptop - Dell XPS 15', quantity: 4, rate: 1750 },
];

const CURRENCIES = [
  { currency: 'AUD', currencySymbol: 'AU$' },
  { currency: 'USD', currencySymbol: 'US$' },
  { currency: 'GBP', currencySymbol: '£' },
  { currency: 'SGD', currencySymbol: 'S$' },
];

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministically builds ~40 invoice fixtures with a spread of statuses,
 * dates (including past-due ones so Overdue derivation is demonstrable),
 * amounts and currencies — enough variety to exercise search, filter, sort
 * and pagination end to end.
 */
export function buildInvoiceFixtures(userId: string): InvoiceFixture[] {
  const today = new Date();
  const statusCycle = [
    InvoiceStatus.DRAFT,
    InvoiceStatus.PENDING,
    InvoiceStatus.PAID,
    InvoiceStatus.PENDING,
    InvoiceStatus.DRAFT,
    InvoiceStatus.PAID,
  ];

  const fixtures: InvoiceFixture[] = [];

  for (let i = 0; i < 40; i++) {
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    const item = ITEMS[i % ITEMS.length];
    const { currency, currencySymbol } = CURRENCIES[i % CURRENCIES.length];
    const status = statusCycle[i % statusCycle.length];

    // Spread invoice dates from ~100 days ago to ~10 days in the future.
    const invoiceOffset = 100 - i * 3;
    const invoiceDate = addDays(today, -invoiceOffset);
    // Due 15-45 days after invoice date; roughly a third land in the past
    // relative to "today" so Draft/Pending records can be seen as Overdue.
    const dueOffset = 15 + (i % 4) * 10;
    const dueDate = addDays(new Date(invoiceDate), dueOffset);

    const taxPercent = 10;
    const discount = i % 5 === 0 ? 20 : 0;
    const quantity = item.quantity;
    const rate = item.rate + (i % 3) * 25;
    const { subTotal, taxAmount, totalAmount } =
      InvoicesService.calculateTotals(quantity, rate, taxPercent, discount);
    const totalPaid =
      status === InvoiceStatus.PAID
        ? totalAmount
        : status === InvoiceStatus.PENDING && i % 2 === 0
          ? Number((totalAmount * 0.4).toFixed(2))
          : 0;

    fixtures.push({
      invoiceNumber: `IV${2000000000 + i * 137}`,
      invoiceReference: `#${572000 + i}`,
      invoiceDate,
      dueDate,
      currency,
      currencySymbol,
      description: `Invoice issued to ${customer.fullname}`,
      status,
      customerFullname: customer.fullname,
      customerEmail: customer.email,
      customerMobileNumber: customer.mobileNumber,
      customerAddress: customer.address,
      invoiceSubTotal: subTotal,
      totalTax: taxAmount,
      totalDiscount: discount,
      totalAmount,
      totalPaid,
      balanceAmount: Number((totalAmount - totalPaid).toFixed(2)),
      createdBy: userId,
      item: { name: item.name, quantity, rate },
    });
  }

  return fixtures;
}
