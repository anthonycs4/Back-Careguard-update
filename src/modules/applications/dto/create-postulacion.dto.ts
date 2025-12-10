import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreatePostulacionDto {
  @IsUUID()
  @IsNotEmpty()
  solicitud_id: string;

  @IsOptional()
  @IsString()
  mensaje?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  tarifa_propuesta?: number;
}
