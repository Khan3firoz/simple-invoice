import { ApiProperty } from '@nestjs/swagger';

export class PagingDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  total: number;
}

export class PaginatedResponseDto<T> {
  data: T[];

  @ApiProperty({ type: PagingDto })
  paging: PagingDto;
}
