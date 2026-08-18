import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/user.entity';

/**
 * End-to-end workflow test: create an invoice via the API, then verify it
 * appears in the invoice list. Requires a running Postgres instance
 * (see README - `docker compose up -d postgres`).
 */
describe('Invoices workflow (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  const testEmail = `e2e-${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  // Relative to "now" so the fixture never drifts into the past and gets
  // reclassified as Overdue by the response's derived status.
  const futureInvoiceDate = new Date().toISOString().slice(0, 10);
  const futureDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const userRepo = moduleFixture.get(getRepositoryToken(User));
    await userRepo.save(
      userRepo.create({
        email: testEmail,
        passwordHash: await bcrypt.hash(testPassword, 10),
        fullname: 'E2E Test User',
      }),
    );

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests to /invoices', async () => {
    await request(app.getHttpServer()).get('/invoices').expect(401);
  });

  it('creates an invoice and finds it in the invoice list', async () => {
    const invoiceNumber = `IV-E2E-${Date.now()}`;

    const createRes = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        invoiceNumber,
        invoiceDate: futureInvoiceDate,
        dueDate: futureDueDate,
        currency: 'AUD',
        customer: { fullname: 'E2E Customer', email: 'e2e-customer@example.com' },
        item: { name: 'Test Item', quantity: 2, rate: 50 },
      })
      .expect(201);

    expect(createRes.body.status).toBe('Draft');
    expect(createRes.body.totalAmount).toBe(110); // 100 subtotal + 10% tax

    const listRes = await request(app.getHttpServer())
      .get(`/invoices?keyword=${invoiceNumber}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].invoiceNumber).toBe(invoiceNumber);
  });

  it('rejects a duplicate invoice number', async () => {
    const invoiceNumber = `IV-E2E-DUP-${Date.now()}`;
    const payload = {
      invoiceNumber,
      invoiceDate: futureInvoiceDate,
      dueDate: futureDueDate,
      currency: 'AUD',
      customer: { fullname: 'E2E Customer', email: 'e2e-customer@example.com' },
      item: { name: 'Test Item', quantity: 1, rate: 10 },
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

  it('rejects a due date before the invoice date', async () => {
    await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        invoiceNumber: `IV-E2E-BADDATE-${Date.now()}`,
        invoiceDate: '2026-02-01',
        dueDate: '2026-01-01',
        currency: 'AUD',
        customer: { fullname: 'E2E Customer', email: 'e2e-customer@example.com' },
        item: { name: 'Test Item', quantity: 1, rate: 10 },
      })
      .expect(400);
  });
});
