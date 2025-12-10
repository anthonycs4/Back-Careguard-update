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

export class CloseContactDto {
  @IsString() @MaxLength(120) nombre: string;
  @IsString() @MaxLength(80) relacion: string;
  @IsString() @Length(6, 32) telefono_e164: string; // +51...
}

export class MedicamentoDto {
  @IsString() nombre: string;
  @IsString() frecuencia: string; // ej: "Cada 8 hrs"
  @IsString() dosis: string; // ej: "10 mg"
}

export class GrandparentPersonDto {
  @IsString() nombre_completo: string;
  @IsDateString() fecha_nacimiento: string; // "YYYY-MM-DD"
  @IsIn([
    'MASCULINO',
    'FEMENINO',
    'NO_BINARIO',
    'PREFIERO_NO_DECIR',
    'DESCONOCIDO',
  ])
  genero: string;
  @IsIn(['ACTUAL', 'EX', 'NUNCA']) fumador: string;

  @IsBoolean() limitacion_movimiento: boolean;
  @IsOptional() @IsString() tipo_limitacion?: string;

  @IsArray() alimentos_restringidos: string[]; // pondremos tope 3 en runtime

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicamentoDto)
  medicamentos: MedicamentoDto[];
}

export class CreateGrandparentsPayloadDto {
  @IsIn(['COMPANIA', 'ASISTENCIA']) servicio: 'COMPANIA' | 'ASISTENCIA';
  @ValidateNested()
  @Type(() => CloseContactDto)
  contacto_cercano: CloseContactDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrandparentPersonDto)
  personas: GrandparentPersonDto[]; // 1..3
}
