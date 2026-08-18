import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoiceItem } from './invoice-item.entity';
import { InvoiceStatus } from './invoice-status.enum';
import { DecimalTransformer } from '../common/decimal.transformer';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  invoiceId: string;

  @Index({ unique: true })
  @Column()
  invoiceNumber: string;

  @Column({ nullable: true })
  invoiceReference?: string;

  @Index()
  @Column('date')
  invoiceDate: string;

  @Index()
  @Column('date')
  dueDate: string;

  @Column({ default: 'AUD' })
  currency: string;

  @Column({ default: 'AU$' })
  currencySymbol: string;

  @Column({ nullable: true })
  description?: string;

  @Index()
  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  // Customer fields are embedded on the invoice for this assessment (see README for rationale)
  @Index()
  @Column()
  customerFullname: string;

  @Column()
  customerEmail: string;

  @Column({ nullable: true })
  customerMobileNumber?: string;

  @Column({ nullable: true })
  customerAddress?: string;

  @Column('decimal', { precision: 12, scale: 2, transformer: DecimalTransformer })
  invoiceSubTotal: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: DecimalTransformer, default: 0 })
  taxPercent: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: DecimalTransformer, default: 0 })
  totalTax: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: DecimalTransformer, default: 0 })
  totalDiscount: number;

  @Index()
  @Column('decimal', { precision: 12, scale: 2, transformer: DecimalTransformer })
  totalAmount: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: DecimalTransformer, default: 0 })
  totalPaid: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: DecimalTransformer })
  balanceAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  createdBy?: string;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true, eager: true })
  items: InvoiceItem[];
}
