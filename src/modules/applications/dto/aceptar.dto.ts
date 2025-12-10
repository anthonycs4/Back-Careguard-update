// src/postulaciones/dto/aceptar.dto.ts
import { IsNumber } from 'class-validator';

export class AceptarPostulacionDto {
  @IsNumber()
  tarifa_acordada!: number; // p.ej. 42.5
}
