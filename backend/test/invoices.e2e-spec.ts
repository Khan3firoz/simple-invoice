import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { AuthResponseDto } from '../src/auth/dto/auth-response.dto';
import { InvoiceResponseDto } from '../src/invoices/dto/invoice-response.dto';
import { PaginatedResponseDto } from '../src/common/dto/paging.dto';

const futureDate = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

// Requires a reachable Postgres configured via .env (same as `npm run seed`),
// with the default reviewer account already seeded — run `npm run seed`
// before `npm run test:e2e`.
describe('Invoices (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.SEED_USER_EMAIL ?? 'admin@simpleinvoice.io',
        password: process.env.SEED_USER_PASSWORD ?? 'Password123!',
      })
      .expect(200);

    accessToken = (loginResponse.body as AuthResponseDto).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated access to /invoices', () => {
    return request(app.getHttpServer()).get('/invoices').expect(401);
  });

  it('creates an invoice and the invoice then appears in the list', async () => {
    const invoiceNumber = `E2E-${Date.now()}`;

    const createResponse = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        invoiceNumber,
        invoiceDate: futureDate(1),
        dueDate: futureDate(15),
        currency: 'USD',
        currencySymbol: 'US$',
        customer: { fullname: 'E2E Customer', email: 'e2e@example.com' },
        item: { name: 'Service', quantity: 2, rate: 150 },
        taxPercent: 10,
        discount: 10,
      })
      .expect(201);

    const created = createResponse.body as InvoiceResponseDto;

    // subTotal = 300, tax = 30, total = 320 — verifies server-side calculation.
    expect(created.status).toBe('Draft');
    expect(created.invoiceSubTotal).toBe(300);
    expect(created.totalTax).toBe(30);
    expect(created.totalAmount).toBe(320);
    expect(created.balanceAmount).toBe(320);

    const listResponse = await request(app.getHttpServer())
      .get('/invoices')
      .query({ keyword: invoiceNumber })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const list = listResponse.body as PaginatedResponseDto<InvoiceResponseDto>;
    expect(list.paging.total).toBe(1);
    expect(list.data[0].invoiceNumber).toBe(invoiceNumber);

    const detailResponse = await request(app.getHttpServer())
      .get(`/invoices/${created.invoiceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const detail = detailResponse.body as InvoiceResponseDto;
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0].name).toBe('Service');
  });

  it('rejects a duplicate invoice number with 409', async () => {
    const invoiceNumber = `E2E-DUP-${Date.now()}`;
    const payload = {
      invoiceNumber,
      invoiceDate: futureDate(1),
      dueDate: futureDate(15),
      currency: 'USD',
      currencySymbol: 'US$',
      customer: { fullname: 'E2E Customer', email: 'e2e@example.com' },
      item: { name: 'Service', quantity: 1, rate: 100 },
    };

    await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(409);
  });

  it('rejects a due date before the invoice date with a structured 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        invoiceNumber: `E2E-BAD-${Date.now()}`,
        invoiceDate: '2026-01-20',
        dueDate: '2026-01-10',
        currency: 'USD',
        currencySymbol: 'US$',
        customer: { fullname: 'E2E Customer', email: 'e2e@example.com' },
        item: { name: 'Service', quantity: 1, rate: 100 },
      })
      .expect(400);

    const body = response.body as ErrorBody;
    expect(body.error).toBe('Bad Request');
    expect(body.message).toContain('dueDate must be on or after invoiceDate');
  });
});
