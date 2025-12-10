import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsISO8601,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FechaRangoDto {
  @IsISO8601() fecha: string; // "2025-07-02"
  @IsString() hora_inicio: string; // "09:00"
  @IsString() hora_fin: string; // "13:00"
}

export class UbicacionDto {
  @IsString() direccion_linea: string;
  @IsNumber() lat: number;
  @IsNumber() lng: number;
}

export class CreateSolicitudBaseDto {
  @IsString() titulo: string;
  @IsString() descripcion: string;

  @ValidateNested()
  @Type(() => UbicacionDto)
  ubicacion: UbicacionDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FechaRangoDto)
  fechas: FechaRangoDto[];
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_sugerido?: number;
}
