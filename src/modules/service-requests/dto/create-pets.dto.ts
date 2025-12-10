import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
  MaxLength,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContactoMascotaDto {
  @IsString() @MaxLength(120) nombre: string;
  @IsString() @MaxLength(80) relacion: string; // Tutor / Dueño / Familiar
  @IsString() @Length(6, 32) telefono_e164: string; // +51...
}

export class AnimalDto {
  @IsString() nombre: string;
  @IsString() especie: string; // perro, gato...
  @IsOptional() @IsString() raza?: string;

  @IsIn(['PEQUENIO', 'MEDIANO', 'GRANDE']) tamanio:
    | 'PEQUENIO'
    | 'MEDIANO'
    | 'GRANDE';
  @IsIn(['AGRESIVO', 'TRANQUILO', 'INQUIETO']) personalidad:
    | 'AGRESIVO'
    | 'TRANQUILO'
    | 'INQUIETO';

  @IsOptional() @IsString() foto_url?: string; // lo dejamos vacío/nullable

  @IsBoolean() problemas_salud: boolean;
  @IsOptional() @IsString() descripcion_salud?: string;

  @IsOptional() @IsString() alimentos_preferidos?: string;
  @IsOptional() @IsString() clinica_veterinaria?: string;
}

export class CreateMascotasPayloadDto {
  @IsIn(['PASEO_DIARIO', 'HOUSING']) servicio: 'PASEO_DIARIO' | 'HOUSING';
  @IsIn(['EN_HOGAR_MASCOTA', 'EN_HOGAR_CUIDADOR']) modalidad:
    | 'EN_HOGAR_MASCOTA'
    | 'EN_HOGAR_CUIDADOR';

  @ValidateNested()
  @Type(() => ContactoMascotaDto)
  contacto: ContactoMascotaDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnimalDto)
  animales: AnimalDto[]; // 1..3
}
