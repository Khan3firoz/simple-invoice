import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { InvoiceStatus } from '../invoice-status.enum';

const SORTABLE_FIELDS = ['invoiceDate', 'dueDate', 'totalAmount'] as const;
const ORDERINGS = ['ASC', 'DESC'] as const;
const STATUSES = [...Object.values(InvoiceStatus), 'Overdue'] as const;

export class QueryInvoiceDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'invoiceDate' })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: (typeof SORTABLE_FIELDS)[number] = 'invoiceDate';

  @ApiPropertyOptional({ enum: ORDERINGS, default: 'DESC' })
  @IsOptional()
  @IsIn(ORDERINGS)
  ordering?: (typeof ORDERINGS)[number] = 'DESC';

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: InvoiceStatus | 'Overdue';

  @ApiPropertyOptional({ description: 'Partial, case-insensitive search on invoice number or customer name' })
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
