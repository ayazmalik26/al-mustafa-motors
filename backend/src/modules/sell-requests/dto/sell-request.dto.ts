import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { ToNumber, Trim, TrimNullable, TrimOptional } from '../../../common/validation/transforms.js';
import { SellIntent, SellRequestStatus, SellVehicleCondition } from '../../../generated/prisma/enums.js';
import { LeadContactDto } from '../../leads/lead-fields.js';

const MAX_YEAR = new Date().getFullYear() + 1;

/** Sent as multipart/form-data (optional photos), so numbers arrive as strings and are converted. */
export class CreateSellRequestDto extends LeadContactDto {
  @Trim() @IsString() @IsNotEmpty({ message: 'Vehicle make is required' }) @MaxLength(40)
  vehicleMake!: string;

  @Trim() @IsString() @IsNotEmpty({ message: 'Vehicle model is required' }) @MaxLength(60)
  vehicleModel!: string;

  @ToNumber()
  @IsInt({ message: 'Enter a valid year' })
  @Min(1970, { message: 'Enter a valid year' })
  @Max(MAX_YEAR, { message: 'Enter a valid year' })
  vehicleYear!: number;

  @IsOptional() @ToNumber() @IsInt({ message: 'Mileage must be a whole number' }) @Min(0) @Max(2_000_000)
  mileage?: number;

  @IsOptional() @TrimOptional() @IsEnum(SellVehicleCondition)
  condition?: SellVehicleCondition;

  @IsOptional() @ToNumber() @IsInt({ message: 'Expected price must be a whole number' }) @Min(0) @Max(2_000_000_000)
  expectedPrice?: number;

  @Trim() @IsEnum(SellIntent, { message: 'Choose sell or exchange' })
  intent!: SellIntent;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(2000)
  message?: string;
}

export class UpdateSellRequestDto {
  @IsOptional() @IsEnum(SellRequestStatus)
  status?: SellRequestStatus;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(4000)
  notes?: string | null;
}

export class QuerySellRequestsDto extends PaginationQueryDto {
  @IsOptional() @TrimOptional() @IsEnum(SellRequestStatus)
  status?: SellRequestStatus;

  @IsOptional() @TrimOptional() @IsEnum(SellIntent)
  intent?: SellIntent;
}
