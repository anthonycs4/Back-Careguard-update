import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
  MaxLength,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContactoTutorDto {
  @IsString() @MaxLength(120) nombre: string;
  @IsString() @MaxLength(80) relacion: string;
  @IsString() @Length(6, 32) telefono_e164: string; // +51...
}

export class MedicamentoDto {
  @IsString() nombre: string;
  @IsString() frecuencia: string;
  @IsString() dosis: string;
}

export class PersonaNinioDto {
  @IsString() nombre_completo: string;
  @IsDateString() fecha_nacimiento: string; // YYYY-MM-DD
  @IsIn([
    'MASCULINO',
    'FEMENINO',
    'NO_BINARIO',
    'PREFIERO_NO_DECIR',
    'DESCONOCIDO',
  ])
  genero: string;

  @IsBoolean() camina_solo: boolean;
  @IsBoolean() dificultad_movimiento: boolean;
  @IsOptional() @IsString() tipo_limitacion?: string;

  @IsBoolean() condicion_medica: boolean;
  @IsOptional() @IsString() tipo_condicion?: string;

  @IsBoolean() alergias: boolean;
  @IsOptional() @IsString() detalle_alergias?: string;

  @IsIn(['LECHE_MATERNA', 'FORMULA', 'MIXTO', 'SOLIDOS']) alimentacion:
    | 'LECHE_MATERNA'
    | 'FORMULA'
    | 'MIXTO'
    | 'SOLIDOS';
  @IsBoolean() dieta_especial: boolean;
  @IsOptional() @IsString() tipo_dieta_especial?: string;

  @IsBoolean() problemas_suenio: boolean;
  @IsBoolean() objeto_apego: boolean;

  @IsIn(['SI', 'NO', 'EN_TRANSICION']) panales: 'SI' | 'NO' | 'EN_TRANSICION';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicamentoDto)
  medicamentos: MedicamentoDto[];
}

export class CreateNiniosPayloadDto {
  @IsIn(['INFANTES', 'BEBES', 'ESPECIALES']) servicio:
    | 'INFANTES'
    | 'BEBES'
    | 'ESPECIALES';

  @ValidateNested()
  @Type(() => ContactoTutorDto)
  contacto_tutor: ContactoTutorDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonaNinioDto)
  personas: PersonaNinioDto[]; // 1..3
}
