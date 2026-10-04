import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsPhone, Trim, TrimOptional } from '../../common/validation/transforms.js';

/** Contact fields shared by the public enquiry and sell/exchange forms. */
export class LeadContactDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(80)
  name!: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsPhone()
  phone!: string;

  @IsOptional()
  @TrimOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsIn(['en', 'ur'])
  locale?: 'en' | 'ur';

  /** Honeypot: hidden from people, filled in by bots. Must stay empty. */
  @IsOptional()
  @IsString()
  @MaxLength(0, { message: 'Invalid submission' })
  website?: string;
}
