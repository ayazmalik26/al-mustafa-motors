import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ToNumber, TrimOptional } from '../validation/transforms.js';

export class PaginationQueryDto {
  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @TrimOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export function pageParams(query: { page?: number; pageSize?: number }, defaultSize = 20) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? defaultSize;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
