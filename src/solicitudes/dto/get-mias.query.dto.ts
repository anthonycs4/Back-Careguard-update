// src/solicitudes/dto/get-mias.query.dto.ts
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMiasQueryDto {
  @IsOptional()
  @IsString()
  estado?:
    | 'ABIERTA'
    | 'EN_REVISION'
    | 'ASIGNADA'
    | 'ACTIVA'
    | 'COMPLETADA'
    | 'CANCELADA';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
