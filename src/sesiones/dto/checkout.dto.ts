// src/sesiones/dto/checkout.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class CheckOutProponerDto {
  @IsOptional()
  @IsString()
  resumen?: string;
}

export class CheckOutConfirmarDto {
  @IsOptional()
  @IsString()
  resumen?: string;
}
