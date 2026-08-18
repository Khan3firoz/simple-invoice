import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import {
  InvoiceStatus,
  InvoiceStatusView,
} from './entities/invoice-status.enum';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { PaginatedResponseDto } from '../common/dto/paging.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
  ) {}

  async create(
    dto: CreateInvoiceDto,
    userId: string,
  ): Promise<InvoiceResponseDto> {
    const totals = InvoicesService.calculateTotals(
      dto.items,
      dto.taxPercent ?? 10,
      dto.discount ?? 0,
    );

    const invoice = this.invoices.create({
      invoiceNumber: dto.invoiceNumber,
      invoiceReference: dto.invoiceReference,
      invoiceDate: dto.invoiceDate,
      dueDate: dto.dueDate,
      currency: dto.currency,
      currencySymbol: dto.currencySymbol,
      description: dto.description,
      status: InvoiceStatus.DRAFT,
      customerFullname: dto.customer.fullname,
      customerEmail: dto.customer.email,
      customerMobileNumber: dto.customer.mobileNumber,
      customerAddress: dto.customer.address,
      invoiceSubTotal: totals.subTotal,
      totalTax: totals.taxAmount,
      totalDiscount: dto.discount ?? 0,
      totalAmount: totals.totalAmount,
      totalPaid: 0,
      balanceAmount: totals.totalAmount,
      createdBy: userId,
      items: dto.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        rate: item.rate,
      })),
    });

    try {
      const saved = await this.invoices.save(invoice);
      return InvoicesService.toResponse(saved);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          `Invoice number "${dto.invoiceNumber}" already exists`,
        );
      }
      throw err;
    }
  }

  async findAll(
    query: QueryInvoicesDto,
  ): Promise<PaginatedResponseDto<InvoiceResponseDto>> {
    // Deliberately not joining `items` here: the list view doesn't need line
    // items (see InvoiceResponseDto usage below), and left-joining a
    // one-to-many relation while using skip/take would duplicate invoice
    // rows per item and corrupt the pagination count once an invoice can
    // have more than one item.
    const qb = this.invoices.createQueryBuilder('invoice');

    if (query.keyword) {
      qb.andWhere(
        '(invoice.invoiceNumber ILIKE :keyword OR invoice.customerFullname ILIKE :keyword)',
        { keyword: `%${query.keyword}%` },
      );
    }

    if (query.fromDate) {
      qb.andWhere('invoice.invoiceDate >= :fromDate', {
        fromDate: query.fromDate,
      });
    }

    if (query.toDate) {
      qb.andWhere('invoice.invoiceDate <= :toDate', { toDate: query.toDate });
    }

    // Status is partly derived (Overdue is never persisted), so filtering has
    // to mirror the same read-time rule used in toResponse() rather than a
    // plain equality check on the stored column.
    if (query.status === 'Overdue') {
      qb.andWhere('invoice.status != :paid', { paid: InvoiceStatus.PAID });
      qb.andWhere('invoice.dueDate < :today', {
        today: InvoicesService.today(),
      });
    } else if (query.status === InvoiceStatus.PAID) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    } else if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
      qb.andWhere('invoice.dueDate >= :today', {
        today: InvoicesService.today(),
      });
    }

    qb.orderBy(`invoice.${query.sortBy}`, query.ordering);
    qb.skip((query.page - 1) * query.pageSize).take(query.pageSize);

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => InvoicesService.toResponse(row)),
      paging: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async findOne(invoiceId: string): Promise<InvoiceResponseDto> {
    const invoice = await this.invoices.findOne({ where: { invoiceId } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return InvoicesService.toResponse(invoice);
  }

  static calculateTotals(
    items: Array<{ quantity: number; rate: number }>,
    taxPercent: number,
    discount: number,
  ) {
    const subTotal = items.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0,
    );
    const taxAmount = subTotal * (taxPercent / 100);
    const totalAmount = subTotal + taxAmount - discount;
    return { subTotal, taxAmount, totalAmount };
  }

  static deriveStatus(
    status: InvoiceStatus,
    dueDate: string,
  ): InvoiceStatusView {
    if (status !== InvoiceStatus.PAID && dueDate < InvoicesService.today()) {
      return 'Overdue';
    }
    return status;
  }

  static toResponse(invoice: Invoice): InvoiceResponseDto {
    return {
      invoiceId: invoice.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceReference: invoice.invoiceReference,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      currencySymbol: invoice.currencySymbol,
      description: invoice.description,
      status: InvoicesService.deriveStatus(invoice.status, invoice.dueDate),
      customer: {
        fullname: invoice.customerFullname,
        email: invoice.customerEmail,
        mobileNumber: invoice.customerMobileNumber,
        address: invoice.customerAddress,
      },
      items: (invoice.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        rate: Number(item.rate),
      })),
      invoiceSubTotal: Number(invoice.invoiceSubTotal),
      totalTax: Number(invoice.totalTax),
      totalDiscount: Number(invoice.totalDiscount),
      totalAmount: Number(invoice.totalAmount),
      totalPaid: Number(invoice.totalPaid),
      balanceAmount: Number(invoice.balanceAmount),
      createdAt: invoice.createdAt,
    };
  }

  private static today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
    );
  }
}
