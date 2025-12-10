import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateUsuarioDto {
  @IsEmail()
  correo: string;

  @IsOptional()
  @IsString()
  nombre_completo?: string;

  @IsOptional()
  @IsString()
  telefono_e164?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  pais_iso2?: string;

  @IsOptional()
  @IsString()
  genero?: string;

  @IsOptional()
  @IsString()
  foto_url?: string;
}
