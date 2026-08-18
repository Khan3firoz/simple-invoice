import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { InvoiceStatus } from '../entities/invoice-status.enum';

export enum InvoiceSortField {
  INVOICE_DATE = 'invoiceDate',
  DUE_DATE = 'dueDate',
  TOTAL_AMOUNT = 'totalAmount',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class QueryInvoicesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 10;

  @ApiPropertyOptional({
    enum: InvoiceSortField,
    default: InvoiceSortField.INVOICE_DATE,
  })
  @IsOptional()
  @IsIn(Object.values(InvoiceSortField))
  sortBy: InvoiceSortField = InvoiceSortField.INVOICE_DATE;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsIn(Object.values(SortOrder))
  ordering: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ enum: [...Object.values(InvoiceStatus), 'Overdue'] })
  @IsOptional()
  @IsIn([...Object.values(InvoiceStatus), 'Overdue'])
  status?: InvoiceStatus | 'Overdue';

  @ApiPropertyOptional({
    description:
      'Partial, case-insensitive match on invoice number or customer name',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
