import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoicesService } from './invoices.service';
import { Invoice } from './invoice.entity';
import { InvoiceStatus } from './invoice-status.enum';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let repo: jest.Mocked<Repository<Invoice>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn((data) => data),
            save: jest.fn((data) => Promise.resolve({ ...data, invoiceId: 'generated-id' })),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    repo = module.get(getRepositoryToken(Invoice));
  });

  describe('deriveStatus (Overdue derivation)', () => {
    it('returns Overdue when status is not Paid and dueDate is in the past', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = InvoicesService.deriveStatus(
        InvoiceStatus.PENDING,
        yesterday.toISOString().slice(0, 10),
      );
      expect(result).toBe('Overdue');
    });

    it('does not derive Overdue for Paid invoices even if dueDate has passed', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = InvoicesService.deriveStatus(
        InvoiceStatus.PAID,
        yesterday.toISOString().slice(0, 10),
      );
      expect(result).toBe(InvoiceStatus.PAID);
    });

    it('returns the persisted status when dueDate is in the future', () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const result = InvoicesService.deriveStatus(
        InvoiceStatus.DRAFT,
        nextWeek.toISOString().slice(0, 10),
      );
      expect(result).toBe(InvoiceStatus.DRAFT);
    });

    it('returns the persisted status when dueDate is exactly today', () => {
      const today = new Date().toISOString().slice(0, 10);
      const result = InvoicesService.deriveStatus(InvoiceStatus.PENDING, today);
      expect(result).toBe(InvoiceStatus.PENDING);
    });
  });

  describe('create (total calculation)', () => {
    // Use dates relative to "now" so the fixture never drifts into the past
    // and gets reclassified as Overdue by the response's derived status.
    const invoiceDate = new Date();
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const baseDto: CreateInvoiceDto = {
      invoiceNumber: 'IV-TEST-001',
      invoiceDate: invoiceDate.toISOString().slice(0, 10),
      dueDate: dueDate.toISOString().slice(0, 10),
      currency: 'AUD',
      customer: { fullname: 'Test Customer', email: 'test@example.com' },
      item: { name: 'Widget', quantity: 3, rate: 100 },
      taxPercent: 10,
      discount: 20,
    } as CreateInvoiceDto;

    it('calculates subtotal, tax, and total amount on the server side', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.create(baseDto, 'user-1');

      // subTotal = 3 * 100 = 300; tax = 30; total = 300 + 30 - 20 = 310
      expect(result.invoiceSubTotal).toBe(300);
      expect(result.totalTax).toBe(30);
      expect(result.totalAmount).toBe(310);
      expect(result.balanceAmount).toBe(310);
    });

    it('always creates new invoices with Draft status', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.create(baseDto, 'user-1');
      expect(result.status).toBe(InvoiceStatus.DRAFT);
    });

    it('defaults tax to 10% and discount to 0 when not provided', async () => {
      repo.findOne.mockResolvedValue(null);
      const dto = { ...baseDto, taxPercent: undefined, discount: undefined } as any;
      const result = await service.create(dto, 'user-1');
      // subTotal = 300; default tax 10% = 30; discount 0; total = 330
      expect(result.totalTax).toBe(30);
      expect(result.totalDiscount).toBe(0);
      expect(result.totalAmount).toBe(330);
    });

    it('throws ConflictException when invoice number already exists', async () => {
      repo.findOne.mockResolvedValue({ invoiceId: 'existing' } as Invoice);
      await expect(service.create(baseDto, 'user-1')).rejects.toThrow(ConflictException);
    });
  });
});
