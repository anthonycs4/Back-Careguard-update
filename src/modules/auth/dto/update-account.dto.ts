import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  Length,
} from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  telefono_e164?: string;

  @IsOptional()
  @Length(2, 2)
  pais_iso2?: string;

  @IsOptional()
  @IsString()
  genero?: string;

  @IsOptional()
  @IsString()
  foto_url?: string;
}
