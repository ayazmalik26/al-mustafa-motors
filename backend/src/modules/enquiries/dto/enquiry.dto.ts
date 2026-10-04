import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Trim, TrimNullable, TrimOptional } from '../../../common/validation/transforms.js';
import { EnquirySource, EnquiryStatus } from '../../../generated/prisma/enums.js';
import { LeadContactDto } from '../../leads/lead-fields.js';

export const ENQUIRY_MIN_MESSAGE = 10;

export class CreateEnquiryDto extends LeadContactDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  @MinLength(ENQUIRY_MIN_MESSAGE, { message: `Message must be at least ${ENQUIRY_MIN_MESSAGE} characters` })
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @TrimOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsEnum(EnquirySource)
  source?: EnquirySource;
}

export class UpdateEnquiryDto {
  @IsOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;

  @IsOptional()
  @TrimNullable()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}

export class QueryEnquiriesDto extends PaginationQueryDto {
  @IsOptional()
  @TrimOptional()
  @IsEnum(EnquiryStatus)
  status?: EnquiryStatus;
}
