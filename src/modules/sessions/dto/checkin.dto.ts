// src/sesiones/dto/checkin.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class CheckInProponerDto {
  @IsOptional()
  @IsString()
  notas?: string;
}

// confirmar check-in no necesita body
