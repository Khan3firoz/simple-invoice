import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoiceStatus } from './invoice-status.enum';
import { InvoiceItem } from './invoice-item.entity';

// Customer is embedded on the Invoice row rather than a separate `customers`
// table: this assessment never looks up "all invoices for a customer" or
// reuses a customer across invoices, so a join buys nothing but complexity.
@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  invoiceId: string;

  @Index({ unique: true })
  @Column()
  invoiceNumber: string;

  @Column({ nullable: true })
  invoiceReference?: string;

  @Column('date')
  invoiceDate: string;

  @Column('date')
  dueDate: string;

  @Column({ length: 3 })
  currency: string;

  @Column()
  currencySymbol: string;

  @Column({ nullable: true })
  description?: string;

  @Index()
  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  // --- Embedded customer fields ---
  @Column()
  customerFullname: string;

  @Column()
  customerEmail: string;

  @Column({ nullable: true })
  customerMobileNumber?: string;

  @Column({ nullable: true })
  customerAddress?: string;

  // --- Money fields (server-calculated, see InvoicesService.calculateTotals) ---
  @Column('decimal', { precision: 12, scale: 2 })
  invoiceSubTotal: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalTax: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalDiscount: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalAmount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalPaid: number;

  @Column('decimal', { precision: 12, scale: 2 })
  balanceAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  createdBy: string;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, {
    cascade: true,
    eager: true,
  })
  items: InvoiceItem[];
}
