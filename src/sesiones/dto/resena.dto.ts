// src/sesiones/dto/resena.dto.ts
import { IsIn, IsInt, Max, Min, IsOptional, IsString } from 'class-validator';

export class CrearResenaDto {
  @IsIn(['CUIDADOR', 'USUARIO'])
  para!: 'CUIDADOR' | 'USUARIO';

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comentario?: string;
}
