import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { InvoiceStatus } from './invoice-status.enum';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';

export interface InvoiceWithDisplayStatus extends Omit<Invoice, 'status'> {
  status: InvoiceStatus | 'Overdue';
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
  ) {}

  /**
   * Overdue is never persisted. It is derived at read time from the stored
   * status + dueDate, per the assessment spec:
   *   if status != "Paid" AND dueDate < today -> "Overdue"
   */
  static deriveStatus(status: InvoiceStatus, dueDate: string): InvoiceStatus | 'Overdue' {
    // Compare plain YYYY-MM-DD strings (lexicographic order matches chronological
    // order for ISO dates) instead of Date objects, which would otherwise compare
    // a UTC-parsed dueDate against a local-timezone "today" and misclassify dates
    // near the day boundary.
    const todayStr = new Date().toISOString().slice(0, 10);
    const dueDateStr = dueDate.slice(0, 10);
    if (status !== InvoiceStatus.PAID && dueDateStr < todayStr) {
      return 'Overdue';
    }
    return status;
  }

  private toResponse(invoice: Invoice): InvoiceWithDisplayStatus {
    return {
      ...invoice,
      status: InvoicesService.deriveStatus(invoice.status, invoice.dueDate),
    };
  }

  async create(dto: CreateInvoiceDto, createdBy: string): Promise<InvoiceWithDisplayStatus> {
    const existing = await this.invoicesRepository.findOne({
      where: { invoiceNumber: dto.invoiceNumber },
    });
    if (existing) {
      throw new ConflictException(`Invoice number "${dto.invoiceNumber}" already exists`);
    }

    const taxPercent = dto.taxPercent ?? 10;
    const discount = dto.discount ?? 0;
    const subTotal = dto.item.quantity * dto.item.rate;
    const taxAmount = subTotal * (taxPercent / 100);
    const totalAmount = subTotal + taxAmount - discount;

    const invoice = this.invoicesRepository.create({
      invoiceNumber: dto.invoiceNumber,
      invoiceReference: dto.invoiceReference,
      invoiceDate: dto.invoiceDate,
      dueDate: dto.dueDate,
      currency: dto.currency,
      currencySymbol: dto.currencySymbol ?? dto.currency,
      description: dto.description,
      status: InvoiceStatus.DRAFT,
      customerFullname: dto.customer.fullname,
      customerEmail: dto.customer.email,
      customerMobileNumber: dto.customer.mobileNumber,
      customerAddress: dto.customer.address,
      invoiceSubTotal: subTotal,
      taxPercent,
      totalTax: taxAmount,
      totalDiscount: discount,
      totalAmount,
      totalPaid: 0,
      balanceAmount: totalAmount,
      createdBy,
      items: [
        Object.assign(new InvoiceItem(), {
          name: dto.item.name,
          quantity: dto.item.quantity,
          rate: dto.item.rate,
        }),
      ],
    });

    const saved = await this.invoicesRepository.save(invoice);
    return this.toResponse(saved);
  }

  async findAll(query: QueryInvoiceDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'invoiceDate';
    const ordering = query.ordering ?? 'DESC';

    const qb = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items');

    if (query.keyword) {
      qb.andWhere(
        '(LOWER(invoice.invoiceNumber) LIKE LOWER(:keyword) OR LOWER(invoice.customerFullname) LIKE LOWER(:keyword))',
        { keyword: `%${query.keyword}%` },
      );
    }

    if (query.fromDate) {
      qb.andWhere('invoice.invoiceDate >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      qb.andWhere('invoice.invoiceDate <= :toDate', { toDate: query.toDate });
    }

    if (query.status) {
      if (query.status === 'Overdue') {
        qb.andWhere('invoice.status != :paid', { paid: InvoiceStatus.PAID }).andWhere(
          'invoice.dueDate < CURRENT_DATE',
        );
      } else if (query.status === InvoiceStatus.PAID) {
        qb.andWhere('invoice.status = :status', { status: InvoiceStatus.PAID });
      } else {
        // Draft/Pending must exclude records that have become Overdue.
        qb.andWhere('invoice.status = :status', { status: query.status }).andWhere(
          'invoice.dueDate >= CURRENT_DATE',
        );
      }
    }

    qb.orderBy(`invoice.${sortBy}`, ordering)
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((invoice) => this.toResponse(invoice)),
      paging: { page, pageSize, total },
    };
  }

  async findOne(invoiceId: string): Promise<InvoiceWithDisplayStatus> {
    const invoice = await this.invoicesRepository.findOne({ where: { invoiceId } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return this.toResponse(invoice);
  }
}
