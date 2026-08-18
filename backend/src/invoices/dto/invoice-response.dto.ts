import { ApiProperty } from '@nestjs/swagger';
import type { InvoiceStatusView } from '../entities/invoice-status.enum';

export class CustomerResponseDto {
  @ApiProperty()
  fullname: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  mobileNumber?: string;

  @ApiProperty({ required: false })
  address?: string;
}

export class InvoiceItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  rate: number;
}

export class InvoiceResponseDto {
  @ApiProperty()
  invoiceId: string;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty({ required: false })
  invoiceReference?: string;

  @ApiProperty()
  invoiceDate: string;

  @ApiProperty()
  dueDate: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  currencySymbol: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ description: 'Draft | Pending | Paid | Overdue (derived)' })
  status: InvoiceStatusView;

  @ApiProperty({ type: CustomerResponseDto })
  customer: CustomerResponseDto;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  items: InvoiceItemResponseDto[];

  @ApiProperty()
  invoiceSubTotal: number;

  @ApiProperty()
  totalTax: number;

  @ApiProperty()
  totalDiscount: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  totalPaid: number;

  @ApiProperty()
  balanceAmount: number;

  @ApiProperty()
  createdAt: Date;
}
