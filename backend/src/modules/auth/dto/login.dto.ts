import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  @MaxLength(200)
  password!: string;
}
