import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ToNumber, Trim, TrimNullable } from '../../../common/validation/transforms.js';
import { SLUG_PATTERN } from '../../../common/utils/slug.js';
import { BodyType, FuelType, Transmission, VehicleCondition, VehicleStatus } from '../../../generated/prisma/enums.js';

const MAX_YEAR = new Date().getFullYear() + 1;

export class CreateVehicleDto {
  @Trim() @IsString() @IsNotEmpty({ message: 'Make is required' }) @MaxLength(40)
  make!: string;

  @Trim() @IsString() @IsNotEmpty({ message: 'Model is required' }) @MaxLength(60)
  model!: string;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(80)
  variant?: string | null;

  @ToNumber() @IsInt({ message: 'Year must be a whole number' }) @Min(1950) @Max(MAX_YEAR)
  year!: number;

  @IsEnum(VehicleCondition)
  condition!: VehicleCondition;

  @IsEnum(BodyType)
  bodyType!: BodyType;

  @IsEnum(FuelType)
  fuelType!: FuelType;

  @IsEnum(Transmission)
  transmission!: Transmission;

  @IsOptional() @ToNumber() @IsInt() @Min(0) @Max(2_000_000)
  mileage?: number | null;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(60)
  engine?: string | null;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(40)
  color?: string | null;

  @IsOptional() @ToNumber() @IsInt({ message: 'Price must be a whole number of rupees' }) @Min(0) @Max(2_000_000_000)
  price?: number | null;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(60)
  priceDisplay?: string | null;

  @IsOptional() @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(5000)
  description?: string | null;

  @IsOptional() @IsBoolean()
  featured?: boolean;

  @IsOptional() @IsBoolean()
  isDemo?: boolean;

  @IsOptional()
  @TrimNullable()
  @IsString()
  @MaxLength(80)
  @Matches(SLUG_PATTERN, { message: 'Slug may only contain lowercase letters, numbers and single hyphens' })
  slug?: string | null;
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

export class ReorderImagesDto {
  @IsArray()
  @IsUUID('all', { each: true })
  imageIds!: string[];
}

export class UpdateImageDto {
  @IsOptional() @TrimNullable() @IsString() @MaxLength(160)
  alt?: string | null;

  @IsOptional() @IsBoolean()
  isPrimary?: boolean;
}
