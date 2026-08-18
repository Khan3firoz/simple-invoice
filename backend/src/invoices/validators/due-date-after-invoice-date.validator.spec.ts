import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IsDateString } from 'class-validator';
import { IsDueDateAfterInvoiceDate } from './due-date-after-invoice-date.validator';

class TestDto {
  @IsDateString()
  invoiceDate: string;

  @IsDateString()
  @IsDueDateAfterInvoiceDate('invoiceDate', {
    message: 'dueDate must be on or after invoiceDate',
  })
  dueDate: string;
}

describe('IsDueDateAfterInvoiceDate', () => {
  it('passes when dueDate is after invoiceDate', async () => {
    const dto = plainToInstance(TestDto, { invoiceDate: '2026-01-01', dueDate: '2026-01-15' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('passes when dueDate equals invoiceDate', async () => {
    const dto = plainToInstance(TestDto, { invoiceDate: '2026-01-01', dueDate: '2026-01-01' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails when dueDate is before invoiceDate', async () => {
    const dto = plainToInstance(TestDto, { invoiceDate: '2026-01-15', dueDate: '2026-01-01' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toEqual(
      expect.objectContaining({
        isDueDateAfterInvoiceDate: 'dueDate must be on or after invoiceDate',
      }),
    );
  });
});
