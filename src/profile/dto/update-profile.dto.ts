import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  nombre_completo?: string;

  @IsOptional()
  @IsString()
  telefono_e164?: string;

  @IsOptional()
  @IsString()
  pais_iso2?: string;

  @IsOptional()
  @IsString()
  genero?: string;

  @IsOptional()
  @IsString()
  foto_url?: string;
}
