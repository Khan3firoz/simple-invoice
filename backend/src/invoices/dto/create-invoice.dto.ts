import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsOnOrAfter } from '../../common/validators/is-on-or-after.validator';

export class CustomerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @ApiProperty()
  @IsEmail({}, { message: 'customer email must be a valid email address' })
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;
}

export class InvoiceItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  rate: number;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  invoiceReference?: string;

  @ApiProperty()
  @IsDateString()
  invoiceDate: string;

  @ApiProperty()
  @IsDateString()
  @IsOnOrAfter('invoiceDate')
  dueDate: string;

  @ApiProperty({ example: 'AUD' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: 'AU$' })
  @IsString()
  @IsNotEmpty()
  currencySymbol: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({ type: [InvoiceItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercent?: number = 10;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number = 0;
}
