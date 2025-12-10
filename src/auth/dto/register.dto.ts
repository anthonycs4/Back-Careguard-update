// src/auth/dto/register.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail() email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  telefono_e164?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  pais_iso2?: string;

  @IsOptional()
  @IsString()
  genero?: string;

  @IsOptional()
  @IsString()
  foto_url?: string;

  // 👉 Nuevo
  @IsOptional()
  @IsString()
  @MaxLength(32)
  dni?: string;
}
