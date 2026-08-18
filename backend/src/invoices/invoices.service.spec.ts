import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus } from './entities/invoice-status.enum';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

type MockRepo = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function makeRepo(): MockRepo {
  return {
    create: jest.fn((data: Partial<Invoice>) => data),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('InvoicesService', () => {
  describe('calculateTotals (pure business logic)', () => {
    it('computes subtotal, tax and total from quantity/rate/tax%/discount', () => {
      // subTotal = 2 * 1000 = 2000; tax 10% = 200; total = 2000 + 200 - 20 = 2180
      const result = InvoicesService.calculateTotals(2, 1000, 10, 20);
      expect(result).toEqual({
        subTotal: 2000,
        taxAmount: 200,
        totalAmount: 2180,
      });
    });

    it('defaults to zero discount', () => {
      const result = InvoicesService.calculateTotals(1, 500, 10, 0);
      expect(result.totalAmount).toBe(550);
    });

    it('supports a zero tax rate', () => {
      const result = InvoicesService.calculateTotals(1, 500, 0, 0);
      expect(result).toEqual({ subTotal: 500, taxAmount: 0, totalAmount: 500 });
    });
  });

  describe('deriveStatus (Overdue derivation)', () => {
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);

    it('reports Overdue for a Draft invoice past its due date', () => {
      expect(InvoicesService.deriveStatus(InvoiceStatus.DRAFT, yesterday)).toBe(
        'Overdue',
      );
    });

    it('reports Overdue for a Pending invoice past its due date', () => {
      expect(
        InvoicesService.deriveStatus(InvoiceStatus.PENDING, yesterday),
      ).toBe('Overdue');
    });

    it('never reports Paid invoices as Overdue, even past due', () => {
      expect(InvoicesService.deriveStatus(InvoiceStatus.PAID, yesterday)).toBe(
        InvoiceStatus.PAID,
      );
    });

    it('returns the persisted status when the due date has not passed', () => {
      expect(
        InvoicesService.deriveStatus(InvoiceStatus.PENDING, tomorrow),
      ).toBe(InvoiceStatus.PENDING);
    });
  });

  describe('create()', () => {
    // Dates must be in the future relative to "today" so the derived status
    // stays Draft instead of being reported as Overdue (see deriveStatus
    // tests above) — this suite is about the persisted status, not derivation.
    const futureDate = (daysFromNow: number) =>
      new Date(Date.now() + daysFromNow * 86_400_000)
        .toISOString()
        .slice(0, 10);

    const dto: CreateInvoiceDto = {
      invoiceNumber: 'IV-0001',
      invoiceDate: futureDate(1),
      dueDate: futureDate(15),
      currency: 'USD',
      currencySymbol: 'US$',
      customer: { fullname: 'Jane Doe', email: 'jane@example.com' },
      item: { name: 'Service', quantity: 2, rate: 100 },
      taxPercent: 10,
      discount: 0,
    };

    it('always creates new invoices with status Draft', async () => {
      const repo = makeRepo();
      repo.save.mockImplementation((invoice: Partial<Invoice>) =>
        Promise.resolve({
          ...invoice,
          invoiceId: 'id-1',
          createdAt: new Date(),
          items: invoice.items,
        }),
      );
      const service = new InvoicesService(
        repo as unknown as Repository<Invoice>,
      );

      const result = await service.create(dto, 'user-1');

      expect(result.status).toBe(InvoiceStatus.DRAFT);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvoiceStatus.DRAFT }),
      );
    });

    it('translates a unique-constraint DB error into a ConflictException', async () => {
      const repo = makeRepo();
      repo.save.mockRejectedValue({ code: '23505' });
      const service = new InvoicesService(
        repo as unknown as Repository<Invoice>,
      );

      await expect(service.create(dto, 'user-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows unrelated database errors as-is', async () => {
      const repo = makeRepo();
      const unrelated = new Error('connection lost');
      repo.save.mockRejectedValue(unrelated);
      const service = new InvoicesService(
        repo as unknown as Repository<Invoice>,
      );

      await expect(service.create(dto, 'user-1')).rejects.toBe(unrelated);
    });
  });

  describe('findOne()', () => {
    it('throws NotFoundException when the invoice does not exist', async () => {
      const repo = makeRepo();
      repo.findOne.mockResolvedValue(null);
      const service = new InvoicesService(
        repo as unknown as Repository<Invoice>,
      );

      await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
