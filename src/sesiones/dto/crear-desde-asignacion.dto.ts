// src/sesiones/dto/crear-desde-asignacion.dto.ts
import { IsUUID } from 'class-validator';

export class CrearDesdeAsignacionDto {
  @IsUUID()
  asignacion_id!: string;
}
