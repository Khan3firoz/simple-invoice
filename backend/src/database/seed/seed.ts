import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { InvoiceItem } from '../../invoices/entities/invoice-item.entity';
import { buildInvoiceFixtures } from './invoice-fixtures';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [User, Invoice, InvoiceItem],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('Connected to database, seeding...');

  const userRepo = dataSource.getRepository(User);
  const invoiceRepo = dataSource.getRepository(Invoice);

  // --- Reviewer account ---
  const seedEmail = process.env.SEED_USER_EMAIL ?? 'admin@simpleinvoice.io';
  const seedPassword = process.env.SEED_USER_PASSWORD ?? 'Password123!';

  let user = await userRepo.findOneBy({ email: seedEmail });
  if (!user) {
    user = await userRepo.save(
      userRepo.create({
        email: seedEmail,
        passwordHash: await bcrypt.hash(seedPassword, 10),
        fullname: 'Admin Reviewer',
      }),
    );
    console.log(`Created reviewer account: ${seedEmail}`);
  } else {
    console.log(`Reviewer account already exists: ${seedEmail}`);
  }

  // --- Invoices (idempotent: skip invoice numbers that already exist) ---
  const fixtures = buildInvoiceFixtures(user.id);
  let created = 0;

  for (const fixture of fixtures) {
    const exists = await invoiceRepo.findOneBy({
      invoiceNumber: fixture.invoiceNumber,
    });
    if (exists) continue;

    const { item, ...invoiceFields } = fixture;
    await invoiceRepo.save(
      invoiceRepo.create({
        ...invoiceFields,
        items: [item],
      }),
    );
    created++;
  }

  console.log(
    `Seeded ${created} new invoice(s) (${fixtures.length - created} already present).`,
  );

  await dataSource.destroy();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
