import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { ToBoolean, ToNumber, TrimOptional } from '../../../common/validation/transforms.js';
import { BodyType, FuelType, Transmission, VehicleCondition, VehicleStatus } from '../../../generated/prisma/enums.js';
import { VEHICLE_SORTS, type VehicleSort } from '../vehicle-query.js';

export class QueryVehiclesDto extends PaginationQueryDto {
  @IsOptional() @TrimOptional() @IsString() @MaxLength(40)
  make?: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(60)
  model?: string;

  @IsOptional() @TrimOptional() @IsEnum(VehicleCondition)
  condition?: VehicleCondition;

  @IsOptional() @TrimOptional() @IsEnum(BodyType)
  bodyType?: BodyType;

  @IsOptional() @TrimOptional() @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional() @TrimOptional() @IsEnum(Transmission)
  transmission?: Transmission;

  @IsOptional() @TrimOptional() @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional() @ToNumber() @IsInt() @Min(1950) @Max(2100)
  minYear?: number;

  @IsOptional() @ToNumber() @IsInt() @Min(1950) @Max(2100)
  maxYear?: number;

  @IsOptional() @ToNumber() @IsInt() @Min(0)
  minPrice?: number;

  @IsOptional() @ToNumber() @IsInt() @Min(0)
  maxPrice?: number;

  @IsOptional() @ToNumber() @IsInt() @Min(0)
  minMileage?: number;

  @IsOptional() @ToNumber() @IsInt() @Min(0)
  maxMileage?: number;

  @IsOptional() @ToBoolean() @IsBoolean()
  featured?: boolean;

  @IsOptional() @TrimOptional() @IsIn(VEHICLE_SORTS)
  sort?: VehicleSort;

  /** Comma-separated vehicle ids (used for the saved-vehicles page). */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value))
  @ArrayMaxSize(60)
  @IsUUID('all', { each: true })
  ids?: string[];

  @IsOptional() @TrimOptional() @IsUUID()
  excludeId?: string;
}
