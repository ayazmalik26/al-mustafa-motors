import { IsBoolean, IsEmail, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';
import { IsPhone, ToNumber, Trim, TrimNullable } from '../../../common/validation/transforms.js';

const URL_OPTS = { protocols: ['http', 'https'], require_protocol: true };

export class UpdateSettingsDto {
  @IsOptional() @Trim() @IsString() @IsNotEmpty() @MaxLength(80)
  businessName?: string;

  @IsOptional() @Trim() @IsPhone()
  phone?: string;

  @IsOptional() @Trim() @IsPhone({ message: 'Enter a valid WhatsApp number including country code (e.g. +92 300 1234567)' })
  whatsapp?: string;

  @IsOptional() @TrimNullable() @IsEmail({}, { message: 'Enter a valid email address' }) @MaxLength(254)
  email?: string | null;

  @IsOptional() @Trim() @IsString() @IsNotEmpty() @MaxLength(300)
  address?: string;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(300)
  addressUr?: string | null;

  @IsOptional() @TrimNullable() @IsUrl(URL_OPTS, { message: 'Enter a full URL starting with https://' }) @MaxLength(500)
  googleMapsUrl?: string | null;

  @IsOptional() @ToNumber() @ValidateIf((_o, v) => v !== null) @IsLatitude({ message: 'Latitude must be between -90 and 90' })
  latitude?: number | null;

  @IsOptional() @ToNumber() @ValidateIf((_o, v) => v !== null) @IsLongitude({ message: 'Longitude must be between -180 and 180' })
  longitude?: number | null;

  @IsOptional() @TrimNullable() @IsUrl(URL_OPTS, { message: 'Enter a full URL starting with https://' }) @MaxLength(300)
  facebookUrl?: string | null;

  @IsOptional() @TrimNullable() @IsUrl(URL_OPTS, { message: 'Enter a full URL starting with https://' }) @MaxLength(300)
  instagramUrl?: string | null;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(200)
  openingHours?: string | null;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(200)
  openingHoursUr?: string | null;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(3000)
  description?: string | null;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(3000)
  descriptionUr?: string | null;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(120)
  heroTitle?: string | null;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(120)
  heroTitleUr?: string | null;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(400)
  heroSubtitle?: string | null;

  @IsOptional() @TrimNullable() @IsString() @MaxLength(400)
  heroSubtitleUr?: string | null;

  @IsOptional()
  @TrimNullable()
  @ValidateIf((_o, v) => typeof v === 'string' && !v.startsWith('/uploads/'))
  @IsUrl(URL_OPTS, { message: 'Enter a full image URL starting with https://' })
  @MaxLength(500)
  heroImageUrl?: string | null;

  @IsOptional() @IsBoolean()
  showDemoNotice?: boolean;
}
