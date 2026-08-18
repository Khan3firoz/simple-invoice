import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';
import { User } from '../../users/user.entity';
import { Invoice } from '../../invoices/invoice.entity';
import { InvoiceItem } from '../../invoices/invoice-item.entity';
import { InvoiceStatus } from '../../invoices/invoice-status.enum';

const CUSTOMERS = [
  { fullname: 'Paul Tan', email: 'paul@101digital.io', address: 'Singapore' },
  { fullname: 'Kangaroo Logistics', email: 'accounts@kangaroo.com.au', address: 'Sydney, Australia' },
  { fullname: 'Nguyen Van A', email: 'nguyenvana@example.com', address: 'Ho Chi Minh City, Vietnam' },
  { fullname: 'Sarah Johnson', email: 'sarah.johnson@example.com', address: 'London, UK' },
  { fullname: 'Global Traders Pte Ltd', email: 'billing@globaltraders.com', address: 'Singapore' },
  { fullname: 'Michael Chen', email: 'michael.chen@example.com', address: 'Hong Kong' },
  { fullname: 'Emma Wilson', email: 'emma.wilson@example.com', address: 'Melbourne, Australia' },
  { fullname: 'Bright Star Trading', email: 'finance@brightstar.com', address: 'Kuala Lumpur, Malaysia' },
  { fullname: 'David Lee', email: 'david.lee@example.com', address: 'Seoul, South Korea' },
  { fullname: 'Oceanic Supplies Co.', email: 'ap@oceanicsupplies.com', address: 'Auckland, New Zealand' },
];

const ITEMS = [
  { name: 'Honda RC150', rate: 1000 },
  { name: 'Web Development Services', rate: 150 },
  { name: 'Consulting Hours', rate: 200 },
  { name: 'Office Furniture Set', rate: 450 },
  { name: 'Annual Software License', rate: 1200 },
  { name: 'Graphic Design Package', rate: 350 },
  { name: 'Cloud Hosting (Monthly)', rate: 89 },
  { name: 'Marketing Campaign', rate: 2500 },
];

const CURRENCIES = [
  { currency: 'AUD', currencySymbol: 'AU$' },
  { currency: 'USD', currencySymbol: '$' },
  { currency: 'GBP', currencySymbol: '£' },
  { currency: 'SGD', currencySymbol: 'S$' },
];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  await AppDataSource.initialize();
  console.log('Database connected. Seeding...');

  const userRepo = AppDataSource.getRepository(User);
  const invoiceRepo = AppDataSource.getRepository(Invoice);

  // --- Seed reviewer user (idempotent) ---
  const seedEmail = (process.env.SEED_USER_EMAIL || 'admin@simpleinvoice.com').toLowerCase();
  const seedPassword = process.env.SEED_USER_PASSWORD || 'Password123!';
  const seedFullname = process.env.SEED_USER_FULLNAME || 'Admin User';

  let user = await userRepo.findOne({ where: { email: seedEmail } });
  if (!user) {
    const passwordHash = await bcrypt.hash(seedPassword, 10);
    user = await userRepo.save(
      userRepo.create({ email: seedEmail, passwordHash, fullname: seedFullname }),
    );
    console.log(`Created reviewer user: ${seedEmail}`);
  } else {
    console.log(`Reviewer user already exists: ${seedEmail}`);
  }

  // --- Clear existing invoices for a clean, repeatable seed ---
  await invoiceRepo.query('TRUNCATE TABLE invoice_items, invoices RESTART IDENTITY CASCADE');

  const today = new Date();
  const records: Invoice[] = [];
  const totalRecords = 40;
  const statuses = [InvoiceStatus.DRAFT, InvoiceStatus.PENDING, InvoiceStatus.PAID];

  for (let i = 0; i < totalRecords; i++) {
    const customer = randomOf(CUSTOMERS);
    const item = randomOf(ITEMS);
    const { currency, currencySymbol } = randomOf(CURRENCIES);
    const status = statuses[i % statuses.length];

    // Spread invoice dates across the last 90 days and the next 30 days.
    const invoiceDate = addDays(today, Math.floor(Math.random() * 120) - 90);
    // Due date 7-45 days after invoice date; some in the past to exercise Overdue derivation.
    const dueDate = addDays(invoiceDate, 7 + Math.floor(Math.random() * 38));

    const quantity = 1 + Math.floor(Math.random() * 5);
    const rate = item.rate;
    const taxPercent = 10;
    const discount = Math.random() > 0.6 ? Math.round(rate * quantity * 0.05) : 0;
    const subTotal = quantity * rate;
    const taxAmount = subTotal * (taxPercent / 100);
    const totalAmount = subTotal + taxAmount - discount;
    const totalPaid = status === InvoiceStatus.PAID ? totalAmount : status === InvoiceStatus.PENDING && Math.random() > 0.7 ? Math.round(totalAmount * 0.4) : 0;

    const invoice = invoiceRepo.create({
      invoiceNumber: `IV${Date.now()}${i}`,
      invoiceReference: `#${1000000 + Math.floor(Math.random() * 8999999)}`,
      invoiceDate: toDateString(invoiceDate),
      dueDate: toDateString(dueDate),
      currency,
      currencySymbol,
      description: `Invoice issued to ${customer.fullname}`,
      status,
      customerFullname: customer.fullname,
      customerEmail: customer.email,
      customerMobileNumber: `+65${9000000 + Math.floor(Math.random() * 999999)}`,
      customerAddress: customer.address,
      invoiceSubTotal: subTotal,
      taxPercent,
      totalTax: taxAmount,
      totalDiscount: discount,
      totalAmount,
      totalPaid,
      balanceAmount: totalAmount - totalPaid,
      createdBy: user.id,
      items: [
        Object.assign(new InvoiceItem(), { name: item.name, quantity, rate }),
      ],
    });

    records.push(invoice);
  }

  await invoiceRepo.save(records);
  console.log(`Seeded ${records.length} invoices.`);

  await AppDataSource.destroy();
  console.log('Seeding complete.');
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
